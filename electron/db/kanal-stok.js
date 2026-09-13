// kanal_stok tablosunun okuma/yazma katmanı + üç kanalın listeleri.
//
// KANAL BİR SATIRDIR, SÜTUN DEĞİL: mağaza / Trendyol / ikas aynı tabloda, yeni kanal
// eklenince şema değişmez.
//
// EŞLEŞME ANAHTARI SKU (ölçüldü 13.09.2026: Trendyol'da 162/162 stok kodu bizim TNC.*
// formatımızda; barkodla 161/162 eşleşiyordu). Barkod yalnız YAZMA için taşınır —
// Trendyol'un stok güncelleme ucu barkodla çalışır.
const { getDb } = require('./database')

function skuAnahtar(deger) {
  return String(deger == null ? '' : deger).trim().toUpperCase()
}

// Bir kanalın fotoğrafını TAMAMEN yeniler. Silme+yazma: kanaldan kalkan ürün eski satır
// olarak kalırsa karşılaştırmada hayalet fark üretir.
function kanaliYaz(kanal, satirlar) {
  const db = getDb()
  const sil = db.prepare('DELETE FROM kanal_stok WHERE kanal = ?')
  const ekle = db.prepare(`INSERT INTO kanal_stok (sku, kanal, barkod, miktar, ad, durum, son_okuma)
    VALUES (@sku, @kanal, @barkod, @miktar, @ad, @durum, datetime('now','localtime'))
    ON CONFLICT(sku, kanal) DO UPDATE SET
      barkod = excluded.barkod, miktar = excluded.miktar, ad = excluded.ad,
      durum = excluded.durum, son_okuma = excluded.son_okuma`)
  const toplu = db.transaction((liste) => {
    sil.run(kanal)
    for (const s of liste) {
      const sku = skuAnahtar(s.sku)
      if (!sku) continue // SKU'suz satır eşleşemez; sessizce atlanır, sayısı raporlanır
      ekle.run({
        sku, kanal,
        barkod: s.barkod ? String(s.barkod).trim() : null,
        miktar: Math.trunc(Number(s.miktar) || 0),
        ad: s.ad || null,
        durum: s.durum || null,
      })
    }
  })
  toplu(satirlar || [])
  const yazilan = (satirlar || []).filter(s => skuAnahtar(s.sku)).length
  return { yazilan, skusuz: (satirlar || []).length - yazilan }
}

function kanalOku(kanal) {
  return getDb().prepare(
    'SELECT sku, barkod, miktar, ad, durum FROM kanal_stok WHERE kanal = ? ORDER BY ad'
  ).all(kanal)
}

function sonOkuma(kanal) {
  return getDb().prepare('SELECT MAX(son_okuma) s FROM kanal_stok WHERE kanal = ?').get(kanal)?.s || null
}

// Mağaza stoğunu urun_stoklar + setler'den TÜRETİR ve kanal_stok'a 'magaza' olarak yazar.
// Ağ yok, yereldir — her turda ucuzca tazelenir.
//
// 🔴 Bu sayılar şu an GERÇEĞİ YANSITMIYOR (mağaza sayımı yapılmadı: 5.624 satır sıfır).
// Bu yüzden 'magaza' kanalı hiçbir gönderime kaynak veya hedef OLAMAZ — arayüz salt
// görüntü olarak gösterir. Sayım bitince aynı boru hattı olduğu gibi çalışır.
function magazaTazele() {
  const db = getDb()
  const satirlar = db.prepare(`
    SELECT u.sku, u.barkod, u.ad, COALESCE(SUM(us.miktar), 0) AS miktar
      FROM urunler u LEFT JOIN urun_stoklar us ON us.urun_id = u.id
     WHERE u.aktif = 1 AND COALESCE(u.sku,'') <> ''
     GROUP BY u.id
    UNION ALL
    SELECT s.sku, s.barkod, s.ad, 0 AS miktar
      FROM setler s
     WHERE s.aktif = 1 AND COALESCE(s.sku,'') <> ''
  `).all()
  return kanaliYaz('magaza', satirlar)
}

/**
 * Tek bir kanalın listesi — ekrandaki üç ayrı listeden biri.
 * Diğer kanallardaki karşılığı da getirir ki satırda "ikas 3 / Trendyol 1" görünebilsin,
 * ama liste HER ZAMAN istenen kanalın ürünlerinden oluşur.
 */
function kanalListesi(kanal) {
  return getDb().prepare(`
    SELECT k.sku, k.barkod, k.ad, k.miktar, k.durum,
           (SELECT miktar FROM kanal_stok x WHERE x.sku = k.sku AND x.kanal = 'ikas')     AS ikas,
           (SELECT miktar FROM kanal_stok x WHERE x.sku = k.sku AND x.kanal = 'trendyol') AS trendyol,
           (SELECT miktar FROM kanal_stok x WHERE x.sku = k.sku AND x.kanal = 'magaza')   AS magaza
      FROM kanal_stok k
     WHERE k.kanal = ?
     ORDER BY k.ad
  `).all(kanal)
}

// Kanal başına özet: kaç ürün, kaçı ana kaynakla eşleşiyor, kaçında fark var.
function ozet(anaKanal) {
  const db = getDb()
  const kanallar = db.prepare('SELECT DISTINCT kanal FROM kanal_stok').all().map(r => r.kanal)
  const sonuc = {}
  for (const k of kanallar) {
    const r = db.prepare(`
      SELECT COUNT(*) toplam,
             SUM(CASE WHEN a.sku IS NOT NULL THEN 1 ELSE 0 END) eslesen,
             SUM(CASE WHEN a.sku IS NOT NULL AND a.miktar <> k.miktar THEN 1 ELSE 0 END) farkli
        FROM kanal_stok k
        LEFT JOIN kanal_stok a ON a.sku = k.sku AND a.kanal = ?
       WHERE k.kanal = ?
    `).get(anaKanal, k)
    sonuc[k] = { toplam: r.toplam || 0, eslesen: r.eslesen || 0, farkli: k === anaKanal ? 0 : (r.farkli || 0), sonOkuma: sonOkuma(k) }
  }
  return sonuc
}

module.exports = { kanaliYaz, kanalOku, sonOkuma, kanalListesi, ozet, magazaTazele, skuAnahtar }
