// Gönderi bazlı otomatik yorum cevabı: şablon kütüphanesi + gönderi otomasyonu CRUD.
// Çalıştırıcı ayrı dosyada (electron/meta/otomasyon.js) — burası yalnız veri katmanı.
const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')

const SAYFA_ADI = 'tenceremtava' // kendi yorumlarımızı elemek için (bkz. _adaylar)
const PENCERE_GUN = 7            // Meta: yoruma özel mesaj yalnız 7 gün içinde gönderilebilir
const MAKS_DENEME = 3            // bu kadar hatadan sonra o yorumdan vazgeç (sonsuz deneme olmasın)

// Şablonun fiyatını çözer. Öncelik: sablon.fiyat (elle yazılmış) → ürünün canlı satış fiyatı
// → setin canlı fiyatı. NULL fiyat = "kaynağa sor" — zam yapılınca şablon kendiliğinden güncel kalır.
// Şablon ya ürüne ya sete bağlanır (ikisi birden değil); setler ayrı tabloda çünkü satışta
// bileşenlerine açılıyorlar, urunler'de karşılıkları yok.
function _sablonlariCoz(db, otomasyonId) {
  return db.prepare(`
    SELECT s.urun_adi, s.aciklama, s.link, s.whatsapp,
           COALESCE(s.fiyat, u.satis_fiyati, st.fiyat) AS fiyat
    FROM sosyal_otomasyon_sablonlar os
    JOIN sosyal_sablonlar s ON s.id = os.sablon_id
    LEFT JOIN urunler u ON u.id = s.urun_id
    LEFT JOIN setler st ON st.id = s.set_id
    WHERE os.otomasyon_id = ? AND s.aktif = 1
    ORDER BY os.sira, s.id
  `).all(otomasyonId)
}

// Cevaplanacak yorumlar. konuId verilirse yalnız o gönderi (açma onayındaki sayı için),
// verilmezse aktif tüm otomasyonlar (çalıştırıcı için).
//
// KRİTİK FİLTRELER:
//  - gonderen_ad != SAYFA_ADI : kendi açık yanıtımız sonraki polling turunda yorum olarak
//    geri gelir; bu filtre olmazsa otomasyon kendi yanıtına cevap verir → SONSUZ DÖNGÜ.
//  - NOT EXISTS(...) : kişi başına gönderide TEK DM (aynı kişi 6 yorum atarsa 6 DM gitmesin).
//    Tekilleştirme gonderen_ad ile — IG yorumlarında 'from' istenemez (tüm çekimi kırar),
//    bu yüzden gonderen_id hep NULL. Instagram'da kullanıcı adı benzersiz, güvenli.
//    YALNIZ ozel_mesaj_tarihi (başarılı gönderim) sayılır — başarısız deneme kişiyi engellemez.
//  - ozel_mesaj_deneme < MAKS_DENEME : kalıcı hatalarda (tek hak dolmuş, 7 gün geçmiş) vazgeç.
//  - GROUP BY : aynı kişinin bu turdaki birden çok yorumundan yalnız biri alınsın.
function _adaylar(db, konuId = null) {
  const kosul = konuId ? 'o.konu_id = ?' : 'o.aktif = 1'
  const params = konuId ? [konuId] : []
  return db.prepare(`
    SELECT m.id, m.konu_id, m.gonderen_ad, m.harici_id, m.platform, o.id AS otomasyon_id
    FROM sosyal_mesajlar m
    JOIN sosyal_otomasyonlar o ON o.konu_id = m.konu_id
    WHERE ${kosul}
      AND m.tur = 'yorum'
      AND m.yon = 'gelen'
      AND m.gonderen_ad != '${SAYFA_ADI}'
      AND m.ozel_mesaj_tarihi IS NULL
      AND COALESCE(m.ozel_mesaj_deneme, 0) < ${MAKS_DENEME}
      AND m.mesaj_tarihi >= datetime('now', '-${PENCERE_GUN} days')
      AND NOT EXISTS (
        SELECT 1 FROM sosyal_mesajlar x
        WHERE x.konu_id = m.konu_id AND x.gonderen_ad = m.gonderen_ad
          AND x.ozel_mesaj_tarihi IS NOT NULL
      )
    GROUP BY m.gonderen_ad, m.konu_id
    ORDER BY m.mesaj_tarihi ASC
  `).all(...params)
}

