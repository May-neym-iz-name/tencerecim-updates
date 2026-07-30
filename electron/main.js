const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')

const isDev = !app.isPackaged
let mainWindow

// TEK ÖRNEK KİLİDİ — ikinci kez açılırsa yeni pencere AÇILMAZ, mevcut pencere öne getirilir.
// Neden şart: her örnek kendi polling turunu ve sosyal otomasyonunu çalıştırır. İki örnek =
// aynı yorumlara paralel DM denemesi + hız kısıtı örnek başına sayıldığı için Meta'nın saatlik
// sınırının iki katına çıkma riski. (2026-07-16'da iki dev örneği yüzünden gerçekten yaşandı.)
// Ayrıca aynı SQLite dosyasına iki süreçten yazmak WAL'a rağmen kilit çekişmesi yaratır.
const tekOrnekKilidi = app.requestSingleInstanceLock()
if (!tekOrnekKilidi) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

// Güncelleme durumunu renderer'a (giriş öncesi güncelleme ekranı) bildir.
function guncellemeDurum(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:durum', payload)
  }
}

// Arka plan çekimi sipariş eklediğinde/durum değiştirdiğinde açık ekrana haber ver.
// Şart: main SQLite'a yazar ama renderer AYRI süreçtir — haber verilmezse React state
// bayat kalır ve kullanıcı sekmeden çıkıp girene kadar eski durumu görür.
function siparisDegisti(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('ikas:siparis-degisti', payload)
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
  // GÜVENLİK: Üretimde DevTools ve varsayılan menü KAPALI.
  // Neden: yetki kontrolü renderer'ın bildirdiği profile bakıyor (yetki.js). DevTools açıkken
  // personel konsoldan `window.api.invoke('auth:profil-ayarla', {aktif:true, rol:'super_admin'})`
  // yazıp tüm yetkileri alabiliyordu. Bu ilk bariyer; kalıcı çözüm profilin main tarafında
  // Supabase oturumuyla doğrulanmasıdır.
  if (!isDev) Menu.setApplicationMenu(null)

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
      devTools: isDev,
    },
  })

  // Sağ tık bağlam menüsü — Electron varsayılan olarak sunmaz. Girdi alanlarında
  // kes/yapıştır, seçili metinde kopyala; hiçbir koşul yoksa menü açılmaz.
  mainWindow.webContents.on('context-menu', (_event, params) => {
    const { isEditable, selectionText, editFlags } = params
    const seciliVar = Boolean(selectionText && selectionText.trim())
    const ogeler = []
    if (isEditable) {
      ogeler.push(
        { label: 'Kes', role: 'cut', enabled: editFlags.canCut },
        { label: 'Kopyala', role: 'copy', enabled: editFlags.canCopy },
        { label: 'Yapıştır', role: 'paste', enabled: editFlags.canPaste },
        { type: 'separator' },
        { label: 'Tümünü Seç', role: 'selectAll', enabled: editFlags.canSelectAll },
      )
    } else if (seciliVar) {
      ogeler.push({ label: 'Kopyala', role: 'copy' })
    }
    if (ogeler.length) Menu.buildFromTemplate(ogeler).popup({ window: mainWindow })
  })

  // Menü kapatılsa da kısayol DevTools'u açabilir → F12 ve Ctrl/Cmd+Shift+I engellenir.
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (isDev) return
    const k = String(input.key || '').toLowerCase()
    if (k === 'f12' || (k === 'i' && (input.control || input.meta) && input.shift)) {
      event.preventDefault()
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ikas online siparişlerini periyodik çek — MUTABAKAT turu.
//
// Eskiden burası 90 saniyeydi ve tek yoldu: "masaüstü uygulama public endpoint
// alamadığı için" webhook kurulamıyordu. O kısıt artık YOK — ikas webhook'u
// Cloudflare Worker'a düşüyor ve sipariş ~5 saniyede geliyor
// (ikasOlayYoklayiciBaslat, aşağıda).
//
// Bu tur yine de KALDIRILMADI: webhook sessizce bozulursa ya da ikas 3 denemede
// vazgeçtiyse (docs/ikas-api-reference.md:150) kaçan siparişi yakalayan tek şey bu.
// Bulut köprüsü kapalıyken de tek çalışan yol budur.
// pullSiparisler updatedAt imleci ile artımlıdır, bu yüzden tur ucuzdur.
const IKAS_SENK_ARALIGI_MS = 5 * 60 * 1000
function ikasSiparisSenkBaslat() {
  const { _pullSiparisler } = require('./ikas')
  const { _ayarlariGetir } = require('./db/ikas-ayarlar')
  let calisiyor = false // çekim 90 sn'yi aşarsa turlar üst üste binmesin (meta ile aynı koruma)
  const calistir = async () => {
    if (calisiyor) return
    try {
      if (!_ayarlariGetir().otomatik_senk) return
      calisiyor = true
      const r = await _pullSiparisler()
      // Yalnızca gerçekten bir şey değiştiyse haber ver — her turda boşuna yeniden
      // yükleme yapıp açık ekranı titretmeyelim.
      if (r?.kaydedilen || r?.guncellenen) siparisDegisti(r)
    } catch (err) {
      console.error('[ikas] sipariş çekme hatası:', err.message)
    } finally {
      calisiyor = false
    }
  }
  setTimeout(calistir, 10 * 1000) // açılıştan 10 sn sonra ilk çekim
  setInterval(calistir, IKAS_SENK_ARALIGI_MS)
}

// ikas olay yoklayıcısı: Worker'daki webhook kuyruğunu 5 saniyede bir kontrol eder.
//
// Neden 5 saniye ucuz: ikas'a değil KENDİ Worker'ımıza gidiyoruz. Olay yoksa cevap
// birkaç bayt ve D1'den tek indeksli okuma. ikas'ı 5 sn'de bir yoklamak hız sınırına
// takılırdı — asıl kazanç bu ayrımda.
//
// İMLEÇ EN SONDA İLERLER: tur ortasında hata olursa aynı olaylar tekrar okunur.
// _pullSiparisler idempotent olduğu için tekrar zararsız; kaçırmak telafi edilemez.
const IKAS_OLAY_ARALIGI_MS = 5 * 1000
const IKAS_OLAY_IMLECI = 'ikas_bulut_imlec'
function ikasOlayYoklayiciBaslat() {
  const { _pullSiparisler } = require('./ikas')
  const { _ayarlariGetir } = require('./db/ikas-ayarlar')
  const { _olaylariCek, _yeniImlec } = require('./ikas/bulut')
  const upsBulut = require('./ups/bulut')
  const yerelAyar = require('./db/yerel-ayarlar')
  let calisiyor = false
  let susturmaBitis = 0 // hata günlüğünü 5 dk sustur (5 sn'de bir konsolu doldurmasın)
  const calistir = async () => {
    if (calisiyor) return
    try {
      if (!upsBulut._ayar().acik) return          // köprü kapalı → eski davranış
      if (!_ayarlariGetir().otomatik_senk) return
      calisiyor = true
      const imlec = yerelAyar._getir(IKAS_OLAY_IMLECI, '1970-01-01T00:00:00.000Z')
      const { kayitlar } = await _olaylariCek(imlec)
      if (!kayitlar.length) return
      const r = await _pullSiparisler()
      if (r?.kaydedilen || r?.guncellenen) siparisDegisti(r)
      yerelAyar._yaz(IKAS_OLAY_IMLECI, _yeniImlec(kayitlar, imlec))
    } catch (err) {
      // Sessiz kalmıyoruz ama boğmuyoruz da: Worker erişilemezse 5 dk'lık mutabakat
      // turu zaten yakalar, her 5 saniyede bir aynı satırı basmanın anlamı yok.
      if (Date.now() > susturmaBitis) {
        console.error('[ikas] olay yoklama hatası:', err.message)
        susturmaBitis = Date.now() + 5 * 60 * 1000
      }
    } finally {
      calisiyor = false
    }
  }
  setTimeout(calistir, 15 * 1000)
  setInterval(calistir, IKAS_OLAY_ARALIGI_MS)
}

// UPS takip yoklayıcısı: gönderi ağa okutulunca "Gönderildi", teslim edilince "Teslim Edildi"
// bilgisini UPS'ten öğrenip yerele yazar (ikas'ın kendi UPS entegrasyonunun yaptığının aynısı,
// ama kontrol bizde). 10 dk: bildirim merkezi kargo olaylarını taşıdığından tazelik önemli
// (2026-07-28 kararı, eskiden 30 dk); UPS yükü artarsa tek satırla geri alınır.
const UPS_TAKIP_ARALIGI_MS = 10 * 60 * 1000
function upsTakipBaslat() {
  const { _takipleriYokla } = require('./ups/takip')
  let calisiyor = false // tur uzun sürerse üst üste binmesin
  const calistir = async () => {
    if (calisiyor) return
    try {
      calisiyor = true
      const r = await _takipleriYokla()
      if (r?.degisti) siparisDegisti(r) // açık sipariş ekranı anında tazelensin
      if (r?.hatalar?.length) console.error('[ups-takip] hatalar:', r.hatalar.slice(0, 5))
      // ikas'a bildirim ayrı sayılır: UPS sorgusu başarılı olup ikas yazımı düşebilir
      // (token süresi, paket durumu çakışması). Bu düşerse müşteri bildirim ALMAZ —
      // sessiz kalmamalı. Ayrıca online_siparisler.ikas_kargo_hata'ya da yazılır.
      if (r?.ikasBildirilen) console.log('[ups-takip] ikas\'a bildirilen sipariş:', r.ikasBildirilen)
      // Telafi: köprü eklenmeden önce teslim olmuş, ikas'ta "Kargoya Hazır"da takılı
      // kalmış siparişler. Bildirimsiz düzeltilir; sayı zamanla 0'a inmeli.
      if (r?.ikasTelafi) console.log('[ups-takip] ikas telafi (geçmiş teslim):', r.ikasTelafi)
      if (r?.ikasHatalari?.length) console.error('[ups-takip] ikas bildirim hataları:', r.ikasHatalari.slice(0, 5))
    } catch (err) {
      console.error('[ups-takip] yoklama hatası:', err.message)
    } finally {
      calisiyor = false
    }
  }
  setTimeout(calistir, 25 * 1000) // açılıştan 25 sn sonra (ikas/meta ile çakışmasın)
  setInterval(calistir, UPS_TAKIP_ARALIGI_MS)
}

// Sosyal medya (Facebook/Instagram) yorum & DM polling. ikas deseniyle aynı:
// masaüstü uygulama public webhook alamadığı için sık çekme. Kurulu değilse veya
// otomatik senkron kapalıysa atlanır. Çekilen öğeler yerel önbelleğe idempotent yazılır.
const META_SENK_ARALIGI_MS = 120 * 1000
function metaSosyalSenkBaslat() {
  const { _tumunuCek } = require('./meta')
  const { _ayarlariGetir } = require('./db/meta-ayarlar')
  const { _yurutucuMu } = require('./meta/yurutucu')
  let calisiyor = false // IG çekimi 20-60 sn sürebilir → turların üst üste binmesini önle.
  const calistir = async () => {
    if (calisiyor) return
    try {
      const a = _ayarlariGetir()
      if (!a.sayfa_token || a.otomatik_senk === '0') return
      // ÇİFT DM KİLİDİ: otomasyon durumu artık PC'ler arası ORTAK (her PC'den açılıp
      // kapatılabiliyor) ama YÜRÜTME tek PC'de olmalı. İki PC yoklarsa aynı yoruma iki DM
      // gider — "DM gitti" damgası (sosyal_mesajlar) senkronlanmadığı için dedup kurtarmaz.
      // Yürütücü seçilmemişse token'ı olan bu PC kendini atar (otomasyon kesilmesin).
      if (!_yurutucuMu({ sayfaToken: a.sayfa_token })) return
      calisiyor = true
      await _tumunuCek()
    } catch (err) {
      console.error('[meta] çekme hatası:', err.message)
    } finally {
      calisiyor = false
    }
  }
  setTimeout(calistir, 15 * 1000) // açılıştan 15 sn sonra ilk çekim
  setInterval(calistir, META_SENK_ARALIGI_MS)
}

// Kilit alınamadıysa (zaten bir örnek açık) HİÇBİR ŞEY başlatma — ne pencere, ne DB, ne polling.
// app.quit() tek başına yeterli görünse de whenReady ile yarışabilir; açık koruma daha güvenli.
if (tekOrnekKilidi) {
  app.whenReady().then(() => {
    require('./db/database').init()
    createWindow()
    ikasSiparisSenkBaslat()
    ikasOlayYoklayiciBaslat()
    upsTakipBaslat()
    metaSosyalSenkBaslat()
    // Güncelleme kontrolü renderer açılışında 'update:kontrolEt' ile tetiklenir.
  })
}

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
  require('./ups/takip'),
  require('./ups/bulut'),
  require('./ups/yakit'),
  require('./ups/etiket-yazdir'),
  require('./db/ikas-ayarlar'),
  require('./db/ayar-senk'),
  require('./db/online-siparisler'),
  require('./db/bildirimler'),
  require('./db/istek-listesi'),
  require('./istek-pdf'),
  require('./db/raporlar'),
  require('./db/panel'),
  require('./db/senk-veri'),
  require('./db/kasa'),
  require('./db/gider'),
  require('./db/malkabul'),
  require('./yedek'),
  require('./sistem'),
  require('./ikas'),
  require('./ikas/ekstra'),
  require('./db/setler'),
  require('./db/meta-ayarlar'),
  require('./db/sosyal-mesajlar'),
  require('./db/sosyal-otomasyon'),
  require('./meta/yurutucu'),
  require('./meta'),
  require('./meta/giris'),
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

