// Meta Graph API istemcisi. Facebook Sayfa + Instagram yorum/DM için.
// ikas/client.js deseni: Electron 22 = Node 16 → global fetch YOK, yerleşik https kullanılır.
//
// Token akışı (kullanıcı yükünü minimize eder):
//   1) Kullanıcı Graph API Explorer'dan KISA ömürlü user token + app_id + app_secret girer.
//   2) kurulumTamamla(): kısa token → 60 günlük UZUN ömürlü user token'a çevrilir
//      (fb_exchange_token), ardından me/accounts ile SAYFA token'ı + sayfa_id alınır,
//      sayfadan bağlı instagram_business_account (ig_id) çekilir. Hepsi meta_ayarlar'a yazılır.
//   3) Sonraki tüm çağrılar kalıcı sayfa_token ile yapılır. Sayfa token'ları uzun ömürlüdür;
//      süre sonuna yaklaşınca kullanıcı yeni kısa token girip tekrar kurulum yapar (uyarılır).
const https = require('https')
const { _ayarlariGetir, _ayarKaydetTek } = require('../db/meta-ayarlar')

const API_SURUM = 'v21.0'
const HOST = 'graph.facebook.com'

// İstek zaman aşımı: Meta bazı sorguları (ör. dev modda IG conversations) yanıtsız
// asılı bırakıyor; sınır olmazsa 120 sn'lik polling turu süresiz bloke olur.
const ISTEK_ZAMAN_ASIMI_MS = 30 * 1000

