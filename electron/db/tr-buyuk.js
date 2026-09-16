// Türkçe duyarlı BÜYÜK HARF normalizasyonu (v1.2.220).
//
// Kullanıcı kararı (16.09.2026): marka, kategori, model, müşteri ve kargo alanları
// kullanıcı NASIL yazarsa yazsın kayıtta ve satış ekranında DAİMA büyük görünür.
//
// Neden kayıt anında normalize ediliyor da yalnız gösterimde büyütülmüyor:
// ölçüldü (16.09) — "Burak GÜL" ve "BURAK GÜL" veritabanında AYRI İKİ müşteri
// kaydı olarak duruyordu. Yalnız gösterimi büyütmek listeyi düzeltir ama mükerrer
// kaydı üretmeye devam ederdi. Normalizasyon kayıt anında olunca aynı kişi aynı
// satıra düşer.
//
// 🔴 SQLite'ın yerleşik upper() BURADA KULLANILAMAZ: ASCII-only'dir, upper('şığü')
// değişmeden döner. Trigger yolu da bilinçli olarak SEÇİLMEDİ — trigger içinde
// db.function ile tanımlanan tr_buyuk yalnız Electron süreci DB'yi açtığında
// kayıtlıdır; depodaki bağımsız Node betikleri yazmaya kalktığında "no such
// function" ile yazma düşerdi ([[node-sqlite-canli-db-okuma]]).

// toLocaleUpperCase('tr') Türkçe çiftleri doğru kurar: i→İ, ı→I.
// Düz toUpperCase() 'i' harfini 'I' yapar ve "İstanbul" → "ISTANBUL" olurdu.
function trBuyuk(deger) {
  if (deger == null) return deger
  const s = String(deger)
  if (!s.trim()) return s
  return s.toLocaleUpperCase('tr')
}

/**
 * Bir nesnenin SEÇİLİ alanlarını büyütür ve YENİ nesne döner (girdi değiştirilmez).
 * Yalnız nesnede FİİLEN bulunan alanlara dokunur: `undefined` bırakılan alan
 * `undefined` kalır — "alanı göndermeyen çağrı ona dokunmaz" kuralı korunsun
 * (urunler.model / setler.web_link deseni).
 *
 * @param {object} nesne
 * @param {string[]} alanlar
 * @returns {object}
 */
function buyukAlanlar(nesne, alanlar) {
  if (!nesne) return nesne
  const kopya = { ...nesne }
  for (const a of alanlar) {
    if (kopya[a] !== undefined && kopya[a] !== null) kopya[a] = trBuyuk(kopya[a])
  }
  return kopya
}

// --- Alan listeleri: normalizasyonun KAPSAMI tek yerde tanımlı ---
//
// KAPSAM DIŞI bırakılanlar ve gerekçeleri:
//  * email      → 1474 kaydın 0'ı büyüktü; e-posta adresi büyütülmez, gönderim
//                 yolunu ve dış sistem eşleşmesini bozabilir.
//  * telefon, tc_kimlik, vergi_no → zaten rakam.
//  * urunler.ad → ikas vitrinine giden başlık; büyük harf başlık SEO'yu ve ürün
//                 sayfası görünümünü etkiler. Kullanıcı da ürün adını saymadı.
//  * kargolar.aciklama → serbest not alanı, cümle yazılıyor.
const MUSTERI_ALANLAR = ['ad', 'soyad', 'unvan', 'adres', 'il', 'ilce', 'vergi_dairesi']
const KARGO_ALANLAR = ['alici_ad', 'alici_adres', 'il', 'ilce']

module.exports = { trBuyuk, buyukAlanlar, MUSTERI_ALANLAR, KARGO_ALANLAR }
