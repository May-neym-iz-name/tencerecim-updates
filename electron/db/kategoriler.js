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
  'kategoriler:listele': () => getDb().prepare(
    `SELECT k.*, (SELECT COUNT(*) FROM urunler u WHERE u.kategori_id = k.id AND u.aktif = 1) AS urun_sayisi
     FROM kategoriler k WHERE k.aktif = 1 ORDER BY k.tam_yol`
  ).all(),

  'kategoriler:olustur': ({ ad, ust_kategori_id }) => {
    return getOrCreate(ad.trim(), ust_kategori_id || null)
  },

  // Kategori adını değiştirir; kendi tam_yol'unu ve TÜM alt kategorilerin
  // tam_yol önekini günceller (hiyerarşi tutarlı kalsın).
  'kategoriler:guncelle': ({ id, ad }) => {
    const db = getDb()
    const kat = db.prepare('SELECT * FROM kategoriler WHERE id=?').get(id)
    if (!kat) throw new Error('Kategori bulunamadı')
    const yeniAd = (ad || '').trim()
    if (!yeniAd) throw new Error('Kategori adı boş olamaz')
    const ust = kat.ust_kategori_id
      ? db.prepare('SELECT tam_yol FROM kategoriler WHERE id=?').get(kat.ust_kategori_id) : null
    const yeniYol = (ust?.tam_yol ? ust.tam_yol + '>' : '') + yeniAd
    const eskiYol = kat.tam_yol
    try {
      db.transaction(() => {
        db.prepare('UPDATE kategoriler SET ad=?, tam_yol=? WHERE id=?').run(yeniAd, yeniYol, id)
        if (eskiYol) {
          const altlar = db.prepare('SELECT id, tam_yol FROM kategoriler WHERE tam_yol LIKE ?').all(eskiYol + '>%')
          const upd = db.prepare('UPDATE kategoriler SET tam_yol=? WHERE id=?')
          for (const a of altlar) upd.run(yeniYol + a.tam_yol.slice(eskiYol.length), a.id)
        }
      })()
    } catch { throw new Error('Aynı üst kategoride bu adda bir kategori zaten var') }
    return db.prepare('SELECT * FROM kategoriler WHERE id=?').get(id)
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
