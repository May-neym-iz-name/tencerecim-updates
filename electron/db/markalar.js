const { getDb } = require('./database')

module.exports = {
  'markalar:listele': () => getDb().prepare('SELECT * FROM markalar WHERE aktif=1 ORDER BY ad').all(),
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
