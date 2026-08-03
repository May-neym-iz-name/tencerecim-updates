// ikas teslimat adresi yardımcıları. Saf fonksiyon — test edilebilir olsun diye
// electron/db bağımlılığı olan index.js'ten ayrı tutulur.

// Teslimat adresini tek metne indirger. Müşteriler ikas'ta 2. adres satırını
// (daire/blok/kat) sıkça kullanıyor; yerelde tek `teslimat_adres` kolonu olduğu
// için iki satır birleştirilir — GraphQL sorgusunda addressLine2 hiç istenmediği
// için bu bilgi kargo etiketine düşmüyordu.
function adresBirlestir(adres) {
  return [adres?.addressLine1, adres?.addressLine2]
    .map(s => (s || '').trim()).filter(Boolean).join(' ') || null
}

module.exports = { adresBirlestir }
