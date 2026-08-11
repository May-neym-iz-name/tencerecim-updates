// Stok sayımı çekirdeği — SAF fonksiyonlar, db enjekte edilebilir (test için).
// IPC kaydı ve yetki/ikas bağlantısı stok.js'te (bu dosya ikas'ı require ETMEZ,
// yoksa vitest düz Node'da yüklenemezdi).
//
// TASARIM (2026-08-11, docs/superpowers/specs/2026-08-11-stok-sayim-design.md):
// - Üç mod: 'tam' (tüm mağaza), 'kapsamli' (marka/kategori), 'hizli' (boş başlar,
//   okutulan eklenir).
// - HAREKET-FARKINDALIKLI TAMAMLAMA: kalemin beklenen_miktar'ı kaleme EKLENDİĞİ anın
//   stoğudur; tamamlarken miktar = max(0, miktar + (sayilan - beklenen)) uygulanır.
//   Mutlak yazım YOK — sayım sürerken düşen satış/online sipariş kaybolmaz.
//   (Eski davranış mutlak yazıyordu: 2 saatlik sayımda satılan ürün stoğa geri geliyordu.)
// - Sayılmayan kalemlere DOKUNULMAZ.
// - Sayımlar YEREL kalır, senkronlanmaz (senk-sema'da yok — bilerek).

const KALEM_SECIMI = `
  SELECT ssk.*, u.ad AS urun_adi, u.barkod, u.sku
  FROM stok_sayim_kalemleri ssk JOIN urunler u ON ssk.urun_id = u.id
`

function baslat(db, { lokasyon_id, tip = 'tam', marka_id, kategori_id, notlar }) {
  if (!lokasyon_id) throw new Error('Mağaza seçilmedi')
  if (!['tam', 'kapsamli', 'hizli'].includes(tip)) throw new Error('Geçersiz sayım tipi')
  if (tip === 'kapsamli' && !marka_id && !kategori_id) {
    throw new Error('Kapsamlı sayım için marka veya kategori seçin')
  }
  const kapsam = tip === 'kapsamli'
    ? JSON.stringify({ marka_id: marka_id || null, kategori_id: kategori_id || null })
    : null

  const tx = db.transaction(() => {
    const r = db.prepare(
      'INSERT INTO stok_sayimlar (lokasyon_id, tip, kapsam, notlar) VALUES (?, ?, ?, ?)'
    ).run(lokasyon_id, tip, kapsam, notlar || null)
    const sayimId = r.lastInsertRowid

    if (tip !== 'hizli') {
      let sorgu = `
        SELECT us.urun_id, us.miktar FROM urun_stoklar us
        JOIN urunler u ON us.urun_id = u.id
        WHERE us.lokasyon_id = ? AND u.aktif = 1`
      const params = [lokasyon_id]
      if (tip === 'kapsamli') {
        if (marka_id) { sorgu += ' AND u.marka_id = ?'; params.push(marka_id) }
        if (kategori_id) { sorgu += ' AND u.kategori_id = ?'; params.push(kategori_id) }
      }
      const ins = db.prepare(
        'INSERT INTO stok_sayim_kalemleri (sayim_id, urun_id, beklenen_miktar) VALUES (?, ?, ?)'
      )
      for (const s of db.prepare(sorgu).all(...params)) ins.run(sayimId, s.urun_id, s.miktar)
    }
    return sayimId
  })
  const sayimId = tx()
  const kalemSayisi = db.prepare('SELECT COUNT(*) c FROM stok_sayim_kalemleri WHERE sayim_id = ?').get(sayimId).c
  return { sayim_id: sayimId, kalem_sayisi: kalemSayisi }
}

// Hızlı modda (veya kapsam dışı ürün okutulunca) kalemi sayıma dahil eder.
// beklenen = ŞU ANKİ stok (delta tamamlaması bu ana göre çalışır). Zaten varsa
// mevcut kalem döner — çift ekleme olmaz.
function kalemEkle(db, { sayim_id, urun_id }) {
  const sayim = db.prepare("SELECT * FROM stok_sayimlar WHERE id = ? AND durum = 'devam_ediyor'").get(sayim_id)
  if (!sayim) throw new Error('Aktif sayım bulunamadı')
  const mevcut = db.prepare(`${KALEM_SECIMI} WHERE ssk.sayim_id = ? AND ssk.urun_id = ?`).get(sayim_id, urun_id)
  if (mevcut) return mevcut
  const stok = db.prepare('SELECT miktar FROM urun_stoklar WHERE urun_id = ? AND lokasyon_id = ?')
    .get(urun_id, sayim.lokasyon_id)
  db.prepare('INSERT INTO stok_sayim_kalemleri (sayim_id, urun_id, beklenen_miktar) VALUES (?, ?, ?)')
    .run(sayim_id, urun_id, stok ? stok.miktar : 0)
  return db.prepare(`${KALEM_SECIMI} WHERE ssk.sayim_id = ? AND ssk.urun_id = ?`).get(sayim_id, urun_id)
}

