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

// Satış oluşturma çekirdeği. db ve ikasPush dışarıdan verilir (test enjeksiyonu için;
// üretimde IPC sarmalayıcısı getDb()/gerçek push'u geçer).
// on_siparis=true iken stok kolu TAMAMEN atlanır: yeterlilik kontrolü yapılmaz,
// urun_stoklar güncellenmez, ikas'a push edilmez. Ürün zaten mağazada yoktur.
function olusturUygula(veri, db, ikasPushFn) {
  const {
    lokasyon_id, musteri_id, odeme_tipi = 'nakit', kalemler, notlar,
    genel_iskonto = 0, odeme_oran = 0, odemeler = null, stok_zorla = false,
    on_siparis = false, on_siparis_not = null,
  } = veri || {}
  const onSiparis = !!on_siparis
    if (!lokasyon_id) throw new Error('Lokasyon seçilmedi')
    if (!Array.isArray(kalemler) || kalemler.length === 0) throw new Error('Satış en az bir kalem içermelidir')

    // Parçalı (karma) ödeme: [{ odeme_tipi, tutar }]. Verilirse satislar.odeme_tipi
    // 'karma' (tek kalemse o tip) olur; tutarlar satis_odemeler'e yazılır.
    const parcali = Array.isArray(odemeler)
      ? odemeler.map(o => ({ odeme_tipi: o.odeme_tipi, tutar: Number(o.tutar) || 0 })).filter(o => o.tutar > 0)
      : null

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
      // stok_zorla açıkken yetersiz stok satışı engellemez (stok 0'ın altına düşmez).
      // Ön siparişte ürün zaten stokta yok; yeterlilik kontrolü uygulanmaz.
      if (!onSiparis && (!stok || stok.miktar < kalem.miktar) && !stok_zorla) {
        const mevcut = stok ? stok.miktar : 0
        throw new Error(`Yetersiz stok: ${urun.ad} (mevcut: ${mevcut}, istenen: ${kalem.miktar})`)
      }

      const birimFiyat = (kalem.birim_fiyat ?? urun.satis_fiyati) * odemeCarpani
      hesapKalemleri.push({ miktar: kalem.miktar, birim_fiyat: birimFiyat, kdv_orani: urun.kdv_orani, iskonto_orani: kalem.iskonto_orani })
      kalemMeta.push({ urun_id: kalem.urun_id, miktar: kalem.miktar, kdv_orani: urun.kdv_orani, set_adi: kalem.set_adi || null })
    }

    const { araToplam, iskontoToplam, kdvToplam, genelToplam, kalemSonuc } = satisHesapla(hesapKalemleri, genel_iskonto)

    // Parçalı ödeme tutarları satış toplamıyla uyuşmalı (±0.05 tolerans).
    if (parcali) {
      if (!parcali.length) throw new Error('Ödeme tutarı girilmedi')
      const odemeToplam = parcali.reduce((t, o) => t + o.tutar, 0)
      if (Math.abs(odemeToplam - genelToplam) > 0.05) {
        throw new Error(`Ödeme toplamı (₺${odemeToplam.toFixed(2)}) satış tutarına (₺${genelToplam.toFixed(2)}) eşit olmalı.`)
      }
    }
    // satislar.odeme_tipi: parçalı çoklu ise 'karma', tek kalemse o tip.
    const satisOdemeTipi = parcali ? (parcali.length > 1 ? 'karma' : parcali[0].odeme_tipi) : odeme_tipi

    const insertFn = db.transaction(() => {
      const satis = db.prepare(`
        INSERT INTO satislar (fis_no, lokasyon_id, musteri_id, odeme_tipi, notlar, ara_toplam, iskonto_toplam, kdv_toplam, genel_toplam, on_siparis, on_siparis_durum, on_siparis_not)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(fisNoUret(db), lokasyon_id, musteri_id||null, satisOdemeTipi, notlar||null,
        araToplam, iskontoToplam, kdvToplam, genelToplam,
        onSiparis ? 1 : 0, onSiparis ? 'bekliyor' : null, onSiparis ? (on_siparis_not || null) : null)

      kalemMeta.forEach((k, i) => {
        const h = kalemSonuc[i]
        db.prepare(`INSERT INTO satis_kalemleri (satis_id,urun_id,miktar,birim_fiyat,iskonto_orani,kdv_orani,toplam,set_adi) VALUES (?,?,?,?,?,?,?,?)`)
          .run(satis.lastInsertRowid, k.urun_id, k.miktar, h.birimFiyat, h.iskonto, k.kdv_orani, r(h.toplam), k.set_adi)
        if (!onSiparis) {
          // Stok satırı yoksa oluştur (stok_zorla durumunda eksik olabilir); 0 altına düşürme.
          db.prepare('INSERT OR IGNORE INTO urun_stoklar (urun_id, lokasyon_id, miktar, minimum_stok) VALUES (?, ?, 0, 0)').run(k.urun_id, lokasyon_id)
          db.prepare('UPDATE urun_stoklar SET miktar=MAX(0, miktar-?) WHERE urun_id=? AND lokasyon_id=?').run(k.miktar, k.urun_id, lokasyon_id)
        }
      })

      // Ödeme kalemlerini yaz (parçalı ise her tip; değilse tek satır = tüm tutar).
      const odemeEkle = db.prepare('INSERT INTO satis_odemeler (satis_id, odeme_tipi, tutar) VALUES (?,?,?)')
      const odemeSatirlari = parcali || [{ odeme_tipi: satisOdemeTipi, tutar: genelToplam }]
      for (const o of odemeSatirlari) odemeEkle.run(satis.lastInsertRowid, o.odeme_tipi, r(o.tutar))

      return db.prepare('SELECT * FROM satislar WHERE id=?').get(satis.lastInsertRowid)
    })
  const sonuc = insertFn()
  // Satılan ürünlerin güncel stoğunu ikas'a yansıt (arka plan, en iyi çaba).
  // Ön siparişte yerel stok değişmediği için push edilecek bir şey YOK.
  if (!onSiparis) ikasPushFn(kalemMeta.map(k => k.urun_id))
  return sonuc
}

// Satış iptali çekirdeği. Ön siparişte stok hiç DÜŞÜLMEDİĞİ için geri de EKLENMEZ —
// aksi halde var olmayan stok şişer ve ikas'a yanlış miktar gider.
function iptalUygula(id, db, ikasPushFn) {
  const satis = db.prepare('SELECT * FROM satislar WHERE id=?').get(id)
  if (!satis || satis.durum === 'iptal') throw new Error('Satış bulunamadı veya zaten iptal')
  if (satis.tip === 'iade') throw new Error('İade kaydı iptal edilemez (orijinal satıştan işlem yapın)')
  const onSiparis = !!satis.on_siparis
  const iptalFn = db.transaction(() => {
    if (!onSiparis) {
      const kalemler = db.prepare('SELECT * FROM satis_kalemleri WHERE satis_id=?').all(id)
      for (const k of kalemler) {
        // Zaten iade edilmiş adetler tekrar stoğa eklenmesin.
        const geri = (k.miktar || 0) - (k.iade_miktar || 0)
        if (geri > 0) db.prepare('UPDATE urun_stoklar SET miktar=miktar+? WHERE urun_id=? AND lokasyon_id=?').run(geri, k.urun_id, satis.lokasyon_id)
      }
    }
    db.prepare("UPDATE satislar SET durum='iptal' WHERE id=?").run(id)
    if (onSiparis) db.prepare("UPDATE satislar SET on_siparis_durum='iptal' WHERE id=?").run(id)
  })
  iptalFn()
  if (!onSiparis) {
    // İade edilen ürünlerin güncel stoğunu ikas'a yansıt.
    const kalemler = db.prepare('SELECT DISTINCT urun_id FROM satis_kalemleri WHERE satis_id=?').all(id)
    ikasPushFn(kalemler.map(k => k.urun_id))
  }
  return { mesaj: 'Satış iptal edildi' }
}

const ON_SIPARIS_DURUMLARI = ['bekliyor', 'kargolandi', 'teslim']

// Ön sipariş listesi: satış + müşteri (kargo formunu ön doldurmak için adres alanları
// dahil) + varsa bağlı UPS gönderisinin takip no'su. Kargo bağı kargolar.satis_id
// üzerindendir (satış ekranından oluşturulan kargolarla aynı yol).
function onSiparisleriGetir({ durum, lokasyon_id, baslangic, bitis } = {}, db) {
  let where = 'WHERE s.on_siparis=1'
  const params = []
  if (durum) { where += ' AND COALESCE(s.on_siparis_durum,?)=?'; params.push('bekliyor', durum) }
  if (lokasyon_id) { where += ' AND s.lokasyon_id=?'; params.push(lokasyon_id) }
  if (baslangic) { where += ' AND DATE(s.tarih)>=?'; params.push(baslangic) }
  if (bitis) { where += ' AND DATE(s.tarih)<=?'; params.push(bitis) }
  const satislar = db.prepare(`
    SELECT s.*, l.ad AS lokasyon_adi,
           m.ad||' '||m.soyad AS musteri_adi, m.telefon AS musteri_telefon, m.email AS musteri_email,
           m.adres AS musteri_adres, m.il AS musteri_il, m.ilce AS musteri_ilce,
           (SELECT k.takip_no FROM kargolar k
              WHERE k.satis_id=s.id AND COALESCE(k.durum,'')!='iptal'
              ORDER BY k.id DESC LIMIT 1) AS takip_no,
           (SELECT k.son_durum FROM kargolar k
              WHERE k.satis_id=s.id AND COALESCE(k.durum,'')!='iptal'
              ORDER BY k.id DESC LIMIT 1) AS kargo_durum
    FROM satislar s
    LEFT JOIN lokasyonlar l ON s.lokasyon_id=l.id
    LEFT JOIN musteriler m ON s.musteri_id=m.id
    ${where} ORDER BY s.tarih DESC
  `).all(...params)
  const kalemSorgu = db.prepare(`
    SELECT sk.urun_id, u.ad AS urun_adi, sk.miktar
    FROM satis_kalemleri sk JOIN urunler u ON sk.urun_id=u.id
    WHERE sk.satis_id=?`)
  for (const s of satislar) s.kalemler = kalemSorgu.all(s.id)
  return satislar
}

// Ön sipariş durumu ilerletme. 'iptal' BURADAN yazılmaz — iptal satislar:iptal
// akışının işidir (para/durum bütünlüğü orada kurulur).
function onSiparisDurumYaz(id, durum, db) {
  if (!ON_SIPARIS_DURUMLARI.includes(durum)) throw new Error('Geçersiz ön sipariş durumu')
  const satis = db.prepare('SELECT id FROM satislar WHERE id=? AND on_siparis=1').get(id)
  if (!satis) throw new Error('Ön sipariş bulunamadı')
  db.prepare('UPDATE satislar SET on_siparis_durum=? WHERE id=?').run(durum, id)
  return { mesaj: 'Ön sipariş durumu güncellendi' }
}

module.exports = {
  _olustur: olusturUygula,

  'satislar:olustur': (veri) => {
    yetkiKontrol('satis_yap')
    // Ön sipariş stok kontrolünü atladığı için AYRI yetki ister.
    if (veri && veri.on_siparis) yetkiKontrol('on_siparis_yap')
    lokasyonKontrol(veri && veri.lokasyon_id)
    return olusturUygula(veri, getDb(), ikasPush)
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
    satis.odemeler = db.prepare('SELECT odeme_tipi, tutar FROM satis_odemeler WHERE satis_id=?').all(id)
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

  _iptal: iptalUygula,

  'satislar:iptal': (id) => {
    yetkiKontrol('satis_iptal')
    return iptalUygula(id, getDb(), ikasPush)
  },

  _onSiparisler: onSiparisleriGetir,
  _onSiparisDurum: onSiparisDurumYaz,

  'satislar:on-siparisler': (filtre) => {
    yetkiKontrol('satis_gecmisi_goruntule')
    return onSiparisleriGetir(filtre || {}, getDb())
  },

  'satislar:on-siparis-durum': ({ id, durum }) => {
    yetkiKontrol('on_siparis_yap')
    return onSiparisDurumYaz(id, durum, getDb())
  },
}

function r(n) { return Math.round(n * 100) / 100 }
