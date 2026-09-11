// ÜRÜN AÇIKLAMASI ŞABLON MOTORU (saf, Electron bağımsız → testlenebilir)
//
// Seçilen tasarım: AÇILIR-KAPANIR (akordeon), emoji başlıklı, marka renkleri
// krem #ecdf93 + lacivert #052238. Çıktı ikas ürün açıklama alanına yazılacak
// SATIR-İÇİ stilli HTML'dir (<style>/<script> ikas'ta silinir; <details> JS'siz çalışır).
//
// KURALLAR (CLAUDE.md + kullanıcı talimatı):
//  - Zorunlu bloklar: SEO giriş · Ürün İçeriği · Malzeme · Sağlık.
//  - Çelik üründe "304 kalite 18/10 paslanmaz çelik" vurgusu (celik=true).
//  - 2 yıl garanti rozeti (garanti=true; OUTLET üründe false → rozet YOK).
//  - İndüksiyon rozeti YALNIZ tedarikçiden DOĞRULANMIŞSA (induksiyon==='evet').
//    'hayir'/'bilinmiyor' → rozet yazılmaz (yanlış iddiadan kaçınmak için).
//  - Metinleri Gemini üretir; buraya düz metin olarak gelir ve KAÇIŞLANIR.

// HTML'e gömülecek metni güvenli hale getirir (Gemini/dış metin kırmasın).
function kacisla(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const RENK = { krem: '#ecdf93', kremYum: '#f6f2df', kremKenar: '#e2dcc2', lacivert: '#052238' }

// Tek akordeon bölmesi. acik=true ilk bölmeyi açık başlatır.
function bolme({ baslik, govde, acik }) {
  return (
    `<details${acik ? ' open' : ''} style="border:1px solid ${RENK.kremKenar};border-radius:10px;margin:0 0 10px;overflow:hidden">` +
      `<summary style="background:${RENK.kremYum};padding:13px 16px;font-weight:700;color:${RENK.lacivert};font-size:15px;list-style:none">${baslik}</summary>` +
      `<div style="padding:13px 16px;font-size:14.5px">${govde}</div>` +
    `</details>`
  )
}

function rozet({ metin, dolu }) {
  const stil = dolu
    ? `background:${RENK.lacivert};color:${RENK.krem}`
    : `background:${RENK.krem};color:${RENK.lacivert}`
  return `<span style="${stil};border-radius:8px;padding:9px 15px;font-weight:800;font-size:13.5px">${metin}</span>`
}

/**
 * Akordeon ürün açıklaması HTML'i üretir.
 * @param {object} p
 * @param {string} p.seoGiris   Gemini SEO giriş paragrafı (düz metin)
 * @param {string} p.urunIcerigi Kutu içeriği (düz metin)
 * @param {string} p.malzeme    Malzeme açıklaması (düz metin)
 * @param {string} p.saglik     Sağlık cümlesi (düz metin)
 * @param {boolean} p.celik     304/18-10 vurgusu yapılsın mı
 * @param {'evet'|'hayir'|'bilinmiyor'} p.induksiyon İndüksiyon rozeti durumu
 * @param {boolean} p.garanti   2 yıl garanti rozeti (outlet=false)
 * @returns {string} inline-stilli HTML
 */
function uretHtml(p) {
  const {
    seoGiris = '', urunIcerigi = '', malzeme = '', saglik = '',
    celik = false, induksiyon = 'bilinmiyor', garanti = true,
  } = p || {}

  const bolmeler =
    bolme({ baslik: '🍲 Ürün İçeriği', govde: kacisla(urunIcerigi), acik: true }) +
    bolme({ baslik: '🧪 Malzeme', govde: kacisla(malzeme), acik: false }) +
    bolme({ baslik: '❤️ Sağlık', govde: kacisla(saglik), acik: false })

  // Rozetler: yalnız doğrulanmış/uygun olanlar.
  const rozetler = []
  if (celik) rozetler.push(rozet({ metin: '★ 304 / 18-10 Çelik', dolu: true }))
  if (induksiyon === 'evet') {
    rozetler.push('<span style="background:#eef1f4;color:' + RENK.lacivert +
      ';border:1px solid #d6dbe2;border-radius:8px;padding:9px 15px;font-weight:800;font-size:13.5px">⚡ İndüksiyon Uyumlu</span>')
  }
  if (garanti) rozetler.push(rozet({ metin: '🛡️ 2 Yıl Garanti', dolu: false }))

  const rozetSatiri = rozetler.length
    ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">${rozetler.join('')}</div>`
    : ''

  return (
    `<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1a2230;line-height:1.6;max-width:760px">` +
      `<p style="font-size:15.5px;margin:0 0 16px">${kacisla(seoGiris)}</p>` +
      bolmeler +
      rozetSatiri +
    `</div>`
  )
}

module.exports = { uretHtml, kacisla, _RENK: RENK }
