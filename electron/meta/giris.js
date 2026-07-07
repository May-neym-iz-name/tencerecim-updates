// Facebook ile Bağlan — masaüstü OAuth (loopback) akışı.
// Giriş, uygulama içi pencerede DEĞİL, kullanıcının GERÇEK tarayıcısında açılır
// (Google/Facebook gömülü tarayıcıyı güvensiz sayıp bloklar). Uygulama geçici bir
// localhost sunucusu açar; Facebook code ile localhost'a döner; code token'a çevrilir.
// Token kullanici_token olarak kaydedilip mevcut client.kurulumTamamla() çağrılır.
const http = require('http')
const https = require('https')
const { shell } = require('electron')
const { _ayarlariGetir, _ayarKaydetTek } = require('../db/meta-ayarlar')
const client = require('./client')

const API_SURUM = 'v21.0'
const PORT = 51789
const REDIRECT = `http://localhost:${PORT}/`
const IZINLER = [
  'pages_show_list', 'pages_read_engagement', 'pages_manage_engagement', 'pages_manage_metadata',
  'pages_messaging', 'pages_read_user_content', 'business_management',
  'instagram_basic', 'instagram_manage_comments', 'instagram_manage_messages',
].join(',')

function bitisSayfasi(basarili) {
  const renk = basarili ? '#16a34a' : '#dc2626'
  const mesaj = basarili ? '✓ Bağlantı başarılı' : '✗ Bağlantı iptal edildi'
  return `<!doctype html><html><head><meta charset="utf-8"><title>Tencerecim</title></head>
    <body style="font-family:system-ui;display:flex;height:100vh;margin:0;align-items:center;justify-content:center;background:#f8fafc">
    <div style="text-align:center"><h1 style="color:${renk}">${mesaj}</h1>
    <p style="color:#64748b">Bu sekmeyi kapatıp uygulamaya dönebilirsiniz.</p></div></body></html>`
}

// Basit HTTPS GET → JSON.
function getJson(url) {
  return new Promise((res, rej) => {
    https.get(url, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)) } catch (e) { rej(e) } }) }).on('error', rej)
  })
}

// Tarayıcıda OAuth aç, localhost'ta code'u yakala, code'u user token'a çevir.
function tokenAl(appId, appSecret) {
  return new Promise((resolve, reject) => {
    let bitti = false
    const sunucu = http.createServer(async (req, res) => {
      const u = new URL(req.url, REDIRECT)
      const code = u.searchParams.get('code')
      const hata = u.searchParams.get('error_description') || u.searchParams.get('error')
      if (!code && !hata) { res.writeHead(404); res.end(); return }
      bitti = true
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(bitisSayfasi(!!code))
      sunucu.close()
      if (hata) return reject(new Error('Facebook izni reddedildi: ' + hata))
      try {
        const j = await getJson(`https://graph.facebook.com/${API_SURUM}/oauth/access_token` +
          `?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(REDIRECT)}` +
          `&client_secret=${encodeURIComponent(appSecret)}&code=${encodeURIComponent(code)}`)
        if (j.error || !j.access_token) return reject(new Error(j.error?.message || 'Token alınamadı.'))
        resolve(j.access_token)
      } catch (e) { reject(e) }
    })
    sunucu.on('error', (e) => reject(new Error('Yerel sunucu açılamadı (' + e.message + '). Port ' + PORT + ' kullanımda olabilir.')))
    sunucu.listen(PORT, '127.0.0.1', () => {
      const url = `https://www.facebook.com/${API_SURUM}/dialog/oauth` +
        `?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(REDIRECT)}` +
        `&response_type=code&scope=${encodeURIComponent(IZINLER)}`
      shell.openExternal(url)
    })
    // 5 dakika içinde tamamlanmazsa iptal.
    setTimeout(() => { if (!bitti) { try { sunucu.close() } catch {}; reject(new Error('Giriş zaman aşımı (5 dk). Tekrar deneyin.')) } }, 5 * 60 * 1000)
  })
}

async function girisBaslat({ sayfaId } = {}) {
  const a = _ayarlariGetir()
  if (!a.app_id || !a.app_secret) {
    throw new Error('Önce App ID ve App Secret girip kaydedin, sonra Facebook ile Bağlan.')
  }
  if (sayfaId) _ayarKaydetTek('sayfa_id', sayfaId)
  const token = await tokenAl(a.app_id, a.app_secret)
  _ayarKaydetTek('kullanici_token', token)
  return client.kurulumTamamla()
}

module.exports = {
  'meta:girisBaslat': (arg) => girisBaslat(arg || {}),
}