module.exports = {
  _adaylar,
  _sablonlariCoz,

  // Şablon kütüphanesi. Bağlı kaynağın (ürün veya set) canlı fiyatını `kaynak_fiyati` olarak
  // döner — arayüz "canlı" rozetinde ve önizlemede kullanır.
  'sosyal:sablonlar': () => getDb().prepare(`
    SELECT s.*, COALESCE(u.satis_fiyati, st.fiyat) AS kaynak_fiyati,
           COALESCE(u.ad, st.ad) AS kaynak_adi,
           CASE WHEN s.set_id IS NOT NULL THEN 'set'
                WHEN s.urun_id IS NOT NULL THEN 'urun' END AS kaynak_tipi
    FROM sosyal_sablonlar s
    LEFT JOIN urunler u ON u.id = s.urun_id
    LEFT JOIN setler st ON st.id = s.set_id
    WHERE s.aktif = 1 ORDER BY s.ad
  `).all(),

  'sosyal:sablonKaydet': ({ id, ad, urun_id, set_id, urun_adi, aciklama, fiyat, link, whatsapp }) => {
    yetkiKontrol('sosyal_medya_yonet')
    if (!ad || !ad.trim()) throw new Error('Şablon adı gerekli.')
    if (!urun_adi || !urun_adi.trim()) throw new Error('Ürün adı gerekli.')
    if (urun_id && set_id) throw new Error('Şablon ya ürüne ya sete bağlanabilir, ikisine birden değil.')
    const db = getDb()
    const p = [ad.trim(), urun_id || null, set_id || null, urun_adi.trim(), aciklama || null,
      fiyat === '' || fiyat == null ? null : Number(fiyat), link || null, whatsapp || null]
    if (id) {
      db.prepare(`UPDATE sosyal_sablonlar SET ad=?, urun_id=?, set_id=?, urun_adi=?, aciklama=?,
        fiyat=?, link=?, whatsapp=? WHERE id=?`).run(...p, id)
      return { id }
    }
    const r = db.prepare(`INSERT INTO sosyal_sablonlar
      (ad, urun_id, set_id, urun_adi, aciklama, fiyat, link, whatsapp) VALUES (?,?,?,?,?,?,?,?)`).run(...p)
    return { id: r.lastInsertRowid }
  },

  // Soft delete: geçmiş otomasyonların bağlantısı kırılmasın.
  'sosyal:sablonSil': (id) => {
    yetkiKontrol('sosyal_medya_yonet')
    getDb().prepare('UPDATE sosyal_sablonlar SET aktif = 0 WHERE id = ?').run(id)
    return { ok: true }
  },

  'sosyal:otomasyonGetir': ({ konu_id }) => {
    const db = getDb()
    const o = db.prepare('SELECT * FROM sosyal_otomasyonlar WHERE konu_id = ?').get(konu_id)
    if (!o) return null
    o.sablonlar = db.prepare(`
      SELECT s.*, os.sira FROM sosyal_otomasyon_sablonlar os
      JOIN sosyal_sablonlar s ON s.id = os.sablon_id
      WHERE os.otomasyon_id = ? ORDER BY os.sira, s.id
    `).all(o.id)
    o.bugun_giden = db.prepare(`SELECT COUNT(*) n FROM sosyal_mesajlar
      WHERE konu_id = ? AND date(ozel_mesaj_tarihi) = date('now','localtime')`).get(konu_id).n
    return o
  },

  'sosyal:otomasyonKaydet': ({ konu_id, platform, aktif, acik_yanit_metni, sablon_idler }) => {
    yetkiKontrol('sosyal_medya_yonet')
    const db = getDb()
    const tx = db.transaction(() => {
      let o = db.prepare('SELECT id, aktif FROM sosyal_otomasyonlar WHERE konu_id = ?').get(konu_id)
      if (!o) {
        const r = db.prepare(`INSERT INTO sosyal_otomasyonlar
          (platform, konu_id, aktif, acik_yanit_metni, baslangic_tarihi)
          VALUES (?,?,?,?,?)`).run(platform, konu_id, aktif ? 1 : 0, acik_yanit_metni || null,
            aktif ? new Date().toISOString() : null)
        o = { id: r.lastInsertRowid, aktif: 0 }
      } else {
        // baslangic_tarihi yalnız KAPALI→AÇIK geçişinde tazelenir.
        const acildi = aktif && !o.aktif
        db.prepare(`UPDATE sosyal_otomasyonlar SET aktif=?, acik_yanit_metni=?
          ${acildi ? ", baslangic_tarihi=datetime('now','localtime')" : ''} WHERE id=?`)
          .run(aktif ? 1 : 0, acik_yanit_metni || null, o.id)
      }
      db.prepare('DELETE FROM sosyal_otomasyon_sablonlar WHERE otomasyon_id = ?').run(o.id)
      const ekle = db.prepare(`INSERT INTO sosyal_otomasyon_sablonlar
        (otomasyon_id, sablon_id, sira) VALUES (?,?,?)`)
      ;(sablon_idler || []).forEach((sid, i) => ekle.run(o.id, sid, i))
      return o.id
    })
    return { id: tx() }
  },

  // Açma onayı için: "bu gönderide kaç kişiye mesaj gidecek?"
  // Aday sorgusunun AYNISINI kullanır → gösterilen sayı gerçekte gidecek sayıdır.
  'sosyal:otomasyonAdaySayisi': ({ konu_id }) => ({ sayi: _adaylar(getDb(), konu_id).length }),
}
