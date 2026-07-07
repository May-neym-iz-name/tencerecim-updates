const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')

module.exports = {
  'musteriler:listele': ({ arama, sayfa = 1, boyut = 100 } = {}) => {
    const db = getDb()
    let sorgu = 'SELECT * FROM musteriler WHERE aktif = 1'
    const params = []
    if (arama) {
      // Kelime bazlı arama: "ömer keskin" gibi tam ad sorguları için her kelime,
      // ad+soyad+telefon+vergi birleşiminde ayrı ayrı aranır (hepsi eşleşmeli).
      // tr_kucuk: Türkçe duyarlı küçük harf (Ö/ö, İ/i LIKE'ta eşleşsin diye).
      const kelimeler = String(arama).trim().split(/\s+/).filter(Boolean)
      for (const kelime of kelimeler) {
        sorgu += " AND tr_kucuk(ad || ' ' || COALESCE(soyad,'') || ' ' || COALESCE(telefon,'') || ' ' || COALESCE(vergi_no,'')) LIKE tr_kucuk(?)"
        params.push(`%${kelime}%`)
      }
    }
    const toplam = db.prepare(`SELECT COUNT(*) as n FROM (${sorgu})`).get(...params).n
    sorgu += ' ORDER BY ad, soyad'
    if (boyut && boyut > 0) { sorgu += ' LIMIT ? OFFSET ?'; params.push(boyut, (sayfa - 1) * boyut) }
    return { toplam, musteriler: db.prepare(sorgu).all(...params) }
  },

  'musteriler:getir': (id) => {
    return getDb().prepare('SELECT * FROM musteriler WHERE id = ?').get(id)
  },

  'musteriler:olustur': (veri) => {
    yetkiKontrol('musteri_duzenle')
    const db = getDb()
    const cols = Object.keys(veri).join(', ')
    const placeholders = Object.keys(veri).map(k => `@${k}`).join(', ')
    const result = db.prepare(`INSERT INTO musteriler (${cols}) VALUES (${placeholders})`).run(veri)
    return db.prepare('SELECT * FROM musteriler WHERE id = ?').get(result.lastInsertRowid)
  },

  'musteriler:guncelle': ({ id, ...veri }) => {
    yetkiKontrol('musteri_duzenle')
    const db = getDb()
    const alanlar = Object.keys(veri).map(k => `${k} = @${k}`).join(', ')
    db.prepare(`UPDATE musteriler SET ${alanlar} WHERE id = @id`).run({ ...veri, id })
    return db.prepare('SELECT * FROM musteriler WHERE id = ?').get(id)
  },

  'musteriler:sil': (id) => {
    yetkiKontrol('musteri_sil')
    getDb().prepare('UPDATE musteriler SET aktif = 0 WHERE id = ?').run(id)
    return { mesaj: 'Müşteri silindi' }
  },
}
