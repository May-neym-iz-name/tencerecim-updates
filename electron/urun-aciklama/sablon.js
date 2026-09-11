// ÜRÜN AÇIKLAMA ŞABLONU — saf fonksiyon, ağa çıkmaz, DB'ye dokunmaz.
//
// SEÇİLEN TASARIM (kullanıcı kararı, _urun-aciklama-onizleme/ önizlemesiyle onaylandı):
// açılır-kapanır akordeon, emoji başlıklı, marka renkleri krem #ecdf93 + lacivert #052238.
// Çıktı ikas açıklama alanına giden SATIR-İÇİ stilli HTML'dir —
// <style> ve <script> ikas tarafından silinir, <details> ise JS'siz çalışır.
//
// 11.09 DÜZELTMESİ — OK İŞARETİ:
// Summary'de `list-style:none` VARDI; bu, tarayıcının açılır-kapanır üçgenini siliyordu.
// Müşteri bölmenin açılabildiğini göremiyordu. Kaldırıldı: yerli üçgen geri geldi ve
// açılıp kapandıkça KENDİLİĞİNDEN dönüyor. Özel ok çizmek işe yaramaz, çünkü durumuna
// göre döndürmek CSS gerektirir ve ikas <style> etiketini siliyor.
//
// KURAL: bu dosya bilgi ÜRETMEZ, biçimlendirir. Boş bölüm için akordeon açmaz.
// Rozetler KOŞULLU: doğrulanmamış iddia yazılmaz.

const RENK = {
  krem: '#ecdf93',        // marka kremi — dolu rozet zemini
  kremYum: '#f6f2df',     // yumuşak krem — başlık şeridi
  kremKenar: '#e2dcc2',   // kenarlık
  lacivert: '#052238',    // marka laciverti — mürekkep
  govde: '#1a2230',       // gövde metni
}

function kacir(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Bölüm sırası ve başlıkları SABİT — "tek format" olmasının anlamı bu.
// İlk bölme AÇIK başlar: müşteri içerik olduğunu görsün.
const BOLUMLER = [
  { anahtar: 'icerik', baslik: '🍲 Ürün İçeriği', acik: true },
  { anahtar: 'malzeme', baslik: '🧪 Malzeme', acik: false },
  { anahtar: 'saglik', baslik: '❤️ Sağlık', acik: false },
]

function bolme({ baslik, govde, acik }) {
  return (
    `<details${acik ? ' open' : ''} style="border:1px solid ${RENK.kremKenar};border-radius:10px;margin:0 0 10px;overflow:hidden">` +
      // list-style BİLEREK ayarlanmadı → yerli açılır-kapanır üçgeni görünür kalsın.
      `<summary style="background:${RENK.kremYum};padding:13px 16px;font-weight:700;` +
        `color:${RENK.lacivert};font-size:15px;cursor:pointer">${kacir(baslik)}</summary>` +
      `<div style="padding:13px 16px;font-size:14.5px">${govde}</div>` +
    `</details>`
  )
}

function rozet(metin, dolu) {
  const stil = dolu
    ? `background:${RENK.lacivert};color:${RENK.krem}`
    : `background:${RENK.krem};color:${RENK.lacivert}`
  return `<span style="${stil};border-radius:8px;padding:9px 15px;font-weight:800;font-size:13.5px">${kacir(metin)}</span>`
}

// Bir bölümün gövdesi: tek metin ya da madde listesi.
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

/**
 * @param {object} bilgi
 * @param {string} bilgi.seo      Gemini SEO paragrafı (düz metin)
 * @param {string|string[]} bilgi.icerik
 * @param {string|string[]} bilgi.malzeme
 * @param {string|string[]} bilgi.saglik
 * @param {boolean} bilgi.celik   304/18-10 rozeti
 * @param {'evet'|'hayir'|'bilinmiyor'} bilgi.induksiyon  YALNIZ 'evet' rozet yazar
 * @param {boolean} bilgi.garanti 2 yıl garanti rozeti (outlet'te false)
 */
function uret(bilgi) {
  const b = bilgi || {}
  const parcalar = []

  const seo = String(b.seo || '').trim()
  if (seo) parcalar.push(`<p style="font-size:15.5px;margin:0 0 16px">${kacir(seo)}</p>`)

  for (const { anahtar, baslik, acik } of BOLUMLER) {
    const g = govde(b[anahtar])
    if (g) parcalar.push(bolme({ baslik, govde: g, acik }))
  }

  // ROZETLER — yalnız doğrulanmış/uygun olanlar. Varsayım YOK.
  const rozetler = []
  if (b.celik) rozetler.push(rozet('★ 304 / 18-10 Çelik', true))
  if (b.induksiyon === 'evet') {
    rozetler.push(`<span style="background:#eef1f4;color:${RENK.lacivert};border:1px solid #d6dbe2;`
      + `border-radius:8px;padding:9px 15px;font-weight:800;font-size:13.5px">⚡ İndüksiyon Uyumlu</span>`)
  }
  if (b.garanti) rozetler.push(rozet('🛡️ 2 Yıl Garanti', false))
  if (rozetler.length) {
    parcalar.push(`<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">${rozetler.join('')}</div>`)
  }

  if (!parcalar.length) return ''
  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;`
    + `color:${RENK.govde};line-height:1.6;max-width:760px">${parcalar.join('')}</div>`
}

module.exports = { uret, kacir, BOLUMLER, RENK }
