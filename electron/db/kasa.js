// Kasa / vardiya yönetimi: gün açılış-kapanış + nakit mutabakatı.
const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol, _lokasyonKontrol: lokasyonKontrol } = require('../yetki')

// Bir oturum için beklenen nakit: açılış + nakit satışlar - nakit giderler.
function nakitOzet(db, oturum) {
  const baslangic = oturum.acilis_tarihi
  const bitis = oturum.kapanis_tarihi || "datetime('now','localtime')"
  const bitisKosul = oturum.kapanis_tarihi ? '?' : "datetime('now','localtime')"
  // Nakit satış = parçalı ödeme kalemlerinden nakit (satis_odemeler) +
  // satis_odemeler kaydı OLMAYAN eski tek-ödeme nakit satışlar (genel_toplam).
  // Böylece hem karma hem tekli ödemeler doğru sayılır.
  const satisParams = [oturum.lokasyon_id, baslangic]
  if (oturum.kapanis_tarihi) satisParams.push(oturum.kapanis_tarihi)
  const legacyParams = [oturum.lokasyon_id, baslangic]
  if (oturum.kapanis_tarihi) legacyParams.push(oturum.kapanis_tarihi)
  const nakitSatis = db.prepare(`
    SELECT COALESCE(SUM(o.tutar),0) n
    FROM satis_odemeler o JOIN satislar s ON o.satis_id = s.id
    WHERE s.lokasyon_id = ? AND s.durum = 'tamamlandi' AND o.odeme_tipi = 'nakit'
      AND s.tarih >= ? AND s.tarih <= ${bitisKosul}
  `).get(...satisParams).n
    + db.prepare(`
    SELECT COALESCE(SUM(s.genel_toplam),0) n FROM satislar s
    WHERE s.lokasyon_id = ? AND s.durum = 'tamamlandi' AND s.odeme_tipi = 'nakit'
      AND s.tarih >= ? AND s.tarih <= ${bitisKosul}
      AND NOT EXISTS (SELECT 1 FROM satis_odemeler o WHERE o.satis_id = s.id)
  `).get(...legacyParams).n
  const giderParams = [oturum.lokasyon_id, baslangic]
  if (oturum.kapanis_tarihi) giderParams.push(oturum.kapanis_tarihi)
  const nakitGider = db.prepare(`
    SELECT COALESCE(SUM(tutar),0) n FROM giderler
    WHERE lokasyon_id = ? AND odeme_tipi = 'nakit'
      AND olusturma_tarihi >= ? AND olusturma_tarihi <= ${bitisKosul}
  `).get(...giderParams).n
  const beklenen = (Number(oturum.acilis_nakit) || 0) + nakitSatis - nakitGider
  return { nakitSatis, nakitGider, beklenen }
}

module.exports = {
  // Lokasyonun açık oturumu (yoksa null).
  'kasa:acik': ({ lokasyon_id }) => {
    const db = getDb()
    const o = db.prepare("SELECT * FROM kasa_oturumlar WHERE lokasyon_id = ? AND durum = 'acik' ORDER BY id DESC LIMIT 1").get(lokasyon_id)
    if (!o) return null
    return { ...o, ...nakitOzet(db, o) }
  },

  // Kasa aç (lokasyonda zaten açık oturum varsa hata).
  'kasa:ac': ({ lokasyon_id, acilis_nakit = 0, kullanici }) => {
    yetkiKontrol('kasa_kullan'); lokasyonKontrol(lokasyon_id)
    const db = getDb()
    const acik = db.prepare("SELECT id FROM kasa_oturumlar WHERE lokasyon_id = ? AND durum = 'acik'").get(lokasyon_id)
    if (acik) throw new Error('Bu mağazada zaten açık bir kasa oturumu var.')
    const r = db.prepare("INSERT INTO kasa_oturumlar (lokasyon_id, acan, acilis_nakit) VALUES (?, ?, ?)")
      .run(lokasyon_id, kullanici || null, Number(acilis_nakit) || 0)
    return db.prepare('SELECT * FROM kasa_oturumlar WHERE id = ?').get(r.lastInsertRowid)
  },

  // Kasa kapat: beklenen nakit hesaplanır, sayılan ile farkı kaydedilir.
  'kasa:kapat': ({ id, sayilan_nakit = 0, notlar, kullanici }) => {
    yetkiKontrol('kasa_kullan')
    const db = getDb()
    const o = db.prepare("SELECT * FROM kasa_oturumlar WHERE id = ? AND durum = 'acik'").get(id)
    if (!o) throw new Error('Açık kasa oturumu bulunamadı.')
    lokasyonKontrol(o.lokasyon_id)
    const { beklenen } = nakitOzet(db, o)
    const sayilan = Number(sayilan_nakit) || 0
    const fark = Math.round((sayilan - beklenen) * 100) / 100
    db.prepare(`UPDATE kasa_oturumlar SET durum='kapali', kapatan=?, kapanis_tarihi=datetime('now','localtime'),
      sayilan_nakit=?, beklenen_nakit=?, fark=?, notlar=? WHERE id=?`)
      .run(kullanici || null, sayilan, Math.round(beklenen * 100) / 100, fark, notlar || null, id)
    return db.prepare('SELECT * FROM kasa_oturumlar WHERE id = ?').get(id)
  },

  // Geçmiş (kapalı) oturumlar.
  'kasa:gecmis': ({ lokasyon_id, limit = 50 } = {}) => {
    const db = getDb()
    let where = "WHERE durum = 'kapali'"
    const params = []
    if (lokasyon_id) { where += ' AND lokasyon_id = ?'; params.push(lokasyon_id) }
    params.push(Math.min(Number(limit) || 50, 500))
    return db.prepare(`
      SELECT k.*, l.ad AS lokasyon_adi FROM kasa_oturumlar k
      JOIN lokasyonlar l ON k.lokasyon_id = l.id
      ${where} ORDER BY k.id DESC LIMIT ?
    `).all(...params)
  },
}
