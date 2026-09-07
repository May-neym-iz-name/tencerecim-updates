// YouTube video yükleme (resumable upload) + video bilgisi düzenleme.
//
// NEDEN PARÇALI YÜKLEME: video dosyaları büyük (10-200 MB). Tek istekte
// göndermek, mağaza internetinde kopan bağlantıda her şeyi baştan başlatır.
// Google'ın "resumable" akışı üç adımdır:
//   1) Oturum aç  → POST .../videos?uploadType=resumable  → Location başlığı
//   2) Parçaları PUT et → her parça 'Content-Range: bytes a-b/toplam'
//      Google devam istiyorsa 308, bitince 200/201 döner.
//   3) Kopma olursa 'bytes *\/toplam' ile SOR → Google nereye kadar aldığını söyler,
//      oradan devam edilir. Baştan başlanmaz.
//
// KOTA: videos.insert = 1600 birim (günde 6 video). Yükleme BAŞLAMADAN önce
// kontrol edilir; yarım yüklenmiş video bırakmamak için.
const fs = require('fs')
const path = require('path')
const https = require('https')
const client = require('./client')
const kota = require('./kota')

const YUKLEME_HOST = 'www.googleapis.com'
const YUKLEME_YOLU = '/upload/youtube/v3/videos'

// Parça boyutu 256 KB'ın katı OLMAK ZORUNDA (Google şartı). 8 MB dengeli:
// küçük olursa istek sayısı artar, büyük olursa kopmada daha çok iş tekrarlanır.
const PARCA_BOYUTU = 8 * 1024 * 1024

// Desteklenen video uzantıları → MIME.
const MIME = {
  '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
  '.wmv': 'video/x-ms-wmv', '.mpg': 'video/mpeg', '.mpeg': 'video/mpeg',
  '.webm': 'video/webm', '.mkv': 'video/x-matroska', '.m4v': 'video/x-m4v',
}

// Devam eden yüklemelerin ilerlemesi (arayüz buradan okur; IPC olay gerekmez).
const _ilerleme = new Map() // id -> { dosya, toplam, gonderilen, durum, video_id, hata }

function ilerlemeDurum(id) {
  if (id) return _ilerleme.get(id) || null
  return Array.from(_ilerleme.entries()).map(([k, v]) => ({ id: k, ...v }))
}

function mimeBul(dosya) {
  const u = path.extname(dosya).toLowerCase()
  const m = MIME[u]
  if (!m) {
    throw new Error(
      `Desteklenmeyen video biçimi: ${u || '(uzantısız)'}. ` +
      `Kabul edilenler: ${Object.keys(MIME).join(', ')}`,
    )
  }
  return m
}

// Ham HTTPS isteği — istekTek'ten farkı: yanıt BAŞLIKLARINA da ihtiyacımız var
// (Location ve Range başlıkları resumable akışın taşıyıcısı).
function istekHam({ host, method, path: yol, headers, body, timeoutMs = 120000 }) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: host, method, path: yol, headers, timeout: timeoutMs }, (res) => {
      let d = ''
      res.setEncoding('utf8')
      res.on('data', c => { d += c })
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(d) } catch { /* gövde boş olabilir (308) */ }
        resolve({ status: res.statusCode, headers: res.headers, json, metin: d })
      })
    })
    req.on('timeout', () => req.destroy(Object.assign(new Error('YouTube yükleme zaman aşımı.'), { code: 'ETIMEDOUT' })))
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

// 1. adım: yükleme oturumu aç, Location (yükleme adresi) al.
async function oturumAc(token, ustveri, boyut, mime) {
  const govde = Buffer.from(JSON.stringify(ustveri), 'utf8')
  const c = await istekHam({
    host: YUKLEME_HOST,
    method: 'POST',
    path: `${YUKLEME_YOLU}?uploadType=resumable&part=snippet,status`,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'Content-Length': govde.length,
      'X-Upload-Content-Length': boyut,
      'X-Upload-Content-Type': mime,
    },
    body: govde,
  })
  if (c.status !== 200) throw client.hataCevir(c.json, c.status)
  const konum = c.headers.location
  if (!konum) throw new Error('YouTube yükleme adresi (Location) vermedi.')
  return konum
}

