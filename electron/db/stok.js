const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')
const { _pushArkaPlan: ikasPush } = require('../ikas')

module.exports = {
  'stok:listele': ({ lokasyon_id, dusuk_stok } = {}) => {
    const db = getDb()
    let sorgu = `
      SELECT us.*, u.ad as urun_adi, u.barkod, u.sku, u.kategori, u.marka
      FROM urun_stoklar us
      JOIN urunler u ON us.urun_id = u.id
      WHERE u.aktif = 1
    `
    const params = []
    if (lokasyon_id) { sorgu += ' AND us.lokasyon_id = ?'; params.push(lokasyon_id) }
    if (dusuk_stok) sorgu += ' AND us.miktar <= us.minimum_stok'
    sorgu += ' ORDER BY u.ad'
    return db.prepare(sorgu).all(...params)
  },

  'stok:guncelle': ({ urun_id, lokasyon_id, miktar }) => {
    yetkiKontrol('stok_duzenle')
    const db = getDb()
    db.prepare(`
      INSERT INTO urun_stoklar (urun_id, lokasyon_id, miktar)
      VALUES (?, ?, ?)
      ON CONFLICT(urun_id, lokasyon_id) DO UPDATE SET miktar = excluded.miktar
    `).run(urun_id, lokasyon_id, miktar)
    ikasPush([urun_id])
    return { mesaj: 'Stok güncellendi', miktar }
  },

  'stok:minimum-guncelle': ({ urun_id, lokasyon_id, minimum_stok }) => {
    yetkiKontrol('stok_duzenle')
    const db = getDb()
    db.prepare(`
      INSERT INTO urun_stoklar (urun_id, lokasyon_id, minimum_stok)
      VALUES (?, ?, ?)
      ON CONFLICT(urun_id, lokasyon_id) DO UPDATE SET minimum_stok = excluded.minimum_stok
    `).run(urun_id, lokasyon_id, minimum_stok)
    return { mesaj: 'Minimum stok güncellendi' }
  },

  'sayim:baslat': ({ lokasyon_id, notlar }) => {
    yetkiKontrol('stok_sayim')
    const db = getDb()
    const result = db.prepare('INSERT INTO stok_sayimlar (lokasyon_id, notlar) VALUES (?, ?)').run(lokasyon_id, notlar || null)
    const sayimId = result.lastInsertRowid

    const stoklar = db.prepare('SELECT us.*, u.ad as urun_adi, u.barkod FROM urun_stoklar us JOIN urunler u ON us.urun_id = u.id WHERE us.lokasyon_id = ? AND u.aktif = 1').all(lokasyon_id)
    const insertKalem = db.prepare('INSERT INTO stok_sayim_kalemleri (sayim_id, urun_id, beklenen_miktar) VALUES (?, ?, ?)')
    for (const s of stoklar) {
      insertKalem.run(sayimId, s.urun_id, s.miktar)
    }

    return { sayim_id: sayimId, kalem_sayisi: stoklar.length }
  },

  'sayim:kalem-gir': ({ sayim_id, urun_id, sayilan_miktar }) => {
    const db = getDb()
    const kalem = db.prepare('SELECT * FROM stok_sayim_kalemleri WHERE sayim_id = ? AND urun_id = ?').get(sayim_id, urun_id)
    if (!kalem) throw new Error('Sayım kalemi bulunamadı')
    const fark = sayilan_miktar - kalem.beklenen_miktar
    db.prepare('UPDATE stok_sayim_kalemleri SET sayilan_miktar = ?, fark = ? WHERE sayim_id = ? AND urun_id = ?')
      .run(sayilan_miktar, fark, sayim_id, urun_id)
    return { fark }
  },

  'sayim:getir': (sayim_id) => {
    const db = getDb()
    const sayim = db.prepare('SELECT * FROM stok_sayimlar WHERE id = ?').get(sayim_id)
    if (!sayim) return null
    sayim.kalemler = db.prepare(`
      SELECT ssk.*, u.ad as urun_adi, u.barkod
      FROM stok_sayim_kalemleri ssk JOIN urunler u ON ssk.urun_id = u.id
      WHERE ssk.sayim_id = ?
      ORDER BY u.ad
    `).all(sayim_id)
    return sayim
  },

  'sayim:tamamla': ({ sayim_id, stogu_guncelle = true }) => {
    yetkiKontrol('stok_sayim')
    const db = getDb()
    const sayim = db.prepare('SELECT * FROM stok_sayimlar WHERE id = ?').get(sayim_id)
    if (!sayim) throw new Error('Sayım bulunamadı')

    const tamamla = db.transaction(() => {
      if (stogu_guncelle) {
        const kalemler = db.prepare('SELECT * FROM stok_sayim_kalemleri WHERE sayim_id = ? AND sayilan_miktar IS NOT NULL').all(sayim_id)
        for (const k of kalemler) {
          db.prepare('UPDATE urun_stoklar SET miktar = ? WHERE urun_id = ? AND lokasyon_id = ?')
            .run(k.sayilan_miktar, k.urun_id, sayim.lokasyon_id)
        }
      }
      db.prepare("UPDATE stok_sayimlar SET durum = 'tamamlandi', bitis_tarihi = datetime('now','localtime') WHERE id = ?").run(sayim_id)
    })
    tamamla()
    if (stogu_guncelle) {
      const idler = db.prepare('SELECT DISTINCT urun_id FROM stok_sayim_kalemleri WHERE sayim_id = ? AND sayilan_miktar IS NOT NULL').all(sayim_id)
      ikasPush(idler.map(k => k.urun_id))
    }
    return { mesaj: 'Sayım tamamlandı' }
  },
}
