// Model Sözlüğü: marka başına model adları. Satış ekranının üçüncü düzeyini besler.
//
// Tohumlama TEK SEFERLİKTİR ve elle ayıklanır (spec §7). Bu ekran olmadan sözlük ilk
// tohumlamada donar ve "Diğer" oranı hiç düşmez — o yüzden CRUD + canlı sayaç +
// "Diğer'de kalanlar" görünümü aynı modülde.
const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')
const { modelCoz, sozlukHazirla, DIGER } = require('./model-coz')
const { adaylar } = require('./model-sozluk-tohum')

// Bir markanın hazır sözlüğü. modelCoz() bunu ürün başına DEĞİL, marka başına ister.
function markaSozlugu(db, markaId) {
  return sozlukHazirla(db.prepare(
    'SELECT model_adi, oncelik, aktif FROM marka_modelleri WHERE marka_id = ? AND aktif = 1'
  ).all(markaId))
}

// Markanın aktif ürünleri + çözümlenmiş modelleri. Sayaç ve "Diğer" listesi bunu paylaşır.
function markaUrunleri(db, markaId) {
  const sz = markaSozlugu(db, markaId)
  return db.prepare('SELECT id, ad, sku, model FROM urunler WHERE aktif = 1 AND marka_id = ? ORDER BY ad')
    .all(markaId)
    .map(u => ({ ...u, cozulen: modelCoz(u.ad, u.model, sz) }))
}

function sayac(db, markaId) {
  const urunler = markaUrunleri(db, markaId)
  const diger = urunler.filter(u => u.cozulen === DIGER).length
  return { toplam: urunler.length, eslesen: urunler.length - diger, diger }
}

