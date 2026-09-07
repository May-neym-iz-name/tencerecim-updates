// Instagram videosunu Meta CDN'den indirir.
//
// KALİTE KURALI: bayt AKIŞI olduğu gibi diske yazılır — ffmpeg YOK.
// Instagram videoyu zaten yeniden kodlamış durumda; araya bir kodlama daha
// koymak ikinci kayıplı tur olur ve kaliteyi DÜŞÜRÜR, korumaz.
//
// YENİDEN DENEME NEDEN VAR: 2026-09-07'de gerçek indirmede
// "SSLV3_ALERT_CLOSE_NOTIFY" alındı; aynı adres saniyeler sonra sorunsuz indi.
// Meta CDN geçici olarak bağlantıyı kesebiliyor. Tek denemede bırakmak,
// gecelik otomasyonun sessizce eksik çalışması demekti.
const fs = require('fs')
const https = require('https')
const path = require('path')

const VARSAYILAN_DENEME = 4
const VARSAYILAN_BEKLEME_MS = 2000

/**
 * Hata GEÇİCİ mi (tekrar denemeye değer mi) yoksa KALICI mı?
 *
 * Ayrım önemli: 404'te tekrar denemek boşuna bekleme, SSL kopmasında
 * denememek ise gereksiz veri kaybıdır. Bkz. [yeniden-deneme-kilidi] dersi —
 * geçici hatayı kalıcı muamelesi görmek işi kilitler.
 */
function geciciMiHata(hata) {
  // Mesaj + kod birlikte bakılır: TLS/soket hatalarının bir kısmı MESAJSIZ gelir,
  // yalnızca .code veya .name taşır. 2026-09-07'de bir indirme tam da böyle
  // düştü ve mesajsız olduğu için KALICI sanılıp tekrar denenmedi.
  // 'Error' jenerik addır, BİLGİ SAYILMAZ — sayılırsa "mesajsız hata" durumu
  // hiç oluşmaz ve aşağıdaki kanıtsızlık kuralı ölü koda dönerdi.
  const ad = (hata && hata.name) || ''
  const m = [
    (hata && hata.message) || '',
    (hata && hata.code) || '',
    ad === 'Error' ? '' : ad,
  ].filter(Boolean).join(' ') || String((hata && hata.message) || '')

  if (/SSL|TLS|ECONNRESET|ETIMEDOUT|ECONNREFUSED|EPIPE|EAI_AGAIN|ENOTFOUND|socket hang up|aborted|ERR_STREAM/i.test(m)) {
    return true
  }
  // HTTP 5xx ve 429 geçicidir; 4xx (403/404 — süresi dolmuş imzalı adres) kalıcıdır.
  const httpKod = /HTTP (\d{3})/.exec(m)
  if (httpKod) {
    const kod = Number(httpKod[1])
    return kod >= 500 || kod === 429
  }
  // Hiçbir bilgi taşımayan hata: kalıcılığına dair KANIT yok. Bir ağ işleminde
  // kanıtsız pes etmek, fazladan bir deneme yapmaktan daha pahalıdır.
  if (!m.trim()) return true
  return false
}

/** Hatayı okunur kılar — mesajsız hatalarda kod/ad gösterir. */
function hataMetni(hata) {
  if (!hata) return 'bilinmeyen hata'
  const m = String(hata.message || '').trim()
  if (m) return m
  return `mesajsiz hata (code=${hata.code || '?'} name=${hata.name || '?'})`
}

function bekle(ms) { return new Promise(r => setTimeout(r, ms)) }

/**
 * Bir işi geçici hatalarda yeniden dener. Ağdan bağımsız test edilebilsin diye
 * saf tutuldu: iş de, bekleme de dışarıdan verilir.
 */
