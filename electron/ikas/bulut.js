// ikas olay kuyruğu istemcisi — uygulama ↔ Cloudflare köprüsü.
//
// NE İŞE YARAR: ikas webhook'u Worker'a düşer, Worker "şu sipariş değişti" bilgisini
// D1'e yazar. Bu modül o kuyruğu okur. Siparişin KENDİSİ buradan gelmez — yetkili
// kaydı mevcut _pullSiparisler() ikas'tan çeker (webhook imzası belgelenmemiş,
// docs/ikas-api-reference.md:154). Webhook yalnızca bir TETİKLEYİCİDİR.
//
// AYRI AYAR YOK: ikas olayları UPS kargo köprüsüyle aynı Worker'da, o yüzden aynı
// bulut_url/bulut_anahtar kullanılır (ups/bulut.js _ayar()).
//
// NOT: Electron 22 = Node 16 → global fetch YOK. Yerleşik https modülü kullanılır.
// (Worker tarafı tam tersi: orada node:https yok, fetch var.)
const https = require('https')
const upsBulut = require('../ups/bulut')

const ZAMAN_ASIMI_MS = 15000

/**
 * Yeni imleç. Saf fonksiyon — ağdan ayrı tutuldu ki test edilebilsin.
 *
 * İki koruma var, ikisi de veri kaybı/sonsuz döngüye karşı:
 *   - boş turda imleç KORUNUR (ileri atlarsak o an yazılmakta olan olayı kaçırırız)
 *   - geriye GİTMEZ (geri alırsak aynı olayları sonsuza dek yeniden işleriz)
 *
 * @param {Array<{alinma_zaman: string}>|null|undefined} kayitlar
 * @param {string} mevcut
 * @returns {string}
 */
function yeniImlec(kayitlar, mevcut) {
  if (!kayitlar || !kayitlar.length) return mevcut
  const son = kayitlar[kayitlar.length - 1].alinma_zaman
  return son > mevcut ? son : mevcut
}

// Basit HTTPS GET. { status, json } döner.
function istek(url, anahtar) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: { Authorization: 'Bearer ' + anahtar },
      timeout: ZAMAN_ASIMI_MS,
    }, (res) => {
      let metin = ''
      res.setEncoding('utf8')
      res.on('data', (c) => { metin += c })
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(metin) } catch {}
        resolve({ status: res.statusCode, json })
      })
    })
    // timeout tek başına isteği KESMEZ, yalnız olayı tetikler — destroy şart
    // (ups/bulut.js:45 ile aynı gerekçe).
    req.on('timeout', () => req.destroy(new Error(`zaman aşımı (${ZAMAN_ASIMI_MS / 1000}s)`)))
    req.on('error', reject)
    req.end()
  })
}

/**
 * Son okumadan beri gelen ikas olayları.
 * @param {string} since ISO damga
 * @returns {Promise<{kayitlar: Array, imlec: string}>}
 */
async function olaylariCek(since) {
  const { url, anahtar, acik } = upsBulut._ayar()
  if (!acik) throw new Error('Bulut köprüsü kurulu değil (bulut_url / bulut_anahtar boş)')
  const q = encodeURIComponent(since || '1970-01-01T00:00:00.000Z')
  const { status, json } = await istek(`${url}/ikas/olaylar?since=${q}&limit=200`, anahtar)
  if (status !== 200) throw new Error(`Worker ${status}`)
  return { kayitlar: json?.kayitlar || [], imlec: json?.imlec || since }
}

module.exports = { _olaylariCek: olaylariCek, _yeniImlec: yeniImlec }
