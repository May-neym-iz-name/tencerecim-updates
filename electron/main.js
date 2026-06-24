const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')

const isDev = !app.isPackaged
let mainWindow

autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

// Güncelleme durumunu renderer'a (giriş öncesi güncelleme ekranı) bildir.
function guncellemeDurum(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:durum', payload)
  }
}

autoUpdater.on('checking-for-update', () => guncellemeDurum({ tip: 'kontrol' }))
autoUpdater.on('update-available', (info) =>
  guncellemeDurum({ tip: 'mevcut', surum: info?.version }))
autoUpdater.on('update-not-available', () => guncellemeDurum({ tip: 'yok' }))
autoUpdater.on('download-progress', (p) =>
  guncellemeDurum({ tip: 'indiriliyor', yuzde: Math.round(p?.percent || 0) }))
autoUpdater.on('update-downloaded', () => guncellemeDurum({ tip: 'indirildi' }))
autoUpdater.on('error', (err) => {
  console.error('Auto-updater hatası:', err?.message)
  guncellemeDurum({ tip: 'hata', mesaj: err?.message })
})

// Renderer açılış anında güncelleme kontrolünü tetikler.
ipcMain.handle('update:kontrolEt', async () => {
  if (isDev) return { tip: 'yok' } // geliştirmede güncelleme yok
  try {
    await autoUpdater.checkForUpdates()
  } catch (err) {
    guncellemeDurum({ tip: 'hata', mesaj: err?.message })
  }
  return { tip: 'baslatildi' }
})

// İndirme bitince kur + yeniden başlat.
// NOT: renderer invoke ile çağırır → ipcMain.handle olmalı (on ile tetiklenmez).
let kuruluyor = false
ipcMain.handle('update:kurVeYenidenBaslat', () => {
  kuruluyor = true
  // isSilent=true: sessiz kurulum (giriş öncesi otomatik akış için sihirbaz açılmaz)
  // isForceRunAfter=true: kurulumdan sonra uygulamayı tekrar başlat
  setImmediate(() => autoUpdater.quitAndInstall(true, true))
})

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 800,
    minWidth: 1100,
    minHeight: 600,
    title: 'Tencerecim Mağaza Yönetim Sistemi',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ikas online siparişlerini periyodik çek (açılışta + her 5 dakikada bir).
// Otomatik senkron kapalıysa pullSiparisler kendi içinde online lokasyon yoksa atlar;
// otomatik_senk bayrağını burada da kontrol ederiz.
const IKAS_SENK_ARALIGI_MS = 5 * 60 * 1000
function ikasSiparisSenkBaslat() {
  const { _pullSiparisler } = require('./ikas')
  const { _ayarlariGetir } = require('./db/ikas-ayarlar')
  const calistir = () => {
    try {
      if (!_ayarlariGetir().otomatik_senk) return
      _pullSiparisler().catch(err => console.error('[ikas] sipariş çekme hatası:', err.message))
    } catch (err) {
      console.error('[ikas] sipariş senkron başlatılamadı:', err.message)
    }
  }
  setTimeout(calistir, 10 * 1000) // açılıştan 10 sn sonra ilk çekim
  setInterval(calistir, IKAS_SENK_ARALIGI_MS)
}

app.whenReady().then(() => {
  require('./db/database').init()
  createWindow()
  ikasSiparisSenkBaslat()
  // Güncelleme kontrolü renderer açılışında 'update:kontrolEt' ile tetiklenir.
})

app.on('window-all-closed', () => {
  // Güncelleme kurulurken erken app.quit() çağırma; quitAndInstall süreci yönetir.
  if (kuruluyor) return
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})

// Tüm IPC handler'ları yükle
const handlerModules = [
  require('./db/urunler'),
  require('./db/musteriler'),
  require('./db/satislar'),
  require('./db/stok'),
  require('./db/lokasyonlar'),
  require('./db/markalar'),
  require('./db/tedarikciler'),
  require('./db/kategoriler'),
  require('./db/excel-import'),
  require('./yetki'),
  require('./surum'),
  require('./db/ups-ayarlar'),
  require('./db/lokasyon-gonderici'),
  require('./ups/kargo'),
  require('./ups/etiket-yazdir'),
  require('./db/ikas-ayarlar'),
  require('./db/ayar-senk'),
  require('./db/online-siparisler'),
  require('./db/raporlar'),
  require('./ikas'),
  require('./fis-yazdir'),
  require('./barkod-yazdir'),
  require('./auth'),
]

for (const mod of handlerModules) {
  for (const [channel, handler] of Object.entries(mod)) {
    if (channel.startsWith('_')) continue // private helpers
    ipcMain.handle(channel, async (event, ...args) => {
      try {
        return { ok: true, data: await handler(...args) }
      } catch (err) {
        console.error(`[IPC Error] ${channel}:`, err.message)
        return { ok: false, error: err.message }
      }
    })
  }
}

