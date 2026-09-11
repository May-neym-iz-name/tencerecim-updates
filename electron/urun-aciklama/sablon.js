// ÜRÜN AÇIKLAMA ŞABLONU — saf fonksiyon, ağa çıkmaz, DB'ye dokunmaz.
//
// Sitedeki ürün açıklamalarını TEK formata çevirir: üstte kısa SEO paragrafı,
// altında açılır-kapanır (akordeon) bölümler.
//
// Renkler tema paletinden: krem #ecdf93 (başlık zemini), lacivert #052238 (mürekkep).
//
// KURAL: bu dosya bilgi ÜRETMEZ. Kendisine verilen metinleri biçimlendirir.
// Bir bölümün metni boşsa o bölüm HİÇ yazılmaz (boş akordeon üretme).

const KREM = '#ecdf93'
const LACIVERT = '#052238'

// ikas açıklama alanı HTML kabul eder; kullanıcı/tedarikçi metni oraya
// kaçışlanmadan girerse biçim bozulur. & < > " hepsi kapatılır.
function kacir(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Bölüm sırası ve başlıkları SABİT — tek format olmasının anlamı bu.
const BOLUMLER = [
  { anahtar: 'icerik', baslik: '🍲 Ürün İçeriği' },
  { anahtar: 'malzeme', baslik: '🧪 Malzeme ve Yapı' },
  { anahtar: 'saglik', baslik: '❤️ Kullanım ve Bakım' },
]

function akordeon(baslik, govde) {
  return [
    `<details style="margin:8px 0;border:1px solid ${KREM};border-radius:8px;overflow:hidden">`,
    `<summary style="background:${KREM};color:${LACIVERT};padding:10px 14px;`
      + `font-weight:600;cursor:pointer;list-style:none">${kacir(baslik)}</summary>`,
    `<div style="padding:12px 14px;color:${LACIVERT};line-height:1.6">${govde}</div>`,
    `</details>`,
  ].join('')
}

// Bir bölümün gövdesi: tek metin ya da madde listesi olabilir.
function govde(deger) {
  if (Array.isArray(deger)) {
    const maddeler = deger.map(m => String(m || '').trim()).filter(Boolean)
    if (!maddeler.length) return ''
    return `<ul style="margin:0;padding-left:20px">`
      + maddeler.map(m => `<li>${kacir(m)}</li>`).join('')
      + `</ul>`
  }
  const metin = String(deger == null ? '' : deger).trim()
  return metin ? `<p style="margin:0">${kacir(metin)}</p>` : ''
}

// bilgi: { seo: string, icerik: string|string[], malzeme: ..., saglik: ... }
// Dönen: ikas description alanına yazılacak HTML.
function uret(bilgi) {
  const b = bilgi || {}
  const parcalar = []

  const seo = String(b.seo || '').trim()
  if (seo) {
    parcalar.push(
      `<p style="color:${LACIVERT};line-height:1.7;margin:0 0 14px">${kacir(seo)}</p>`
    )
  }

  for (const { anahtar, baslik } of BOLUMLER) {
    const g = govde(b[anahtar])
    if (g) parcalar.push(akordeon(baslik, g))
  }

  return parcalar.join('\n')
}

module.exports = { uret, kacir, BOLUMLER, KREM, LACIVERT }
