const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')
const { _pushArkaPlan: ikasPush } = require('../ikas')
const sayim = require('./stok-sayim')

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

  // --- Sayım: çekirdek mantık stok-sayim.js'te (saf, db enjekte, testli) -----

  'sayim:baslat': (p) => {
    yetkiKontrol('stok_sayim')
    return sayim.baslat(getDb(), p)
  },

  'sayim:kalem-ekle': (p) => {
    yetkiKontrol('stok_sayim')
    return sayim.kalemEkle(getDb(), p)
  },

  'sayim:kalem-gir': (p) => sayim.kalemGir(getDb(), p),

  'sayim:kalem-sifirla': (p) => {
    yetkiKontrol('stok_sayim')
    return sayim.kalemSifirla(getDb(), p)
  },

  'sayim:getir': (sayim_id) => sayim.getir(getDb(), sayim_id),

  'sayim:listele': (p) => sayim.listele(getDb(), p || {}),

  'sayim:tamamla': ({ sayim_id, stogu_guncelle = true }) => {
    yetkiKontrol('stok_sayim')
    const sonuc = sayim.tamamla(getDb(), { sayim_id, stogu_guncelle })
    if (sonuc.guncellenenUrunIdler.length) ikasPush(sonuc.guncellenenUrunIdler)
    return sonuc
  },

  'sayim:iptal': (sayim_id) => {
    yetkiKontrol('stok_sayim')
    return sayim.iptal(getDb(), sayim_id)
  },
}
