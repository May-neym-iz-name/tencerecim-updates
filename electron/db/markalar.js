const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')
const { trBuyuk } = require('./tr-buyuk')

// Marka SKU kısaltması: otomatik stok kodunun (TNC.<KISALTMA>.00001) tek kaynağı.
// Kodun kendisi ASCII'dir, bu yüzden Türkçe harfler katlanır (İMZA → IMZ). Aksi hâlde
// 'TNC.İMZ.00001' gibi bir kod üretilir ve dış sistemlerde (Trendyol stockCode,
// ikas SKU, fatura) taşınırken bozulurdu.
const TR_KATLAMA = { 'İ': 'I', 'I': 'I', 'Ş': 'S', 'Ğ': 'G', 'Ü': 'U', 'Ö': 'O', 'Ç': 'C' }

function kisaltmaNormalize(deger) {
  return String(deger || '')
    .toLocaleUpperCase('tr')
    .replace(/[İIŞĞÜÖÇ]/g, (h) => TR_KATLAMA[h])
    .replace(/[^A-Z0-9]/g, '')
}

// Kısaltma tekil OLMALI: iki marka aynı kısaltmayı paylaşırsa ikisinin stok kodları
// aynı numara dizisini yarışır ve mükerrer SKU üretme baskısı doğar.
function kisaltmaDogrula(db, ham, hariçId = 0) {
  const k = kisaltmaNormalize(ham)
  if (!k) throw new Error('SKU kısaltması zorunludur (örn. LAV, SFL)')
  if (k.length < 2 || k.length > 6) throw new Error('SKU kısaltması 2-6 karakter olmalı (örn. LAV)')
  const sahip = db.prepare(
    'SELECT ad FROM markalar WHERE sku_kisaltma = ? AND id != ?').get(k, hariçId)
  if (sahip) throw new Error(`"${k}" kısaltması zaten ${sahip.ad} markasında kullanılıyor`)
  return k
}

module.exports = {
  'markalar:listele': () => getDb().prepare(
    `SELECT m.*, (SELECT COUNT(*) FROM urunler u WHERE u.marka_id = m.id AND u.aktif = 1) AS urun_sayisi
     FROM markalar m WHERE m.aktif = 1 ORDER BY m.ad`
  ).all(),
  // sku_kisaltma ZORUNLU (v1.2.219): stok kodu bu alandan üretilir, marka eklendiği anda
  // bilinmezse o markanın ilk ürününde otomatik kod üretilemez.
  'markalar:olustur': ({ ad, sku_kisaltma }) => {
    yetkiKontrol('urun_duzenle')
    const db = getDb()
    const yeni = trBuyuk(String(ad || '').trim())
    if (!yeni) throw new Error('Marka adı boş olamaz')
    // Aynı ad (büyük/küçük harf duyarsız) zaten varsa: pasifse yeniden aktive et,
    // aktifse onu döndür — UNIQUE ihlaliyle çökme yerine akıllı davran.
    const mevcut = db.prepare('SELECT * FROM markalar WHERE lower(ad) = lower(?)').get(yeni)
    if (mevcut) {
      const kis = kisaltmaDogrula(db, sku_kisaltma, mevcut.id)
      // Mevcut markanın kısaltması varsa KORUNUR: o kısaltmayla üretilmiş SKU'lar
      // sahada dolaşıyor (Trendyol/ikas/fatura), yeniden adlandırmak onları koparır.
      db.prepare(`UPDATE markalar SET aktif = 1, ad = ?,
        sku_kisaltma = COALESCE(NULLIF(sku_kisaltma, ''), ?) WHERE id = ?`).run(yeni, kis, mevcut.id)
      return db.prepare('SELECT * FROM markalar WHERE id=?').get(mevcut.id)
    }
    const kis = kisaltmaDogrula(db, sku_kisaltma)
    const r = db.prepare('INSERT INTO markalar (ad, sku_kisaltma) VALUES (?, ?)').run(yeni, kis)
    return db.prepare('SELECT * FROM markalar WHERE id=?').get(r.lastInsertRowid)
  },

  // Kısaltmayı sonradan düzeltmek/doldurmak için (geri doldurmanın boş bıraktığı
  // ya da yanlış türettiği markalar). Üretilmiş SKU'lar GERİYE DÖNÜK değişmez —
  // yalnız bundan SONRAKİ kodlar yeni kısaltmayı kullanır.
  'markalar:kisaltma-guncelle': ({ id, sku_kisaltma }) => {
    yetkiKontrol('urun_duzenle')
    const db = getDb()
    const kis = kisaltmaDogrula(db, sku_kisaltma, id)
    db.prepare('UPDATE markalar SET sku_kisaltma = ? WHERE id = ?').run(kis, id)
    return db.prepare('SELECT * FROM markalar WHERE id=?').get(id)
  },
  // İsim değiştir. Yeni ad başka bir markanınkiyle çakışıyorsa (örn. ROLLERS↔Rollers)
  // düz UPDATE UNIQUE ile çökerdi → o markayla BİRLEŞTİR: ürünleri hedefe taşı, bu
  // kaydı pasifle. Böylece çift/yazım-farklı markalar tek çatı altında toplanır.
  'markalar:guncelle': ({ id, ad }) => {
    yetkiKontrol('urun_duzenle')
    const db = getDb()
    const yeni = trBuyuk(String(ad || '').trim())
    if (!yeni) throw new Error('Marka adı boş olamaz')
    const hedef = db.prepare('SELECT * FROM markalar WHERE lower(ad) = lower(?) AND id != ?').get(yeni, id)
    if (hedef) {
      const tx = db.transaction(() => {
        db.prepare('UPDATE urunler SET marka_id = ? WHERE marka_id = ?').run(hedef.id, id)
        db.prepare('UPDATE markalar SET aktif = 0 WHERE id = ?').run(id)
        db.prepare('UPDATE markalar SET aktif = 1, ad = ? WHERE id = ?').run(yeni, hedef.id)
      })
      tx()
      return { ...db.prepare('SELECT * FROM markalar WHERE id=?').get(hedef.id), _birlesti: true }
    }
    try {
      db.prepare('UPDATE markalar SET ad=? WHERE id=?').run(yeni, id)
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) throw new Error('Bu marka adı zaten kullanılıyor')
      throw e
    }
    return db.prepare('SELECT * FROM markalar WHERE id=?').get(id)
  },
  'markalar:sil': (id) => {
    yetkiKontrol('urun_duzenle')
    getDb().prepare('UPDATE markalar SET aktif=0 WHERE id=?').run(id)
    return { mesaj: 'Marka silindi' }
  },

  _kisaltmaNormalize: kisaltmaNormalize,
  _kisaltmaDogrula: kisaltmaDogrula,
}
