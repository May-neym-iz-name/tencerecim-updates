// YouTube yorumları — çekme ve yanıtlama.
//
// Yorumlar AYRI bir tabloya değil, Meta yorumlarıyla AYNI `sosyal_mesajlar`
// tablosuna yazılır (platform='youtube', tur='yorum'). Tablo baştan
// platform-agnostik tasarlandığı için cevapsız/okunmamış süzgeçleri, personel
// ataması, iç not ve "cevaplandı" süpürücüsü hazır geliyor; ikinci kez yazılmıyor.
//
// KOTA: commentThreads.list = 1 birim, comments.insert = 50 birim, videos.list = 1.
// videos.insert 1600 birim olduğu için yorum tarafı pratikte bedava; kısıt yüklemede.
const client = require('./client')
const kota = require('./kota')
const {
  _upsertMesaj, _gonderiKaydet, _yanitlananlariKapat, _gorunmeyenleriIsaretle,
} = require('../db/sosyal-mesajlar')
const { getDb } = require('../db/database')

const SAYFA_BOYUT = 100      // commentThreads.list üst sınırı
const VIDEO_TOPLU = 50       // videos.list tek çağrıda en fazla 50 kimlik

/**
 * Bir commentThread'i sosyal_mesajlar satırlarına çevirir. SAF: ağ ve DB yok.
 *
 * `yon` ayrımı kanal kimliğine göre yapılır: kendi kanalımızdan gelen yorum
 * 'giden'dir. Bunu yanlış yapmak, kendi yanıtımızı cevap bekleyen bir soru
 * gibi listelemek demek olurdu.
 */
function threadCevir(thread, kanalId) {
  const satirlar = []
  const s = thread && thread.snippet
  if (!s) return satirlar
  const videoId = s.videoId || null

  const ekle = (c, ustId) => {
    const cs = c && c.snippet
    if (!cs) return
    const yazarId = (cs.authorChannelId && cs.authorChannelId.value) || null
    satirlar.push({
      platform: 'youtube',
      tur: 'yorum',
      harici_id: c.id,
      konu_id: videoId,
      ust_id: ustId,
      gonderen_id: yazarId,
      gonderen_ad: cs.authorDisplayName || null,
      // textOriginal HAM metindir; textDisplay HTML kaçışı ve <a> etiketi içerir.
      // Listede ham metin gösterilir, yoksa kullanıcı &amp; ve <br> görür.
      metin: cs.textOriginal || cs.textDisplay || '',
      yon: yazarId && kanalId && yazarId === kanalId ? 'giden' : 'gelen',
      mesaj_tarihi: cs.publishedAt || null,
    })
  }

  const ust = s.topLevelComment
  if (ust) ekle(ust, null)
  // Yanıtlar üst yorumun kimliğine bağlanır — YouTube'da yorum ağacı TEK seviyedir.
  const yanitlar = (thread.replies && thread.replies.comments) || []
  for (const y of yanitlar) ekle(y, ust ? ust.id : null)
  return satirlar
}

/** Satırlardan tekil video kimliklerini çıkarır. SAF. */
function videoKimlikleri(satirlar) {
  return [...new Set(satirlar.map(s => s.konu_id).filter(Boolean))]
}

/** Hangi videoların başlığı yerelde YOK — yalnız onlar için videos.list yapılır. */
function eksikVideolar(idler) {
  if (!idler.length) return []
  const db = getDb()
  const soru = idler.map(() => '?').join(',')
  const bilinen = new Set(
    db.prepare(`SELECT konu_id FROM sosyal_gonderiler WHERE konu_id IN (${soru}) AND baslik IS NOT NULL`)
      .all(...idler).map(r => r.konu_id),
  )
  return idler.filter(id => !bilinen.has(id))
}

/** Video başlığı/kapağı/linkini sosyal_gonderiler'e yazar (konu_id başına tek kopya). */
async function videoBilgiCek(idler, gunluk = () => {}) {
  for (let i = 0; i < idler.length; i += VIDEO_TOPLU) {
    const dilim = idler.slice(i, i + VIDEO_TOPLU)
    kota.kotaKontrol('videos.list')
    const r = await client.cagir('GET', '/youtube/v3/videos', {
      params: { part: 'snippet', id: dilim.join(',') },
    })
    kota.harca('videos.list')
    for (const it of (r.items || [])) {
      const sn = it.snippet || {}
      const k = sn.thumbnails || {}
      _gonderiKaydet({
        konu_id: it.id,
        platform: 'youtube',
        konu_baslik: sn.title || null,
        konu_gorsel: (k.medium || k.default || {}).url || null,
        konu_link: `https://www.youtube.com/watch?v=${it.id}`,
      })
    }
    gunluk(`video bilgisi: ${dilim.length} kimlik`)
  }
}

/**
 * Kanalın TÜM yorumlarını çeker.
 *
 * `allThreadsRelatedToChannelId` kullanılır: video başına ayrı çağrı yapmak
 * yerine kanalın tamamı tek uçtan sayfalanır. Çağrı sayısı video sayısıyla
 * değil, yorum sayısıyla büyür.
 */
