// YouTube API istemcisi (Data API v3 + Analytics API).
// meta/client.js deseni: Electron 22 = Node 16 → global fetch YOK, yerleşik https kullanılır.
//
// Token akışı (Meta'dan FARKLI — Google'a özgü):
//   1) giris.js tarayıcıda OAuth açar, localhost'ta code yakalar, code'u
//      refresh_token + access_token ikilisine çevirir.
//   2) refresh_token SÜRESİZDİR ve yalnızca ilk onayda verilir. Kalıcı olarak saklanır.
//   3) access_token 1 SAATLİKTİR. Her çağrıdan önce süresi kontrol edilir; dolmaya
//      yakınsa refresh_token ile sessizce yenilenir. Kullanıcı bir daha giriş yapmaz.
//
// KOTA: Google günlük 10.000 birim verir ve gün bitince API tamamen susar.
// channels.list = 1 birim, videos.insert = 1600 birim, search.list = 100 birim.
// Bu yüzden "arama" ile değil, bilinen kimliklerle çalışılır.
const https = require('https')
const { _ayarlariGetir, _ayarKaydetTek } = require('../db/youtube-ayarlar')

const API_HOST = 'www.googleapis.com'
const OAUTH_HOST = 'oauth2.googleapis.com'

// İstek zaman aşımı: sınır olmazsa dalgalı mağaza internetinde çağrı süresiz asılı kalır.
const ISTEK_ZAMAN_ASIMI_MS = 30 * 1000

// access_token'ın ömrü bitmeden NE KADAR ÖNCE yenileneceği.
// Fazla dar: uzun süren bir işlem (video yükleme) ortasında token ölür, istek 401 alır.
// Fazla geniş: her çağrıda gereksiz yenileme, Google'a fazladan yük.
// 5 dakika, 1600 birimlik video yüklemesinin bile bitmesine yeter.
const YENILEME_PAYI_MS = 5 * 60 * 1000

// Bellekteki token — DB'den her seferinde okuyup şifre çözmemek için.
let _tokenCache = null // { access_token, bitis }

function cacheSifirla() { _tokenCache = null }

// Tek HTTPS denemesi. { status, json } döner.
function istekTek({ host, method, path, params, body, headers, timeoutMs = ISTEK_ZAMAN_ASIMI_MS }) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams(params || {}).toString()
    const options = {
      hostname: host,
      method,
      headers: { ...(headers || {}) },
      timeout: timeoutMs,
      path: qs ? `${path}?${qs}` : path,
    }
    let govde = null
    if (body != null) {
      govde = Buffer.from(typeof body === 'string' ? body : JSON.stringify(body), 'utf8')
      if (!options.headers['Content-Type']) options.headers['Content-Type'] = 'application/json'
      options.headers['Content-Length'] = govde.length
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
      req.destroy(Object.assign(new Error('YouTube API yanıt vermedi (zaman aşımı).'), { code: 'ETIMEDOUT' }))
    })
    req.on('error', reject)
    if (govde) req.write(govde)
    req.end()
  })
}

// Geçici ağ/DNS hatalarında (dalgalı mağaza interneti) otomatik yeniden dener.
const AG_HATALARI = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE'])
function bekle(ms) { return new Promise(r => setTimeout(r, ms)) }

async function istek(opts, { deneme = 3 } = {}) {
  let sonHata
  for (let i = 0; i < deneme; i++) {
    try {
      return await istekTek(opts)
    } catch (e) {
      sonHata = e
      // Yalnızca geçici ağ hatalarında tekrar dene; API/mantık hatasında değil.
      if (!AG_HATALARI.has(e.code) || i === deneme - 1) throw e
      await bekle(500 * (i + 1)) // 0.5s, 1s artan bekleme
    }
  }
  throw sonHata
}

// Google API hatasını okunur Türkçe mesaja çevirir.
// Kota hatası ayrı ele alınır: "yarın tekrar dene" demek, "bir şey bozuldu" demekten farklıdır.
function hataCevir(json, status) {
  const e = json && json.error
  if (!e) return new Error(`YouTube API beklenmedik yanıt (HTTP ${status})`)

  // OAuth uç noktası düz {error, error_description} döner; API uç noktası {error:{message,errors}}.
  if (typeof e === 'string') {
    if (e === 'invalid_grant') {
      return Object.assign(
        new Error('YouTube yetkisi geçersiz (iptal edilmiş veya şifre değişmiş olabilir). Yeniden bağlanın.'),
        { kod: 'yetki' },
      )
    }
    return Object.assign(new Error(`YouTube yetki hatası: ${json.error_description || e}`), { kod: 'yetki' })
  }

  const sebep = (e.errors && e.errors[0] && e.errors[0].reason) || ''
  if (sebep === 'quotaExceeded' || sebep === 'dailyLimitExceeded') {
    return Object.assign(
      new Error('YouTube günlük API kotası (10.000 birim) doldu. Kota her gün Pasifik saatiyle gece yarısı sıfırlanır.'),
      { kod: 'kota' },
    )
  }
  if (status === 403 && sebep === 'forbidden') {
    return Object.assign(new Error(`YouTube izin vermedi: ${e.message}`), { kod: 'yetki' })
  }
  return new Error(`YouTube API (${status}): ${e.message}${sebep ? ' [' + sebep + ']' : ''}`)
}

// --- Token yönetimi ---------------------------------------------------------

