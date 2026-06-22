const { getDb } = require('./database')
const { satisHesapla } = require('./satis-hesapla')
const { _yetkiKontrol: yetkiKontrol, _lokasyonKontrol: lokasyonKontrol } = require('../yetki')

function bugununTarihKodu() {
  const now = new Date()
  return now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')
}

// Aynı gün içinde sıralı, çakışmasız fiş no üretir: F + YYYYMMDD + 4 haneli sıra
function fisNoUret(db) {
  const tarih = bugununTarihKodu()
  const onek = `F${tarih}`
  const row = db.prepare(
    "SELECT fis_no FROM satislar WHERE fis_no LIKE ? ORDER BY fis_no DESC LIMIT 1"
  ).get(`${onek}%`)
  const sonSira = row ? parseInt(row.fis_no.slice(onek.length), 10) || 0 : 0
  return `${onek}${String(sonSira + 1).padStart(4, '0')}`
}

module.exports = {
  'satislar:olustur': ({ lokasyon_id, musteri_id, odeme_tipi = 'nakit', kalemler, notlar, genel_iskonto = 0 }) => {
    yetkiKontrol('satis_yap')
    lokasyonKontrol(lokasyon_id)
    const db = getDb()
    if (!lokasyon_id) throw new Error('Lokasyon seçilmedi')
    if (!Array.isArray(kalemler) || kalemler.length === 0) throw new Error('Satış en az bir kalem içermelidir')

    // Ürün/stok doğrula ve hesaplama için kalem verisini hazırla
    const hesapKalemleri = []
    const kalemMeta = []
    for (const kalem of kalemler) {
      const urun = db.prepare('SELECT * FROM urunler WHERE id = ? AND aktif = 1').get(kalem.urun_id)
      if (!urun) throw new Error(`Ürün bulunamadı: ${kalem.urun_id}`)
      const stok = db.prepare('SELECT * FROM urun_stoklar WHERE urun_id = ? AND lokasyon_id = ?').get(kalem.urun_id, lokasyon_id)
      if (!stok || stok.miktar < kalem.miktar) throw new Error(`Yetersiz stok: ${urun.ad}`)

      const birimFiyat = kalem.birim_fiyat ?? urun.satis_fiyati
      hesapKalemleri.push({ miktar: kalem.miktar, birim_fiyat: birimFiyat, kdv_orani: urun.kdv_orani, iskonto_orani: kalem.iskonto_orani })
      kalemMeta.push({ urun_id: kalem.urun_id, miktar: kalem.miktar, kdv_orani: urun.kdv_orani })
    }

    const { araToplam, iskontoToplam, kdvToplam, genelToplam, kalemSonuc } = satisHesapla(hesapKalemleri, genel_iskonto)

    const insertFn = db.transaction(() => {
      const satis = db.prepare(`
        INSERT INTO satislar (fis_no, lokasyon_id, musteri_id, odeme_tipi, notlar, ara_toplam, iskonto_toplam, kdv_toplam, genel_toplam)
        VALUES (?,?,?,?,?,?,?,?,?)
      `).run(fisNoUret(db), lokasyon_id, musteri_id||null, odeme_tipi, notlar||null,
        araToplam, iskontoToplam, kdvToplam, genelToplam)

      kalemMeta.forEach((k, i) => {
        const h = kalemSonuc[i]
        db.prepare(`INSERT INTO satis_kalemleri (satis_id,urun_id,miktar,birim_fiyat,iskonto_orani,kdv_orani,toplam) VALUES (?,?,?,?,?,?,?)`)
          .run(satis.lastInsertRowid, k.urun_id, k.miktar, h.birimFiyat, h.iskonto, k.kdv_orani, r(h.toplam))
        db.prepare('UPDATE urun_stoklar SET miktar=miktar-? WHERE urun_id=? AND lokasyon_id=?').run(k.miktar, k.urun_id, lokasyon_id)
      })
      return db.prepare('SELECT * FROM satislar WHERE id=?').get(satis.lastInsertRowid)
    })
    return insertFn()
  },

  'satislar:listele': ({ lokasyon_id, baslangic, bitis, odeme_tipi, sayfa = 1, boyut = 50 } = {}) => {
    const db = getDb()
    let where = 'WHERE 1=1'
    const params = []
    if (lokasyon_id) { where += ' AND s.lokasyon_id=?'; params.push(lokasyon_id) }
    if (baslangic) { where += ' AND DATE(s.tarih)>=?'; params.push(baslangic) }
    if (bitis) { where += ' AND DATE(s.tarih)<=?'; params.push(bitis) }
    if (odeme_tipi) { where += ' AND s.odeme_tipi=?'; params.push(odeme_tipi) }
    const toplam = db.prepare(`SELECT COUNT(*) as n FROM satislar s ${where}`).get(...params).n
    const sorgu = `
      SELECT s.*, l.ad as lokasyon_adi, m.ad||' '||m.soyad as musteri_adi
      FROM satislar s
      LEFT JOIN lokasyonlar l ON s.lokasyon_id=l.id
      LEFT JOIN musteriler m ON s.musteri_id=m.id
      ${where} ORDER BY s.tarih DESC LIMIT ? OFFSET ?
    `
    params.push(boyut, (sayfa - 1) * boyut)
    return { toplam, satislar: db.prepare(sorgu).all(...params) }
  },

  'satislar:getir': (id) => {
    const db = getDb()
    const satis = db.prepare(`
      SELECT s.*, l.ad as lokasyon_adi, m.ad||' '||m.soyad as musteri_adi
      FROM satislar s LEFT JOIN lokasyonlar l ON s.lokasyon_id=l.id LEFT JOIN musteriler m ON s.musteri_id=m.id
      WHERE s.id=?`).get(id)
    if (!satis) return null
    satis.kalemler = db.prepare(`
      SELECT sk.*, u.ad as urun_adi, u.barkod
      FROM satis_kalemleri sk JOIN urunler u ON sk.urun_id=u.id
      WHERE sk.satis_id=?`).all(id)
    return satis
  },

  'satislar:gunluk-ozet': ({ lokasyon_id, tarih } = {}) => {
    const db = getDb()
    const gun = tarih || new Date().toISOString().split('T')[0]
    let where = "WHERE durum='tamamlandi' AND DATE(tarih)=?"
    const params = [gun]
    if (lokasyon_id) { where += ' AND lokasyon_id=?'; params.push(lokasyon_id) }
    return db.prepare(`SELECT COUNT(*) as satis_sayisi, SUM(genel_toplam) as toplam_ciro, SUM(kdv_toplam) as toplam_kdv, SUM(iskonto_toplam) as toplam_iskonto FROM satislar ${where}`).get(...params)
  },

  'satislar:iptal': (id) => {
    yetkiKontrol('satis_iptal')
    const db = getDb()
    const satis = db.prepare('SELECT * FROM satislar WHERE id=?').get(id)
    if (!satis || satis.durum === 'iptal') throw new Error('Satış bulunamadı veya zaten iptal')
    const iptalFn = db.transaction(() => {
      const kalemler = db.prepare('SELECT * FROM satis_kalemleri WHERE satis_id=?').all(id)
      for (const k of kalemler) {
        db.prepare('UPDATE urun_stoklar SET miktar=miktar+? WHERE urun_id=? AND lokasyon_id=?').run(k.miktar, k.urun_id, satis.lokasyon_id)
      }
      db.prepare("UPDATE satislar SET durum='iptal' WHERE id=?").run(id)
    })
    iptalFn()
    return { mesaj: 'Satış iptal edildi' }
  },
}

function r(n) { return Math.round(n * 100) / 100 }