// 3. adım yardımcısı: kopmadan sonra "nereye kadar aldın?" diye sorar.
// Google 308 + Range: bytes=0-N döner; N+1'den devam edilir.
async function nereyeKadar(konum, boyut) {
  const u = new URL(konum)
  const c = await istekHam({
    host: u.hostname,
    method: 'PUT',
    path: u.pathname + u.search,
    headers: { 'Content-Length': 0, 'Content-Range': `bytes */${boyut}` },
  })
  if (c.status === 200 || c.status === 201) return { bitti: true, json: c.json }
  if (c.status === 308) {
    const r = c.headers.range // "bytes=0-12345"
    const son = r ? Number(String(r).split('-')[1]) : -1
    return { bitti: false, gonderilen: Number.isFinite(son) ? son + 1 : 0 }
  }
  throw client.hataCevir(c.json, c.status)
}

function dosyaParcasiOku(fd, konum, uzunluk) {
  return new Promise((resolve, reject) => {
    const tampon = Buffer.alloc(uzunluk)
    fs.read(fd, tampon, 0, uzunluk, konum, (e, okunan) => {
      if (e) return reject(e)
      resolve(okunan === uzunluk ? tampon : tampon.subarray(0, okunan))
    })
  })
}

/**
 * Videoyu YouTube'a yükler.
 *
 * @param {object} p
 * @param {string} p.dosya      Video dosyasının tam yolu
 * @param {string} p.baslik     Video başlığı (YouTube sınırı 100 karakter)
 * @param {string} p.aciklama   Açıklama (sınır 5000 karakter)
 * @param {string[]} [p.etiketler]  Etiketler (toplam 500 karakter sınırı)
 * @param {string} [p.gizlilik] 'private' | 'unlisted' | 'public' — VARSAYILAN 'private'.
 *                              Bilerek private: yanlış açıklamayla halka açılan video,
 *                              düzeltilene kadar görünür kalır.
 * @param {string} [p.kategori] YouTube kategori kimliği (varsayılan '22' People & Blogs;
 *                              yemek/tanıtım için '26' Howto & Style uygundur)
 * @param {string} [p.id]       İlerleme takibi için anahtar (verilmezse dosya adı)
 * @param {string|Date} [p.yayinZamani]  Zamanlanmış yayın anı (RFC3339 / Date).
 *
 * YAYIN ZAMANI TUZAĞI: publishAt YALNIZCA privacyStatus 'private' iken çalışır.
 * 'public' ile birlikte gönderilirse YouTube HATA VERMEZ — publishAt'i sessizce
 * yok sayar ve video anında yayına girer. Bu yüzden burada gizlilik zorla
 * 'private' yapılır ve çağıran uyarılır; ayrıca yükleme sonrası dönen
 * gercek_yayin alanı İSTENEN ile karşılaştırılmalıdır (bkz. sonuç nesnesi).
 * Geçmiş bir an gönderilmesi de tutarsız davranır; burada peşinen reddedilir.
 */
