// Kendi setlerimiz: mevcut ürünlerden oluşan, TEK set fiyatlı paketler.
// Satışta set bileşenlere açılır (stok bileşen ürünlerden düşer); fişte
// yalnızca set fiyatı görünür (satis_kalemleri.set_adi ile gruplanır).
//
// v1.2.180: set artık "normal ürün gibi" düzenlenir — SKU, barkod, KDV, açıklama,
// marka ve kategori taşır. SKU/barkod ELLE girilir, OTOMATİK ÜRETİLMEZ: setin kodu
// ikas ve bizimhesap'ta zaten mevcut ve üç sistemin BİREBİR aynı olması şart
// ([[sku-tek-kaynak-kurali]]). Otomatik üretim burada üçüncü, uyumsuz bir kod
// doğururdu → pazaryeri faturasını bulmak imkânsız hale gelirdi.
const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')
const { kelimeKosulu } = require('./tr-arama')

// Set listesi + bileşenleri (Satış ekranı ve Setler yönetimi için).
// arama verilmezse (boş/undefined) mevcut davranış aynen korunur: tüm aktif setler.
// Arama set ADI + BİLEŞEN ÜRÜN ADLARI + SKU/BARKOD üzerinde yapılır: kullanıcı setin
// içindeki bir ürünün adını yazınca da set bulunmalı (2026-08-11 isteği — set ürün
// havuzunda çıkmıyordu); stok kodu/barkodla arama v1.2.180'de eklendi.
// db enjekte edilebilir (test için); üretimde IPC sarmalayıcısı getDb() geçer.
const SET_ICERIK_ALT = `(SELECT group_concat(u.ad, ' ') FROM set_urunler su
   JOIN urunler u ON u.id = su.urun_id WHERE su.set_id = s.id)`

// Marka/kategori adları LEFT JOIN ile gelir — liste ekranı ayrı sorgu atmasın.
// Alanlar sonradan eklendiği için eski kayıtlarda NULL: LEFT JOIN şart.
// SÜTUNLAR ve FROM ayrı tutulur: listele() araya icerik_metni alt sorgusunu sokuyor
// ve o alt sorgu s.id'ye bakıyor — tek parça bir SELECT'e virgülle eklenirse alt
// sorgu FROM listesine düşer ve "no such column: s.id" verir (testle yakalandı).
const SET_SUTUNLAR = `s.*, m.ad AS marka_adi, k.tam_yol AS kategori_yol`
const SET_FROM = `FROM setler s
  LEFT JOIN markalar m ON m.id = s.marka_id
  LEFT JOIN kategoriler k ON k.id = s.kategori_id`

const BILESEN_SQL = `
  SELECT su.urun_id, su.miktar, u.ad, u.kdv_orani, u.satis_fiyati
  FROM set_urunler su JOIN urunler u ON u.id = su.urun_id
  WHERE su.set_id = ? AND u.aktif = 1
`

