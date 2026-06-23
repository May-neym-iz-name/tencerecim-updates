// Online (ikas web sitesi) siparişlerinin yerel listelenmesi ve detayı.
const { getDb } = require('./database')

module.exports = {
  'online-siparis:listele': ({ arama, sayfa = 1, boyut = 50 } = {}) => {
    const db = getDb()
    let where = 'WHERE 1=1'
    const params = []
    if (arama) {
      where += ' AND (s.siparis_no LIKE ? OR s.musteri_ad LIKE ? OR s.musteri_telefon LIKE ?)'
      params.push(`%${arama}%`, `%${arama}%`, `%${arama}%`)
    }
    const toplam = db.prepare(`SELECT COUNT(*) n FROM online_siparisler s ${where}`).get(...params).n
    // Her siparişe ilişkili (varsa) en güncel kargo takip no'sunu ekle.
    const sorgu = `
      SELECT s.*, (
        SELECT k.takip_no FROM kargolar k
        WHERE k.online_siparis_id = s.id AND k.durum != 'iptal'
        ORDER BY k.id DESC LIMIT 1
      ) AS kargo_takip_no
      FROM online_siparisler s ${where} ORDER BY s.siparis_tarihi DESC LIMIT ? OFFSET ?`
    params.push(boyut, (sayfa - 1) * boyut)
    return { toplam, siparisler: db.prepare(sorgu).all(...params) }
  },

  'online-siparis:getir': (id) => {
    const db = getDb()
    const siparis = db.prepare('SELECT * FROM online_siparisler WHERE id = ?').get(id)
    if (!siparis) return null
    siparis.kalemler = db.prepare(`
      SELECT k.*, l.ad AS lokasyon_adi
      FROM online_siparis_kalemleri k
      LEFT JOIN lokasyonlar l ON k.lokasyon_id = l.id
      WHERE k.siparis_id = ?
    `).all(id)
    siparis.kargolar = db.prepare(
      "SELECT id, takip_no, durum FROM kargolar WHERE online_siparis_id = ? ORDER BY id DESC"
    ).all(id)
    return siparis
  },
}
