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
ipcMain.on('update:kurVeYenidenBaslat', () => {
  autoUpdater.quitAndInstall()
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

app.whenReady().then(() => {
  require('./db/database').init()
  createWindow()
  // Güncelleme kontrolü renderer açılışında 'update:kontrolEt' ile tetiklenir.
})

app.on('window-all-closed', () => {
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
  require('./fis-yazdir'),
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

