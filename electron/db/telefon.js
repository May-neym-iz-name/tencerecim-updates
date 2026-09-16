// Telefon numarası normalizasyonu — eşleştirmenin tek kaynağı.
//
// Aynı numara farklı biçimlerde yazılıyor: "5538638657", "+905538638657",
// "0553 863 86 57". Eşleştirmeyi ham metinle yapan kod mükerrer kayıt üretir —
// ölçüldü (16.09.2026): ikas/index.js `WHERE telefon = ?` ile TAM eşleştiriyordu ve
// aynı kişi her senkronda yeniden ekleniyordu ([[mukerrer-musteri-birlestirme]]).
//
// Son 10 hane seçildi çünkü Türkiye'de abone numarası 10 hanedir (5XX XXX XX XX);
// "+90" ve baştaki "0" ön ekleri bu sayede elenir.

/**
 * @param {string|null} tel
 * @returns {string|null} 10 haneli anahtar, kısa/boş numarada ham rakamlar veya null
 */
function telSon10(tel) {
  const d = String(tel || '').replace(/\D/g, '')
  return d.length >= 10 ? d.slice(-10) : (d || null)
}

module.exports = { telSon10 }
