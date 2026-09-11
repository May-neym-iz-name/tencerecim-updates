// GEMİNİ İSTEM KURMA + SEO METİN ÜRETİMİ
//
// Gemini'ye ürün başına SADECE iki alan ürettiririz: seoGiris ve saglik.
// urunIcerigi ve malzeme FAKTÜELDİR → yapısal veriden gelir, uydurulmaz.
// Gemini yanıtı JSON olarak istenir ki güvenilir ayrıştırılsın.
//
// İSTEM KURALLARI (CLAUDE.md + kullanıcı):
//  - Türkçe, 2-3 cümle seoGiris + 1-2 cümle saglik.
//  - Birincil anahtar kelime (ürün tipi) İLK cümlede.
//  - Fiyat/indirim YAZILMAZ.
//  - Çelik üründe "304 kalite 18/10 paslanmaz çelik" İLK cümlede geçer.
//  - İndüksiyon SADECE induksiyon==='evet' ise anılır; aksi halde HİÇ anılmaz.
//  - Klişe yok ("kaliteli ürün", "vazgeçilmez" vb.).

function istemKur(urun) {
  const { ad = '', kategori = '', malzeme = '', celik = false, induksiyon = 'bilinmiyor' } = urun || {}
  const satirlar = [
    'Sen bir e-ticaret SEO metin yazarısın. Aşağıdaki ürün için Türkçe metin üret.',
    '',
    `ÜRÜN ADI: ${ad}`,
    kategori ? `KATEGORİ: ${kategori}` : '',
    malzeme ? `MALZEME: ${malzeme}` : '',
    '',
    'KURALLAR:',
    '- "seoGiris": 2-3 cümle, ~40-60 kelime. Birincil anahtar kelime (ürün tipi) İLK cümlede.',
    '- "saglik": 1-2 cümle; malzeme ile sağlık ilişkisini kur (gıdayla tepkime, ağır metal, BPA, besin değeri).',
    '- Fiyat, indirim, kampanya YAZMA.',
    '- Klişe yasak: "kaliteli ürün", "vazgeçilmez", "kaçırılmayacak fırsat" gibi ifadeler kullanma.',
    celik
      ? '- Bu ürün paslanmaz çeliktir: "304 kalite 18/10 paslanmaz çelik" ifadesini seoGiris\'in İLK cümlesinde geçir.'
      : '- Malzemeyi olduğu gibi kullan; olmayan bir malzeme uydurma.',
    induksiyon === 'evet'
      ? '- Bu ürün indüksiyon uyumludur; bunu doğal biçimde bir kez belirtebilirsin.'
      : '- İndüksiyon/ocak uyumu hakkında HİÇBİR ŞEY yazma (doğrulanmadı).',
    '',
    'ÇIKTI BİÇİMİ: yalnız şu JSON, başka metin yok:',
    '{"seoGiris":"...","saglik":"..."}',
  ]
  return satirlar.filter((s) => s !== null && s !== undefined).join('\n')
}

// Gemini yanıtından JSON çıkarır (```json ... ``` sarmalını da hoş görür).
function ayristir(metin) {
  if (!metin || typeof metin !== 'string') throw new Error('Gemini boş yanıt')
  let t = metin.trim().replace(/^```(?:json)?/i, '').replace(/```$/,'').trim()
  const bas = t.indexOf('{'); const son = t.lastIndexOf('}')
  if (bas === -1 || son === -1) throw new Error('Gemini yanıtında JSON yok: ' + t.slice(0, 120))
  const o = JSON.parse(t.slice(bas, son + 1))
  const seoGiris = String(o.seoGiris || '').trim()
  const saglik = String(o.saglik || '').trim()
  if (!seoGiris || !saglik) throw new Error('Gemini eksik alan döndürdü')
  return { seoGiris, saglik }
}

/**
 * Bir ürün için SEO metni üretir.
 * @param {object} urun {ad, kategori, malzeme, celik, induksiyon}
 * @param {string} anahtar Gemini API anahtarı (uygulama içinde çözülür)
 * @param {function} _uret test için enjekte edilebilir gemini.uret
 * @returns {Promise<{seoGiris:string, saglik:string, model:string}>}
 */
async function uretMetin({ urun, anahtar, _uret }) {
  if (!anahtar) throw new Error('Gemini anahtarı yok (Ayarlar > AI)')
  const uret = _uret || require('../ai/gemini').uret
  const istem = istemKur(urun)
  const { metin, model } = await uret({ anahtar, istem, sicaklik: 0.6, enFazlaJeton: 400 })
  const { seoGiris, saglik } = ayristir(metin)
  return { seoGiris, saglik, model }
}

module.exports = { istemKur, ayristir, uretMetin }
