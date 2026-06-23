// ikas Admin API istemcisi: OAuth client-credentials token alır (cache'ler) ve
// GraphQL sorguları çalıştırır. Kimlik bilgileri ikas_ayarlar tablosundan okunur.
const { _ayarlariGetir } = require('../db/ikas-ayarlar')

const GRAPHQL_URL = 'https://api.myikas.com/api/v1/admin/graphql'
// Token'ı süresi dolmadan 60 sn önce yenile.
const YENILEME_MARJI_MS = 60 * 1000

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
  })
  const res = await fetch(`https://${a.store_name}.myikas.com/api/admin/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || !json?.access_token) {
    throw new Error(`ikas token alınamadı (HTTP ${res.status}). Mağaza adı/anahtarları kontrol edin.`)
  }
  tokenCache = {
    store: a.store_name,
    token: json.access_token,
    gecerlilik: simdi + (Number(json.expires_in || 0) * 1000) - YENILEME_MARJI_MS,
  }
  return tokenCache.token
}

// GraphQL sorgusu çalıştırır; ikas hata döndürürse Error fırlatır.
async function graphql(query, variables) {
  const token = await tokenAl()
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`ikas API hatası (HTTP ${res.status})`)
  if (json?.errors?.length) throw new Error('ikas: ' + json.errors.map(e => e.message).join('; '))
  return json?.data
}

// Token cache'ini geçersiz kılar (ayarlar değişince çağrılır).
function tokenSifirla() { tokenCache = { store: null, token: null, gecerlilik: 0 } }

module.exports = { graphql, tokenAl, tokenSifirla }