module.exports = {
  _markaSozlugu: markaSozlugu,
  _sayac: sayac,

  // Bir markanın model listesi + canlı sayaç. Her modelin kaç ürüne DENK GELDİĞİ de
  // döner — sözlükten silmenin etkisi görülebilsin diye.
  'marka-modelleri:listele': (markaId) => {
    const db = getDb()
    const satirlar = db.prepare(
      'SELECT * FROM marka_modelleri WHERE marka_id = ? ORDER BY oncelik DESC, model_adi'
    ).all(markaId)
    const urunler = markaUrunleri(db, markaId)
    const dagilim = {}
    for (const u of urunler) dagilim[u.cozulen] = (dagilim[u.cozulen] || 0) + 1
    return {
      modeller: satirlar.map(s => ({ ...s, urun_sayisi: dagilim[s.model_adi] || 0 })),
      sayac: {
        toplam: urunler.length,
        diger: dagilim[DIGER] || 0,
        eslesen: urunler.length - (dagilim[DIGER] || 0),
      },
    }
  },

  // "Diğer"de kalan ürünler — sözlüğe ne eklenmesi gerektiği BURADAN görülür.
  'marka-modelleri:diger-urunler': (markaId) => {
    const db = getDb()
    return markaUrunleri(db, markaId).filter(u => u.cozulen === DIGER)
      .map(({ id, ad, sku }) => ({ id, ad, sku }))
  },

  // Tüm markaların kapsama özeti (ekranın üst şeridi).
  'marka-modelleri:ozet': () => {
    const db = getDb()
    const markalar = db.prepare(`SELECT m.id, m.ad FROM markalar m WHERE m.aktif = 1
      AND EXISTS (SELECT 1 FROM urunler u WHERE u.marka_id = m.id AND u.aktif = 1) ORDER BY m.ad`).all()
    return markalar.map(m => {
      const s = sayac(db, m.id)
      const modelSayisi = db.prepare('SELECT COUNT(*) c FROM marka_modelleri WHERE marka_id = ? AND aktif = 1').get(m.id).c
      return { ...m, ...s, model_sayisi: modelSayisi }
    }).sort((a, b) => b.toplam - a.toplam)
  },

  'marka-modelleri:ekle': ({ marka_id, model_adi, oncelik }) => {
    yetkiKontrol('urun_duzenle')
    const ad = (model_adi || '').trim()
    if (!marka_id) throw new Error('Marka seçin')
    if (!ad) throw new Error('Model adı boş olamaz')
    const db = getDb()
    // Aynı adla pasif kayıt varsa CANLANDIR — silinip yeniden eklenen model
    // UNIQUE'e takılıp "zaten var" hatası vermesin.
    const mevcut = db.prepare('SELECT id, aktif FROM marka_modelleri WHERE marka_id = ? AND model_adi = ?').get(marka_id, ad)
    if (mevcut) {
      db.prepare('UPDATE marka_modelleri SET aktif = 1, oncelik = ? WHERE id = ?').run(Number(oncelik) || 0, mevcut.id)
      return { id: mevcut.id, canlandirildi: mevcut.aktif === 0 }
    }
    const r = db.prepare('INSERT INTO marka_modelleri (marka_id, model_adi, oncelik) VALUES (?, ?, ?)')
      .run(marka_id, ad, Number(oncelik) || 0)
    return { id: r.lastInsertRowid, canlandirildi: false }
  },

  // Gönderilmeyen alana DOKUNULMAZ, boş gönderilen alan YAZILIR. COALESCE kullanılmaz:
  // boş "dokunma" sayılsaydı önceliği 0'a çekmek imkânsız olurdu ([[setlerimiz]] tuzağı).
  'marka-modelleri:guncelle': (veri) => {
    yetkiKontrol('urun_duzenle')
    const { id } = veri
    if (!id) throw new Error('Model id gerekli')
    const db = getDb()
    if (veri.model_adi !== undefined) {
      const ad = String(veri.model_adi).trim()
      if (!ad) throw new Error('Model adı boş olamaz')
      try { db.prepare('UPDATE marka_modelleri SET model_adi = ? WHERE id = ?').run(ad, id) }
      catch { throw new Error('Bu markada bu adda bir model zaten var') }
    }
    if (veri.oncelik !== undefined) db.prepare('UPDATE marka_modelleri SET oncelik = ? WHERE id = ?').run(Number(veri.oncelik) || 0, id)
    if (veri.aktif !== undefined) db.prepare('UPDATE marka_modelleri SET aktif = ? WHERE id = ?').run(veri.aktif ? 1 : 0, id)
    return { ok: true }
  },

  // Yumuşak silme: aktif=0. Kayıt DURUR ki aynı ad yeniden eklendiğinde
  // önceliği geri gelsin ve senkron karşı PC'de de silmeyi görsün.
  'marka-modelleri:sil': (id) => {
    yetkiKontrol('urun_duzenle')
    getDb().prepare('UPDATE marka_modelleri SET aktif = 0 WHERE id = ?').run(id)
    return { ok: true }
  },

  // Tohumlama ÖNİZLEMESİ — hiçbir şey yazmaz. Kullanıcı ne geleceğini görmeden
  // 300 satırlık sözlük oluşmasın.
  'marka-modelleri:tohum-onizleme': (markaId) => {
    const db = getDb()
    const marka = db.prepare('SELECT id, ad FROM markalar WHERE id = ?').get(markaId)
    if (!marka) throw new Error('Marka bulunamadı')
    const adlar = db.prepare('SELECT ad FROM urunler WHERE aktif = 1 AND marka_id = ?').all(markaId).map(r => r.ad)
    const mevcut = new Set(db.prepare('SELECT model_adi FROM marka_modelleri WHERE marka_id = ?').all(markaId)
      .map(r => r.model_adi.toLowerCase()))
    return {
      marka: marka.ad,
      urun_sayisi: adlar.length,
      adaylar: adaylar(adlar, marka.ad).map(a => ({ ...a, zaten_var: mevcut.has(a.model_adi.toLowerCase()) })),
    }
  },

  // Önizlemede seçilen adayları yazar. Seçim ZORUNLU: "hepsini otomatik ekle"
  // yolu bilerek yok — gürültülü sözlük (Lines 214, Rollers 96 sözde model)
  // spec §9.2'de kabul edilmiş bir risk, körlemesine yazmak onu büyütür.
  'marka-modelleri:tohumla': ({ marka_id, modeller }) => {
    yetkiKontrol('urun_duzenle')
    if (!marka_id) throw new Error('Marka seçin')
    if (!Array.isArray(modeller) || !modeller.length) throw new Error('En az bir model seçin')
    const db = getDb()
    const ins = db.prepare('INSERT OR IGNORE INTO marka_modelleri (marka_id, model_adi, oncelik) VALUES (?, ?, 0)')
    let eklenen = 0
    db.transaction(() => {
      for (const m of modeller) {
        const ad = String(m || '').trim()
        if (ad) eklenen += ins.run(marka_id, ad).changes
      }
    })()
    return { eklenen, ...sayac(db, marka_id) }
  },
}
