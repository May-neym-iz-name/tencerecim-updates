const { getDb } = require('./database')

module.exports = {
  'markalar:listele': () => getDb().prepare(
    `SELECT m.*, (SELECT COUNT(*) FROM urunler u WHERE u.marka_id = m.id AND u.aktif = 1) AS urun_sayisi
     FROM markalar m WHERE m.aktif = 1 ORDER BY m.ad`
  ).all(),
  'markalar:olustur': ({ ad }) => {
    const db = getDb()
    try {
      const r = db.prepare('INSERT INTO markalar (ad) VALUES (?)').run(ad.trim())
      return db.prepare('SELECT * FROM markalar WHERE id=?').get(r.lastInsertRowid)
    } catch { throw new Error('Bu marka zaten mevcut') }
  },
  'markalar:guncelle': ({ id, ad }) => {
    getDb().prepare('UPDATE markalar SET ad=? WHERE id=?').run(ad.trim(), id)
    return getDb().prepare('SELECT * FROM markalar WHERE id=?').get(id)
  },
  'markalar:sil': (id) => {
    getDb().prepare('UPDATE markalar SET aktif=0 WHERE id=?').run(id)
    return { mesaj: 'Marka silindi' }
  },
}
