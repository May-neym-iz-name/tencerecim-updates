// Satış ekranı gezinmesinin üçüncü düzeyi: MODEL.
//
// Model ürün adının İÇİNDE saklı ve konumu markaya göre DEĞİŞİYOR (ölçüldü 12.09):
//   Sofram Venüs 18 cm Derin Tencere   → marka, MODEL, ölçü, biçim, tip
//   YUVARLAK TENCERE Ç20 FOLK BEYAZ    → biçim, tip, ölçü, MODEL, renk   (Lava)
// Lava'nın adları markayla BAŞLAMIYOR ve model ORTADA. Bu yüzden "markadan sonraki
// kelimeler modeldir" varsayımına dayanan KONUMSAL ayrıştırma reddedildi — Lava'nın
// 543 tencerenin tamamında yalnız "YUVARLAK"/"ÇOK AMAÇLI" biçim kelimelerini buluyordu.
//
// Yerine: marka başına MODEL SÖZLÜĞÜ + adın herhangi bir yerinde eşleştirme.

const { trNormal } = require('./tr-arama')

const DIGER = 'Diğer'

// Metni " kelime kelime " biçimine indirger. Baştaki/sondaki boşluk KASITLI:
// alt dizi araması böylece KELİME SINIRINA saygı duyar. Onsuz sözlükteki "vento"
// "ventolin"i, "soft" "software"i yakalardı — ürün adları tedarikçiden geldiği için
// böyle sürprizler gerçek. Çok kelimeli modeller ("black line", "folk sable") ise
// bu biçimde tek parça olarak aranabilir; kelime kelime eşleştirme onları bölerdi.
function sinirli(s) {
  const k = trNormal(s).split(/[^a-z0-9]+/).filter(Boolean)
  return k.length ? ' ' + k.join(' ') + ' ' : ''
}

/**
 * Bir markanın sözlük satırlarını eşleştirmeye hazırlar (her ürün için yeniden
 * hesaplanmasın diye AYRI tutuldu — 2.906 ürün x sözlük boyu çarpımı).
 * @param {Array<{model_adi: string, oncelik?: number, aktif?: number}>} satirlar
 * @returns {Array<{model_adi: string, desen: string, uzunluk: number, oncelik: number}>}
 */
function sozlukHazirla(satirlar) {
  return (satirlar || [])
    .filter(s => s && s.model_adi && s.aktif !== 0)
    .map(s => {
      const desen = sinirli(s.model_adi)
      return { model_adi: s.model_adi, desen, uzunluk: desen.length, oncelik: Number(s.oncelik) || 0 }
    })
    .filter(s => s.desen)
    // Sıra BURADA sabitlenir: ÖNCELİK yüksek olan önce, eşitlikte UZUN olan önce,
    // o da eşitse ada göre — böylece sonuç sorgu sırasından BAĞIMSIZ olur.
    //
    // Önceliğin uzunluktan ÖNCE gelmesi bilinçli bir karar (kullanıcı, 14.09). Spec §4.2
    // "eşit uzunlukta eşleşmede sıralama" diyordu, ama spec'i motive eden örnek o kuralla
    // ÇÖZÜLEMİYOR: "LAVA FOLK SABLE GRİ" adında folk (6) ve sable (7) eşit uzunlukta
    // DEĞİL, dolayısıyla uzunluk önce gelseydi sable daima kazanır ve öncelik bu senaryoda
    // hiç devreye girmezdi. O zaman "Sable ayrı bir model mi, Folk'un bir yüzeyi mi"
    // sorusunu Model Sözlüğü ekranından cevaplamak İMKÂNSIZ olurdu — geriye her ürüne
    // tek tek elle model girmek kalırdı ki bu tam da reddedilen seçenek.
    // Bu sırayla soruyu VERİ cevaplıyor: Folk'un önceliğini yükseltmek yeter.
    .sort((a, b) => b.oncelik - a.oncelik || b.uzunluk - a.uzunluk || a.model_adi.localeCompare(b.model_adi, 'tr'))
}

/**
 * Model çözümleme. Sıra SABİTTİR:
 *   1. elle girilen model (urunler.model / setler.model) dolu mu → onu kullan
 *   2. markanın aktif sözlüğünü ürün adında ara → EN UZUN eşleşme kazanır
 *   3. hiçbiri → "Diğer"
 *
 * @param {string} ad          ürün/set adı
 * @param {string|null} elle   elle girilmiş model (sözlüğü YENER)
 * @param {Array} hazirSozluk  sozlukHazirla() çıktısı
 * @returns {string}
 */
function modelCoz(ad, elle, hazirSozluk) {
  const elleTemiz = (elle == null ? '' : String(elle)).trim()
  if (elleTemiz) return elleTemiz
  const hedef = sinirli(ad)
  if (!hedef) return DIGER
  for (const s of hazirSozluk || []) {
    if (hedef.includes(s.desen)) return s.model_adi
  }
  return DIGER
}

module.exports = { DIGER, modelCoz, sozlukHazirla, _sinirli: sinirli }