function kalemGir(db, { sayim_id, urun_id, sayilan_miktar }) {
  const kalem = db.prepare('SELECT * FROM stok_sayim_kalemleri WHERE sayim_id = ? AND urun_id = ?')
    .get(sayim_id, urun_id)
  if (!kalem) throw new Error('Sayım kalemi bulunamadı')
  const fark = sayilan_miktar - kalem.beklenen_miktar
  db.prepare('UPDATE stok_sayim_kalemleri SET sayilan_miktar = ?, fark = ? WHERE sayim_id = ? AND urun_id = ?')
    .run(sayilan_miktar, fark, sayim_id, urun_id)
  return { fark }
}

// "Yeniden say": fark raporunda şüpheli görülen kalemin sayımı silinir, kalem
// listede kalır (beklenen korunur) — kullanıcı tekrar sayar.
function kalemSifirla(db, { sayim_id, urun_id }) {
  db.prepare('UPDATE stok_sayim_kalemleri SET sayilan_miktar = NULL, fark = NULL WHERE sayim_id = ? AND urun_id = ?')
    .run(sayim_id, urun_id)
  return { ok: true }
}

function getir(db, sayim_id) {
  const sayim = db.prepare('SELECT * FROM stok_sayimlar WHERE id = ?').get(sayim_id)
  if (!sayim) return null
  sayim.kalemler = db.prepare(`${KALEM_SECIMI} WHERE ssk.sayim_id = ? ORDER BY u.ad`).all(sayim_id)
  return sayim
}

// Geçmiş sayımlar (en yeni üstte) + özet sayaçlar. Fark raporu arşivi buradan açılır.
function listele(db, { lokasyon_id } = {}) {
  let sorgu = `
    SELECT ss.*, l.ad AS lokasyon_adi,
      (SELECT COUNT(*) FROM stok_sayim_kalemleri k WHERE k.sayim_id = ss.id) AS kalem_sayisi,
      (SELECT COUNT(*) FROM stok_sayim_kalemleri k WHERE k.sayim_id = ss.id AND k.sayilan_miktar IS NOT NULL) AS sayilan_sayisi,
      (SELECT COUNT(*) FROM stok_sayim_kalemleri k WHERE k.sayim_id = ss.id AND k.fark IS NOT NULL AND k.fark != 0) AS farkli_sayisi
    FROM stok_sayimlar ss JOIN lokasyonlar l ON ss.lokasyon_id = l.id`
  const params = []
  if (lokasyon_id) { sorgu += ' WHERE ss.lokasyon_id = ?'; params.push(lokasyon_id) }
  sorgu += ' ORDER BY ss.id DESC LIMIT 50'
  return db.prepare(sorgu).all(...params)
}

// HAREKET-FARKINDALIKLI tamamlama: sayılan kalemler için stok DELTASI uygulanır.
// Dönüş: { islenen, kirpilan, guncellenenUrunIdler } — kirpilan = 0'a kırpılan satır sayısı.
function tamamla(db, { sayim_id, stogu_guncelle = true }) {
  const sayim = db.prepare("SELECT * FROM stok_sayimlar WHERE id = ?").get(sayim_id)
  if (!sayim) throw new Error('Sayım bulunamadı')
  if (sayim.durum !== 'devam_ediyor') throw new Error('Bu sayım zaten kapatılmış')

  let islenen = 0, kirpilan = 0
  const urunIdler = []
  const tx = db.transaction(() => {
    if (stogu_guncelle) {
      const kalemler = db.prepare(
        'SELECT * FROM stok_sayim_kalemleri WHERE sayim_id = ? AND sayilan_miktar IS NOT NULL'
      ).all(sayim_id)
      const oku = db.prepare('SELECT miktar FROM urun_stoklar WHERE urun_id = ? AND lokasyon_id = ?')
      const yaz = db.prepare(`
        INSERT INTO urun_stoklar (urun_id, lokasyon_id, miktar) VALUES (?, ?, ?)
        ON CONFLICT(urun_id, lokasyon_id) DO UPDATE SET miktar = excluded.miktar`)
      for (const k of kalemler) {
        const delta = k.sayilan_miktar - k.beklenen_miktar
        const mevcut = oku.get(k.urun_id, sayim.lokasyon_id)
        const yeni = (mevcut ? mevcut.miktar : 0) + delta
        if (yeni < 0) kirpilan++
        yaz.run(k.urun_id, sayim.lokasyon_id, Math.max(0, yeni))
        urunIdler.push(k.urun_id)
        islenen++
      }
    }
    db.prepare("UPDATE stok_sayimlar SET durum = 'tamamlandi', bitis_tarihi = datetime('now','localtime') WHERE id = ?")
      .run(sayim_id)
  })
  tx()
  return { islenen, kirpilan, guncellenenUrunIdler: urunIdler }
}

// İptal artık DB'ye işaretlenir. ESKİ HATA: iptal yalnız ekranda (localStorage)
// yapılıyordu; DB'de sayım sonsuza dek 'devam_ediyor' kalıyor, geçmişte öksüz
// kayıtlar birikiyordu.
function iptal(db, sayim_id) {
  db.prepare("UPDATE stok_sayimlar SET durum = 'iptal', bitis_tarihi = datetime('now','localtime') WHERE id = ? AND durum = 'devam_ediyor'")
    .run(sayim_id)
  return { ok: true }
}

module.exports = { baslat, kalemEkle, kalemGir, kalemSifirla, getir, listele, tamamla, iptal }
