// kanal_stok tablosunun okuma/yazma katmanı + karşılaştırma sorgusu.
//
// KANAL BİR SATIRDIR, SÜTUN DEĞİL: mağaza (sayım sonrası) veya Hepsiburada eklenince
// şema değişmez, yalnız yeni satır gelir.
const { getDb } = require('./database')

// Bir kanalın fotoğrafını TAMAMEN yeniler: o kanalın eski satırları silinir, yenileri
// yazılır. Neden silme+yazma: kanaldan kalkan ürün eski satır olarak kalırsa
// karşılaştırmada hayalet fark üretir.
function kanaliYaz(kanal, satirlar) {
  const db = getDb()
  const sil = db.prepare('DELETE FROM kanal_stok WHERE kanal = ?')
  const ekle = db.prepare(`INSERT INTO kanal_stok (barkod, kanal, miktar, ad, durum, son_okuma)
    VALUES (@barkod, @kanal, @miktar, @ad, @durum, datetime('now','localtime'))
    ON CONFLICT(barkod, kanal) DO UPDATE SET
      miktar = excluded.miktar, ad = excluded.ad, durum = excluded.durum, son_okuma = excluded.son_okuma`)
  const toplu = db.transaction((liste) => {
    sil.run(kanal)
    for (const s of liste) {
      const barkod = String(s.barkod || '').trim()
      if (!barkod) continue
      ekle.run({
        barkod, kanal,
        miktar: Math.trunc(Number(s.miktar) || 0),
        ad: s.ad || null,
        durum: s.durum || null,
      })
    }
  })
  toplu(satirlar || [])
  return { yazilan: (satirlar || []).length }
}

function kanalOku(kanal) {
  return getDb().prepare('SELECT barkod, miktar, ad, durum FROM kanal_stok WHERE kanal = ?').all(kanal)
}

function sonOkuma(kanal) {
  return getDb().prepare('SELECT MAX(son_okuma) s FROM kanal_stok WHERE kanal = ?').get(kanal)?.s || null
}

/**
 * Ekranın okuduğu birleşik tablo: her barkod için üç kanalın adedi yan yana.
 * Mağaza sütunu urun_stoklar'dan TÜRETİLİR ama karara GİRMEZ — sayım yapılmadığı için
 * güvenilmez (ölçüm 13.09: 5.624 satır sıfır). Arayüz onu gri gösterir.
 */
function karsilastir() {
  return getDb().prepare(`
    SELECT
      b.barkod,
      COALESCE(i.ad, t.ad, u.ad)                       AS ad,
      i.miktar                                          AS ikas,
      t.miktar                                          AS trendyol,
      t.durum                                           AS trendyol_durum,
      (SELECT SUM(us.miktar) FROM urun_stoklar us
         JOIN urunler uu ON uu.id = us.urun_id
        WHERE uu.barkod = b.barkod AND uu.aktif = 1)    AS magaza,
      u.sku                                             AS sku
    FROM (SELECT DISTINCT barkod FROM kanal_stok) b
    LEFT JOIN kanal_stok i ON i.barkod = b.barkod AND i.kanal = 'ikas'
    LEFT JOIN kanal_stok t ON t.barkod = b.barkod AND t.kanal = 'trendyol'
    LEFT JOIN urunler   u ON u.barkod = b.barkod AND u.aktif = 1
    ORDER BY
      CASE WHEN i.miktar IS NOT NULL AND t.miktar IS NOT NULL AND i.miktar <> t.miktar
           THEN 0 ELSE 1 END,          -- farklılar en üstte
      COALESCE(i.ad, t.ad, u.ad)
  `).all()
}

module.exports = { kanaliYaz, kanalOku, sonOkuma, karsilastir }
