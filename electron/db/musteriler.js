const { getDb } = require('./database')

module.exports = {
  'musteriler:listele': ({ arama, sayfa = 1, boyut = 100 } = {}) => {
    const db = getDb()
    let sorgu = 'SELECT * FROM musteriler WHERE aktif = 1'
    const params = []
    if (arama) {
      sorgu += ' AND (ad LIKE ? OR soyad LIKE ? OR telefon LIKE ? OR vergi_no LIKE ?)'
      params.push(`%${arama}%`, `%${arama}%`, `%${arama}%`, `%${arama}%`)
    }
    const toplam = db.prepare(`SELECT COUNT(*) as n FROM (${sorgu})`).get(...params).n
    sorgu += ' ORDER BY ad, soyad LIMIT ? OFFSET ?'
    params.push(boyut, (sayfa - 1) * boyut)
    return { toplam, musteriler: db.prepare(sorgu).all(...params) }
  },

  'musteriler:getir': (id) => {
    return getDb().prepare('SELECT * FROM musteriler WHERE id = ?').get(id)
  },

  'musteriler:olustur': (veri) => {
    const db = getDb()
    const cols = Object.keys(veri).join(', ')
    const placeholders = Object.keys(veri).map(k => `@${k}`).join(', ')
    const result = db.prepare(`INSERT INTO musteriler (${cols}) VALUES (${placeholders})`).run(veri)
    return db.prepare('SELECT * FROM musteriler WHERE id = ?').get(result.lastInsertRowid)
  },

  'musteriler:guncelle': ({ id, ...veri }) => {
    const db = getDb()
    const alanlar = Object.keys(veri).map(k => `${k} = @${k}`).join(', ')
    db.prepare(`UPDATE musteriler SET ${alanlar} WHERE id = @id`).run({ ...veri, id })
    return db.prepare('SELECT * FROM musteriler WHERE id = ?').get(id)
  },

  'musteriler:sil': (id) => {
    getDb().prepare('UPDATE musteriler SET aktif = 0 WHERE id = ?').run(id)
    return { mesaj: 'Müşteri silindi' }
  },
}
