// Ürün barkod etiketi yazdırma.
// Renderer, JsBarcode ile etiketlerin HTML'ini üretip buraya gönderir; burada gizli bir
// BrowserWindow'da yüklenip yazıcıya basılır. 45mm x 20mm OS-214 plus etiketi içindir.
const { BrowserWindow } = require('electron')
const { htmlYukle } = require('./html-yukle')

// Varsayılan etiket ölçüsü (renderer boyut gönderirse o kullanılır — 40x20 XP-470B vb.)
const VARSAYILAN_GENISLIK_MM = 45
const VARSAYILAN_YUKSEKLIK_MM = 20

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
async function barkodYazdir({ html, yazici, genislikMm, yukseklikMm }) {
  if (!html) throw new Error('Yazdırılacak etiket içeriği boş')
  // Sayfa boyutu etiketle AYNI olmalı — 40mm etikete 45mm sayfa gönderilirse
  // bazı sürücüler (XP-470B) işi sessizce reddediyor/kaydırıyor.
  const gen = Math.round((Number(genislikMm) || VARSAYILAN_GENISLIK_MM) * 1000)
  const yuk = Math.round((Number(yukseklikMm) || VARSAYILAN_YUKSEKLIK_MM) * 1000)
  return gizliPencereyle(async (win) => {
    await htmlYukle(win, html)
    await new Promise((resolve, reject) => {
      const secenekler = {
        silent: !!yazici,
        printBackground: true,
        margins: { marginType: 'none' },
        pageSize: { width: gen, height: yuk },
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
  await htmlYukle(win, html)
  return { acildi: true }
}

module.exports = {
  'barkod:yazicilar': () => yazicilariGetir(),
  'barkod:yazdir': ({ html, yazici, genislikMm, yukseklikMm }) => barkodYazdir({ html, yazici, genislikMm, yukseklikMm }),
  'kargo-etiket:onizle': ({ html, baslik }) => onizlemeAc({ html, baslik }),
}
