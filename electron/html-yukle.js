// Büyük HTML'i (onlarca gömülü base64 görsel/etiket) bir BrowserWindow'a yükler.
// data: URL ile yüklemek Chromium'un URL uzunluk sınırını aşınca ERR_INVALID_URL (-300)
// verir; toplu basımda (çok sayıda etiket) bu sınır aşılır. Geçici .html dosyası +
// loadFile sınırı tamamen ortadan kaldırır. Yükleme bitince (did-finish-load) içerik
// render'a gömülüdür, kaynak dosya güvenle silinir.
const { app } = require('electron')
const fs = require('fs')
const path = require('path')

async function htmlYukle(win, html) {
  const yol = path.join(app.getPath('temp'), `tnc-yazdir-${Date.now()}-${Math.random().toString(36).slice(2)}.html`)
  fs.writeFileSync(yol, html, 'utf8')
  try { await win.loadFile(yol) }
  finally { try { fs.unlinkSync(yol) } catch {} }
}

module.exports = { htmlYukle }