async function videoYukle({
  dosya, baslik, aciklama, etiketler, gizlilik = 'private',
  kategori = '22', dil = 'tr', id, yayinZamani,
}) {
  if (!dosya || !fs.existsSync(dosya)) throw new Error(`Video dosyası bulunamadı: ${dosya}`)
  if (!baslik || !baslik.trim()) throw new Error('Video başlığı boş olamaz.')
  if (baslik.length > 100) throw new Error(`Başlık 100 karakteri aşıyor (${baslik.length}).`)
  if (aciklama && aciklama.length > 5000) throw new Error(`Açıklama 5000 karakteri aşıyor (${aciklama.length}).`)
  if (!['private', 'unlisted', 'public'].includes(gizlilik)) {
    throw new Error(`Geçersiz gizlilik: ${gizlilik}`)
  }

  // Zamanlanmış yayın: doğrulama ve zorunlu 'private' düzeltmesi.
  let yayinISO = null
  if (yayinZamani) {
    const an = yayinZamani instanceof Date ? yayinZamani : new Date(yayinZamani)
    if (Number.isNaN(an.getTime())) throw new Error(`Geçersiz yayın zamanı: ${yayinZamani}`)
    if (an.getTime() <= Date.now()) {
      // Sessizce "şimdi yayınla"ya düşmek, kaçırılan slotu fark edilmez kılar.
      throw new Error(
        `Yayın zamanı geçmişte: ${an.toISOString()}. Geçmiş slot için yayinZamani ` +
        'verilmemeli, gizlilik doğrudan "public" seçilmelidir.',
      )
    }
    yayinISO = an.toISOString()
    // publishAt yalnızca private ile çalışır — public gönderilirse sessizce yok sayılır.
    gizlilik = 'private'
  }

  // Yükleme BAŞLAMADAN kota kontrolü: yarım yüklenmiş video bırakmayalım.
  kota.kotaKontrol('videos.insert')

  const mime = mimeBul(dosya)
  const boyut = fs.statSync(dosya).size
  if (!boyut) throw new Error('Video dosyası boş (0 bayt).')

  const anahtar = id || path.basename(dosya)
  _ilerleme.set(anahtar, { dosya, toplam: boyut, gonderilen: 0, durum: 'basliyor' })

  const ustveri = {
    snippet: {
      title: baslik,
      description: aciklama || '',
      tags: Array.isArray(etiketler) ? etiketler : undefined,
      categoryId: String(kategori),
      defaultLanguage: dil,
      defaultAudioLanguage: dil,
    },
    status: {
      privacyStatus: gizlilik,
      // Google zorunlu kılıyor: belirtilmezse yükleme reddedilebilir.
      selfDeclaredMadeForKids: false,
      ...(yayinISO ? { publishAt: yayinISO } : {}),
    },
  }

  const token = await client.accessTokenAl()
  const konum = await oturumAc(token, ustveri, boyut, mime)
  const u = new URL(konum)

  const fd = fs.openSync(dosya, 'r')
  try {
    let gonderilen = 0
    let ardArdaHata = 0

    while (gonderilen < boyut) {
      const uzunluk = Math.min(PARCA_BOYUTU, boyut - gonderilen)
      const parca = await dosyaParcasiOku(fd, gonderilen, uzunluk)
      const son = gonderilen + parca.length - 1

      let c
      try {
        c = await istekHam({
          host: u.hostname,
          method: 'PUT',
          path: u.pathname + u.search,
          headers: {
            'Content-Length': parca.length,
            'Content-Range': `bytes ${gonderilen}-${son}/${boyut}`,
          },
          body: parca,
        })
      } catch (e) {
        // Ağ koptu: Google'a nereye kadar aldığını sor, oradan devam et.
        // Baştan başlamak 200 MB'lık videoda kabul edilemez.
        if (++ardArdaHata > 5) throw e
        const s = await nereyeKadar(konum, boyut)
        if (s.bitti) { c = { status: 200, json: s.json } } else { gonderilen = s.gonderilen; continue }
      }

      if (c.status === 308) {
        // Devam: Google'ın bildirdiği konumu esas al (bizimkinden sapabilir).
        const r = c.headers && c.headers.range
        const alinan = r ? Number(String(r).split('-')[1]) + 1 : gonderilen + parca.length
        gonderilen = Number.isFinite(alinan) ? alinan : gonderilen + parca.length
        ardArdaHata = 0
        _ilerleme.set(anahtar, { dosya, toplam: boyut, gonderilen, durum: 'yukleniyor' })
        continue
      }

      if (c.status === 200 || c.status === 201) {
        kota.harca('videos.insert')
        const v = c.json || {}
        const sonuc = {
          video_id: v.id,
          url: v.id ? `https://www.youtube.com/watch?v=${v.id}` : null,
          baslik: v.snippet && v.snippet.title,
          // İSTENEN gizlilik ile GERÇEKLEŞEN gizlilik farklı olabilir:
          // doğrulanmamış API projelerinde Google videoyu zorla private tutar.
          istenen_gizlilik: gizlilik,
          gercek_gizlilik: v.status && v.status.privacyStatus,
          yuklenme_durumu: v.status && v.status.uploadStatus,
          // Aynı gerekçe yayın zamanı için de geçerli — hatta daha güçlü:
          // publishAt sessizce yok sayılabilen bir alandır, "hata gelmedi"
          // onun kurulduğunun kanıtı DEĞİLDİR. İkisi de kaydedilir ki
          // çağıran karşılaştırabilsin.
          istenen_yayin: yayinISO,
          gercek_yayin: (v.status && v.status.publishAt) || null,
        }
        _ilerleme.set(anahtar, { dosya, toplam: boyut, gonderilen: boyut, durum: 'bitti', video_id: sonuc.video_id })
        return sonuc
      }

      // 5xx geçici olabilir; sor-ve-devam et.
      if (c.status >= 500 && ++ardArdaHata <= 5) {
        const s = await nereyeKadar(konum, boyut)
        if (s.bitti) { kota.harca('videos.insert'); break }
        gonderilen = s.gonderilen
        continue
      }
      throw client.hataCevir(c.json, c.status)
    }
    throw new Error('Yükleme beklenmedik biçimde sonlandı.')
  } catch (e) {
    _ilerleme.set(anahtar, { dosya, toplam: boyut, gonderilen: 0, durum: 'hata', hata: e.message })
    throw e
  } finally {
    fs.closeSync(fd)
  }
}

