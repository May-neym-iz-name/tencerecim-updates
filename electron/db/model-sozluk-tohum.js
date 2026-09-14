// Model sözlüğünün TEK SEFERLİK tohumlanması: ürün adlarındaki model adaylarını
// frekans analiziyle bulur. Otomatik tekrar ETMEZ — tohumlandıktan sonra sözlük
// Model Sözlüğü ekranından elle ayıklanır (bkz. spec §7).
//
// Yöntem: marka başına, ürün adlarında EŞİK kez ya da daha çok geçen ve
// tip/biçim/renk/ölçü/malzeme/marka kelimesi OLMAYAN sözcükler model adayıdır.
//
// 🔴 MARKANIN KENDİ ADI MUTLAKA DIŞLANIR. Spec'teki ölçüm dürüstlüğü notu tam olarak
// bu yüzden var: ilk ölçüm %97,8 kapsama vermişti ve YANLIŞTI — sözlüğe markanın adı
// da girmiş, eşleşme modeli değil MARKAYI yakalıyordu. Gerçek sayı %84,5 çıktı.

const { trNormal } = require('./tr-arama')

// Model OLMAYAN kelimeler. Hepsi trNormal() geçmiş biçimde yazılır (ç→c, ı→i…).
// Listeler canlı veritabanındaki token frekansından türetildi (14.09, 1.185 farklı token).
const URUN_TIPI = [
  'tencere', 'tenceresi', 'tava', 'tavasi', 'sahan', 'sahani', 'guvec', 'guveci',
  'caydanlik', 'cezve', 'cezvesi', 'termos', 'kase', 'kasesi', 'bardak', 'fincan',
  'sutluk', 'kacerola', 'izgara', 'izgarasi', 'duduklu', 'dudukiu', 'tencerem',
  'kasik', 'kasigi', 'catal', 'catali', 'bicak', 'bicagi', 'kepce', 'kevgir',
  'tepsi', 'tepsisi', 'kalip', 'kalibi', 'rende', 'suzgec', 'suzgeci', 'sufle',
  'takim', 'takimi', 'set', 'seti', 'yemek', 'kahvalti', 'servis', 'sunum',
  'kapak', 'kapagi', 'kulp', 'kulplu', 'sap', 'sapli', 'saplı', 'omca',
  'kizartma', 'pisirici', 'saklama', 'karistirma', 'demlik', 'demlikli',
  // Tohumlama ölçümünde (14.09) model sanılan ama ürün TİPİ olan kelimeler:
  'spatula', 'kepcesi', 'masa', 'masasi', 'kol', 'kolu', 'kabi', 'kabu', 'boru',
  'cevirme', 'ezme', 'sufle', 'baharatlik', 'yaglik', 'tuzluk', 'peceta',
  // 'matik' bir düdüklü TİPİdir (Matik Düdüklüler kategorisi), model değil.
  'matik', 'klasik',
]
const BICIM = [
  'yuvarlak', 'oval', 'kare', 'dikdortgen', 'basik', 'derin', 'yayvan', 'dik',
  'orta', 'karniyarik', 'cok', 'amacli', 'sade', 'duz', 'desenli', 'desen',
  'boyali', 'boyasiz', 'mat', 'parlak', 'kapakli', 'kapaksiz', 'delikli', 'cukur',
  'kalin', 'ince', 'des', 'bolmeli', 'tutamak', 'renk', 'secenekli', 'renkli',
  // BASIK = PİLAV = YAYVAN — üçü aynı biçimin adı ([[urun-terimleri]] hafızası).
  // 'pilav' burada olmazsa bir BİÇİM kelimesi model sanılır.
  'pilav', 'pilavlik',
]
const RENK = [
  'siyah', 'beyaz', 'gri', 'kirmizi', 'yesil', 'mavi', 'turuncu', 'mor', 'sari',
  'pembe', 'lacivert', 'krem', 'bej', 'kahve', 'kahverengi', 'bordo', 'antrasit',
  'altin', 'gold', 'silver', 'gumus', 'bronz', 'bakir', 'rose', 'inox', 'antik',
  // Canlı tohum önizlemesinde (14.09, LAVA) model sanılan renkler. Renk evrensel
  // olarak model değildir — tek bir markaya özel ayar değil, listenin eksiğiydi.
  'turkuaz', 'suyesil', 'petrol', 'lila', 'mentol', 'paprika', 'seftali',
  'aubergine', 'terracotta', 'matt', 'antrasit', 'vizon', 'somon', 'fistik',
  'nar', 'safir', 'zumrut', 'karamel', 'toprak', 'buz', 'sedef',
]
const OLCU = [
  'cm', 'mm', 'lt', 'l', 'ml', 'no', 'numara', 'cap', 'capi', 'agiz', 'boy',
  'parca', 'kisilik', 'pcs', 'adet', 'li', 'lu', 'lik', 'luk', 'x', 'ts', 'aile',
  'mega', 'buyuk', 'kucuk', 'mini', 'midi', 'maxi', 'standart',
]
const MALZEME = [
  'granit', 'celik', 'titanyum', 'seramik', 'dokum', 'demir', 'emaye', 'porselen',
  'aluminyum', 'aluminium', 'bakalit', 'cam', 'metal', 'silikon', 'plastik',
  'ahsap', 'bambu', 'teflon', 'paslanmaz', 'nikel', 'kromaj', 'kordonlu',
  'steel', 'inoks', 'induksiyon', 'indiksiyon',
]
const DURAK = new Set([...URUN_TIPI, ...BICIM, ...RENK, ...OLCU, ...MALZEME])

// Bir token model adayı olabilir mi? (markaya bağlı olmayan kurallar)
// - en az 3 harf: 's', 'x', '12' gibi tekil harf/sayı parçaları elenir
// - sayı İÇEREN token elenir: '28', 'c28' (Lava'nın Ç-kodu = ÇAP), '00', '6'
function adayMi(token) {
  if (token.length < 3) return false
  if (/[0-9]/.test(token)) return false
  return !DURAK.has(token)
}

const ESIK = 3 // bir kelimenin model sayılması için markada en az kaç üründe geçmesi gerektiği

/**
 * Bir markanın ürün adlarından model adaylarını çıkarır.
 * @param {string[]} adlar       markanın aktif ürün adları
 * @param {string} markaAdi      markanın adı — kelimeleri MUTLAKA dışlanır
 * @param {number} esik
 * @returns {Array<{model_adi: string, gecis: number}>} frekansa göre azalan
 */
function adaylar(adlar, markaAdi, esik = ESIK) {
  // Markanın kendi adının kelimeleri (MAXX DORIA → maxx, doria) yasaklı.
  const markaKelimeleri = new Set(trNormal(markaAdi || '').split(/[^a-z0-9]+/).filter(Boolean))
  const say = new Map()
  for (const ad of adlar) {
    // Aynı ad içinde iki kez geçen kelime BİR sayılır — "geçiş" ürün sayısıdır,
    // kelime sayısı değil. Yoksa eşik anlamını yitirir.
    const gorulen = new Set(trNormal(ad).split(/[^a-z0-9]+/).filter(Boolean))
    for (const t of gorulen) {
      if (markaKelimeleri.has(t) || !adayMi(t)) continue
      say.set(t, (say.get(t) || 0) + 1)
    }
  }
  return [...say.entries()]
    .filter(([, n]) => n >= esik)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr'))
    .map(([t, n]) => ({ model_adi: t, gecis: n }))
}

module.exports = { adaylar, adayMi, DURAK, ESIK, _URUN_TIPI: URUN_TIPI, _RENK: RENK }
