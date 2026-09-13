// Trendyol Marketplace API istemcisi.
//
// meta/client.js ve ikas/client.js deseni: Electron 22 = Node 16 → global fetch YOK,
// yerleşik https kullanılır.
//
// Kimlik: Basic Auth (api_key:api_secret) + ZORUNLU User-Agent `{sellerId} - SelfIntegration`.
// User-Agent gönderilmezse Trendyol isteği reddeder — bu bir öneri değil, şart.
// Anahtarlar meta/ikas gibi diskte DPAPI ile şifreli durur (bkz. db/gizli-alan.js).
//
// Sürüm notu (13.09.2026): kullandığımız üç uç da 15 Eylül V2 geçişinden ETKİLENMİYOR —
// stok yazma V1-V2 ortak, okuma ve batch sorgusu zaten V2. Ürün YARATMA V2'ye geçiyor
// ama bu modül ürün yaratmıyor.
const https = require('https')
const { _ayarlariGetir } = require('../db/trendyol-ayarlar')

const HOST = 'apigw.trendyol.com'
const TABAN = '/integration'

// Trendyol sınırı: 50 istek / 10 sn. Tavana dayanmamak için 10 sn'de 40 ile yetiniyoruz —
// aynı anda başka bir modül de istek atıyor olabilir ve 429 yemek toplu işi yarıda bırakır.
const PENCERE_MS = 10 * 1000
const PENCERE_MAKS = 40
const _istekZamanlari = []

const ISTEK_ZAMAN_ASIMI_MS = 30 * 1000

function bekle(ms) { return new Promise(r => setTimeout(r, ms)) }

// Hız sınırı kapısı: pencere dolduysa en eski isteğin düşmesini bekler.
async function hizKapisi() {
  for (;;) {
    const simdi = Date.now()
    while (_istekZamanlari.length && simdi - _istekZamanlari[0] > PENCERE_MS) _istekZamanlari.shift()
    if (_istekZamanlari.length < PENCERE_MAKS) { _istekZamanlari.push(simdi); return }
    await bekle(PENCERE_MS - (simdi - _istekZamanlari[0]) + 50)
  }
}

function kimlik() {
  const a = _ayarlariGetir()
  if (!a.seller_id || !a.api_key || !a.api_secret) {
    throw new Error('Trendyol kimlik bilgileri eksik. Ayarlar > Trendyol bölümünden Satıcı ID, API Key ve API Secret girin.')
  }
  return a
}

function istekTek(method, yol, { govde, sorgu } = {}) {
  const a = kimlik()
  return new Promise((resolve, reject) => {
    const qs = sorgu ? '?' + new URLSearchParams(sorgu).toString() : ''
    const yuk = govde ? Buffer.from(JSON.stringify(govde), 'utf8') : null
    const options = {
      hostname: HOST,
      method,
      path: `${TABAN}${yol}${qs}`,
      timeout: ISTEK_ZAMAN_ASIMI_MS,
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${a.api_key}:${a.api_secret}`).toString('base64'),
        'User-Agent': `${a.seller_id} - SelfIntegration`,
        Accept: 'application/json',
      },
    }
    if (yuk) {
      options.headers['Content-Type'] = 'application/json'
      options.headers['Content-Length'] = yuk.length
    }
    const req = https.request(options, (res) => {
      let govdeMetin = ''
      res.setEncoding('utf8')
      res.on('data', (c) => { govdeMetin += c })
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(govdeMetin) } catch { /* boş/HTML yanıt olabilir */ }
        resolve({ status: res.statusCode, json, ham: govdeMetin })
      })
    })
    req.on('timeout', () => {
      req.destroy(Object.assign(new Error('Trendyol yanıt vermedi (zaman aşımı).'), { code: 'ETIMEDOUT' }))
    })
    req.on('error', reject)
    if (yuk) req.write(yuk)
    req.end()
  })
}

const AG_HATALARI = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE'])

// Trendyol hatasını okunur mesaja çevirir. Hata gövdesi bazen {errors:[{message}]},
// bazen {message}, bazen düz metin geliyor — üçünü de karşıla, yoksa teşhis imkânsızlaşır.
function hataCevir(status, json, ham) {
  const parcalar = []
  if (json && Array.isArray(json.errors)) parcalar.push(...json.errors.map(e => e && (e.message || e.errorMessage || JSON.stringify(e))))
  if (json && json.message) parcalar.push(json.message)
  if (!parcalar.length && ham) parcalar.push(String(ham).slice(0, 200))
  const e = new Error(`Trendyol API (HTTP ${status}): ${parcalar.filter(Boolean).join(' | ') || 'ayrıntı yok'}`)
  e.status = status
  // 15 dakika kuralı: aynı istek tekrarlanırsa reddedilir. Bu bir ARIZA DEĞİL,
  // Trendyol'un döngü korumasıdır — arayüz bunu hata gibi göstermemeli.
  if (/15 dak|15 minute|duplicate/i.test(parcalar.join(' '))) e.tekrarKorumasi = true
  return e
}

async function istek(method, yol, opts = {}, { deneme = 3 } = {}) {
  let sonHata
  for (let i = 0; i < deneme; i++) {
    await hizKapisi()
    let cevap
    try {
      cevap = await istekTek(method, yol, opts)
    } catch (e) {
      sonHata = e
      if (!AG_HATALARI.has(e.code) || i === deneme - 1) throw e
      await bekle(500 * (i + 1))
      continue
    }
    // 429/5xx geçicidir → bekleyip tekrar dene. 4xx (429 hariç) kalıcıdır → hemen fırlat.
    if (cevap.status === 429 || cevap.status >= 500) {
      sonHata = hataCevir(cevap.status, cevap.json, cevap.ham)
      if (i === deneme - 1) throw sonHata
      await bekle(2000 * (i + 1))
      continue
    }
    if (cevap.status < 200 || cevap.status >= 300) throw hataCevir(cevap.status, cevap.json, cevap.ham)
    return cevap.json
  }
  throw sonHata
}

const get = (yol, sorgu, opts) => istek('GET', yol, { sorgu }, opts)
const post = (yol, govde, opts) => istek('POST', yol, { govde }, opts)

function sellerId() { return _ayarlariGetir().seller_id || null }
function kimlikVar() {
  const a = _ayarlariGetir()
  return !!(a.seller_id && a.api_key && a.api_secret)
}

module.exports = { get, post, sellerId, kimlikVar, _hataCevir: hataCevir }
