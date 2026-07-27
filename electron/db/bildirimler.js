// Bildirim merkezi: listeleme, okunmamış sayacı, okundu işaretleme.
// Bildirim ÜRETİMİ ikas çekiminde yapılır (electron/ikas/bildirim-uret.js);
// bu modül yalnızca okuma + okundu durumunu yönetir. _ekle yardımcısı üretici içindir.
const { getDb } = require('./database')

// INSERT OR IGNORE: dedup_anahtar UNIQUE olduğu için aynı olay tekrar eklenmez.
// Döner: eklenen satır sayısı (0 = zaten vardı / eklenmedi).
function _ekle(db, k) {
  const r = db.prepare(`
    INSERT OR IGNORE INTO bildirimler (tip, baslik, mesaj, onem, ikas_siparis_id, dedup_anahtar)
    VALUES (@tip, @baslik, @mesaj, @onem, @ikas_siparis_id, @dedup_anahtar)
  `).run({
    tip: k.tip, baslik: k.baslik, mesaj: k.mesaj || null,
    onem: k.onem || 'normal', ikas_siparis_id: k.ikas_siparis_id || null,
    dedup_anahtar: k.dedup_anahtar,
  })
  return r.changes
}

module.exports = {
  _ekle,

  'bildirim:liste': ({ sayfa = 1, boyut = 50 } = {}) => {
    const db = getDb()
    const toplam = db.prepare('SELECT COUNT(*) n FROM bildirimler').get().n
    const bildirimler = db.prepare(
      `SELECT * FROM bildirimler ORDER BY olusturma_tarihi DESC, id DESC LIMIT ? OFFSET ?`
    ).all(boyut, (sayfa - 1) * boyut)
    return { toplam, bildirimler }
  },

  // Üstte gösterilecek belirgin blok: iptal/iade talepleri. Okunmamışlar önce.
  'bildirim:onemliler': () => {
    const db = getDb()
    return db.prepare(
      `SELECT * FROM bildirimler WHERE onem = 'yuksek'
       ORDER BY okundu ASC, olusturma_tarihi DESC, id DESC LIMIT 100`
    ).all()
  },

  // Okunmamış sayıları: toplam rozette, yuksek ise ses kararında kullanılır
  // (ses YALNIZ yüksek önemli bildirim artınca çalar — kullanıcı kararı 2026-07-28).
  'bildirim:sayac': () => {
    const db = getDb()
    return db.prepare(`SELECT COUNT(*) AS toplam,
      SUM(CASE WHEN onem = 'yuksek' THEN 1 ELSE 0 END) AS yuksek
      FROM bildirimler WHERE okundu = 0`).get()
  },

  'bildirim:okundu': (id) => {
    const db = getDb()
    db.prepare('UPDATE bildirimler SET okundu = 1 WHERE id = ?').run(id)
    return { ok: true }
  },

  'bildirim:tumunuOku': () => {
    const db = getDb()
    db.prepare('UPDATE bildirimler SET okundu = 1 WHERE okundu = 0').run()
    return { ok: true }
  },
}
