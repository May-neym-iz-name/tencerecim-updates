const { getDb } = require('./database')

module.exports = {
  'lokasyonlar:listele': () => {
    return getDb().prepare('SELECT * FROM lokasyonlar WHERE aktif = 1 ORDER BY id').all()
  },

  'lokasyonlar:olustur': (veri) => {
    const db = getDb()
    const result = db.prepare('INSERT INTO lokasyonlar (ad, adres, telefon, ikas_lokasyon_id) VALUES (@ad, @adres, @telefon, @ikas_lokasyon_id)').run(veri)
    return db.prepare('SELECT * FROM lokasyonlar WHERE id = ?').get(result.lastInsertRowid)
  },

  'lokasyonlar:guncelle': ({ id, ...veri }) => {
    const db = getDb()
    const alanlar = Object.keys(veri).map(k => `${k} = @${k}`).join(', ')
    db.prepare(`UPDATE lokasyonlar SET ${alanlar} WHERE id = @id`).run({ ...veri, id })
    return db.prepare('SELECT * FROM lokasyonlar WHERE id = ?').get(id)
  },
}
