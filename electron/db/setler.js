// Kendi setlerimiz: mevcut ürünlerden oluşan, TEK set fiyatlı paketler.
// Satışta set bileşenlere açılır (stok bileşen ürünlerden düşer); fişte
// yalnızca set fiyatı görünür (satis_kalemleri.set_adi ile gruplanır).
const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')
const { kelimeKosulu } = require('./tr-arama')

// Set listesi + bileşenleri (Satış ekranı ve Setler yönetimi için).
// arama verilmezse (boş/undefined) mevcut davranış aynen korunur: tüm aktif setler.
// Arama set ADI + BİLEŞEN ÜRÜN ADLARI üzerinde yapılır: kullanıcı setin içindeki bir
// ürünün adını yazınca da set bulunmalı (2026-08-11 isteği — set ürün havuzunda çıkmıyordu).
// db enjekte edilebilir (test için); üretimde IPC sarmalayıcısı getDb() geçer.
const SET_ICERIK_ALT = `(SELECT group_concat(u.ad, ' ') FROM set_urunler su
   JOIN urunler u ON u.id = su.urun_id WHERE su.set_id = s.id)`

function listele({ arama } = {}, db = getDb()) {
  const params = []
  let where = ''
  if (arama) {
    const k = kelimeKosulu("(ad || ' ' || COALESCE(icerik_metni, ''))", arama)
    where = ' WHERE 1 = 1' + k.sql
    params.push(...k.params)
  }
  const setler = db.prepare(
    `SELECT * FROM (SELECT s.*, ${SET_ICERIK_ALT} AS icerik_metni FROM setler s WHERE s.aktif = 1)` +
    `${where} ORDER BY ad`
  ).all(...params).map(({ icerik_metni, ...s }) => s)
  const bilesenStmt = db.prepare(`
    SELECT su.urun_id, su.miktar, u.ad, u.kdv_orani, u.satis_fiyati
    FROM set_urunler su JOIN urunler u ON u.id = su.urun_id
    WHERE su.set_id = ? AND u.aktif = 1
  `)
  return setler.map(s => ({ ...s, bilesenler: bilesenStmt.all(s.id) }))
}

function kalemleriYaz(db, setId, kalemler) {
  db.prepare('DELETE FROM set_urunler WHERE set_id = ?').run(setId)
  const ins = db.prepare('INSERT INTO set_urunler (set_id, urun_id, miktar) VALUES (?, ?, ?)')
  for (const k of kalemler) {
    const miktar = Math.max(1, parseInt(k.miktar, 10) || 1)
    ins.run(setId, k.urun_id, miktar)
  }
}

module.exports = {
  _listele: listele,

  'setler:listele': (p) => listele(p || {}),

  'setler:olustur': ({ ad, fiyat, kalemler }) => {
    yetkiKontrol('urun_duzenle')
    if (!ad || !ad.trim()) throw new Error('Set adı zorunlu')
    if (!(Number(fiyat) > 0)) throw new Error('Geçerli bir set fiyatı girin')
    if (!Array.isArray(kalemler) || kalemler.length === 0) throw new Error('Sete en az bir ürün ekleyin')
    const db = getDb()
    const tx = db.transaction(() => {
      // Aynı adla pasif set varsa canlandır (UNIQUE ad).
      const mevcut = db.prepare('SELECT id FROM setler WHERE ad = ?').get(ad.trim())
      let id
      if (mevcut) {
        db.prepare('UPDATE setler SET fiyat = ?, aktif = 1 WHERE id = ?').run(Number(fiyat), mevcut.id)
        id = mevcut.id
      } else {
        id = db.prepare('INSERT INTO setler (ad, fiyat, aktif) VALUES (?, ?, 1)').run(ad.trim(), Number(fiyat)).lastInsertRowid
      }
      kalemleriYaz(db, id, kalemler)
      return id
    })
    const id = tx()
    return { id }
  },

  'setler:guncelle': ({ id, ad, fiyat, kalemler }) => {
    yetkiKontrol('urun_duzenle')
    if (!id) throw new Error('Set id gerekli')
    const db = getDb()
    const tx = db.transaction(() => {
      db.prepare('UPDATE setler SET ad = COALESCE(?, ad), fiyat = COALESCE(?, fiyat) WHERE id = ?')
        .run(ad?.trim() || null, Number(fiyat) > 0 ? Number(fiyat) : null, id)
      if (Array.isArray(kalemler)) kalemleriYaz(db, id, kalemler)
    })
    tx()
    return { ok: true }
  },

  'setler:sil': (id) => {
    yetkiKontrol('urun_duzenle')
    getDb().prepare('UPDATE setler SET aktif = 0 WHERE id = ?').run(id)
    return { ok: true }
  },
}