// Tek HTTPS denemesi. { status, json } döner. method GET/POST. timeoutMs override edilebilir.
function istekTek(method, path, params, timeoutMs = ISTEK_ZAMAN_ASIMI_MS) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams(params || {}).toString()
    const yol = `/${API_SURUM}/${path.replace(/^\//, '')}`
    const options = { hostname: HOST, method, headers: {}, timeout: timeoutMs }
    let body = null
    if (method === 'GET') {
      options.path = qs ? `${yol}?${qs}` : yol
    } else {
      body = Buffer.from(qs, 'utf8')
      options.path = yol
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded'
      options.headers['Content-Length'] = body.length
    }
    const req = https.request(options, (res) => {
      let chunks = ''
      res.setEncoding('utf8')
      res.on('data', (c) => { chunks += c })
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(chunks) } catch {}
        resolve({ status: res.statusCode, json })
      })
    })
    req.on('timeout', () => {
      req.destroy(Object.assign(new Error('Meta API yanıt vermedi (zaman aşımı).'), { code: 'ETIMEDOUT' }))
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

// Geçici ağ/DNS hatalarında (dalgalı mağaza interneti) otomatik yeniden dener.
const AG_HATALARI = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE'])
function bekle(ms) { return new Promise(r => setTimeout(r, ms)) }

async function istek(method, path, params, { deneme = 3, timeout } = {}) {
  let sonHata
  for (let i = 0; i < deneme; i++) {
    try {
      return await istekTek(method, path, params, timeout)
    } catch (e) {
      sonHata = e
      // Yalnızca geçici ağ hatalarında tekrar dene; API/mantık hatasında değil.
      if (!AG_HATALARI.has(e.code) || i === deneme - 1) throw e
      await bekle(500 * (i + 1)) // 0.5s, 1s artan bekleme
    }
  }
  throw sonHata
}

// Graph API hatasını okunur mesaja çevirir.
function hataCevir(json, status) {
  const e = json && json.error
  if (e) return new Error(`Meta API (${status}): ${e.message}${e.code ? ' [kod ' + e.code + ']' : ''}`)
  return new Error(`Meta API beklenmedik yanıt (HTTP ${status})`)
}

// Sayfa token'ıyla GET. path örn: '{sayfa_id}/conversations'. auto access_token ekler.
// opts: { deneme, timeout } — ağır IG conversations çağrıları için override edilir.
async function get(path, params = {}, opts) {
  const a = _ayarlariGetir()
  if (!a.sayfa_token) throw new Error('Meta Sayfa token yok. Ayarlar > Sosyal Medya bölümünden kurulumu tamamlayın.')
  const { status, json } = await istek('GET', path, { ...params, access_token: a.sayfa_token }, opts)
  if (status < 200 || status >= 300 || !json || json.error) throw hataCevir(json, status)
  return json
}

// Sayfa token'ıyla POST (yorum/mesaj gönderme).
async function post(path, params = {}, opts) {
  const a = _ayarlariGetir()
  if (!a.sayfa_token) throw new Error('Meta Sayfa token yok. Ayarlar > Sosyal Medya bölümünden kurulumu tamamlayın.')
  const { status, json } = await istek('POST', path, { ...params, access_token: a.sayfa_token }, opts)
  if (status < 200 || status >= 300 || !json || json.error) throw hataCevir(json, status)
  return json
}

// Kurulum: kısa ömürlü user token → uzun ömürlü sayfa token + sayfa_id + ig_id.
// meta_ayarlar'a kalıcı yazar. Test/ilk kurulum ve token yenileme için çağrılır.
async function kurulumTamamla() {
  const a = _ayarlariGetir()
  if (!a.app_id || !a.app_secret || !a.kullanici_token) {
    throw new Error('Kurulum için App ID, App Secret ve (kısa ömürlü) Kullanıcı Token gerekli.')
  }
  // 1) Kısa user token → uzun ömürlü user token.
  const uzun = await istek('GET', 'oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: a.app_id,
    client_secret: a.app_secret,
    fb_exchange_token: a.kullanici_token,
  })
  if (uzun.status !== 200 || !uzun.json || !uzun.json.access_token) throw hataCevir(uzun.json, uzun.status)
  const uzunUserToken = uzun.json.access_token
  const gecerlilikMs = Date.now() + (uzun.json.expires_in ? uzun.json.expires_in * 1000 : 60 * 24 * 3600 * 1000)

  // 2) Sayfaları listele, sayfa token'ı + id al. Ayarda sayfa_id varsa onu, yoksa ilkini seç.
  const acc = await istek('GET', 'me/accounts', { access_token: uzunUserToken })
  if (acc.status !== 200 || !acc.json || !Array.isArray(acc.json.data)) throw hataCevir(acc.json, acc.status)
  if (acc.json.data.length === 0) throw new Error('Bu hesaba bağlı Facebook Sayfası bulunamadı.')
  const istenenId = a.sayfa_id
  const sayfa = (istenenId && acc.json.data.find(s => s.id === istenenId)) || acc.json.data[0]
  if (!sayfa.access_token) throw new Error('Sayfa token alınamadı (izinleri kontrol edin).')

  // 3) Sayfaya bağlı Instagram işletme hesabını çek (varsa).
  let igId = ''
  try {
    const ig = await istek('GET', sayfa.id, {
      fields: 'instagram_business_account',
      access_token: sayfa.access_token,
    })
    igId = ig.json?.instagram_business_account?.id || ''
  } catch { /* IG bağlı değilse sorun değil */ }

  _ayarKaydetTek('sayfa_token', sayfa.access_token)
  _ayarKaydetTek('sayfa_id', sayfa.id)
  _ayarKaydetTek('sayfa_ad', sayfa.name || '')
  _ayarKaydetTek('ig_id', igId)
  _ayarKaydetTek('token_gecerlilik', String(gecerlilikMs))
  // Kısa ömürlü user token artık gereksiz; saklamaya devam etme (güvenlik).
  _ayarKaydetTek('kullanici_token', '')
  cacheSifirla()
  return { sayfa_id: sayfa.id, sayfa_ad: sayfa.name, ig_id: igId, ig_bagli: !!igId }
}

// Bağlantı durumu (renderer'da göstermek için).
function durum() {
  const a = _ayarlariGetir()
  const gecerlilik = Number(a.token_gecerlilik || 0)
  return {
    kurulu: !!a.sayfa_token,
    sayfa_id: a.sayfa_id || '',
    sayfa_ad: a.sayfa_ad || '',
    ig_bagli: !!a.ig_id,
    token_gecerlilik: gecerlilik || null,
    token_gun_kaldi: gecerlilik ? Math.max(0, Math.round((gecerlilik - Date.now()) / 86400000)) : null,
  }
}

let cache = {}
function cacheSifirla() { cache = {} }

module.exports = { get, post, kurulumTamamla, durum, cacheSifirla, _sayfaId: () => _ayarlariGetir().sayfa_id, _igId: () => _ayarlariGetir().ig_id }
