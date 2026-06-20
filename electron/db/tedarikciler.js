const { getDb } = require('./database')

module.exports = {
  'tedarikciler:listele': () => getDb().prepare('SELECT * FROM tedarikciler WHERE aktif=1 ORDER BY ad').all(),
  'tedarikciler:olustur': ({ ad, telefon, email }) => {
    const db = getDb()
    try {
      const r = db.prepare('INSERT INTO tedarikciler (ad, telefon, email) VALUES (?, ?, ?)').run(ad.trim(), telefon||null, email||null)
      return db.prepare('SELECT * FROM tedarikciler WHERE id=?').get(r.lastInsertRowid)
    } catch { throw new Error('Bu tedarikçi zaten mevcut') }
  },
  'tedarikciler:guncelle': ({ id, ad, telefon, email }) => {
    getDb().prepare('UPDATE tedarikciler SET ad=?, telefon=?, email=? WHERE id=?').run(ad.trim(), telefon||null, email||null, id)
    return getDb().prepare('SELECT * FROM tedarikciler WHERE id=?').get(id)
  },
  'tedarikciler:sil': (id) => {
    getDb().prepare('UPDATE tedarikciler SET aktif=0 WHERE id=?').run(id)
    return { mesaj: 'Tedarikçi silindi' }
  },
}
