// Satış fişi yazdırma — gizli BrowserWindow'da HTML fiş oluşturup yazıcıya gönderir.
// 80mm termal fiş yazıcısı ve normal A4 yazıcıyla uyumludur (sistem yazdırma diyaloğu açılır).
const { BrowserWindow } = require('electron')
const { getDb } = require('./db/database')

function tl(n) {
  return (Number(n) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺'
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

function fisVerisiGetir(satisId) {
  const db = getDb()
  const satis = db.prepare(`
    SELECT s.*, l.ad AS lokasyon_adi, l.adres AS lokasyon_adres, l.telefon AS lokasyon_telefon,
           m.ad AS m_ad, m.soyad AS m_soyad
    FROM satislar s
    LEFT JOIN lokasyonlar l ON s.lokasyon_id = l.id
    LEFT JOIN musteriler m ON s.musteri_id = m.id
    WHERE s.id = ?
  `).get(satisId)
  if (!satis) throw new Error('Satış bulunamadı')
  satis.kalemler = db.prepare(`
    SELECT sk.*, u.ad AS urun_adi FROM satis_kalemleri sk
    JOIN urunler u ON sk.urun_id = u.id WHERE sk.satis_id = ?
  `).all(satisId)
  return satis
}

function fisHtml(satis) {
  const musteriAdi = satis.m_ad ? `${satis.m_ad} ${satis.m_soyad || ''}`.trim() : null
  const odemeEtiket = { nakit: 'Nakit', kredi_karti: 'Kredi Kartı', kart: 'Kart', havale: 'Havale' }[satis.odeme_tipi] || satis.odeme_tipi

  const kalemSatirlari = satis.kalemler.map(k => `
    <div class="kalem">
      <div class="kalem-ad">${esc(k.urun_adi)}</div>
      <div class="kalem-detay">
        <span>${k.miktar} x ${tl(k.birim_fiyat)}${k.iskonto_orani > 0 ? ` (-%${k.iskonto_orani})` : ''}</span>
        <span>${tl(k.toplam)}</span>
      </div>
    </div>`).join('')

  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; width: 76mm; padding: 4mm 3mm; }
  .merkez { text-align: center; }
  .magaza-ad { font-size: 15px; font-weight: bold; }
  .kucuk { font-size: 10px; }
  .ayrac { border-top: 1px dashed #000; margin: 6px 0; }
  .satir { display: flex; justify-content: space-between; }
  .kalem { margin-bottom: 4px; }
  .kalem-ad { font-weight: bold; }
  .kalem-detay { display: flex; justify-content: space-between; padding-left: 6px; }
  .toplam-genel { font-size: 14px; font-weight: bold; }
  .footer { margin-top: 8px; font-size: 10px; }
  @media print { body { width: auto; } }
</style></head><body>
  <div class="merkez">
    <div class="magaza-ad">${esc(satis.lokasyon_adi || 'Tencerecim')}</div>
    ${satis.lokasyon_adres ? `<div class="kucuk">${esc(satis.lokasyon_adres)}</div>` : ''}
    ${satis.lokasyon_telefon ? `<div class="kucuk">Tel: ${esc(satis.lokasyon_telefon)}</div>` : ''}
  </div>
  <div class="ayrac"></div>
  <div class="satir kucuk"><span>Fiş No:</span><span>${esc(satis.fis_no)}</span></div>
  <div class="satir kucuk"><span>Tarih:</span><span>${esc(satis.tarih)}</span></div>
  ${musteriAdi ? `<div class="satir kucuk"><span>Müşteri:</span><span>${esc(musteriAdi)}</span></div>` : ''}
  <div class="ayrac"></div>
  ${kalemSatirlari}
  <div class="ayrac"></div>
  <div class="satir"><span>Ara Toplam (KDV hariç)</span><span>${tl(satis.ara_toplam)}</span></div>
  ${satis.iskonto_toplam > 0 ? `<div class="satir"><span>İskonto</span><span>-${tl(satis.iskonto_toplam)}</span></div>` : ''}
  <div class="satir"><span>KDV</span><span>${tl(satis.kdv_toplam)}</span></div>
  <div class="ayrac"></div>
  <div class="satir toplam-genel"><span>TOPLAM</span><span>${tl(satis.genel_toplam)}</span></div>
  <div class="satir kucuk"><span>Ödeme</span><span>${esc(odemeEtiket)}</span></div>
  <div class="ayrac"></div>
  <div class="merkez footer">
    <div>Bizi tercih ettiğiniz için teşekkürler!</div>
    <div class="kucuk">Bu belge mali değeri olmayan satış fişidir.</div>
  </div>
</body></html>`
}

// satisId verilen satışın fişini yazdırır. sessiz=true ise diyalog açmadan
// varsayılan yazıcıya basar (termal yazıcı için ileride kullanılabilir).
async function fisYazdir(satisId, { sessiz = false } = {}) {
  const satis = fisVerisiGetir(satisId)
  const html = fisHtml(satis)

  const win = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: false },
  })

  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    await new Promise((resolve, reject) => {
      win.webContents.print(
        { silent: sessiz, printBackground: true, margins: { marginType: 'none' } },
        (success, failureReason) => {
          if (!success && failureReason && failureReason !== 'cancelled') {
            reject(new Error(`Yazdırma hatası: ${failureReason}`))
          } else {
            resolve()
          }
        }
      )
    })
    return { yazdirildi: true }
  } finally {
    if (!win.isDestroyed()) win.close()
  }
}

module.exports = {
  'fis:yazdir': ({ satis_id, sessiz }) => fisYazdir(satis_id, { sessiz }),
}
