const { getDb } = require('./database')
const { satisHesapla } = require('./satis-hesapla')
const { _yetkiKontrol: yetkiKontrol, _lokasyonKontrol: lokasyonKontrol } = require('../yetki')
const { _pushArkaPlan: ikasPush } = require('../ikas')

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
  'satislar:olustur': ({ lokasyon_id, musteri_id, odeme_tipi = 'nakit', kalemler, notlar, genel_iskonto = 0, odeme_oran = 0 }) => {
    yetkiKontrol('satis_yap')
    lokasyonKontrol(lokasyon_id)
    const db = getDb()
    if (!lokasyon_id) throw new Error('Lokasyon seçilmedi')
    if (!Array.isArray(kalemler) || kalemler.length === 0) throw new Error('Satış en az bir kalem içermelidir')

    // Ödeme tipine göre yüzdesel fiyat farkı (pozitif = artırım, negatif = indirim).
    // Birim fiyatlara çarpan olarak uygulanır; -%100 altı güvenlik için 0'a kırpılır.
    const odemeCarpani = Math.max(0, 1 + (Number(odeme_oran) || 0) / 100)

    // Ürün/stok doğrula ve hesaplama için kalem verisini hazırla
    const hesapKalemleri = []
    const kalemMeta = []
    for (const kalem of kalemler) {
      const urun = db.prepare('SELECT * FROM urunler WHERE id = ? AND aktif = 1').get(kalem.urun_id)
      if (!urun) throw new Error(`Ürün bulunamadı: ${kalem.urun_id}`)
      const stok = db.prepare('SELECT * FROM urun_stoklar WHERE urun_id = ? AND lokasyon_id = ?').get(kalem.urun_id, lokasyon_id)
      if (!stok || stok.miktar < kalem.miktar) throw new Error(`Yetersiz stok: ${urun.ad}`)

      const birimFiyat = (kalem.birim_fiyat ?? urun.satis_fiyati) * odemeCarpani
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
    const sonuc = insertFn()
    // Satılan ürünlerin güncel stoğunu ikas'a yansıt (arka plan, en iyi çaba).
    ikasPush(kalemMeta.map(k => k.urun_id))
    return sonuc
  },

  'satislar:listele': ({ lokasyon_id, baslangic, bitis, odeme_tipi, fis_no, sayfa = 1, boyut = 50 } = {}) => {
    const db = getDb()
    let where = 'WHERE 1=1'
    const params = []
    if (lokasyon_id) { where += ' AND s.lokasyon_id=?'; params.push(lokasyon_id) }
    // Fiş no araması: geçmiş tüm fişlerde bulunabilsin diye tarih aralığı YOK SAYILIR.
    if (fis_no) {
      where += ' AND s.fis_no LIKE ?'; params.push(`%${fis_no}%`)
    } else {
      if (baslangic) { where += ' AND DATE(s.tarih)>=?'; params.push(baslangic) }
      if (bitis) { where += ' AND DATE(s.tarih)<=?'; params.push(bitis) }
    }
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
      SELECT s.*, l.ad as lokasyon_adi, m.ad||' '||m.soyad as musteri_adi, m.telefon as musteri_telefon
      FROM satislar s LEFT JOIN lokasyonlar l ON s.lokasyon_id=l.id LEFT JOIN musteriler m ON s.musteri_id=m.id
      WHERE s.id=?`).get(id)
    if (!satis) return null
    satis.kalemler = db.prepare(`
      SELECT sk.*, u.ad as urun_adi, u.barkod
      FROM satis_kalemleri sk JOIN urunler u ON sk.urun_id=u.id
      WHERE sk.satis_id=?`).all(id)
    return satis
  },

  // Mağaza içi (kısmi) iade: seçilen kalem/adetler stoğa geri eklenir ve raporlara
  // negatif "iade satışı" olarak yansır (ciro otomatik netleşir).
  // kalemler: [{ satis_kalemi_id, miktar }]
  'satislar:iade': ({ satis_id, kalemler, notlar }) => {
    yetkiKontrol('satis_iptal')
    const db = getDb()
    const satis = db.prepare("SELECT * FROM satislar WHERE id=? AND durum='tamamlandi' AND COALESCE(tip,'satis')='satis'").get(satis_id)
    if (!satis) throw new Error('İade için uygun satış bulunamadı')
    lokasyonKontrol(satis.lokasyon_id)
    if (!Array.isArray(kalemler) || kalemler.length === 0) throw new Error('İade edilecek ürün seçin')

    const origMap = new Map(db.prepare('SELECT * FROM satis_kalemleri WHERE satis_id=?').all(satis_id).map(k => [k.id, k]))
    const iadeler = []
    for (const it of kalemler) {
      const ok = origMap.get(it.satis_kalemi_id)
      if (!ok) throw new Error('Satış kalemi bulunamadı')
      const kalan = ok.miktar - (ok.iade_miktar || 0)
      const m = parseInt(it.miktar, 10) || 0
      if (m <= 0) continue
      if (m > kalan) throw new Error(`"${ok.urun_id}" için iade adedi kalan adetten (${kalan}) fazla olamaz`)
      iadeler.push({ ok, miktar: m })
    }
    if (!iadeler.length) throw new Error('İade adedi girilmedi')

    // Bu satışın kaçıncı iadesi (benzersiz fiş no için).
    const iadeSira = db.prepare("SELECT COUNT(*) n FROM satislar WHERE iade_kaynak_id=?").get(satis_id).n + 1

    const tx = db.transaction(() => {
      let ara = 0, kdv = 0, gen = 0
      const stokArt = db.prepare('UPDATE urun_stoklar SET miktar=miktar+? WHERE urun_id=? AND lokasyon_id=?')
      const iadeArt = db.prepare('UPDATE satis_kalemleri SET iade_miktar=COALESCE(iade_miktar,0)+? WHERE id=?')
      const retKalem = []
      for (const { ok, miktar } of iadeler) {
        const birimEf = ok.miktar ? (ok.toplam || 0) / ok.miktar : 0
        const tutar = birimEf * miktar
        const kdvT = tutar * ok.kdv_orani / (100 + ok.kdv_orani)
        gen += tutar; kdv += kdvT; ara += (tutar - kdvT)
        stokArt.run(miktar, ok.urun_id, satis.lokasyon_id)
        iadeArt.run(miktar, ok.id)
        retKalem.push({ ok, miktar, tutar })
      }
      const ret = db.prepare(`INSERT INTO satislar
        (fis_no, lokasyon_id, musteri_id, odeme_tipi, durum, tip, iade_kaynak_id, ara_toplam, iskonto_toplam, kdv_toplam, genel_toplam, notlar)
        VALUES (?,?,?,?,'tamamlandi','iade',?,?,?,?,?,?)`).run(
        `I${satis.fis_no}-${iadeSira}`, satis.lokasyon_id, satis.musteri_id, satis.odeme_tipi, satis.id,
        r(-ara), 0, r(-kdv), r(-gen), notlar || null)
      const kalemEkle = db.prepare('INSERT INTO satis_kalemleri (satis_id,urun_id,miktar,birim_fiyat,iskonto_orani,kdv_orani,toplam) VALUES (?,?,?,?,?,?,?)')
      for (const { ok, miktar, tutar } of retKalem) {
        kalemEkle.run(ret.lastInsertRowid, ok.urun_id, -miktar, ok.birim_fiyat, ok.iskonto_orani, ok.kdv_orani, r(-tutar))
      }
      return ret.lastInsertRowid
    })
    const id = tx()
    ikasPush(iadeler.map(x => x.ok.urun_id))
    return db.prepare('SELECT * FROM satislar WHERE id=?').get(id)
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
    if (satis.tip === 'iade') throw new Error('İade kaydı iptal edilemez (orijinal satıştan işlem yapın)')
    const iptalFn = db.transaction(() => {
      const kalemler = db.prepare('SELECT * FROM satis_kalemleri WHERE satis_id=?').all(id)
      for (const k of kalemler) {
        // Zaten iade edilmiş adetler tekrar stoğa eklenmesin.
        const geri = (k.miktar || 0) - (k.iade_miktar || 0)
        if (geri > 0) db.prepare('UPDATE urun_stoklar SET miktar=miktar+? WHERE urun_id=? AND lokasyon_id=?').run(geri, k.urun_id, satis.lokasyon_id)
      }
      db.prepare("UPDATE satislar SET durum='iptal' WHERE id=?").run(id)
    })
    iptalFn()
    // İade edilen ürünlerin güncel stoğunu ikas'a yansıt.
    const kalemler = db.prepare('SELECT DISTINCT urun_id FROM satis_kalemleri WHERE satis_id=?').all(id)
    ikasPush(kalemler.map(k => k.urun_id))
    return { mesaj: 'Satış iptal edildi' }
  },
}

function r(n) { return Math.round(n * 100) / 100 }
