// İstek listeleri (tedarikçiden tedarik istek listesi) — CRUD.
// Bulut senkron jenerik senk_kayitlar üzerinden (senk-sema.js kaydı yeter).
const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol, _lokasyonKontrol: lokasyonKontrol } = require('../yetki')

// Bir listenin kalemlerini KİMLİK KORUYARAK yazar (sil-yeniden-yaz DEĞİL).
//
// Sil-yeniden-yaz her kaydetmede tüm kalemlere yeni senk_id verdiği için senkron bunları
// "yepyeni satır" sanıyordu; silme yayılmadığından karşı PC eskileri tutup yenileri de
// ekliyor, liste her turda şişiyordu (27.07 Sofram listesi: 40 kalem → 182 satır).
// Burada mevcut satır yerinde güncellenir → senk_id sabit kalır, bulut aynı kaydı günceller.
//
// db PARAMETRE: getDb() içeriden çağrılmaz ki bellek-içi DB ile test edilebilsin
// (senk-veri.js'deki _uygula emsali). Çağıran bir transaction içinde olmalıdır.
function _kalemleriYaz(db, istekId, hazir) {
  // Aynı ürün birden fazla kez eklenmişse tek satırda topla: (liste, ürün) çifti tekil
  // olmazsa senkronun dogalCift dedup'ı hangi satırı eşleyeceğini bilemez.
  const urunlu = new Map()
  const serbest = []
  for (const k of hazir) {
    if (k.urun_id == null) { serbest.push(k); continue }
    const v = urunlu.get(k.urun_id)
    if (v) v.miktar += k.miktar
    else urunlu.set(k.urun_id, { ...k })
  }

  // Mevcut satırlar: ürün başına ilki korunur; kopyalar ve serbest metinler silinir
  // (serbest metin kalemlerinin kalıcı kimliği yok, her kayıtta yeniden yazılırlar).
  const mevcutUrun = new Map()
  const silinecek = []
  for (const m of db.prepare('SELECT id, urun_id, urun_adi, miktar FROM istek_listesi_kalemleri WHERE istek_id = ? ORDER BY id').all(istekId)) {
    if (m.urun_id != null && !mevcutUrun.has(m.urun_id)) mevcutUrun.set(m.urun_id, m)
    else silinecek.push(m.id)
  }

  const guncelle = db.prepare('UPDATE istek_listesi_kalemleri SET urun_adi = ?, miktar = ? WHERE id = ?')
  const ekle = db.prepare('INSERT INTO istek_listesi_kalemleri (istek_id, urun_id, urun_adi, miktar) VALUES (?, ?, ?, ?)')
  const sil = db.prepare('DELETE FROM istek_listesi_kalemleri WHERE id = ?')

  for (const k of urunlu.values()) {
    const m = mevcutUrun.get(k.urun_id)
    if (!m) { ekle.run(istekId, k.urun_id, k.urun_adi, k.miktar); continue }
    mevcutUrun.delete(k.urun_id)
    // Değişmediyse dokunma: gereksiz UPDATE senk_guncelleme'yi tazeleyip boşuna push üretir.
    if (m.miktar !== k.miktar || m.urun_adi !== k.urun_adi) guncelle.run(k.urun_adi, k.miktar, m.id)
  }
  for (const m of mevcutUrun.values()) silinecek.push(m.id)  // listeden çıkarılanlar
  for (const id of silinecek) sil.run(id)
  for (const k of serbest) ekle.run(istekId, null, k.urun_adi, k.miktar)
}

module.exports = {
  _kalemleriYaz,

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

  // Seçili şubedeki mevcut stokları toplu getir: { urun_id: miktar }.
  // Ürün ekleme ekranında eklenen kalemlerin stok adedini göstermek için.
  'istek:stoklar': ({ lokasyon_id, urun_idler }) => {
    const db = getDb()
    if (!lokasyon_id || !Array.isArray(urun_idler) || urun_idler.length === 0) return {}
    const yer = urun_idler.map(() => '?').join(',')
    const rows = db.prepare(
      `SELECT urun_id, miktar FROM urun_stoklar WHERE lokasyon_id = ? AND urun_id IN (${yer})`
    ).all(lokasyon_id, ...urun_idler)
    const harita = {}
    for (const r of rows) harita[r.urun_id] = r.miktar
    return harita
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
      } else {
        const r = db.prepare('INSERT INTO istek_listeleri (lokasyon_id, tedarikci_id, baslik, tarih) VALUES (?, ?, ?, ?)')
          .run(lokasyon_id, tedarikci_id, baslik || null, tarih || null)
        istekId = r.lastInsertRowid
      }
      _kalemleriYaz(db, istekId, hazir)
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
