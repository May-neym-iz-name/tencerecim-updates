// Yerel veritabanı yedekleme / geri yükleme. better-sqlite3 .backup() ile
// tutarlı (WAL dahil) yedek alınır; geri yükleme dosyayı kopyalayıp uygulamayı
// yeniden başlatmayı önerir.
const { app, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { getDb } = require('./db/database')
const yedekSifre = require('./yedek-sifre')

function dbYolu() {
  return path.join(app.getPath('userData'), 'tencerecim.db')
}

function tarihDamgasi() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`
}

module.exports = {
  // Tutarlı bir yedek dosyası oluşturur (kullanıcı konum seçer).
  //
  // KVKK: yedek TÜM müşteri verisini ve API secret'larını taşır. Parola
  // verilirse dosya AES-256-GCM ile şifrelenir (.tncyedek). Parola verilmezse
  // eski davranış korunur (.db) — ama arayüz parolayı zorunlu ister.
  'yedek:olustur': async (girdi) => {
    const { _yetkiKontrol } = require('./yetki'); _yetkiKontrol('ayarlar_duzenle')
    const parola = girdi && typeof girdi === 'object' ? girdi.parola : null
    const sifreliMi = typeof parola === 'string' && parola.length > 0

    const uzanti = sifreliMi ? yedekSifre.DOSYA_UZANTISI : 'db'
    const sonuc = await dialog.showSaveDialog({
      title: 'Veritabanı Yedeğini Kaydet',
      defaultPath: `tencerecim_yedek_${tarihDamgasi()}.${uzanti}`,
      filters: [{
        name: sifreliMi ? 'Şifreli Yedek' : 'Veritabanı',
        extensions: [uzanti],
      }],
    })
    if (sonuc.canceled || !sonuc.filePath) return { iptal: true }

    if (!sifreliMi) {
      // better-sqlite3 backup() WAL'ı da dahil tutarlı kopya üretir.
      await getDb().backup(sonuc.filePath)
      return { iptal: false, yol: sonuc.filePath, boyut: fs.statSync(sonuc.filePath).size, sifreli: false }
    }

    // Önce geçici bir yerde tutarlı kopya al, sonra şifreleyip hedefe yaz.
    // Şifrelenmemiş ara dosya kullanıcının seçtiği klasörde ASLA kalmamalı.
    const gecici = path.join(app.getPath('temp'), `tnc_yedek_${Date.now()}.db`)
    try {
      await getDb().backup(gecici)
      const paket = yedekSifre.sifrele(fs.readFileSync(gecici), parola)
      fs.writeFileSync(sonuc.filePath, paket)
    } finally {
      try { fs.unlinkSync(gecici) } catch { /* zaten silinmiş olabilir */ }
    }
    return { iptal: false, yol: sonuc.filePath, boyut: fs.statSync(sonuc.filePath).size, sifreli: true }
  },

  // Seçilen yedeği aktif veritabanının üzerine yazar. Uygulama yeniden
  // başlatılmalı (bağlantı açıkken bozulmaması için mevcut bağlantı kapatılır).
  'yedek:geri-yukle': async (girdi) => {
    const { _yetkiKontrol } = require('./yetki'); _yetkiKontrol('ayarlar_duzenle')
    const parola = girdi && typeof girdi === 'object' ? girdi.parola : null
    const sonuc = await dialog.showOpenDialog({
      title: 'Geri Yüklenecek Yedeği Seçin',
      // Eski şifresiz .db yedekleri geriye dönük uyum için kabul edilir.
      filters: [{ name: 'Yedek', extensions: [yedekSifre.DOSYA_UZANTISI, 'db'] }],
      properties: ['openFile'],
    })
    if (sonuc.canceled || !sonuc.filePaths?.length) return { iptal: true }
    let kaynak = sonuc.filePaths[0]
    const hedef = dbYolu()

    // Şifreli yedek: paroladan çöz, geçici dosyaya yaz, oradan geri yükle.
    // Çözülmüş kopya kullanıcının klasörüne ASLA yazılmaz.
    let gecici = null
    if (yedekSifre.sifreliMi(fs.readFileSync(kaynak))) {
      if (!parola) return { iptal: true, parolaGerekli: true }
      const acik = yedekSifre.coz(fs.readFileSync(kaynak), parola)
      gecici = path.join(app.getPath('temp'), `tnc_geri_${Date.now()}.db`)
      fs.writeFileSync(gecici, acik)
      kaynak = gecici
    }

    // Onay: bu işlem mevcut veriyi değiştirir.
    const onay = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['Vazgeç', 'Geri Yükle ve Kapat'],
      defaultId: 0, cancelId: 0,
      title: 'Yedeği Geri Yükle',
      message: 'Mevcut tüm veriler seçilen yedekle DEĞİŞTİRİLECEK.',
      detail: 'Devam ederseniz uygulama kapanır; tekrar açtığınızda yedek aktif olur. ' +
        'Güvenlik için önce mevcut durumun yedeğini almanız önerilir.',
    })
    if (onay.response !== 1) return { iptal: true }

    // Mevcut bağlantıyı kapat, geri yüklemeden önce otomatik güvenlik yedeği al.
    try {
      const guvenlik = hedef.replace(/\.db$/, `_oncesi_${tarihDamgasi()}.db`)
      await getDb().backup(guvenlik)
    } catch { /* güvenlik yedeği alınamazsa devam et */ }
    try { getDb().close() } catch { /* zaten kapalı olabilir */ }

    fs.copyFileSync(kaynak, hedef)
    // Çözülmüş geçici kopya diskte kalmasın.
    if (gecici) { try { fs.unlinkSync(gecici) } catch { /* zaten silinmiş */ } }
    // WAL/SHM artıklarını temizle (eski WAL yeni db'yle çelişmesin).
    for (const ek of ['-wal', '-shm']) {
      try { fs.unlinkSync(hedef + ek) } catch { /* yoksa sorun değil */ }
    }
    // Uygulamayı yeniden başlat.
    app.relaunch(); app.exit(0)
    return { iptal: false }
  },
}