function listele({ arama } = {}, db = getDb()) {
  const params = []
  let where = ''
  if (arama) {
    const k = kelimeKosulu(
      "(ad || ' ' || COALESCE(icerik_metni, '') || ' ' || COALESCE(sku, '') || ' ' || COALESCE(barkod, ''))",
      arama,
    )
    where = ' WHERE 1 = 1' + k.sql
    params.push(...k.params)
  }
  const setler = db.prepare(
    `SELECT * FROM (SELECT ${SET_SUTUNLAR}, ${SET_ICERIK_ALT} AS icerik_metni ${SET_FROM} WHERE s.aktif = 1)` +
    `${where} ORDER BY ad`
  ).all(...params).map(({ icerik_metni, ...s }) => s)
  const bilesenStmt = db.prepare(BILESEN_SQL)
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

// Boş metni NULL'a çevirir. UNIQUE indeksler kısmi ("WHERE ... IS NOT NULL")
// olduğundan, kutuyu boş bırakan İKİNCİ set '' değeriyle çakışırdı.
function bosNull(v) {
  const s = v == null ? '' : String(v).trim()
  return s === '' ? null : s
}

// Barkod TEK havuz: ürün barkodu, ürün takma ad barkodu (urun_barkodlar) ve set
// barkodu aynı okuyucudan geçer. Üç tablonun kendi UNIQUE indeksi vardı ama
// ARALARINDA kontrol yoktu → aynı barkod hem bir ürüne hem bir sete verilebiliyor,
// kasada hangisinin geleceği sorgu sırasına kalıyordu. Kaydetmeden önce üçünü de tara.
// haricSetId: düzenlenen setin kendi barkodu çakışma sayılmasın.
function barkodCakismasi(db, barkod, haricSetId = 0) {
  if (!barkod) return null
  const u = db.prepare('SELECT ad FROM urunler WHERE barkod = ? AND aktif = 1').get(barkod)
  if (u) return `Bu barkod "${u.ad}" ürününde kullanılıyor`
  const t = db.prepare(`SELECT u.ad FROM urun_barkodlar ub JOIN urunler u ON u.id = ub.urun_id
                        WHERE ub.barkod = ? AND u.aktif = 1`).get(barkod)
  if (t) return `Bu barkod "${t.ad}" ürününe takma ad olarak tanımlı`
  const s = db.prepare('SELECT ad FROM setler WHERE barkod = ? AND aktif = 1 AND id != ?').get(barkod, haricSetId)
  if (s) return `Bu barkod "${s.ad}" setinde kullanılıyor`
  return null
}

// SKU da ürünlerle ORTAK havuz: bir ürüne ait TNC.* kodu sete verilemez.
function skuCakismasi(db, sku, haricSetId = 0) {
  if (!sku) return null
  const u = db.prepare('SELECT ad FROM urunler WHERE sku = ? AND aktif = 1').get(sku)
  if (u) return `Bu stok kodu "${u.ad}" ürününde kullanılıyor`
  const s = db.prepare('SELECT ad FROM setler WHERE sku = ? AND aktif = 1 AND id != ?').get(sku, haricSetId)
  if (s) return `Bu stok kodu "${s.ad}" setinde kullanılıyor`
  return null
}

// Barkodla set bulma (Satış ekranı okuyucusu). listele() ile AYNI şekli döndürür —
// bileşenler dahil — çünkü Satış'taki setSepeteEkle() bilesenler bekliyor.
function barkodIleBul(barkod, db = getDb()) {
  const kod = bosNull(barkod)
  if (!kod) return null
  const s = db.prepare(`SELECT ${SET_SUTUNLAR} ${SET_FROM} WHERE s.barkod = ? AND s.aktif = 1`).get(kod)
  if (!s) return null
  return { ...s, bilesenler: db.prepare(BILESEN_SQL).all(s.id) }
}

// Formdan gelen "ürün alanlarını" doğrulayıp yazıma hazırlar.
// kdv_orani NULL bırakılabilir → satışta bileşenlerden hesaplanır (eski davranış).
function alanlariHazirla(db, veri, haricSetId = 0) {
  const sku = bosNull(veri.sku)
  const barkod = bosNull(veri.barkod)
  const skuHata = skuCakismasi(db, sku, haricSetId)
  if (skuHata) throw new Error(skuHata)
  const barkodHata = barkodCakismasi(db, barkod, haricSetId)
  if (barkodHata) throw new Error(barkodHata)
  let kdv = null
  if (veri.kdv_orani !== undefined && veri.kdv_orani !== null && String(veri.kdv_orani).trim() !== '') {
    kdv = Number(veri.kdv_orani)
    if (!Number.isFinite(kdv) || kdv < 0 || kdv > 100) throw new Error('KDV oranı 0-100 arasında olmalı')
  }
  return {
    sku,
    barkod,
    kdv_orani: kdv,
    aciklama: bosNull(veri.aciklama),
    marka_id: veri.marka_id ? Number(veri.marka_id) : null,
    kategori_id: veri.kategori_id ? Number(veri.kategori_id) : null,
  }
}

// Formun gönderdiği "ürün alanları" — güncellemede yalnız GÖNDERİLENLER yazılır.
const URUN_ALANLARI = ['sku', 'barkod', 'kdv_orani', 'aciklama', 'marka_id', 'kategori_id']

module.exports = {
  _listele: listele,
  _barkodla: barkodIleBul,
  _alanlariHazirla: alanlariHazirla,

  'setler:listele': (p) => listele(p || {}),

  'setler:barkodla': (barkod) => barkodIleBul(barkod, getDb()),

  'setler:olustur': (veri) => {
    yetkiKontrol('urun_duzenle')
    const { ad, fiyat, kalemler, web_link } = veri
    if (!ad || !ad.trim()) throw new Error('Set adı zorunlu')
    if (!(Number(fiyat) > 0)) throw new Error('Geçerli bir set fiyatı girin')
    if (!Array.isArray(kalemler) || kalemler.length === 0) throw new Error('Sete en az bir ürün ekleyin')
    const db = getDb()
    const tx = db.transaction(() => {
      // Aynı adla pasif set varsa canlandır (UNIQUE ad).
      const mevcut = db.prepare('SELECT id FROM setler WHERE ad = ?').get(ad.trim())
      const a = alanlariHazirla(db, veri, mevcut?.id || 0)
      let id
      if (mevcut) {
        db.prepare(`UPDATE setler SET fiyat = ?, aktif = 1, web_link = ?, sku = ?, barkod = ?,
                    kdv_orani = ?, aciklama = ?, marka_id = ?, kategori_id = ? WHERE id = ?`)
          .run(Number(fiyat), web_link || null, a.sku, a.barkod, a.kdv_orani, a.aciklama, a.marka_id, a.kategori_id, mevcut.id)
        id = mevcut.id
      } else {
        id = db.prepare(`INSERT INTO setler (ad, fiyat, aktif, web_link, sku, barkod, kdv_orani, aciklama, marka_id, kategori_id)
                         VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`)
          .run(ad.trim(), Number(fiyat), web_link || null, a.sku, a.barkod, a.kdv_orani, a.aciklama, a.marka_id, a.kategori_id)
          .lastInsertRowid
      }
      kalemleriYaz(db, id, kalemler)
      return id
    })
    const id = tx()
    return { id }
  },

  'setler:guncelle': (veri) => {
    yetkiKontrol('urun_duzenle')
    const { id, ad, fiyat, kalemler, web_link } = veri
    if (!id) throw new Error('Set id gerekli')
    const db = getDb()
    const tx = db.transaction(() => {
      db.prepare('UPDATE setler SET ad = COALESCE(?, ad), fiyat = COALESCE(?, fiyat) WHERE id = ?')
        .run(ad?.trim() || null, Number(fiyat) > 0 ? Number(fiyat) : null, id)
      // web_link ayrı yazılır: COALESCE ile birleştirilseydi kutuyu boşaltıp linki SİLMEK
      // imkânsız olurdu (boş değer "dokunma" sayılırdı). undefined = alan gönderilmedi → koru.
      if (web_link !== undefined) {
        db.prepare('UPDATE setler SET web_link = ? WHERE id = ?').run(web_link || null, id)
      }
      // Ürün alanlarında da AYNI kural: gönderilmediyse dokunma, boş gönderildiyse SİL.
      // (Aksi halde yanlış girilmiş bir SKU'yu temizlemek mümkün olmazdı.)
      const gonderilen = URUN_ALANLARI.filter(k => veri[k] !== undefined)
      if (gonderilen.length) {
        const a = alanlariHazirla(db, veri, id)
        for (const k of gonderilen) {
          db.prepare(`UPDATE setler SET ${k} = ? WHERE id = ?`).run(a[k], id)
        }
      }
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
