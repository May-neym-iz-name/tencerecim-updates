// "Beni hatırla" — e-posta+şifreyi safeStorage (OS şifrelemesi) ile yerelde saklar.
// Düz metin değil; şifrelenemiyorsa hiç saklanmaz.
const { safeStorage, app } = require('electron')
const fs = require('fs')
const path = require('path')

function dosyaYolu() {
  return path.join(app.getPath('userData'), 'beni-hatirla.bin')
}

module.exports = {
  'auth:beni-hatirla-kaydet': ({ email, sifre }) => {
    if (!safeStorage.isEncryptionAvailable()) return { kaydedildi: false }
    const sifreli = safeStorage.encryptString(JSON.stringify({ email, sifre }))
    fs.writeFileSync(dosyaYolu(), sifreli)
    return { kaydedildi: true }
  },

  'auth:beni-hatirla-getir': () => {
    try {
      const buf = fs.readFileSync(dosyaYolu())
      return JSON.parse(safeStorage.decryptString(buf))
    } catch {
      return null
    }
  },

  'auth:beni-hatirla-temizle': () => {
    try { fs.unlinkSync(dosyaYolu()) } catch {}
    return { temizlendi: true }
  },
}
