// Şablonlardan müşteriye gidecek özel mesajı üretir — veritabanından BAĞIMSIZ saf mantık
// (satis-hesapla.js deseni). Kullanıcı mesajın tamamını asla yazmaz; kutuları doldurur,
// burası birleştirir.
//
// Meta kuralı: yorum başına TEK mesaj → bir gönderideki TÜM ürünler bu tek mesajda birleşir.
// Meta sınırı: ~1000 karakter. Aşılırsa METNİ KESMİYORUZ — asildi=true dönüp arayüz uyarıyor,
// çünkü yarısı kesilmiş bir fiyat mesajı müşteriye gitmemeli.

const MAKS_KARAKTER = 1000
const SELAMLAMA = 'Merhaba,'

// Alan etiketleri. Eskiden yalnız emoji vardı (💰 / 🛒 / 📱) — ne olduğu belirsizdi ve
// bazı cihazlarda emoji düşünce satır anlamsız kalıyordu. Artık açık yazı.
const ETIKET_FIYAT = 'Fiyat:'
const ETIKET_LINK = 'Online Sipariş Hattı:'
const ETIKET_WHATSAPP = 'Whatsapp Sipariş Hattı:'

/**
 * Fiyatı Türkçe biçimde yazar. Fiyat yoksa null → çağıran satırı hiç yazmaz.
 * @param {number|null|undefined} n
 * @returns {string|null}
 */
function fiyatYaz(n) {
  const s = Number(n)
  if (!s || Number.isNaN(s)) return null
  return `${s.toLocaleString('tr-TR')} TL`
}

/**
 * Tek ürünün bloğu.
 * @param {{urun_adi: string, aciklama?: string, fiyat?: number|null, link?: string, whatsapp?: string}} s
 * @param {boolean} whatsappYaz - true ise bu bloğun altına whatsapp yazılır (numaralar farklıysa)
 * @returns {string}
 */
function sablonBloku(s, whatsappYaz) {
  const satirlar = [s.urun_adi]
  if (s.aciklama) satirlar.push(s.aciklama)
  const f = fiyatYaz(s.fiyat)
  if (f) satirlar.push(`${ETIKET_FIYAT} ${f}`)
  if (s.link) satirlar.push(`${ETIKET_LINK} ${s.link}`)
  if (whatsappYaz && s.whatsapp) satirlar.push(`${ETIKET_WHATSAPP} ${s.whatsapp}`)
  return satirlar.join('\n')
}

/**
 * Şablonlardan tam mesajı üretir.
 * WhatsApp tekilleştirme: numaralar AYNIYSA sonda bir kez (1000 karakteri israf etmemek için),
 * FARKLIYSA her ürünün altında ayrı.
 * @param {{sablonlar: Array, selamlama?: string}} girdi
 * @returns {{metin: string, karakter: number, asildi: boolean}}
 */
function mesajOlustur({ sablonlar, selamlama = SELAMLAMA }) {
  const liste = (sablonlar || []).filter(Boolean)
  if (!liste.length) return { metin: '', karakter: 0, asildi: false }

  const numaralar = [...new Set(liste.map(s => (s.whatsapp || '').trim()).filter(Boolean))]
  const ortakNumara = numaralar.length === 1 ? numaralar[0] : null

  const parcalar = [selamlama, '']
  for (const s of liste) {
    parcalar.push(sablonBloku(s, !ortakNumara))
    parcalar.push('')
  }
  if (ortakNumara) parcalar.push(`${ETIKET_WHATSAPP} ${ortakNumara}`)

  const metin = parcalar.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return { metin, karakter: metin.length, asildi: metin.length > MAKS_KARAKTER }
}

module.exports = { fiyatYaz, sablonBloku, mesajOlustur, MAKS_KARAKTER, SELAMLAMA }
