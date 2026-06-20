const { getDb } = require('./database')

function getOrCreate(ad, ust_id) {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM kategoriler WHERE ad=? AND (ust_kategori_id IS ? OR ust_kategori_id=?)').get(ad, ust_id, ust_id)
  if (existing) return existing
  const tam_yol = ust_id
    ? (db.prepare('SELECT tam_yol FROM kategoriler WHERE id=?').get(ust_id)?.tam_yol || '') + '>' + ad
    : ad
  const r = db.prepare('INSERT OR IGNORE INTO kategoriler (ad, ust_kategori_id, tam_yol) VALUES (?,?,?)').run(ad, ust_id||null, tam_yol)
  return db.prepare('SELECT * FROM kategoriler WHERE id=?').get(r.lastInsertRowid) ||
    db.prepare('SELECT * FROM kategoriler WHERE ad=? AND (ust_kategori_id IS ? OR ust_kategori_id=?)').get(ad, ust_id, ust_id)
}

module.exports = {
  'kategoriler:listele': () => getDb().prepare('SELECT * FROM kategoriler WHERE aktif=1 ORDER BY tam_yol').all(),

  'kategoriler:olustur': ({ ad, ust_kategori_id }) => {
    return getOrCreate(ad.trim(), ust_kategori_id || null)
  },

  'kategoriler:sil': (id) => {
    getDb().prepare('UPDATE kategoriler SET aktif=0 WHERE id=?').run(id)
    return { mesaj: 'Kategori silindi' }
  },

  '_getOrCreateKategori': (tamYol) => {
    if (!tamYol) return null
    const parcalar = tamYol.split('>')
    let ust_id = null
    let son = null
    for (const parca of parcalar) {
      son = getOrCreate(parca.trim(), ust_id)
      ust_id = son.id
    }
    return son
  },
}
