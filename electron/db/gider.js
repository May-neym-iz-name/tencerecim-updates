// Gider takibi (kira, fatura, personel, vb.) — net kârlılık için.
const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol, _lokasyonKontrol: lokasyonKontrol } = require('../yetki')

module.exports = {
  'gider:ekle': ({ lokasyon_id, tarih, kategori, aciklama, tutar, odeme_tipi = 'nakit', kullanici }) => {
    yetkiKontrol('gider_yonet')
    if (lokasyon_id) lokasyonKontrol(lokasyon_id)
    const t = Number(tutar)
    if (!Number.isFinite(t) || t <= 0) throw new Error('Geçerli bir tutar girin.')
    const db = getDb()
    const r = db.prepare(`INSERT INTO giderler (lokasyon_id, tarih, kategori, aciklama, tutar, odeme_tipi, kullanici)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      lokasyon_id || null, tarih || new Date().toISOString().slice(0, 10),
      kategori || null, aciklama || null, t, odeme_tipi || 'nakit', kullanici || null)
    return db.prepare('SELECT * FROM giderler WHERE id = ?').get(r.lastInsertRowid)
  },

  'gider:listele': ({ lokasyon_id, baslangic, bitis, kategori, sayfa = 1, boyut = 50 } = {}) => {
    const db = getDb()
    let where = 'WHERE 1=1'
    const params = []
    if (lokasyon_id) { where += ' AND g.lokasyon_id = ?'; params.push(lokasyon_id) }
    if (baslangic) { where += ' AND g.tarih >= ?'; params.push(baslangic) }
    if (bitis) { where += ' AND g.tarih <= ?'; params.push(bitis) }
    if (kategori) { where += ' AND g.kategori = ?'; params.push(kategori) }
    const toplamSatir = db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(tutar),0) toplam FROM giderler g ${where}`).get(...params)
    const sorgu = `SELECT g.*, l.ad AS lokasyon_adi FROM giderler g
      LEFT JOIN lokasyonlar l ON g.lokasyon_id = l.id
      ${where} ORDER BY g.tarih DESC, g.id DESC LIMIT ? OFFSET ?`
    params.push(boyut, (sayfa - 1) * boyut)
    return { toplam: toplamSatir.n, toplamTutar: toplamSatir.toplam, giderler: db.prepare(sorgu).all(...params) }
  },

  'gider:sil': (id) => {
    yetkiKontrol('gider_yonet')
    getDb().prepare('DELETE FROM giderler WHERE id = ?').run(id)
    return { mesaj: 'Gider silindi' }
  },
}
