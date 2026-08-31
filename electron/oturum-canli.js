// oturum-dogrula.js'in GERÇEK dünya bağlantıları: https isteği + şifreli
// önbellek dosyası. Saf mantık orada, yan etkiler burada — test tarafı saf
// mantığı Electron/ağ olmadan sınayabilsin diye.

const https = require('https')
const fs = require('fs')
const path = require('path')
const { olusturDogrulayici } = require('./oturum-dogrula')

// DİKKAT: bu iki değer src/lib/supabase.js ile AYNI olmalı. Renderer vite ile
// paketlendiği için ortak bir modül paylaşamıyoruz; kayma olmasın diye
// electron/oturum-canli.test.js iki dosyayı karşılaştıran bir parite testi
// tutuyor. Publishable anahtar istemciye gömülmesi normal olan anahtardır.
const SUPABASE_URL = 'https://lnyvgrintrvjbdtzicys.supabase.co'
const SUPABASE_KEY = 'sb_publishable_hplEuxLZ7ZwSWx9pWhLS1A_Fwov7M0a'

const ONBELLEK_DOSYA = 'oturum-onbellek.bin'
const ZAMAN_ASIMI_MS = 8000

function istek(yol, token) {
  return new Promise((cozumle, reddet) => {
    const url = new URL(yol, SUPABASE_URL)
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        timeout: ZAMAN_ASIMI_MS,
      },
      (res) => {
        let ham = ''
        res.on('data', (p) => { ham += p })
        res.on('end', () => {
          let govde = null
          try { govde = ham ? JSON.parse(ham) : null } catch { govde = null }
          cozumle({ durum: res.statusCode, govde })
        })
      },
    )
    // Zaman aşımı ve ağ hatası AYNI şekilde ele alınır: ikisi de "Supabase'e
    // ulaşamadım" demek, yani çevrimdışı yola düşülmeli. reddet() bunu tetikler.
    req.on('timeout', () => { req.destroy(new Error('Supabase zaman asimi')) })
    req.on('error', reddet)
    req.end()
  })
}

function onbellekYolu() {
  const { app } = require('electron')
  return path.join(app.getPath('userData'), ONBELLEK_DOSYA)
}

function onbellekOku() {
  try {
    const { safeStorage } = require('electron')
    const ham = fs.readFileSync(onbellekYolu())
    return JSON.parse(safeStorage.decryptString(ham))
  } catch {
    // Dosya yok, bozuk, ya da başka bir Windows kullanıcısı tarafından
    // yazılmış (DPAPI çözemez) — hiçbiri hata değil, önbellek yok demektir.
    return null
  }
}

function onbellekYaz(deger) {
  try {
    const { safeStorage } = require('electron')
    if (!safeStorage.isEncryptionAvailable()) return
    fs.writeFileSync(onbellekYolu(), safeStorage.encryptString(JSON.stringify(deger)))
  } catch { /* yazamazsak sadece çevrimdışı çalışamayız, oturum yine geçerli */ }
}

function onbellekSil() {
  try { fs.unlinkSync(onbellekYolu()) } catch { /* zaten yok */ }
}

const dogrulaHam = olusturDogrulayici({
  istek,
  onbellekOku,
  onbellekYaz,
  onbellekSil,
  simdi: () => Date.now(),
})

// Doğrulanmış oturumun ham access_token'ı — SADECE main process içinde,
// bellekte tutulur (diske yazılmaz, IPC ile dışarı verilmez). Fatura modülü
// gibi bulut çağrısı yapan modüller renderer'dan JWT PARAMETRESİ ALAMAZ
// (ele geçirilmiş bir renderer istediği kimliği taklit edebilirdi); bunun
// yerine main'in kendi doğruladığı jetonu buradan okur.
let aktifToken = null

async function dogrula(token) {
  const sonuc = await dogrulaHam(token)
  aktifToken = sonuc ? token : null
  return sonuc
}

function aktifJwt() {
  return aktifToken
}

function aktifTokenTemizle() {
  aktifToken = null
}

module.exports = { dogrula, onbellekSil, aktifJwt, _aktifTokenTemizle: aktifTokenTemizle, SUPABASE_URL, SUPABASE_KEY }