async function yorumlariCek({ sayfaSiniri = 10, gunluk = () => {} } = {}) {
  const durum = client.durum()
  if (!durum.bagli) throw new Error('YouTube bagli degil.')
  const kanalId = durum.kanal_id

  let sayfa = null
  let toplam = 0
  let yeni = 0
  // Tarama TÜKENDİ mi? Sayfa sınırına takılıp yarıda kaldıysak "listede yok"
  // demek "silinmiş" demek DEĞİLDİR — silme süpürücüsü ancak tam taramada çalışır.
  let tamTarama = false
  const tumSatirlar = []
  for (let i = 0; i < sayfaSiniri; i++) {
    kota.kotaKontrol('commentThreads.list')
    const r = await client.cagir('GET', '/youtube/v3/commentThreads', {
      params: {
        part: 'snippet,replies',
        allThreadsRelatedToChannelId: kanalId,
        maxResults: SAYFA_BOYUT,
        order: 'time',
        textFormat: 'plainText',
        ...(sayfa ? { pageToken: sayfa } : {}),
      },
    })
    kota.harca('commentThreads.list')
    const items = r.items || []
    for (const t of items) tumSatirlar.push(...threadCevir(t, kanalId))
    toplam += items.length
    gunluk(`sayfa ${i + 1}: ${items.length} konu`)
    sayfa = r.nextPageToken
    if (!sayfa) { tamTarama = true; break }
  }

  // Video meta verisi ÖNCE yazılır: liste ekranı başlığa göre gruplandığı için
  // başlıksız gelen yorum "(video)" diye görünür.
  await videoBilgiCek(eksikVideolar(videoKimlikleri(tumSatirlar)), gunluk)

  for (const satir of tumSatirlar) {
    // _upsertMesaj idempotenttir: harici_id çakışırsa metin/durum korunur,
    // yani ikinci çekim okunmuş yorumu tekrar 'yeni' yapmaz.
    const id = _upsertMesaj(satir)
    if (id) yeni++
  }
  // YouTube'da SİLİNEN (veya moderasyona alınan) yorumlar artık listede dönmez.
  // Yerel kopyayı işaretle ki gelen kutusunda cevap bekliyormuş gibi durmasın.
  const silme = _gorunmeyenleriIsaretle(
    'youtube', new Set(tumSatirlar.map(s => s.harici_id)), tamTarama,
  )
  _yanitlananlariKapat()
  return {
    konu: toplam,
    satir: tumSatirlar.length,
    yazilan: yeni,
    tamTarama,
    silinen: silme.isaretlenen,
    geriGelen: silme.geriGelen,
    kota: kota.durum(),
  }
}

/**
 * Bir yoruma yanıt yazar.
 *
 * 🔴 YouTube yorum ağacı TEK SEVİYEDİR. Bir YANITA yanıt verilirken parentId
 * yine ÜST yorumun kimliği olmalıdır; yanıtın kendi kimliği gönderilirse API
 * hata vermeden yanıtı beklenenden başka yere iliştirir.
 */
async function yorumYanitla({ harici_id, metin, kullanici }) {
  const govde = String(metin || '').trim()
  if (!govde) throw new Error('Yanit metni bos olamaz.')
  const db = getDb()
  const satir = db.prepare(
    "SELECT id, harici_id, ust_id, konu_id FROM sosyal_mesajlar WHERE harici_id = ? AND platform = 'youtube'",
  ).get(harici_id)
  if (!satir) throw new Error('Yorum yerelde bulunamadi, once yorumlari cekin.')

  const ustId = satir.ust_id || satir.harici_id
  kota.kotaKontrol('comments.insert')
  const r = await client.cagir('POST', '/youtube/v3/comments', {
    params: { part: 'snippet' },
    body: { snippet: { parentId: ustId, textOriginal: govde } },
  })
  kota.harca('comments.insert')

  const durum = client.durum()
  _upsertMesaj({
    platform: 'youtube',
    tur: 'yorum',
    harici_id: r.id,
    konu_id: satir.konu_id,
    ust_id: ustId,
    gonderen_id: durum.kanal_id || null,
    gonderen_ad: durum.kanal_adi || 'Tencerecim Store',
    metin: govde,
    yon: 'giden',
    mesaj_tarihi: (r.snippet && r.snippet.publishedAt) || new Date().toISOString(),
  })
  // Yanıtlanan yorumu kapat ve KİMİN yanıtladığını yaz — Meta tarafında
  // (electron/meta/index.js) aynı iş IPC katmanında yapılıyor; sorumluluk
  // arayüzde değil burada dursun ki iki platform aynı davransın.
  db.prepare(
    "UPDATE sosyal_mesajlar SET durum = 'cevaplandi', cevaplayan_kullanici = ? WHERE id = ?",
  ).run(kullanici || null, satir.id)
  // Süpürücü ust_id eşleşmesine bakar; uygulama DIŞINDAN verilen yanıtları da kapatır.
  _yanitlananlariKapat()
  return { ok: true, id: r.id, ust_id: ustId, kota: kota.durum() }
}

module.exports = { threadCevir, videoKimlikleri, eksikVideolar, yorumlariCek, yorumYanitla }
