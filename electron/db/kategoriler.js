const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')
const { HARITA, anaTip } = require('./ana-tip')

// ana_tip_ver: çağıran açıkça bir ana tip verdiyse o yazılır; vermediyse ana-tip.js
// haritasından türetilir. Harita yeni kategori adını tanımıyorsa NULL kalır → satış
// ekranında "Diğer" dalına düşer ve kullanıcı ürün penceresinden düzeltebilir.
function getOrCreate(ad, ust_id, ana_tip_ver) {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM kategoriler WHERE ad=? AND (ust_kategori_id IS ? OR ust_kategori_id=?)').get(ad, ust_id, ust_id)
  if (existing) {
    // Mevcut kategoriye ana tip verilmişse ve kayıt boşsa doldur (ezme YOK:
    // elle ayarlanmış bir ana tip sessizce değişmemeli).
    const yeni = String(ana_tip_ver || '').trim()
    if (yeni && !String(existing.ana_tip || '').trim()) {
      db.prepare('UPDATE kategoriler SET ana_tip = ? WHERE id = ?').run(yeni, existing.id)
      return db.prepare('SELECT * FROM kategoriler WHERE id=?').get(existing.id)
    }
    return existing
  }
  const tam_yol = ust_id
    ? (db.prepare('SELECT tam_yol FROM kategoriler WHERE id=?').get(ust_id)?.tam_yol || '') + '>' + ad
    : ad
  const tip = String(ana_tip_ver || '').trim() || anaTip(ad) || null
  const r = db.prepare('INSERT OR IGNORE INTO kategoriler (ad, ust_kategori_id, tam_yol, ana_tip) VALUES (?,?,?,?)').run(ad, ust_id||null, tam_yol, tip)
  return db.prepare('SELECT * FROM kategoriler WHERE id=?').get(r.lastInsertRowid) ||
    db.prepare('SELECT * FROM kategoriler WHERE ad=? AND (ust_kategori_id IS ? OR ust_kategori_id=?)').get(ad, ust_id, ust_id)
}

module.exports = {
  'kategoriler:listele': () => getDb().prepare(
    `SELECT k.*, (SELECT COUNT(*) FROM urunler u WHERE u.kategori_id = k.id AND u.aktif = 1) AS urun_sayisi
     FROM kategoriler k WHERE k.aktif = 1 ORDER BY k.tam_yol`
  ).all(),

  'kategoriler:olustur': ({ ad, ust_kategori_id, ana_tip }) => {
    yetkiKontrol('urun_duzenle')
    return getOrCreate(ad.trim(), ust_kategori_id || null, ana_tip)
  },

  // Satış ekranı 2. düzeyi için seçenek listesi: ana-tip.js haritasındaki tipler +
  // veritabanında FİİLEN kullanılan tipler (harita dışı, elle açılmış olanlar dahil).
  // İkisinin birleşimi alınır ki elle açılan bir tip listeden kaybolmasın.
  'kategoriler:ana-tipler': () => {
    const kullanilan = getDb().prepare(
      `SELECT ana_tip, COUNT(*) AS n FROM kategoriler
       WHERE aktif = 1 AND COALESCE(ana_tip,'') <> '' GROUP BY ana_tip`).all()
    const sayi = Object.fromEntries(kullanilan.map(r => [r.ana_tip, r.n]))
    const tumu = [...new Set([...Object.keys(HARITA), ...kullanilan.map(r => r.ana_tip)])]
    return tumu.map(t => ({ ad: t, kategori_sayisi: sayi[t] || 0 }))
      .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))
  },

  // Bir kategorinin ana tipini değiştirir.
  // 🔴 YAN ETKİ: ana tip KATEGORİYE aittir, ürüne değil — bu çağrı o kategorideki
  // TÜM ürünlerin satış ekranındaki yerini değiştirir. Çağıran arayüz etkilenen
  // ürün sayısını kullanıcıya göstermek zorundadır.
  'kategoriler:ana-tip-guncelle': ({ id, ana_tip }) => {
    yetkiKontrol('urun_duzenle')
    const db = getDb()
    const kat = db.prepare('SELECT * FROM kategoriler WHERE id = ?').get(id)
    if (!kat) throw new Error('Kategori bulunamadı')
    // Boş değer GEÇERLİ: "ana tipi yok" demek (satış ekranında Diğer dalı).
    const yeni = String(ana_tip || '').trim() || null
    db.prepare('UPDATE kategoriler SET ana_tip = ? WHERE id = ?').run(yeni, id)
    const etkilenen = db.prepare(
      'SELECT COUNT(*) AS n FROM urunler WHERE kategori_id = ? AND aktif = 1').get(id).n
    return { ...db.prepare('SELECT * FROM kategoriler WHERE id=?').get(id), etkilenen_urun: etkilenen }
  },

  // Kategori adını değiştirir; kendi tam_yol'unu ve TÜM alt kategorilerin
  // tam_yol önekini günceller (hiyerarşi tutarlı kalsın).
  'kategoriler:guncelle': ({ id, ad }) => {
    yetkiKontrol('urun_duzenle')
    const db = getDb()
    const kat = db.prepare('SELECT * FROM kategoriler WHERE id=?').get(id)
    if (!kat) throw new Error('Kategori bulunamadı')
    const yeniAd = (ad || '').trim()
    if (!yeniAd) throw new Error('Kategori adı boş olamaz')
    const ust = kat.ust_kategori_id
      ? db.prepare('SELECT tam_yol FROM kategoriler WHERE id=?').get(kat.ust_kategori_id) : null
    const yeniYol = (ust?.tam_yol ? ust.tam_yol + '>' : '') + yeniAd
    const eskiYol = kat.tam_yol
    try {
      db.transaction(() => {
        db.prepare('UPDATE kategoriler SET ad=?, tam_yol=? WHERE id=?').run(yeniAd, yeniYol, id)
        if (eskiYol) {
          const altlar = db.prepare('SELECT id, tam_yol FROM kategoriler WHERE tam_yol LIKE ?').all(eskiYol + '>%')
          const upd = db.prepare('UPDATE kategoriler SET tam_yol=? WHERE id=?')
          for (const a of altlar) upd.run(yeniYol + a.tam_yol.slice(eskiYol.length), a.id)
        }
      })()
    } catch { throw new Error('Aynı üst kategoride bu adda bir kategori zaten var') }
    return db.prepare('SELECT * FROM kategoriler WHERE id=?').get(id)
  },

  'kategoriler:sil': (id) => {
    yetkiKontrol('urun_duzenle')
    getDb().prepare('UPDATE kategoriler SET aktif=0 WHERE id=?').run(id)
    return { mesaj: 'Kategori silindi' }
  },

  '_getOrCreateKategori': (tamYol) => {
    if (!tamYol) return null
    const parcalar = tamYol.split('>')
    let ust_id = null
    let son = null
    for (const parca of parcalar) {
      son = getOrCreate(parca.trim(), ust_id)
      ust_id = son.id
    }
    return son
  },
}
