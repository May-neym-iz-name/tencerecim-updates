// İstek listesi PDF üretimi — gizli BrowserWindow + webContents.printToPDF().
// HTML üreten _istekHtml SAF tutulur (DB/electron'suz test edilir). Logo base64
// gömülür (renderer asset yolu main'den okunamaz; gömülü veri PDF'i kendine yeterli kılar).
const { BrowserWindow, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { getDb } = require('./db/database')
const { htmlYukle } = require('./html-yukle')

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

// Logo bir kez okunur (asar içinden fs.readFileSync çalışır). Yoksa boş string.
let logoCache
function logoDataUri() {
  if (logoCache === undefined) {
    try {
      const buf = fs.readFileSync(path.join(__dirname, 'assets', 'istek-logo.png'))
      logoCache = `data:image/png;base64,${buf.toString('base64')}`
    } catch {
      logoCache = ''
    }
  }
  return logoCache
}

function _istekHtml(liste, logoUri) {
  const satirlar = (liste.kalemler || []).map((k, i) => `
    <tr>
      <td class="no">${i + 1}</td>
      <td class="ad">${esc(k.urun_adi)}</td>
      <td class="adet">${esc(k.miktar)}</td>
    </tr>`).join('')
  const toplamAdet = (liste.kalemler || []).reduce((t, k) => t + (Number(k.miktar) || 0), 0)

  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
  .ust { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
  .ust img { height: 54px; }
  .baslik h1 { font-size: 18px; }
  .baslik .alt { color: #555; font-size: 12px; margin-top: 2px; }
  .bilgi { display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 12px; }
  .bilgi .kutu { max-width: 60%; }
  .bilgi .etiket { color: #888; font-size: 10px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 7px 9px; text-align: left; }
  th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; color: #444; }
  td.no, th.no { width: 40px; text-align: center; }
  td.adet, th.adet { width: 80px; text-align: center; font-weight: bold; }
  tfoot td { font-weight: bold; background: #fafafa; }
  .footer { margin-top: 18px; color: #999; font-size: 10px; text-align: center; }
</style></head><body>
  <div class="ust">
    ${logoUri ? `<img src="${logoUri}" alt="logo">` : ''}
    <div class="baslik">
      <h1>Tedarik İstek Listesi</h1>
      <div class="alt">Tencerecim</div>
    </div>
  </div>
  <div class="bilgi">
    <div class="kutu">
      <div class="etiket">Şube</div>
      <div><strong>${esc(liste.lokasyon_adi || '-')}</strong></div>
      ${liste.lokasyon_adres ? `<div>${esc(liste.lokasyon_adres)}</div>` : ''}
    </div>
    <div>
      <div class="etiket">Tedarikçi</div>
      <div><strong>${esc(liste.tedarikci_adi || '-')}</strong></div>
      <div class="etiket" style="margin-top:6px">Tarih</div>
      <div>${esc(liste.tarih || '-')}</div>
    </div>
  </div>
  <table>
    <thead><tr><th class="no">#</th><th>Ürün</th><th class="adet">Adet</th></tr></thead>
    <tbody>${satirlar}</tbody>
    <tfoot><tr><td colspan="2" style="text-align:right">Toplam Adet</td><td class="adet">${toplamAdet}</td></tr></tfoot>
  </table>
  <div class="footer">Bu belge Tencerecim mağaza programı tarafından oluşturulmuştur.</div>
</body></html>`
}

function pdfVeriGetir(id) {
  const db = getDb()
  const liste = db.prepare(`
    SELECT i.*, l.ad AS lokasyon_adi, COALESCE(g.adres, l.adres) AS lokasyon_adres,
           t.ad AS tedarikci_adi
    FROM istek_listeleri i
    LEFT JOIN lokasyonlar l ON i.lokasyon_id = l.id
    LEFT JOIN lokasyon_gonderici g ON i.lokasyon_id = g.lokasyon_id
    LEFT JOIN tedarikciler t ON i.tedarikci_id = t.id
    WHERE i.id = ?
  `).get(id)
  if (!liste) throw new Error('İstek listesi bulunamadı')
  liste.kalemler = db.prepare(
    'SELECT urun_adi, miktar FROM istek_listesi_kalemleri WHERE istek_id = ? ORDER BY id'
  ).all(id)
  return liste
}

function dosyaAdi(liste) {
  const temiz = (s) => String(s || '').replace(/[^\wğüşöçıİĞÜŞÖÇ ]/gi, '').trim().replace(/\s+/g, '-')
  return `istek-${temiz(liste.lokasyon_adi) || 'sube'}-${temiz(liste.tedarikci_adi) || 'tedarikci'}-${liste.tarih || ''}.pdf`
}

async function istekPdfKaydet(id) {
  const liste = pdfVeriGetir(id)
  const html = _istekHtml(liste, logoDataUri())

  const sonuc = await dialog.showSaveDialog({
    title: 'İstek Listesi PDF Kaydet',
    defaultPath: dosyaAdi(liste),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (sonuc.canceled || !sonuc.filePath) return { kaydedildi: false }

  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: false } })
  try {
    await htmlYukle(win, html)
    const pdf = await win.webContents.printToPDF({ printBackground: true, pageSize: 'A4', margins: { marginType: 'default' } })
    fs.writeFileSync(sonuc.filePath, pdf)
    return { kaydedildi: true, yol: sonuc.filePath }
  } finally {
    if (!win.isDestroyed()) win.close()
  }
}

module.exports = {
  _istekHtml,
  'istek:pdf': (id) => istekPdfKaydet(id),
}
