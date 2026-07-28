// Ürün barkod etiketi üretimi.
// OS-214 plus termal etiket yazıcısı, 45mm genişlik x 20mm yükseklik etiket için tasarlanmıştır.
// JsBarcode ile CODE128 barkodu SVG olarak üretilir; çıktı, yazdırma için tam HTML belgesi olur.
import JsBarcode from 'jsbarcode'

const SVG_NS = 'http://www.w3.org/2000/svg'

// Desteklenen etiket ölçüleri. Yazıcı PC'ye göre değişir (mağazada OS-214, ofiste XP-470B)
// → seçim cihaza özel localStorage'da tutulur (BarkodModal).
export const ETIKET_BOYUTLARI = [
  { kod: '45x20', genislik: 45, yukseklik: 20, ad: '45 x 20 mm (OS-214)' },
  { kod: '40x20', genislik: 40, yukseklik: 20, ad: '40 x 20 mm (XP-470B)' },
]
export const VARSAYILAN_BOYUT = '45x20'
export function boyutBul(kod) {
  return ETIKET_BOYUTLARI.find(b => b.kod === kod) || ETIKET_BOYUTLARI[0]
}
// Geriye uyum (eski içe aktarımlar için varsayılan ölçü).
export const ETIKET_GENISLIK_MM = 45
export const ETIKET_YUKSEKLIK_MM = 20

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

function tl(n) {
  return (Number(n) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺'
}

// Verilen değeri CODE128 barkodu olarak SVG metnine dönüştürür.
// Geçersiz/boş değerde hata fırlatır (çağıran taraf yakalar).
export function barkodSvg(deger) {
  const svg = document.createElementNS(SVG_NS, 'svg')
  JsBarcode(svg, String(deger), {
    format: 'CODE128',
    width: 1.3,
    height: 32,
    displayValue: false,
    margin: 0,
  })
  return new XMLSerializer().serializeToString(svg)
}

// Tek bir etiketin iç HTML'i (barkod SVG'si önceden üretilip paylaşılır).
function etiketIc({ magaza, ad, deger, fiyat, fiyatGoster }, svg) {
  return `
    <div class="etiket">
      ${magaza ? `<div class="magaza">${esc(magaza)}</div>` : ''}
      <div class="ad">${esc(ad)}</div>
      <div class="barkod">${svg}</div>
      <div class="numara">${esc(deger)}</div>
      ${fiyatGoster && fiyat != null ? `<div class="fiyat">${tl(fiyat)}</div>` : ''}
    </div>`
}

// adet kadar etiket içeren, yazdırılmaya hazır tam HTML belgesi üretir.
export function barkodYazdirHtml({ magaza, ad, deger, fiyat, adet = 1, fiyatGoster = true, boyut = VARSAYILAN_BOYUT }) {
  if (!deger) throw new Error('Barkod değeri boş olamaz')
  const olcu = boyutBul(boyut)
  const svg = barkodSvg(deger)
  const tekEtiket = etiketIc({ magaza, ad, deger, fiyat, fiyatGoster }, svg)
  const etiketler = Array.from({ length: Math.max(1, adet) }, () => tekEtiket).join('')
  // Fiyat satırı varken 20mm yüksekliğe her şey sığmıyordu (ad kırpılıyordu).
  // Fiyatlı düzen bütçesi (kullanılabilir ~18.4mm): mağaza 2 + ad 2×2.1 + barkod 5.5
  // + numara 2.3 + fiyat 3 + boşluklar ≈ 17.6mm → ada İKİ TAM satır kalır.
  const barkodMaksMm = fiyatGoster ? 5.5 : 9
  const adPt = fiyatGoster ? 6 : 6.5
  const magazaPt = fiyatGoster ? 5.5 : 6
  const numaraPt = fiyatGoster ? 6.5 : 7

  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<style>
  @page { size: ${olcu.genislik}mm ${olcu.yukseklik}mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, 'Segoe UI', sans-serif; color: #000; }
  .etiket {
    width: ${olcu.genislik}mm;
    height: ${olcu.yukseklik}mm;
    padding: 0.8mm 1.5mm;
    text-align: center;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    page-break-after: always;
  }
  .etiket:last-child { page-break-after: auto; }
  .magaza { font-size: ${magazaPt}pt; font-weight: bold; letter-spacing: 0.5px; line-height: 1; }
  .ad {
    font-size: ${adPt}pt; line-height: 1.05; max-height: 2.1em; overflow: hidden;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    word-break: break-word;
  }
  .barkod { line-height: 0; margin: 0.4mm 0 0.2mm; }
  .barkod svg { width: 100%; height: auto; max-height: ${barkodMaksMm}mm; }
  .numara { font-size: ${numaraPt}pt; letter-spacing: 1.5px; line-height: 1; }
  .fiyat { font-size: 8.5pt; font-weight: bold; line-height: 1.05; }
</style></head><body>${etiketler}</body></html>`
}
