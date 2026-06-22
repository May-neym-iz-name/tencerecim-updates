// UPS kargo etiketi (base64 PNG) yazdırma.
// UPS kuralı: barkod en az 2cm genişlik, 12cm yükseklik, min 200 dpi. Bu yüzden ürün barkodundan
// (45x20mm) farklı, daha büyük bir etikete (varsayılan 100x150mm) basılır.
const { BrowserWindow } = require('electron')

const ETIKET_GENISLIK_MIKRON = 100000 // 100mm
const ETIKET_YUKSEKLIK_MIKRON = 150000 // 150mm

async function gizliPencereyle(is) {
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: false } })
  try {
    return await is(win)
  } finally {
    if (!win.isDestroyed()) win.close()
  }
}

// Her PNG'yi tam sayfa kaplayacak şekilde HTML'e gömer.
function etiketHtml(pngler) {
  const sayfalar = pngler.map((b64, i) => {
    // Zaten data: ile başlıyorsa olduğu gibi kullan.
    const src = b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`
    const sayfaSonu = i < pngler.length - 1 ? 'page-break-after:always;' : ''
    return `<div style="width:100%;height:100%;${sayfaSonu}display:flex;align-items:center;justify-content:center;">
      <img src="${src}" style="max-width:100%;max-height:100%;object-fit:contain;" />
    </div>`
  }).join('')
  return `<!doctype html><html><head><meta charset="utf-8">
    <style>@page{margin:0}html,body{margin:0;padding:0;width:100%;height:100%}img{display:block}</style>
    </head><body>${sayfalar}</body></html>`
}

// pngler: base64 string dizisi. yazici verilirse sessizce o yazıcıya basar.
async function etiketYazdir({ pngler, yazici }) {
  if (!pngler || !pngler.length) throw new Error('Yazdırılacak etiket bulunamadı')
  const html = etiketHtml(pngler)
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
          reject(new Error(`Etiket yazdırma hatası: ${failureReason}`))
        } else {
          resolve()
        }
      })
    })
    return { yazdirildi: true }
  })
}

module.exports = {
  'kargo:etiket-yazdir': ({ pngler, yazici }) => etiketYazdir({ pngler, yazici }),
}
