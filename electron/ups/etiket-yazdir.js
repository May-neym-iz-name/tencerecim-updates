// UPS kargo etiketi (base64 PNG) yazdırma.
// UPS kuralı: barkod en az 2cm genişlik, 12cm yükseklik, min 200 dpi. Bu yüzden ürün barkodundan
// (45x20mm) farklı, daha büyük bir etikete (varsayılan 100x150mm) basılır.
const { BrowserWindow } = require('electron')

// Sayfa başına etiket düzenleri. 1 = termal etiket (100×150mm, 1 etiket/sayfa);
// 2 ve 4 = A4 sayfaya ızgara (yazıcıda kâğıda basanlar için).
// mm cinsinden sayfa ölçüsü + ızgara (kolon×satır). pageSize mikron olarak eşitlenir.
const DUZENLER = {
  1: { pageW: 100, pageH: 150, kolon: 1, satir: 1 },
  2: { pageW: 210, pageH: 297, kolon: 1, satir: 2 },
  4: { pageW: 210, pageH: 297, kolon: 2, satir: 2 },
}

async function gizliPencereyle(is) {
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: false } })
  try {
    return await is(win)
  } finally {
    if (!win.isDestroyed()) win.close()
  }
}

// PNG'leri sayfa-başına adete göre ızgara sayfalara böler. Her sayfa fiziksel mm
// ölçüsünde bir kutudur; böylece page-break her fiziksel sayfaya tam oturur.
function etiketHtml(pngler, duzen) {
  const perPage = duzen.kolon * duzen.satir
  const sayfalar = []
  for (let i = 0; i < pngler.length; i += perPage) sayfalar.push(pngler.slice(i, i + perPage))

  const sayfaHtml = sayfalar.map((grup, si) => {
    const hucreler = grup.map(b64 => {
      const src = b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`
      return `<div class="hucre"><img src="${src}"/></div>`
    }).join('')
    const sayfaSonu = si < sayfalar.length - 1 ? 'page-break-after:always;' : ''
    return `<div class="sayfa" style="width:${duzen.pageW}mm;height:${duzen.pageH}mm;
      grid-template-columns:repeat(${duzen.kolon},1fr);grid-template-rows:repeat(${duzen.satir},1fr);${sayfaSonu}">${hucreler}</div>`
  }).join('')

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page{margin:0;size:${duzen.pageW}mm ${duzen.pageH}mm}
    html,body{margin:0;padding:0}
    .sayfa{display:grid;box-sizing:border-box;}
    .hucre{display:flex;align-items:center;justify-content:center;overflow:hidden;padding:${duzen.kolon > 1 || duzen.satir > 1 ? '3mm' : '0'};}
    .hucre img{max-width:100%;max-height:100%;object-fit:contain;display:block;}
    </style></head><body>${sayfaHtml}</body></html>`
}

// pngler: base64 dizisi. sayfaBasina: 1|2|4 (sayfa başına etiket). yazici verilirse sessiz basar.
async function etiketYazdir({ pngler, yazici, sayfaBasina = 1 }) {
  if (!pngler || !pngler.length) throw new Error('Yazdırılacak etiket bulunamadı')
  const duzen = DUZENLER[sayfaBasina] || DUZENLER[1]
  const html = etiketHtml(pngler, duzen)
  return gizliPencereyle(async (win) => {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    await new Promise((resolve, reject) => {
      const secenekler = {
        silent: !!yazici,
        printBackground: true,
        margins: { marginType: 'none' },
        pageSize: { width: duzen.pageW * 1000, height: duzen.pageH * 1000 }, // mm → mikron
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
  'kargo:etiket-yazdir': ({ pngler, yazici, sayfaBasina }) => etiketYazdir({ pngler, yazici, sayfaBasina }),
}