// refresh_token ile yeni access_token alır ve DB'ye yazar.
async function accessTokenYenile() {
  const a = _ayarlariGetir()
  if (!a.client_id || !a.client_secret) {
    throw Object.assign(new Error('YouTube Client ID/Secret girilmemiş. Ayarlar → YouTube.'), { kod: 'yetki' })
  }
  if (!a.refresh_token) {
    throw Object.assign(new Error('YouTube bağlantısı yok. "YouTube\'a Bağlan" ile yetki verin.'), { kod: 'yetki' })
  }

  const { status, json } = await istek({
    host: OAUTH_HOST,
    method: 'POST',
    path: '/token',
    body: new URLSearchParams({
      client_id: a.client_id,
      client_secret: a.client_secret,
      refresh_token: a.refresh_token,
      grant_type: 'refresh_token',
    }).toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  if (status !== 200 || !json || !json.access_token) throw hataCevir(json, status)

  const bitis = Date.now() + (Number(json.expires_in) || 3600) * 1000
  _ayarKaydetTek('access_token', json.access_token)
  _ayarKaydetTek('token_bitis', String(bitis))
  _tokenCache = { access_token: json.access_token, bitis }
  return json.access_token
}

/**
 * Yenileme politikası — tek karar, tek yerde, ağdan bağımsız.
 * bitisMs yoksa (hiç token alınmamış) yenileme gerekir.
 * Bitişe YENILEME_PAYI_MS'ten az kalmışsa, token teknik olarak hâlâ geçerli olsa
 * bile önceden yenilenir: uzun süren bir işin (video yükleme) ortasında ölmesin.
 */
function yenilemeGerekli(bitisMs, simdi = Date.now()) {
  const bitis = Number(bitisMs || 0)
  return bitis - YENILEME_PAYI_MS <= simdi
}

// Geçerli bir access_token döndürür; gerekiyorsa yeniler.
async function accessTokenAl() {
  if (_tokenCache && !yenilemeGerekli(_tokenCache.bitis)) {
    return _tokenCache.access_token
  }
  const a = _ayarlariGetir()
  const bitis = Number(a.token_bitis || 0)
  if (a.access_token && !yenilemeGerekli(bitis)) {
    _tokenCache = { access_token: a.access_token, bitis }
    return a.access_token
  }
  return accessTokenYenile()
}

// --- Yetkili çağrı ----------------------------------------------------------

/**
 * Yetkili YouTube API çağrısı. Token süresi dolmuşsa yeniler; 401 alırsa
 * BİR KEZ token'ı zorla yenileyip tekrar dener (saat kayması / erken iptal durumu).
 */
async function cagir(method, path, { params, body, host = API_HOST } = {}) {
  let token = await accessTokenAl()
  let cevap = await istek({
    host, method, path, params, body,
    headers: { Authorization: `Bearer ${token}` },
  })
  if (cevap.status === 401) {
    cacheSifirla()
    token = await accessTokenYenile()
    cevap = await istek({
      host, method, path, params, body,
      headers: { Authorization: `Bearer ${token}` },
    })
  }
  if (cevap.status < 200 || cevap.status >= 300) throw hataCevir(cevap.json, cevap.status)
  return cevap.json
}

// --- Uygulama uçları --------------------------------------------------------

/**
 * Bağlı kanalın bilgisi. Bağlantının GERÇEKTEN çalıştığının kanıtı budur:
 * kanal adı geliyorsa token, kapsam ve API'nin üçü de yerindedir. Maliyet: 1 birim.
 */
async function kanalBilgi() {
  const j = await cagir('GET', '/youtube/v3/channels', {
    params: { part: 'snippet,statistics', mine: 'true' },
  })
  const k = j && j.items && j.items[0]
  if (!k) {
    throw new Error('Bu Google hesabına bağlı bir YouTube kanalı bulunamadı. Kanalın sahibi olan hesapla bağlanın.')
  }
  return {
    kanal_id: k.id,
    kanal_adi: k.snippet && k.snippet.title,
    abone: k.statistics && k.statistics.subscriberCount,
    video_sayisi: k.statistics && k.statistics.videoCount,
    izlenme: k.statistics && k.statistics.viewCount,
  }
}

// Kanal bilgisini çekip ayarlara yazar (bağlantı sonrası ve "durumu tazele" için).
async function kurulumTamamla() {
  const bilgi = await kanalBilgi()
  _ayarKaydetTek('kanal_id', bilgi.kanal_id)
  _ayarKaydetTek('kanal_adi', bilgi.kanal_adi || '')
  return bilgi
}

/**
 * Arayüzün "bağlı mı" sorusuna ucuz cevap: AĞA ÇIKMAZ, yalnız DB'ye bakar.
 * Gerçekten çalışıyor mu sorusunun cevabı kurulumTamamla()'dır.
 */
function durum() {
  const a = _ayarlariGetir()
  return {
    kimlik_girildi: Boolean(a.client_id && a.client_secret),
    bagli: Boolean(a.refresh_token),
    kanal_id: a.kanal_id || null,
    kanal_adi: a.kanal_adi || null,
    token_bitis: a.token_bitis ? Number(a.token_bitis) : null,
  }
}

module.exports = {
  cagir,
  cacheSifirla,
  yenilemeGerekli,
  accessTokenAl,
  accessTokenYenile,
  kanalBilgi,
  kurulumTamamla,
  durum,
  hataCevir,
  YENILEME_PAYI_MS,
}
