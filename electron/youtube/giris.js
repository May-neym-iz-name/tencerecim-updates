// "YouTube'a Bağlan" — masaüstü OAuth (loopback) akışı.
// Giriş, uygulama içi pencerede DEĞİL, kullanıcının GERÇEK tarayıcısında açılır
// (Google gömülü tarayıcıyı güvensiz sayıp "disallowed_useragent" ile bloklar).
// Uygulama geçici bir localhost sunucusu açar; Google code ile localhost'a döner;
// code refresh_token + access_token'a çevrilir.
const http = require('http')
const { shell } = require('electron')
const { _ayarlariGetir, _ayarKaydetTek } = require('../db/youtube-ayarlar')
const client = require('./client')

// meta/giris.js 51789'u kullanıyor. Aynı portu paylaşırsak, Meta girişi yarım
// kalmış (sunucusu kapanmamış) durumdayken YouTube girişi "port kullanımda" ile patlar.
const PORT = 51790
const REDIRECT = `http://localhost:${PORT}/`

const IZINLER = [
  'https://www.googleapis.com/auth/youtube.readonly',      // kanal bilgisi
  'https://www.googleapis.com/auth/youtube.upload',        // video yükleme
  'https://www.googleapis.com/auth/youtube.force-ssl',     // yorum + video bilgisi düzenleme
  'https://www.googleapis.com/auth/yt-analytics.readonly', // performans raporu
].join(' ')

function bitisSayfasi(basarili, mesajMetni) {
  const renk = basarili ? '#16a34a' : '#dc2626'
  const mesaj = basarili ? '✓ YouTube bağlantısı başarılı' : '✗ Bağlantı iptal edildi'
  return `<!doctype html><html><head><meta charset="utf-8"><title>Tencerecim</title></head>
    <body style="font-family:system-ui;display:flex;height:100vh;margin:0;align-items:center;justify-content:center;background:#f8fafc">
    <div style="text-align:center"><h1 style="color:${renk}">${mesaj}</h1>
    <p style="color:#64748b">${mesajMetni || 'Bu sekmeyi kapatıp uygulamaya dönebilirsiniz.'}</p></div></body></html>`
}

// code → { refresh_token, access_token, expires_in }
function kodDegistir(code, clientId, clientSecret) {
  return new Promise((resolve, reject) => {
    const https = require('https')
    const govde = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT,
      grant_type: 'authorization_code',
    }).toString()
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(govde),
      },
      timeout: 30 * 1000,
    }, (res) => {
      let d = ''
      res.setEncoding('utf8')
      res.on('data', c => { d += c })
      res.on('end', () => {
        let j = null
        try { j = JSON.parse(d) } catch {}
        if (res.statusCode !== 200 || !j || !j.access_token) {
          return reject(client.hataCevir(j, res.statusCode))
        }
        resolve(j)
      })
    })
    req.on('timeout', () => req.destroy(new Error('Google token uç noktası yanıt vermedi.')))
    req.on('error', reject)
    req.write(govde)
    req.end()
  })
}

// Tarayıcıda OAuth aç, localhost'ta code'u yakala.
function kodAl(clientId) {
  return new Promise((resolve, reject) => {
    let bitti = false
    const sunucu = http.createServer((req, res) => {
      const u = new URL(req.url, REDIRECT)
      const code = u.searchParams.get('code')
      const hata = u.searchParams.get('error')
      if (!code && !hata) { res.writeHead(404); res.end(); return }
      bitti = true
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(bitisSayfasi(!!code))
      sunucu.close()
      if (hata) {
        return reject(new Error(
          hata === 'access_denied'
            ? 'Google izni reddedildi. Yetki vermeden bağlantı kurulamaz.'
            : 'Google izni alınamadı: ' + hata,
        ))
      }
      resolve(code)
    })
    sunucu.on('error', (e) => reject(new Error(
      'Yerel sunucu açılamadı (' + e.message + '). Port ' + PORT + ' kullanımda olabilir.',
    )))
    sunucu.listen(PORT, '127.0.0.1', () => {
      const url = 'https://accounts.google.com/o/oauth2/v2/auth' +
        `?client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT)}` +
        '&response_type=code' +
        `&scope=${encodeURIComponent(IZINLER)}` +
        // access_type=offline OLMADAN refresh_token GELMEZ; uygulama 1 saat sonra ölür.
        '&access_type=offline' +
        // prompt=consent OLMADAN, ikinci bağlanışta refresh_token GELMEZ (Google onu
        // yalnız ilk onayda verir). Bunu bir saat sonra "neden düştü" diye fark edersin.
        '&prompt=consent' +
        '&include_granted_scopes=true'
      shell.openExternal(url)
    })
    // 5 dakika içinde tamamlanmazsa iptal (sunucu açık kalmasın, port kilitlenmesin).
    setTimeout(() => {
      if (!bitti) {
        try { sunucu.close() } catch {}
        reject(new Error('Giriş zaman aşımı (5 dk). Tekrar deneyin.'))
      }
    }, 5 * 60 * 1000)
  })
}

async function girisBaslat() {
  const a = _ayarlariGetir()
  if (!a.client_id || !a.client_secret) {
    throw new Error('Önce Client ID ve Client Secret girip kaydedin, sonra YouTube\'a Bağlan.')
  }

  const code = await kodAl(a.client_id)
  const t = await kodDegistir(code, a.client_id, a.client_secret)

  // refresh_token yoksa bağlantı kalıcı olmaz — sessizce kabul etmek, bir saat
  // sonra "neden koptu" diye aramaktan iyidir. Açıkça hata ver.
  if (!t.refresh_token) {
    throw new Error(
      'Google refresh_token vermedi; bağlantı 1 saat sonra düşerdi. ' +
      'Google Hesabı → Güvenlik → Üçüncü taraf uygulamalar bölümünden "Tencerecim Magaza Programi" ' +
      'erişimini kaldırıp tekrar bağlanın.',
    )
  }

  _ayarKaydetTek('refresh_token', t.refresh_token)
  _ayarKaydetTek('access_token', t.access_token)
  _ayarKaydetTek('token_bitis', String(Date.now() + (Number(t.expires_in) || 3600) * 1000))
  client.cacheSifirla()

  // Kanal bilgisini çek: bağlantının gerçekten çalıştığının kanıtı (1 birim).
  return client.kurulumTamamla()
}

module.exports = {
  'youtube:girisBaslat': () => girisBaslat(),
}
