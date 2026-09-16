const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')
const { anaTip } = require('./ana-tip')
const { trBuyuk } = require('./tr-buyuk')

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
    // Kategori adı DAİMA büyük saklanır (kullanıcı kararı 16.09). Senkronun doğal
    // anahtarı da 'ad' olduğu için bu aynı zamanda eşleşmeyi sağlamlaştırır:
    // "Granit Tavalar" ile "GRANİT TAVALAR" artık ayrı satır doğuramaz.
    return getOrCreate(trBuyuk(ad.trim()), ust_kategori_id || null, ana_tip)
  },

  // Kategori adını değiştirir; kendi tam_yol'unu ve TÜM alt kategorilerin
  // tam_yol önekini günceller (hiyerarşi tutarlı kalsın).
  'kategoriler:guncelle': ({ id, ad }) => {
    yetkiKontrol('urun_duzenle')
    const db = getDb()
    const kat = db.prepare('SELECT * FROM kategoriler WHERE id=?').get(id)
    if (!kat) throw new Error('Kategori bulunamadı')
    const yeniAd = trBuyuk((ad || '').trim())
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
