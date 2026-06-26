// Mal kabul (tedarikçiden gelen ürün girişi): stok artırır, son alış maliyetini
// günceller ve güncel stoğu ikas'a yansıtır.
const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol, _lokasyonKontrol: lokasyonKontrol } = require('../yetki')
const { _pushArkaPlan: ikasPush } = require('../ikas')

module.exports = {
  // kalemler: [{ urun_id, miktar, birim_maliyet }]
  'mal-kabul:olustur': ({ lokasyon_id, tedarikci_id, fatura_no, notlar, kullanici, kalemler }) => {
    yetkiKontrol('mal_kabul_yonet'); lokasyonKontrol(lokasyon_id)
    const db = getDb()
    if (!lokasyon_id) throw new Error('Mağaza seçilmedi')
    if (!Array.isArray(kalemler) || kalemler.length === 0) throw new Error('En az bir ürün ekleyin')

    // Doğrula + toplam maliyet.
    const hazir = []
    for (const k of kalemler) {
      const urun = db.prepare('SELECT id FROM urunler WHERE id = ? AND aktif = 1').get(k.urun_id)
      if (!urun) throw new Error(`Ürün bulunamadı: ${k.urun_id}`)
      const miktar = parseInt(k.miktar, 10)
      if (!Number.isFinite(miktar) || miktar <= 0) throw new Error('Geçersiz miktar')
      hazir.push({ urun_id: k.urun_id, miktar, birim_maliyet: Number(k.birim_maliyet) || 0 })
    }
    const toplam = hazir.reduce((t, k) => t + k.miktar * k.birim_maliyet, 0)

    const tx = db.transaction(() => {
      const mk = db.prepare(`INSERT INTO mal_kabuller (lokasyon_id, tedarikci_id, fatura_no, toplam_maliyet, kullanici, notlar)
        VALUES (?, ?, ?, ?, ?, ?)`).run(lokasyon_id, tedarikci_id || null, fatura_no || null, toplam, kullanici || null, notlar || null)
      const kalemEkle = db.prepare('INSERT INTO mal_kabul_kalemleri (mal_kabul_id, urun_id, miktar, birim_maliyet) VALUES (?, ?, ?, ?)')
      const stokVarMi = db.prepare('INSERT OR IGNORE INTO urun_stoklar (urun_id, lokasyon_id, miktar, minimum_stok) VALUES (?, ?, 0, 0)')
      const stokArt = db.prepare('UPDATE urun_stoklar SET miktar = miktar + ? WHERE urun_id = ? AND lokasyon_id = ?')
      const maliyetGuncelle = db.prepare("UPDATE urunler SET alis_fiyati = ?, guncelleme_tarihi = datetime('now','localtime') WHERE id = ?")
      for (const k of hazir) {
        kalemEkle.run(mk.lastInsertRowid, k.urun_id, k.miktar, k.birim_maliyet)
        stokVarMi.run(k.urun_id, lokasyon_id)
        stokArt.run(k.miktar, k.urun_id, lokasyon_id)
        if (k.birim_maliyet > 0) maliyetGuncelle.run(k.birim_maliyet, k.urun_id)
      }
      return mk.lastInsertRowid
    })
    const id = tx()
    // Güncel stoğu ikas'a yansıt (arka plan).
    ikasPush(hazir.map(k => k.urun_id))
    return db.prepare('SELECT * FROM mal_kabuller WHERE id = ?').get(id)
  },

  'mal-kabul:listele': ({ lokasyon_id, sayfa = 1, boyut = 50 } = {}) => {
    const db = getDb()
    let where = 'WHERE 1=1'
    const params = []
    if (lokasyon_id) { where += ' AND mk.lokasyon_id = ?'; params.push(lokasyon_id) }
    const toplam = db.prepare(`SELECT COUNT(*) n FROM mal_kabuller mk ${where}`).get(...params).n
    const sorgu = `SELECT mk.*, l.ad AS lokasyon_adi, t.ad AS tedarikci_adi,
      (SELECT COUNT(*) FROM mal_kabul_kalemleri WHERE mal_kabul_id = mk.id) AS kalem_sayisi
      FROM mal_kabuller mk
      LEFT JOIN lokasyonlar l ON mk.lokasyon_id = l.id
      LEFT JOIN tedarikciler t ON mk.tedarikci_id = t.id
      ${where} ORDER BY mk.id DESC LIMIT ? OFFSET ?`
    params.push(boyut, (sayfa - 1) * boyut)
    return { toplam, kayitlar: db.prepare(sorgu).all(...params) }
  },

  'mal-kabul:getir': (id) => {
    const db = getDb()
    const kayit = db.prepare(`SELECT mk.*, l.ad AS lokasyon_adi, t.ad AS tedarikci_adi
      FROM mal_kabuller mk LEFT JOIN lokasyonlar l ON mk.lokasyon_id = l.id
      LEFT JOIN tedarikciler t ON mk.tedarikci_id = t.id WHERE mk.id = ?`).get(id)
    if (!kayit) return null
    kayit.kalemler = db.prepare(`SELECT mkk.*, u.ad AS urun_adi, u.barkod
      FROM mal_kabul_kalemleri mkk JOIN urunler u ON mkk.urun_id = u.id
      WHERE mkk.mal_kabul_id = ?`).all(id)
    return kayit
  },
}
