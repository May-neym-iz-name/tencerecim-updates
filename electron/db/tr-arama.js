// Türkçe duyarsız, KELİME BAZLI arama — tüm ürün aramalarının ortak mantığı.
//
// İki sorunu birden çözer:
//
// 1) HARF DUYARLILIĞI. SQLite LIKE yalnız ASCII'de büyük/küçük duyarsızdır; Ö/ö, İ/i,
//    Ş/ş eşleşmez. Ama toLocaleLowerCase('tr') tek başına YETMEZ, hatta bozar:
//      "LİNES" → "lines"   (noktalı İ)
//      "LINES" → "lınes"   (NOKTASIZ ı!)
//    Yani kullanıcı ASCII klavyeyle "LINES" yazarsa "LİNES" ürününü BULAMAZ.
//    Çözüm harfleri KATLAMAK: i/ı/İ/I hepsi 'i' olur, ş→s, ğ→g, ü→u, ö→o, ç→c.
//    Böylece "celik tencere" yazan da "ÇELİK TENCERE"yi bulur.
//
// 2) KELİME SIRASI. Eskiden arama tek parça aranıyordu: "çelik tencere metal kulp"
//    ancak ürün adında BİREBİR bitişik geçiyorsa eşleşirdi. Artık arama kelimelere
//    bölünür ve HER kelime ayrı ayrı aranır (AND) — sıra önemsizdir.
//    Örn. "lines ÇELİK TENCERE METAL KULP oscar cam kapak" aramasıyla
//    "LİNES OSCAR 18 X 10 ÇELİK TENCERE KORDONLU METAL KULP CAM KAPAK" bulunur.
//
// DİKKAT: src/utils/arama.js (frontend ESM) bu dosyanın İKİZİDİR. Electron CJS,
// Vite ise ESM istediği için tek dosya paylaşılamıyor. İkisinin aynı kaldığını
// src/utils/arama-paritesi.test.js doğrular (emsal: yetki.js / izinler.js paritesi).

// Katlanan harfler. Hem büyük hem küçük biçimler tek hedefe iner.
const HARF = {
  'ı': 'i', 'İ': 'i', 'I': 'i',
  'ş': 's', 'Ş': 's',
  'ğ': 'g', 'Ğ': 'g',
  'ü': 'u', 'Ü': 'u',
  'ö': 'o', 'Ö': 'o',
  'ç': 'c', 'Ç': 'c',
  // Düzeltme işaretli harfler (kâse, hâlâ) — aynı sepete.
  'â': 'a', 'Â': 'a', 'î': 'i', 'Î': 'i', 'û': 'u', 'Û': 'u',
}

/**
 * Metni aramaya uygun biçime indirger: Türkçe harfler katlanır, hepsi küçük harf olur.
 * @param {*} s
 * @returns {string}
 */
function trNormal(s) {
  if (s == null) return ''
  let out = ''
  for (const ch of String(s)) out += (HARF[ch] !== undefined ? HARF[ch] : ch)
  // Kalan A-Z için sade toLowerCase: Türkçe harfler yukarıda zaten katlandı, bu yüzden
  // locale'e ihtiyaç yok (ve locale burada ı/i ayrımını geri getirirdi).
  return out.toLowerCase()
}

// BAĞLAÇLAR aramadan düşülür. Arama AND mantığıyla çalıştığı için katalogda
// bulunmayan tek bir bağlaç TÜM sonucu siler: kullanıcı ikas'taki "Sofram 6 Boy
// Rendeli Saklama VE Karıştırma Kabı" adını yapıştırdığında, yereldeki
// "Sofram 6 Boy Karıştırma Saklama Kabı (Kapaklı) + Rendeli" seti yalnızca "ve"
// yüzünden bulunamadı (2026-08-11). Bağlaçlar zaten ayırt edici değil.
// Not: normalize edilmiş biçimler ('için' → 'icin').
const BAGLACLAR = new Set(['ve', 'ile', 'veya', 'icin', 'ya', 'ki', 'the', 'and'])

/**
 * Aramayı kelimelere böler (normalize edilmiş, boşlar atılmış, bağlaçlar düşülmüş).
 * Arama SADECE bağlaçlardan oluşuyorsa hiçbiri atılmaz (kullanıcı gerçekten onu arıyordur).
 * @param {*} s
 * @returns {string[]}
 */
function kelimeler(s) {
  const hepsi = trNormal(s).split(/\s+/).filter(Boolean)
  const suzulmus = hepsi.filter((k) => !BAGLACLAR.has(k))
  return suzulmus.length ? suzulmus : hepsi
}

// LIKE deseni: % ve _ kullanıcı metninde JOKER olmamalı. SKU'larda '.' var, '%' yok
// ama yanlışlıkla yazılan bir '%' tüm listeyi döndürürdü.
function likeDeseni(kelime) {
  return `%${kelime.replace(/[\\%_]/g, (c) => '\\' + c)}%`
}

/**
 * Ön yüz (bellek içi) filtreleme: metin, aramanın TÜM kelimelerini içeriyor mu?
 * @param {*} metin - tek bir alan ya da birleştirilmiş metin
 * @param {*} arama
 * @returns {boolean}
 */
function eslesirMi(metin, arama) {
  const ks = kelimeler(arama)
  if (!ks.length) return true // arama boş → her şey geçer
  const hedef = trNormal(metin)
  return ks.every((k) => hedef.includes(k))
}

/**
 * SQL tarafı: her kelime için bir AND koşulu üretir.
 * @param {string} alanIfadesi - aranacak birleşik SQL ifadesi (tr_ara ile sarmalanır)
 * @param {*} arama
 * @returns {{sql: string, params: string[]}}
 */
function kelimeKosulu(alanIfadesi, arama) {
  const ks = kelimeler(arama)
  if (!ks.length) return { sql: '', params: [] }
  return {
    // Parametre ZATEN normalize edilmiş halde gider; alanı tr_ara ile normalize ederiz.
    sql: ks.map(() => ` AND tr_ara(${alanIfadesi}) LIKE ? ESCAPE '\\'`).join(''),
    params: ks.map(likeDeseni),
  }
}

module.exports = { trNormal, kelimeler, eslesirMi, kelimeKosulu, likeDeseni }