/**
 * Var olan bir videonun başlık/açıklama/etiketlerini günceller. 50 BİRİM —
 * yüklemenin 1/32'si. Videolar elle yüklenip metinleri buradan yazılırsa
 * kota sorunu tamamen ortadan kalkar.
 *
 * DİKKAT: videos.update, gönderilmeyen snippet alanlarını SIFIRLAR. Bu yüzden
 * önce mevcut snippet okunur, üstüne yazılır, tamamı geri gönderilir.
 */
async function videoGuncelle({ videoId, baslik, aciklama, etiketler, kategori }) {
  if (!videoId) throw new Error('videoId zorunlu.')
  kota.kotaKontrol('videos.list')

  const mevcut = await client.cagir('GET', '/youtube/v3/videos', {
    params: { part: 'snippet', id: videoId },
  })
  kota.harca('videos.list')
  const v = mevcut && mevcut.items && mevcut.items[0]
  if (!v) throw new Error(`Video bulunamadı: ${videoId}`)

  kota.kotaKontrol('videos.update')
  const s = v.snippet || {}
  const yeniSnippet = {
    // Gönderilmeyen alan silineceği için MEVCUT değerler taban alınır.
    title: baslik != null ? baslik : s.title,
    description: aciklama != null ? aciklama : s.description,
    tags: etiketler != null ? etiketler : s.tags,
    categoryId: kategori != null ? String(kategori) : s.categoryId,
    defaultLanguage: s.defaultLanguage,
    defaultAudioLanguage: s.defaultAudioLanguage,
  }
  if (yeniSnippet.title && yeniSnippet.title.length > 100) {
    throw new Error(`Başlık 100 karakteri aşıyor (${yeniSnippet.title.length}).`)
  }
  if (yeniSnippet.description && yeniSnippet.description.length > 5000) {
    throw new Error(`Açıklama 5000 karakteri aşıyor (${yeniSnippet.description.length}).`)
  }

  const sonuc = await client.cagir('PUT', '/youtube/v3/videos', {
    params: { part: 'snippet' },
    body: { id: videoId, snippet: yeniSnippet },
  })
  kota.harca('videos.update')
  return {
    video_id: sonuc.id,
    baslik: sonuc.snippet && sonuc.snippet.title,
    url: `https://www.youtube.com/watch?v=${sonuc.id}`,
  }
}

module.exports = {
  videoYukle,
  videoGuncelle,
  ilerlemeDurum,
  mimeBul,
  PARCA_BOYUTU,
  MIME,
}
