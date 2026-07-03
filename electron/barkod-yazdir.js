// Ürün barkod etiketi yazdırma.
// Renderer, JsBarcode ile etiketlerin HTML'ini üretip buraya gönderir; burada gizli bir
// BrowserWindow'da yüklenip yazıcıya basılır. 45mm x 20mm OS-214 plus etiketi içindir.
const { BrowserWindow } = require('electron')

const ETIKET_GENISLIK_MIKRON = 45000 // 45mm
const ETIKET_YUKSEKLIK_MIKRON = 20000 // 20mm

// Geçici gizli pencere oluşturup verilen iş ile çalıştırır, sonra kapatır.
async function gizliPencereyle(is) {
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: false } })
  try {
    return await is(win)
  } finally {
    if (!win.isDestroyed()) win.close()
  }
}

// Sistemdeki yazıcıları listeler (etiket yazıcısını seçtirmek için).
async function yazicilariGetir() {
  return gizliPencereyle(async (win) => {
    const yazicilar = await win.webContents.getPrintersAsync()
    return yazicilar.map(y => ({
      ad: y.name,
      aciklama: y.displayName || y.description || y.name,
      varsayilan: !!y.isDefault,
    }))
  })
}

// Verilen HTML etiketlerini yazdırır.
// yazici verilirse o yazıcıya sessizce basar; verilmezse sistem yazdırma diyaloğu açılır.
async function barkodYazdir({ html, yazici }) {
  if (!html) throw new Error('Yazdırılacak etiket içeriği boş')
  return gizliPencereyle(async (win) => {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    await new Promise((resolve, reject) => {
      const secenekler = {
        silent: !!yazici,
        printBackground: true,
        margins: { marginType: 'none' },
        pageSize: { width: ETIKET_GENISLIK_MIKRON, height: ETIKET_YUKSEKLIK_MIKRON },
      }
      if (yazici) secenekler.deviceName = yazici
      win.webContents.print(secenekler, (success, failureReason) => {
        if (!success && failureReason && failureReason !== 'cancelled') {
          reject(new Error(`Barkod yazdırma hatası: ${failureReason}`))
        } else {
          resolve()
        }
      })
    })
    return { yazdirildi: true }
  })
}

// Verilen HTML'i görünür bir pencerede açar (kargo etiketi önizleme + yazdırma).
// Pencere içindeki "Yazdır" butonu window.print() çağırır.
async function onizlemeAc({ html, baslik }) {
  if (!html) throw new Error('Önizlenecek içerik boş')
  const win = new BrowserWindow({
    width: 820, height: 1000, title: baslik || 'Önizleme',
    autoHideMenuBar: true, webPreferences: { offscreen: false },
  })
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  return { acildi: true }
}

module.exports = {
  'barkod:yazicilar': () => yazicilariGetir(),
  'barkod:yazdir': ({ html, yazici }) => barkodYazdir({ html, yazici }),
  'kargo-etiket:onizle': ({ html, baslik }) => onizlemeAc({ html, baslik }),
}
