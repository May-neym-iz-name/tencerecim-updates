const { getDb } = require('./database')

const URUN_SELECT = `
  SELECT u.*, m.ad as marka_adi, k.tam_yol as kategori_yol, t.ad as tedarikci_adi
  FROM urunler u
  LEFT JOIN markalar m ON u.marka_id = m.id
  LEFT JOIN kategoriler k ON u.kategori_id = k.id
  LEFT JOIN tedarikciler t ON u.tedarikci_id = t.id
`

module.exports = {
  'urunler:listele': ({ arama, kategori_id, marka_id, sayfa = 1, boyut = 100 } = {}) => {
    const db = getDb()
    let where = 'WHERE u.aktif = 1'
    const params = []
    if (arama) {
      where += ' AND (u.ad LIKE ? OR u.barkod LIKE ? OR u.sku LIKE ?)'
      params.push(`%${arama}%`, `%${arama}%`, `%${arama}%`)
    }
    if (kategori_id) {
      // Seçilen kategori + tüm alt kategorilerindeki ürünleri kapsa (tam_yol prefix eşleşmesi).
      const kat = db.prepare('SELECT tam_yol FROM kategoriler WHERE id = ?').get(kategori_id)
      if (kat && kat.tam_yol) {
        where += ' AND u.kategori_id IN (SELECT id FROM kategoriler WHERE tam_yol = ? OR tam_yol LIKE ?)'
        params.push(kat.tam_yol, kat.tam_yol + '>%')
      } else {
        where += ' AND u.kategori_id = ?'
        params.push(kategori_id)
      }
    }
    if (marka_id) { where += ' AND u.marka_id = ?'; params.push(marka_id) }
    const toplam = db.prepare(`SELECT COUNT(*) as n FROM urunler u ${where}`).get(...params).n
    const sorgu = `${URUN_SELECT} ${where} ORDER BY u.ad LIMIT ? OFFSET ?`
    params.push(boyut, (sayfa - 1) * boyut)
    return { toplam, urunler: db.prepare(sorgu).all(...params) }
  },

  'urunler:getir': (id) => {
    return getDb().prepare(`${URUN_SELECT} WHERE u.id = ? AND u.aktif = 1`).get(id)
  },

  'urunler:barkodla': (barkod) => {
    return getDb().prepare(`${URUN_SELECT} WHERE u.barkod = ? AND u.aktif = 1`).get(barkod)
  },

  'urunler:olustur': (veri) => {
    const db = getDb()
    const { ad, barkod, sku, marka_id, kategori_id, tedarikci_id, aciklama, alis_fiyati, satis_fiyati, kdv_orani } = veri
    const r = db.prepare(`
      INSERT INTO urunler (ad, barkod, sku, marka_id, kategori_id, tedarikci_id, aciklama, alis_fiyati, satis_fiyati, kdv_orani)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(ad, barkod||null, sku||null, marka_id||null, kategori_id||null, tedarikci_id||null, aciklama||null, alis_fiyati||0, satis_fiyati, kdv_orani||20)
    return db.prepare(`${URUN_SELECT} WHERE u.id = ?`).get(r.lastInsertRowid)
  },

  'urunler:guncelle': ({ id, ...veri }) => {
    const db = getDb()
    const { ad, barkod, sku, marka_id, kategori_id, tedarikci_id, aciklama, alis_fiyati, satis_fiyati, kdv_orani } = veri
    db.prepare(`
      UPDATE urunler SET ad=?, barkod=?, sku=?, marka_id=?, kategori_id=?, tedarikci_id=?,
      aciklama=?, alis_fiyati=?, satis_fiyati=?, kdv_orani=?, guncelleme_tarihi=datetime('now','localtime')
      WHERE id=?
    `).run(ad, barkod||null, sku||null, marka_id||null, kategori_id||null, tedarikci_id||null,
       aciklama||null, alis_fiyati||0, satis_fiyati, kdv_orani||20, id)
    return db.prepare(`${URUN_SELECT} WHERE u.id = ?`).get(id)
  },

  'urunler:sil': (id) => {
    getDb().prepare('UPDATE urunler SET aktif = 0 WHERE id = ?').run(id)
    return { mesaj: 'Ürün silindi' }
  },

  'urunler:stok': (urun_id) => {
    return getDb().prepare(`
      SELECT us.*, l.ad as lokasyon_adi
      FROM urun_stoklar us JOIN lokasyonlar l ON us.lokasyon_id = l.id
      WHERE us.urun_id = ?
    `).all(urun_id)
  },
}
