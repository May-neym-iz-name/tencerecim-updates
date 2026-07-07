const { getDb } = require('./database')

module.exports = {
  'markalar:listele': () => getDb().prepare(
    `SELECT m.*, (SELECT COUNT(*) FROM urunler u WHERE u.marka_id = m.id AND u.aktif = 1) AS urun_sayisi
     FROM markalar m WHERE m.aktif = 1 ORDER BY m.ad`
  ).all(),
  'markalar:olustur': ({ ad }) => {
    const db = getDb()
    const yeni = String(ad || '').trim()
    if (!yeni) throw new Error('Marka adı boş olamaz')
    // Aynı ad (büyük/küçük harf duyarsız) zaten varsa: pasifse yeniden aktive et,
    // aktifse onu döndür — UNIQUE ihlaliyle çökme yerine akıllı davran.
    const mevcut = db.prepare('SELECT * FROM markalar WHERE lower(ad) = lower(?)').get(yeni)
    if (mevcut) {
      if (!mevcut.aktif) db.prepare('UPDATE markalar SET aktif=1, ad=? WHERE id=?').run(yeni, mevcut.id)
      return db.prepare('SELECT * FROM markalar WHERE id=?').get(mevcut.id)
    }
    const r = db.prepare('INSERT INTO markalar (ad) VALUES (?)').run(yeni)
    return db.prepare('SELECT * FROM markalar WHERE id=?').get(r.lastInsertRowid)
  },
  // İsim değiştir. Yeni ad başka bir markanınkiyle çakışıyorsa (örn. ROLLERS↔Rollers)
  // düz UPDATE UNIQUE ile çökerdi → o markayla BİRLEŞTİR: ürünleri hedefe taşı, bu
  // kaydı pasifle. Böylece çift/yazım-farklı markalar tek çatı altında toplanır.
  'markalar:guncelle': ({ id, ad }) => {
    const db = getDb()
    const yeni = String(ad || '').trim()
    if (!yeni) throw new Error('Marka adı boş olamaz')
    const hedef = db.prepare('SELECT * FROM markalar WHERE lower(ad) = lower(?) AND id != ?').get(yeni, id)
    if (hedef) {
      const tx = db.transaction(() => {
        db.prepare('UPDATE urunler SET marka_id = ? WHERE marka_id = ?').run(hedef.id, id)
        db.prepare('UPDATE markalar SET aktif = 0 WHERE id = ?').run(id)
        db.prepare('UPDATE markalar SET aktif = 1, ad = ? WHERE id = ?').run(yeni, hedef.id)
      })
      tx()
      return { ...db.prepare('SELECT * FROM markalar WHERE id=?').get(hedef.id), _birlesti: true }
    }
    try {
      db.prepare('UPDATE markalar SET ad=? WHERE id=?').run(yeni, id)
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) throw new Error('Bu marka adı zaten kullanılıyor')
      throw e
    }
    return db.prepare('SELECT * FROM markalar WHERE id=?').get(id)
  },
  'markalar:sil': (id) => {
    getDb().prepare('UPDATE markalar SET aktif=0 WHERE id=?').run(id)
    return { mesaj: 'Marka silindi' }
  },
}
