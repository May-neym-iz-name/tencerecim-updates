// Online sipariş için "TENCERECİM KARGO ETİKET" çıktısı HTML'i üretir.
// Veri electron 'kargo-etiket:veri' handler'ından; barkod (takip no'dan üretilen
// CODE128 SVG) ve logo (base64) çağıran tarafça hazırlanıp geçilir.

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
  const firma = d.kargo_firma || 'UPS'

  // Toplamlar: fiyatlar KDV dahil kabul edilir; ürün başına KDV oranıyla ayrıştırılır.
  let araToplam = 0, kdvToplam = 0
  for (const k of (d.kalemler || [])) {
    const dahil = (Number(k.birim_fiyat) || 0) * (Number(k.miktar) || 1)
    const oran = (Number(k.kdv) || 20) / 100
    const haric = dahil / (1 + oran)
    araToplam += haric
    kdvToplam += dahil - haric
  }
  const netToplam = araToplam + kdvToplam

  const kalemler = (d.kalemler || []).map(k => `
    <tr>
      <td class="img">${k.resim ? `<img src="${esc(k.resim)}" alt="">` : '<div class="ph"></div>'}</td>
      <td class="ad"><b>${k.miktar}x</b> ${esc(k.ad)}</td>
      <td class="marka">${esc(k.marka)}</td>
      <td class="sku">${esc(k.sku)}</td>
      <td class="fiyat">${tl(k.birim_fiyat)}</td>
    </tr>`).join('')

  // Sağ üst kutu: takip barkodu + numara + kargo firması + kargo ücreti.
  const barkodKutu = d.takip_no ? `
    <div class="sag">
      ${d.barkodSvg ? `<div class="barkod-svg">${d.barkodSvg}</div>` : ''}
      <div class="takip-no">${esc(d.takip_no)}</div>
      <div class="firma">Paket Kargo Firması / ${esc(firma)} Kargo</div>
      ${d.kargoKurali ? `<div class="ucret">${esc(d.kargoKurali)}: ${tl(d.kargoUcreti)}</div>` : ''}
    </div>` : `
    <div class="sag">
      ${d.kargoKurali ? `<div class="ucret">${esc(d.kargoKurali)}: ${tl(d.kargoUcreti)}</div>` : ''}
    </div>`

  return `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<title>Kargo Etiketi ${esc(d.siparis_no || '')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 28px 34px; font-size: 13px; }
  .toolbar { position: sticky; top: 0; text-align: right; margin: -10px -10px 10px; }
  .toolbar button { font-size: 14px; padding: 8px 18px; border: 0; border-radius: 8px; background: #2563eb; color: #fff; cursor: pointer; }
  .head { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e5e5e5; padding-bottom: 10px; }
  .head .tarih { font-size: 12px; color: #333; flex: 1; }
  .head .logo { flex: 1; text-align: center; }
  .head .logo img { height: 46px; width: auto; }
  .head .bos { flex: 1; }
  h1 { font-size: 26px; font-weight: 800; margin: 22px 0 6px; letter-spacing: .5px; }
  .firma-ust { color: #333; margin-bottom: 16px; font-size: 13px; }
  .grid { display: flex; justify-content: space-between; gap: 24px; }
  .ln { margin: 4px 0; line-height: 1.5; }
  .lbl { color: #333; }
  .val { color: #000; font-weight: 600; }
  .adres { white-space: pre-line; }
  .sag { text-align: center; min-width: 290px; }
  .barkod-svg { line-height: 0; }
  .barkod-svg svg { width: 280px; height: auto; max-height: 90px; }
  .takip-no { font-family: 'Consolas', monospace; font-weight: 700; font-size: 13px; letter-spacing: 1.5px; color: #1a4bd8; margin-top: 2px; }
  .firma { margin-top: 14px; font-size: 13px; color: #222; }
  .ucret { font-weight: 600; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 26px; }
  td { padding: 12px 6px; border-bottom: 1px solid #eee; vertical-align: middle; }
  td.img { width: 54px; }
  td.img img { width: 46px; height: 46px; object-fit: contain; }
  td.img .ph { width: 46px; height: 46px; background: #f2f2f2; border-radius: 4px; }
  td.ad { font-size: 13px; }
  td.marka, td.sku { font-size: 11px; color: #666; white-space: nowrap; }
  td.fiyat { text-align: right; white-space: nowrap; font-size: 12px; }
  .toplamlar { width: 280px; margin-left: auto; margin-top: 14px; font-size: 13px; }
  .toplamlar > div { display: flex; justify-content: space-between; padding: 6px 2px; border-bottom: 1px solid #eee; }
  .toplamlar .net { font-weight: 800; font-size: 15px; border-bottom: none; border-top: 2px solid #333; margin-top: 2px; }
  @media print { .toolbar { display: none; } body { padding: 12px 18px; } }
</style></head>
<body>
  <div class="toolbar"><button onclick="window.print()">🖨 Yazdır</button></div>
  <div class="head">
    <span class="tarih">${esc(d.siparis_tarihi || '')}</span>
    <span class="logo">${d.logo ? `<img src="${esc(d.logo)}" alt="">` : ''}</span>
    <span class="bos"></span>
  </div>
  <h1>TENCERECİM KARGO ETİKET</h1>
  <div class="firma-ust">${esc(firma)} Kargo</div>
  <div class="grid">
    <div class="sol">
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
    ${barkodKutu}
  </div>
  <table><tbody>${kalemler}</tbody></table>
  <div class="toplamlar">
    <div><span>Ara Toplam (KDV Hariç)</span><span>${tl(araToplam)}</span></div>
    <div><span>KDV</span><span>${tl(kdvToplam)}</span></div>
    <div class="net"><span>Net Toplam</span><span>${tl(netToplam)}</span></div>
  </div>
</body></html>`
}
