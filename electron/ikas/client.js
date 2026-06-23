// ikas Admin API istemcisi: OAuth client-credentials token alır (cache'ler) ve
// GraphQL sorguları çalıştırır. Kimlik bilgileri ikas_ayarlar tablosundan okunur.
// NOT: Electron 22 = Node 16 → global fetch YOK. Yerleşik https modülü kullanılır.
const https = require('https')
const { _ayarlariGetir } = require('../db/ikas-ayarlar')

const GRAPHQL_URL = 'https://api.myikas.com/api/v1/admin/graphql'
// Token'ı süresi dolmadan 60 sn önce yenile.
const YENILEME_MARJI_MS = 60 * 1000

// Basit HTTPS POST. { status, json } döner. fetch yerine (Node 16 uyumlu).
function postJson(url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const data = Buffer.from(body, 'utf8')
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: { ...headers, 'Content-Length': data.length },
    }, (res) => {
      let chunks = ''
      res.setEncoding('utf8')
      res.on('data', (c) => { chunks += c })
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(chunks) } catch {}
        resolve({ status: res.statusCode, json })
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

// store_name'e göre token cache'i (bellek içi).
let tokenCache = { store: null, token: null, gecerlilik: 0 }

function ayarlar() {
  const a = _ayarlariGetir()
  if (!a.store_name || !a.client_id || !a.client_secret) {
    throw new Error('ikas kimlik bilgileri eksik. Ayarlar > ikas Entegrasyonu bölümünden girin.')
  }
  return a
}

async function tokenAl() {
  const a = ayarlar()
  const simdi = Date.now()
  if (tokenCache.token && tokenCache.store === a.store_name && tokenCache.gecerlilik > simdi) {
    return tokenCache.token
  }
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: a.client_id,
    client_secret: a.client_secret,
  }).toString()
  const { status, json } = await postJson(
    `https://${a.store_name}.myikas.com/api/admin/oauth/token`,
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  )
  if (status < 200 || status >= 300 || !json?.access_token) {
    throw new Error(`ikas token alınamadı (HTTP ${status}). Mağaza adı/anahtarları kontrol edin.`)
  }
  tokenCache = {
    store: a.store_name,
    token: json.access_token,
    gecerlilik: simdi + (Number(json.expires_in || 0) * 1000) - YENILEME_MARJI_MS,
  }
  return tokenCache.token
}

// ikas'ın şifreli iş-kuralı hata kodlarını anlaşılır Türkçe mesaja çevirir.
const HATA_CEVIRI = {
  'error_messages.order.not_eligible_for_update':
    'Sipariş bu işlem için uygun durumda değil (ödeme tamamlanmamış, zaten kargolanmış veya iptal/iade edilmiş olabilir).',
  'error_messages.order_line.not_eligible_for_refund':
    'Bu sipariş kalemi iadeye uygun değil (ödenmemiş, henüz işlenmemiş veya zaten iade edilmiş olabilir).',
  'error_messages.order_line.not_eligible_for_cancel':
    'Bu sipariş kalemi iptale uygun değil (zaten kargolanmış, iptal veya iade edilmiş olabilir).',
}
function cevirHata(mesaj) {
  if (!mesaj) return mesaj
  const anahtar = String(mesaj).trim()
  return HATA_CEVIRI[anahtar] || mesaj
}

// GraphQL sorgusu çalıştırır; ikas hata döndürürse Error fırlatır.
async function graphql(query, variables) {
  const token = await tokenAl()
  const { status, json } = await postJson(
    GRAPHQL_URL,
    { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    JSON.stringify({ query, variables }),
  )
  // GraphQL doğrulama hataları HTTP 400 ile birlikte gövdede gelebilir; mutlaka oku.
  if (json?.errors?.length) {
    const mesaj = json.errors.map(e => cevirHata(e.message) || JSON.stringify(e)).join('; ')
    throw new Error('ikas: ' + mesaj)
  }
  if (status < 200 || status >= 300) {
    const ek = json ? ' — ' + JSON.stringify(json).slice(0, 300) : ''
    throw new Error(`ikas API hatası (HTTP ${status})${ek}`)
  }
  return json?.data
}

// Token cache'ini geçersiz kılar (ayarlar değişince çağrılır).
function tokenSifirla() { tokenCache = { store: null, token: null, gecerlilik: 0 } }

module.exports = { graphql, tokenAl, tokenSifirla }
