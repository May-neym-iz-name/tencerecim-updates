// İstek listeleri (tedarikçiden tedarik istek listesi) — CRUD.
// Bulut senkron jenerik senk_kayitlar üzerinden (senk-sema.js kaydı yeter).
const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol, _lokasyonKontrol: lokasyonKontrol } = require('../yetki')

module.exports = {
  'istek:listele': () => {
    const db = getDb()
    return db.prepare(`
      SELECT i.id, i.lokasyon_id, i.tedarikci_id, i.baslik, i.tarih,
             l.ad AS lokasyon_adi, t.ad AS tedarikci_adi,
             (SELECT COUNT(*) FROM istek_listesi_kalemleri WHERE istek_id = i.id) AS kalem_sayisi
      FROM istek_listeleri i
      LEFT JOIN lokasyonlar l ON i.lokasyon_id = l.id
      LEFT JOIN tedarikciler t ON i.tedarikci_id = t.id
      ORDER BY i.id DESC
    `).all()
  },

  'istek:getir': (id) => {
    const db = getDb()
    const liste = db.prepare(`
      SELECT i.*, l.ad AS lokasyon_adi, t.ad AS tedarikci_adi
      FROM istek_listeleri i
      LEFT JOIN lokasyonlar l ON i.lokasyon_id = l.id
      LEFT JOIN tedarikciler t ON i.tedarikci_id = t.id
      WHERE i.id = ?
    `).get(id)
    if (!liste) return null
    liste.kalemler = db.prepare(
      'SELECT id, urun_id, urun_adi, miktar FROM istek_listesi_kalemleri WHERE istek_id = ? ORDER BY id'
    ).all(id)
    return liste
  },

  // Yeni liste (id yoksa) ya da mevcut listeyi güncelle (kalemleri sil-yeniden yaz).
  'istek:kaydet': ({ id, lokasyon_id, tedarikci_id, baslik, tarih, kalemler }) => {
    yetkiKontrol('mal_kabul_yonet'); lokasyonKontrol(lokasyon_id)
    const db = getDb()
    if (!lokasyon_id) throw new Error('Şube seçilmedi')
    if (!tedarikci_id) throw new Error('Tedarikçi seçilmedi')
    if (!Array.isArray(kalemler) || kalemler.length === 0) throw new Error('En az bir ürün ekleyin')

    const hazir = kalemler.map(k => {
      const miktar = parseInt(k.miktar, 10)
      if (!Number.isFinite(miktar) || miktar <= 0) throw new Error('Geçersiz miktar')
      return { urun_id: k.urun_id || null, urun_adi: k.urun_adi || '', miktar }
    })

    const tx = db.transaction(() => {
      let istekId = id
      if (istekId) {
        db.prepare('UPDATE istek_listeleri SET lokasyon_id=?, tedarikci_id=?, baslik=?, tarih=? WHERE id=?')
          .run(lokasyon_id, tedarikci_id, baslik || null, tarih || null, istekId)
        db.prepare('DELETE FROM istek_listesi_kalemleri WHERE istek_id = ?').run(istekId)
      } else {
        const r = db.prepare('INSERT INTO istek_listeleri (lokasyon_id, tedarikci_id, baslik, tarih) VALUES (?, ?, ?, ?)')
          .run(lokasyon_id, tedarikci_id, baslik || null, tarih || null)
        istekId = r.lastInsertRowid
      }
      const kalemEkle = db.prepare('INSERT INTO istek_listesi_kalemleri (istek_id, urun_id, urun_adi, miktar) VALUES (?, ?, ?, ?)')
      for (const k of hazir) kalemEkle.run(istekId, k.urun_id, k.urun_adi, k.miktar)
      return istekId
    })
    return { id: tx() }
  },

  'istek:sil': (id) => {
    yetkiKontrol('mal_kabul_yonet')
    const db = getDb()
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM istek_listesi_kalemleri WHERE istek_id = ?').run(id)
      db.prepare('DELETE FROM istek_listeleri WHERE id = ?').run(id)
    })
    tx()
    return { ok: true }
  },
}
