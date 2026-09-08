// Gönderilen ÜRÜN KARTINI yerel gelen kutusuna yazılabilir hale getirir (08.09.2026).
// Eskiden kart DM'i yalnız metin olarak (ya da hiç) kaydediliyordu → sohbette BOŞ BALON.
//
// ek_* alanları İLK kartı taşır (liste satırı ve önizleme için), ham_ek TÜM kartları
// (balon karuseli buradan çizer — bkz. src/components/UrunKartiBalonu.jsx).
// `yuk` = kartMesajiOlustur().yuk: { attachment: { payload: { elements: [...] } } }.
function kartKaydi(yuk, { kim = null } = {}) {
  const el = yuk && yuk.attachment && yuk.attachment.payload && yuk.attachment.payload.elements
  if (!Array.isArray(el) || !el.length) return null
  const linkOf = (e) => (e.default_action && e.default_action.url)
    || ((e.buttons || []).find(b => b && b.url) || {}).url || null
  const ilk = el[0]
  const ek = el.length > 1 ? ` ve ${el.length - 1} ürün daha` : ''
  return {
    ek_tur: 'urun_karti',
    ek_baslik: `${ilk.title || 'Ürün'}${ek}`,
    ek_gorsel: ilk.image_url || null,
    ek_link: linkOf(ilk),
    metin: ilk.subtitle || '',
    ham_ek: JSON.stringify({
      kim,
      elements: el.map(e => ({
        title: e.title || null, subtitle: e.subtitle || null, image_url: e.image_url || null, url: linkOf(e),
      })),
    }),
  }
}

module.exports = { kartKaydi }
