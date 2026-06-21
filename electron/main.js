const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')

const isDev = !app.isPackaged
let mainWindow

autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

autoUpdater.on('update-available', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-status', 'Yeni güncelleme indiriliyor...')
  }
})

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Güncelleme Hazır',
    message: 'Yeni sürüm indirildi. Uygulama yeniden başlatılarak güncellenecek.',
    buttons: ['Şimdi Güncelle', 'Sonra'],
  }).then(({ response }) => {
    if (response === 0) autoUpdater.quitAndInstall()
  })
})

autoUpdater.on('error', (err) => {
  console.error('Auto-updater hatası:', err.message)
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
  if (!isDev) {
    setTimeout(() => autoUpdater.checkForUpdates(), 3000)
  }
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

