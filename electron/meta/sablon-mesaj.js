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

  // Genel (serbest) şablon: metin AYNEN gider — ürün/fiyat biçimi uygulanmaz.
  // Tek-tür kuralı gereği liste ya tümüyle genel ya tümüyle ürün olur; defansif olarak
  // "hepsi genel mi?" testine bakıyoruz.
  if (liste.every(s => s.tur === 'genel')) {
    const metin = liste
      .map(s => (s.serbest_metin || '').trim())
      .filter(Boolean)
      .join('\n\n')
      .trim()
    return { metin, karakter: metin.length, asildi: metin.length > MAKS_KARAKTER }
  }

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

/**
 * GÖNDERİYE ÖZEL mesaj. mesajOlustur'dan (şablon yolu) üç noktada ayrılır:
 *  1. Açıklama gönderiye aittir, ürüne değil → bir kez yazılır. Şablon yolunda her ürün
 *     kendi açıklamasını taşıdığı için 3 ürünlü gönderide 3 açıklama gidiyordu.
 *  2. Ürünün kendi `aciklama` alanı BİLEREK okunmaz — çağıran yanlışlıkla tam ürün satırı
 *     geçirse bile açıklama sızmaz (yukarıdaki 1. maddenin garantisi).
 *  3. WhatsApp gönderi başına tek → tekilleştirme mantığı gerekmez.
 * Şablon yolu bozulmadan durur: mesajlaşmadaki `sosyal:sablonMetin` onu kullanmaya devam eder.
 *
 * @param {{aciklama?: string, urunler?: Array<{ad: string, fiyat?: number|null, web_link?: string}>,
 *          whatsapp?: string, selamlama?: string}} girdi
 * @returns {{metin: string, karakter: number, asildi: boolean}}
 */
function gonderiMesajiOlustur({ aciklama, urunler, whatsapp, selamlama = SELAMLAMA } = {}) {
  const liste = (urunler || []).filter(u => u && u.ad)
  const metinAciklama = (aciklama || '').trim()
  if (!metinAciklama && !liste.length) return { metin: '', karakter: 0, asildi: false }

  // Ürünsüz gönderi = duyuru (mağaza tanıtımı, konum bilgisi). Metin AYNEN gider —
  // eski 'genel' şablon yolunun davranışı. Kullanıcının metni zaten kendi selamlamasıyla
  // başlıyor olabilir; başına "Merhaba," eklemek çift selamlama üretirdi.
  const parcalar = liste.length ? [selamlama, ''] : []
  if (metinAciklama) parcalar.push(metinAciklama, '')
  for (const u of liste) {
    const satirlar = [u.ad]
    const f = fiyatYaz(u.fiyat)
    if (f) satirlar.push(`${ETIKET_FIYAT} ${f}`)
    if (u.web_link) satirlar.push(`${ETIKET_LINK} ${u.web_link}`)
    parcalar.push(satirlar.join('\n'), '')
  }
  const wp = (whatsapp || '').trim()
  if (wp) parcalar.push(`${ETIKET_WHATSAPP} ${wp}`)

  const metin = parcalar.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return { metin, karakter: metin.length, asildi: metin.length > MAKS_KARAKTER }
}

module.exports = { fiyatYaz, sablonBloku, mesajOlustur, gonderiMesajiOlustur, MAKS_KARAKTER, SELAMLAMA }
