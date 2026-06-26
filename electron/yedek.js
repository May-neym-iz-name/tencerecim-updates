// Yerel veritabanı yedekleme / geri yükleme. better-sqlite3 .backup() ile
// tutarlı (WAL dahil) yedek alınır; geri yükleme dosyayı kopyalayıp uygulamayı
// yeniden başlatmayı önerir.
const { app, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { getDb } = require('./db/database')

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
  'yedek:olustur': async () => {
    const { _yetkiKontrol } = require('./yetki'); _yetkiKontrol('ayarlar_duzenle')
    const sonuc = await dialog.showSaveDialog({
      title: 'Veritabanı Yedeğini Kaydet',
      defaultPath: `tencerecim_yedek_${tarihDamgasi()}.db`,
      filters: [{ name: 'Veritabanı', extensions: ['db'] }],
    })
    if (sonuc.canceled || !sonuc.filePath) return { iptal: true }
    // better-sqlite3 backup() WAL'ı da dahil tutarlı kopya üretir.
    await getDb().backup(sonuc.filePath)
    const boyut = fs.statSync(sonuc.filePath).size
    return { iptal: false, yol: sonuc.filePath, boyut }
  },

  // Seçilen yedeği aktif veritabanının üzerine yazar. Uygulama yeniden
  // başlatılmalı (bağlantı açıkken bozulmaması için mevcut bağlantı kapatılır).
  'yedek:geri-yukle': async () => {
    const { _yetkiKontrol } = require('./yetki'); _yetkiKontrol('ayarlar_duzenle')
    const sonuc = await dialog.showOpenDialog({
      title: 'Geri Yüklenecek Yedeği Seçin',
      filters: [{ name: 'Veritabanı', extensions: ['db'] }],
      properties: ['openFile'],
    })
    if (sonuc.canceled || !sonuc.filePaths?.length) return { iptal: true }
    const kaynak = sonuc.filePaths[0]
    const hedef = dbYolu()

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
    // WAL/SHM artıklarını temizle (eski WAL yeni db'yle çelişmesin).
    for (const ek of ['-wal', '-shm']) {
      try { fs.unlinkSync(hedef + ek) } catch { /* yoksa sorun değil */ }
    }
    // Uygulamayı yeniden başlat.
    app.relaunch(); app.exit(0)
    return { iptal: false }
  },
}
