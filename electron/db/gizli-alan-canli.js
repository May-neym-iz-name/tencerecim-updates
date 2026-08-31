// gizli-alan.js'in GERÇEK şifreleme bağlantısı: Electron safeStorage (Windows'ta
// DPAPI). Saf mantık gizli-alan.js'te, Electron bağımlılığı burada — testler
// Electron olmadan çalışabilsin diye.
const g = require('./gizli-alan')

const kripto = {
  kullanilabilir() {
    try { return require('electron').safeStorage.isEncryptionAvailable() } catch { return false }
  },
  sifrele(duz) {
    return require('electron').safeStorage.encryptString(duz)
  },
  coz(buf) {
    return require('electron').safeStorage.decryptString(buf)
  },
}

module.exports = {
  kripto,
  coz: (deger) => g.coz(deger, kripto),
  objeCoz: (tablo, obj) => g.objeCoz(tablo, obj, kripto),
  yazmaDegeri: (tablo, anahtar, deger) => g.yazmaDegeri(tablo, anahtar, deger, kripto),
  gecisYap: (db) => g.tumunuSifrele(db, kripto),
}
