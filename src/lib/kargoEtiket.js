// Online sipariş için "TENCERECİM KARGO ETİKET" çıktısı HTML'i üretir.
// Veri electron 'kargo-etiket:veri' handler'ından gelir; burada yalnızca sunum.

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function tl(n) {
  const v = Number(n) || 0
  return '₺ ' + v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function satir(label, deger) {
  if (deger == null || deger === '') return ''
  return `<div class="ln"><span class="lbl">${esc(label)}</span> <span class="val">${esc(deger)}</span></div>`
}

export function kargoEtiketHtml(d) {
  const adres = [d.teslimat_adres, [d.teslimat_ilce, d.teslimat_il].filter(Boolean).join(' / ')]
    .filter(Boolean).join('\n')

  const kalemler = (d.kalemler || []).map(k => `
    <tr>
      <td class="img">${k.resim ? `<img src="${esc(k.resim)}" alt="">` : '<div class="ph"></div>'}</td>
      <td class="ad"><b>${k.miktar}x</b> ${esc(k.ad)}</td>
      <td class="marka">${esc(k.marka)}</td>
      <td class="sku">${esc(k.sku)}</td>
      <td class="fiyat">${tl(k.birim_fiyat)}</td>
    </tr>`).join('')

  return `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<title>Kargo Etiketi ${esc(d.siparis_no || '')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 28px 34px; font-size: 13px; }
  .toolbar { position: sticky; top: 0; text-align: right; margin: -10px -10px 10px; }
  .toolbar button { font-size: 14px; padding: 8px 18px; border: 0; border-radius: 8px; background: #2563eb; color: #fff; cursor: pointer; }
  .head { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e5e5e5; padding-bottom: 10px; }
  .head .tarih { font-size: 12px; color: #333; }
  .head .mark { font-weight: 800; letter-spacing: 1px; color: #1a1a1a; }
  h1 { font-size: 26px; font-weight: 800; margin: 22px 0 18px; letter-spacing: .5px; }
  .grid { display: flex; justify-content: space-between; gap: 20px; }
  .ln { margin: 4px 0; line-height: 1.5; }
  .lbl { color: #333; }
  .val { color: #000; font-weight: 500; }
  .adres { white-space: pre-line; }
  .ucret { font-weight: 600; white-space: nowrap; }
  table { width: 100%; border-collapse: collapse; margin-top: 26px; }
  td { padding: 12px 6px; border-bottom: 1px solid #eee; vertical-align: middle; }
  td.img { width: 54px; }
  td.img img { width: 46px; height: 46px; object-fit: contain; }
  td.img .ph { width: 46px; height: 46px; background: #f2f2f2; border-radius: 4px; }
  td.ad { font-size: 13px; }
  td.marka, td.sku { font-size: 11px; color: #666; white-space: nowrap; }
  td.fiyat { text-align: right; white-space: nowrap; font-size: 12px; }
  @media print { .toolbar { display: none; } body { padding: 12px 18px; } }
</style></head>
<body>
  <div class="toolbar"><button onclick="window.print()">🖨 Yazdır</button></div>
  <div class="head">
    <span class="tarih">${esc(d.siparis_tarihi || '')}</span>
    <span class="mark">TENCERECİM</span>
    <span style="width:80px"></span>
  </div>
  <h1>TENCERECİM KARGO ETİKET</h1>
  <div class="grid">
    <div>
      ${satir('Sipariş No:', d.siparis_no)}
      ${satir('Takip Numarası:', d.takip_no)}
      ${satir('Kargo Kural İsmi:', d.kargoKurali)}
      ${satir('Gönderen:', d.gonderen)}
      ${satir('Satış Kanalı:', d.satisKanali)}
      ${satir('Alıcı Ad-Soyad:', d.musteri_ad)}
      ${satir('Alıcı Telefon:', d.musteri_telefon)}
      <div class="ln"><span class="lbl">Alıcı Adresi:</span> <span class="val adres">${esc(adres)}</span></div>
      ${satir('Sipariş Tarihi ve Saati:', d.siparis_tarihi)}
      ${satir('Ödeme Yöntemi:', d.odeme_yontemi)}
    </div>
    <div class="ucret">${d.kargoKurali ? `${esc(d.kargoKurali)}: ${tl(d.kargoUcreti)}` : ''}</div>
  </div>
  <table><tbody>${kalemler}</tbody></table>
</body></html>`
}
