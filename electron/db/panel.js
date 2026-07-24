// Ana ekran (Dashboard) özeti ve düşük stok uyarıları.
const { getDb } = require('./database')

const BUGUN = "DATE('now','localtime')"

module.exports = {
  // Dashboard özeti: bugünkü ciro (mağaza bazlı), kritik stok, bekleyen online
  // sipariş, son satışlar ve son 7 günün cirosu.
  'panel:ozet': () => {
    const db = getDb()

    // Bugünkü mağaza satışları (lokasyon bazlı).
    const bugun = db.prepare(`
      SELECT s.lokasyon_id, l.ad AS lokasyon_adi,
             COUNT(*) AS satis_sayisi, COALESCE(SUM(s.genel_toplam),0) AS ciro
      FROM satislar s JOIN lokasyonlar l ON s.lokasyon_id = l.id
      WHERE s.durum = 'tamamlandi' AND COALESCE(s.tip,'satis') != 'iade' AND DATE(s.tarih) = ${BUGUN}
      GROUP BY s.lokasyon_id ORDER BY ciro DESC
    `).all()
    const bugunGenel = bugun.reduce((a, b) => ({
      ciro: a.ciro + b.ciro, satis_sayisi: a.satis_sayisi + b.satis_sayisi,
    }), { ciro: 0, satis_sayisi: 0 })

    // Kritik stok: minimum tanımlı ve altına düşmüş aktif ürün-lokasyon sayısı.
    const kritikStokSayisi = db.prepare(`
      SELECT COUNT(*) n FROM urun_stoklar us JOIN urunler u ON us.urun_id = u.id
      WHERE u.aktif = 1 AND us.minimum_stok > 0 AND us.miktar <= us.minimum_stok
    `).get().n

    // Bekleyen online sipariş: iptal/iade değil ve henüz kargolanmamış.
    const bekleyenOnlineSayisi = db.prepare(`
      SELECT COUNT(*) n FROM online_siparisler
      WHERE durum NOT IN ('CANCELLED','REFUNDED')
        AND (kargo_durumu IS NULL OR kargo_durumu IN ('UNFULFILLED',''))
    `).get().n

    // Fiilen iptal/iade talebinde olan siparişler. Paket durumu daha güncel gerçeği
    // yansıtır → o kazanır; paket henüz oluşmamışsa (''/UNFULFILLED) sipariş durumuna
    // bakılır. Karşılığı: src/utils/talep.js bekleyenTalepMi (ESM↔CJS köprüsü yok).
    const bekleyenTalepSayisi = db.prepare(`
      SELECT COUNT(*) n FROM online_siparisler
      WHERE (CASE WHEN COALESCE(kargo_durumu,'') IN ('','UNFULFILLED')
                  THEN COALESCE(durum,'') ELSE kargo_durumu END)
            IN ('REFUND_REQUESTED','CANCEL_REQUESTED')
    `).get().n

    const sonSatislar = db.prepare(`
      SELECT s.id, s.fis_no, s.genel_toplam, s.odeme_tipi, s.tarih,
             l.ad AS lokasyon_adi, COALESCE(m.ad || ' ' || m.soyad, '') AS musteri_adi
      FROM satislar s JOIN lokasyonlar l ON s.lokasyon_id = l.id
      LEFT JOIN musteriler m ON s.musteri_id = m.id
      WHERE s.durum = 'tamamlandi' AND COALESCE(s.tip,'satis') != 'iade'
      ORDER BY s.id DESC LIMIT 8
    `).all()

    // Son 7 gün ciro (mağaza).
    const haftalik = db.prepare(`
      SELECT DATE(tarih) AS gun, COALESCE(SUM(genel_toplam),0) AS ciro
      FROM satislar
      WHERE durum = 'tamamlandi' AND COALESCE(tip,'satis') != 'iade' AND DATE(tarih) >= DATE('now','localtime','-6 days')
      GROUP BY DATE(tarih) ORDER BY gun ASC
    `).all()

    return { bugun, bugunGenel, kritikStokSayisi, bekleyenOnlineSayisi, bekleyenTalepSayisi, sonSatislar, haftalik }
  },

  // Düşük/kritik stoktaki ürünler (minimum tanımlı ve altına düşmüş).
  'stok:dusuk': ({ lokasyon_id } = {}) => {
    const db = getDb()
    let where = 'WHERE u.aktif = 1 AND us.minimum_stok > 0 AND us.miktar <= us.minimum_stok'
    const params = []
    if (lokasyon_id) { where += ' AND us.lokasyon_id = ?'; params.push(lokasyon_id) }
    return db.prepare(`
      SELECT u.id AS urun_id, u.ad AS urun_adi, u.barkod, u.sku,
             us.lokasyon_id, l.ad AS lokasyon_adi, us.miktar, us.minimum_stok,
             (us.minimum_stok - us.miktar) AS eksik
      FROM urun_stoklar us
      JOIN urunler u ON us.urun_id = u.id
      JOIN lokasyonlar l ON us.lokasyon_id = l.id
      ${where}
      ORDER BY (us.miktar - us.minimum_stok) ASC, u.ad
    `).all(...params)
  },
}