async function yenidenDene(is, {
  deneme = VARSAYILAN_DENEME,
  beklemeMs = VARSAYILAN_BEKLEME_MS,
  gecici = geciciMiHata,
  bekleyici = bekle,
  gunluk = () => {},
} = {}) {
  let sonHata
  for (let i = 1; i <= deneme; i++) {
    try {
      return await is(i)
    } catch (e) {
      sonHata = e
      if (i === deneme || !gecici(e)) throw e
      const sure = beklemeMs * i // artan bekleme
      gunluk(`gecici hata (${i}/${deneme}): ${hataMetni(e)} → ${sure}ms sonra tekrar`)
      await bekleyici(sure)
    }
  }
  throw sonHata
}

/**
 * Tek indirme denemesi. Yönlendirmeleri izler.
 *
 * `get` DIŞARIDAN VERİLEBİLİR: yarım dosya korumasının gerçekten çalıştığını
 * kanıtlamanın başka yolu yok. Ağa çıkan bir testte kopmayı istediğin anda
 * üretemezsin; üretemediğin arıza da test edilmemiş demektir.
 */
function indirTek(url, hedef, { get = https.get, yonlendirmeKalan = 5 } = {}) {
  return new Promise((resolve, reject) => {
    const istek = get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        if (yonlendirmeKalan <= 0) return reject(new Error('cok fazla yonlendirme'))
        return indirTek(res.headers.location, hedef, { get, yonlendirmeKalan: yonlendirmeKalan - 1 })
          .then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`indirme HTTP ${res.statusCode}`))
      }
      // Sunucu akisi HATA VERMEDEN erken kapatabilir: o zaman 'finish' normal
      // tetiklenir, yarim dosya adi degistirilir ve gecerli video sanilir.
      // Tek deterministik olcut Content-Length'tir; varsa MUTLAKA karsilastirilir.
      const beklenen = Number(res.headers['content-length']) || 0
      // YARIM DOSYA ASLA YÜKLENMEZ: önce '.parca'ya yazılır, tamamlanınca
      // adı değiştirilir. Böylece kesilen indirme, geçerli bir video sanılmaz.
      const gecici = hedef + '.parca'
      const ws = fs.createWriteStream(gecici)
      res.pipe(ws)

      // Yarim parcayi TANITICI KAPANDIKTAN SONRA sil.
      // ws.destroy() essamanszdir; Windows acik tanicili dosyayi sildirmez, bu
      // yuzden hemen unlink denemek EPERM verir. Eski surumde bu hata catch{}
      // ile yutuluyordu ve her basarisiz indirme diskte bir .parca birakiyordu.
      const parcayiSil = (bitince) => {
        const sil = () => {
          try { fs.unlinkSync(gecici) } catch {}
          bitince()
        }
        if (ws.destroyed || ws.closed) return sil()
        ws.once('close', sil)
        ws.destroy()
      }

      res.on('error', e => parcayiSil(() => reject(e)))
      ws.on('error', e => parcayiSil(() => reject(e)))
      ws.on('finish', () => ws.close(() => {
        try {
          const boyut = fs.statSync(gecici).size
          if (!boyut) { fs.unlinkSync(gecici); return reject(new Error('indirilen dosya bos')) }
          if (beklenen && boyut !== beklenen) {
            fs.unlinkSync(gecici)
            // ECONNRESET metni bilerek: bu GECICI bir ariza, yeniden denenmeli.
            return reject(new Error(`eksik indirme (ECONNRESET): ${boyut}/${beklenen} bayt`))
          }
          fs.renameSync(gecici, hedef)
          resolve(boyut)
        } catch (e) { reject(e) }
      }))
    })
    istek.on('error', reject)
    istek.setTimeout(120000, () => istek.destroy(new Error('indirme zaman asimi (ETIMEDOUT)')))
  })
}

/** Videoyu indirir; geçici ağ hatalarında yeniden dener. Bayt sayısını döner. */
async function videoIndir(url, hedef, opts = {}) {
  fs.mkdirSync(path.dirname(hedef), { recursive: true })
  return yenidenDene(() => indirTek(url, hedef, { get: opts.get }), opts)
}

module.exports = { geciciMiHata, hataMetni, yenidenDene, indirTek, videoIndir, VARSAYILAN_DENEME }
