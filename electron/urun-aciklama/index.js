// ÜRÜN AÇIKLAMA STÜDYOSU — orkestratör (main process)
// Akış: ikas'tan ürün oku → sınıflandır (çelik/garanti/indüksiyon) → Gemini SEO metni →
//       şablona döк → önizleme döndür. Yayınlama ayrı adım (aciklama-yaz).

const { uretHtml } = require('./sablon')
const { uretMetin } = require('./metin')

// --- Saf sınıflandırma (test edilebilir) ---

// Çelik/paslanmaz mı? Ad veya kategoride "çelik/paslanmaz" geçiyorsa.
function celikMi(ad = '', kategoriler = []) {
  const metin = (ad + ' ' + kategoriler.join(' ')).toLocaleLowerCase('tr')
  return /çelik|paslanmaz|18\/10|inox/.test(metin)
}

// Outlet ürününde garanti YOK.
function garantiVarMi(ad = '', kategoriler = [], etiketler = []) {
  const metin = (ad + ' ' + kategoriler.join(' ') + ' ' + etiketler.join(' ')).toLocaleLowerCase('tr')
  return !/outlet|2\.?\s*kalite|teşhir|hasarlı/.test(metin)
}

// İndüksiyon: YALNIZ doğrulanmış veri haritasından. Eşleşme yoksa 'bilinmiyor'.
// harita: { [urunId]: 'evet'|'hayir', markalar: { [markaAdi]: 'evet'|'hayir' } }
function induksiyonDurum(urun, harita = {}) {
  if (!urun) return 'bilinmiyor'
  // 1) Ürün id (en kesin)
  if (harita[urun.id] === 'evet' || harita[urun.id] === 'hayir') return harita[urun.id]
  const ad = (urun.name || '').toLocaleLowerCase('tr')
  // 2) Model eşleşmesi (ad içinde alt-dize) — harita.modeller: [{eslesme,durum}]
  for (const m of (harita.modeller || [])) {
    if (m && m.eslesme && ad.includes(String(m.eslesme).toLocaleLowerCase('tr'))) return m.durum
  }
  // 3) Marka (en kaba; yalnız marka geneli doğrulanmışsa)
  const marka = (urun.marka || '').toLocaleLowerCase('tr')
  const mh = harita.markalar || {}
  for (const k of Object.keys(mh)) {
    if (marka && marka.includes(k.toLocaleLowerCase('tr'))) return mh[k]
  }
  return 'bilinmiyor'
}

// Faktüel varsayılanlar (kullanıcı son-kontrol ekranında düzenleyebilir).
function urunIcerigiVarsayilan(kapakVar = true) {
  return kapakVar ? '1 adet tencere gövdesi · 1 adet cam kapak · kullanım kılavuzu'
                  : '1 adet ürün · kullanım kılavuzu'
}
function malzemeVarsayilan(celik) {
  return celik ? '304 kalite 18/10 paslanmaz çelik gövde · temperli cam kapak'
               : 'Ürün malzemesi (tedarikçi bilgisiyle doldurulacak)'
}

// Ürün nesnesinden önizleme verisi kurar (metin hariç). Saf.
function siniflandir(urun, induksiyonHaritasi = {}) {
  const ad = urun.name || ''
  const kategoriler = (urun.categories || []).map((c) => c.name || c)
  const etiketler = (urun.tags || []).map((t) => t.name || t)
  const celik = celikMi(ad, kategoriler)
  // Kapak: adında "kapaksız" geçmiyorsa kapaklı sayılır (tencerede kapak varsayılan).
  const kapakVar = !/kapaksız|kapaksiz/i.test(ad)
  return {
    ad,
    celik,
    garanti: garantiVarMi(ad, kategoriler, etiketler),
    induksiyon: induksiyonDurum(urun, induksiyonHaritasi),
    urunIcerigi: urunIcerigiVarsayilan(kapakVar),
    malzeme: malzemeVarsayilan(celik),
  }
}

// --- Orkestrasyon (Electron bağımlı; bağımlılıklar enjekte edilebilir) ---

function geminiAnahtar() {
  try { return (require('../db/ai-ayarlar')._ayarlariGetir() || {}).gemini_anahtar || '' } catch { return '' }
}

/**
 * Bir ürün için önizleme (HTML + meta). Yazmaz.
 * @param {object} opts { urun, induksiyonHaritasi, anahtar, _uretMetin }
 */
async function onizle({ urun, induksiyonHaritasi = {}, anahtar, _uretMetin = uretMetin }) {
  const s = siniflandir(urun, induksiyonHaritasi)
  const key = anahtar || geminiAnahtar()
  const { seoGiris, saglik, model } = await _uretMetin({
    urun: { ad: s.ad, kategori: (urun.categories || []).map((c) => c.name).join(', '), malzeme: s.malzeme, celik: s.celik, induksiyon: s.induksiyon },
    anahtar: key,
  })
  const html = uretHtml({
    seoGiris, saglik, urunIcerigi: s.urunIcerigi, malzeme: s.malzeme,
    celik: s.celik, induksiyon: s.induksiyon, garanti: s.garanti,
  })
  const uyarilar = []
  if (s.celik && s.induksiyon === 'bilinmiyor') uyarilar.push('İndüksiyon durumu doğrulanmadı → rozet yazılmadı.')
  if (!s.celik) uyarilar.push('Çelik tespit edilmedi → 304/18-10 vurgusu yok. Malzemeyi kontrol et.')
  return { html, seoGiris, saglik, siniflar: s, model, uyarilar }
}

module.exports = {
  onizle, siniflandir,
  celikMi, garantiVarMi, induksiyonDurum, urunIcerigiVarsayilan, malzemeVarsayilan,
}
