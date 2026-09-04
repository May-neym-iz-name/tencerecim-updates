// Büyük HTML'i (onlarca gömülü base64 görsel/etiket) bir BrowserWindow'a yükler.
// data: URL ile yüklemek Chromium'un URL uzunluk sınırını aşınca ERR_INVALID_URL (-300)
// verir; toplu basımda (çok sayıda etiket) bu sınır aşılır. Geçici .html dosyası +
// loadFile sınırı tamamen ortadan kaldırır. Yükleme bitince (did-finish-load) içerik
// render'a gömülüdür, kaynak dosya güvenle silinir.
const { app } = require('electron')
const fs = require('fs')
const path = require('path')

// Geçici dosyanın ADI önemlidir: "Microsoft Print to PDF" kaydetme kutusunu belgenin
// adından doldurur, belge adı boşsa URL'in dosya adına düşer. Eskiden ad hep
// `tnc-yazdir-<zaman damgası>` idi → kullanıcı her PDF'e adı elle yazıyordu.
// adKoku verilirse (ör. "Kargo-Etiketi-SIP-123") dosya adı da anlamlı olur.
function _dosyaAdi(adKoku) {
  const temiz = String(adKoku || '')
    .replace(/[\\/:*?"<>|]/g, '')   // Windows'un yasakladığı karakterler
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  const benzersiz = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return temiz ? `${temiz}.html` : `tnc-yazdir-${benzersiz}.html`
}

async function htmlYukle(win, html, adKoku) {
  const yol = path.join(app.getPath('temp'), _dosyaAdi(adKoku))
  fs.writeFileSync(yol, html, 'utf8')
  try { await win.loadFile(yol) }
  finally { try { fs.unlinkSync(yol) } catch {} }
}

module.exports = { htmlYukle, _dosyaAdi }
