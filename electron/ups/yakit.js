// UPS yurt içi yakıt ek ücreti oranını otomatik çeker.
// Kaynak: https://apps.ups.com.tr/DomesticFuelSurcharge — PDF döndürür.
// PDF'in Flate stream'leri zlib ile açılır, "(...)" metin parçalarından
// "10 Nisan- 16 Nisan: %8.50" kalıpları ayıklanır; SON dönem güncel orandır.
// Kırılgan bir kaynak → hata durumunda null döner, UI elle girişe düşer.
const https = require('https')
const zlib = require('zlib')

const KAYNAK = 'https://apps.ups.com.tr/DomesticFuelSurcharge'
let cache = null // { oran, donem, zaman }
const CACHE_MS = 6 * 60 * 60 * 1000 // 6 saat

function indir(url) {
  return new Promise((resolve, reject) => {
    const istek = https.get(url, { timeout: 20000 }, (yanit) => {
      if (yanit.statusCode >= 300 && yanit.statusCode < 400 && yanit.headers.location) {
        return indir(yanit.headers.location).then(resolve, reject)
      }
      const parcalar = []
      yanit.on('data', (p) => parcalar.push(p))
      yanit.on('end', () => resolve(Buffer.concat(parcalar)))
    })
    istek.on('timeout', () => { istek.destroy(); reject(new Error('UPS yakıt sayfası zaman aşımı')) })
    istek.on('error', reject)
  })
}

function pdfMetniCoz(buf) {
  let metin = ''
  let i = 0
  while (true) {
    const s = buf.indexOf('stream', i)
    if (s < 0) break
    let basla = s + 6
    if (buf[basla] === 13) basla++
    if (buf[basla] === 10) basla++
    const e = buf.indexOf('endstream', basla)
    if (e < 0) break
    try { metin += zlib.inflateSync(buf.slice(basla, e)).toString('latin1') } catch { /* Flate değil */ }
    i = e + 9
  }
  return [...metin.matchAll(/\((?:[^()\\]|\\.)*\)/g)].map((m) => m[0].slice(1, -1)).join('')
}

async function yakitOraniCek() {
  if (cache && Date.now() - cache.zaman < CACHE_MS) return cache
  const buf = await indir(KAYNAK)
  const tam = pdfMetniCoz(buf)
  // "10 Nisan-  16 Nisan: %8.50" kalıpları — son eşleşme güncel dönemdir.
  const donemler = [...tam.matchAll(/(\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+)\s*-\s*(\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+)\s*:\s*%\s*(\d{1,2}[.,]\d{1,2})/g)]
  if (!donemler.length) throw new Error('Oran deseni bulunamadı (UPS sayfa yapısı değişmiş olabilir)')
  const son = donemler[donemler.length - 1]
  cache = {
    oran: parseFloat(son[3].replace(',', '.')),
    donem: `${son[1]} – ${son[2]}`,
    zaman: Date.now(),
  }
  return cache
}

module.exports = {
  'kargo:yakit-orani': async () => {
    try { return await yakitOraniCek() } catch (e) { return { oran: null, hata: e.message } }
  },
}
