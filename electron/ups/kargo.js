// UPS kargo işlemleri: gönderi oluşturma, takip, iptal, kurye çağırma.
const { getDb } = require('../db/database')
const { _ayarlariGetir } = require('../db/ups-ayarlar')
const { _gondericiGetir } = require('../db/lokasyon-gonderici')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')
const soap = require('./soap')

function kimlik(ayar) {
  return {
    musteriKodu: ayar.musteri_kodu,
    kullaniciKodu: ayar.kullanici_kodu,
    sifre: ayar.sifre,
  }
}

// Kargo müşterisini müşteriler tablosuna kaydeder (yoksa). Aynı kişi zaten
// varsa (telefon veya ad-soyad eşleşmesi) DOKUNULMAZ — üzerine yazma/mükerrer yok.
// Dönen id kargo kaydına bağlanır. Hata olursa kargo oluşturmayı engellemez.
function musteriKaydet(db, veri) {
  try {
    const tamAd = String(veri.aliciAd || '').trim()
    if (!tamAd) return null
    const tel = String(veri.aliciTelefon || veri.aliciCep || '').replace(/\D/g, '')
    // 1) Telefonla eşleşme (en güvenilir; senkronun doğal anahtarı da telefon)
    if (tel) {
      const m = db.prepare(
        "SELECT id FROM musteriler WHERE replace(replace(replace(COALESCE(telefon,''),' ',''),'-',''),'(','') LIKE ?"
      ).get('%' + tel.slice(-10)) // son 10 hane: 0/+90 önek farklarını tolere eder
      if (m) return m.id
    }
    // 2) Ad-soyad tam eşleşme (Türkçe büyük/küçük duyarsız)
    const parcalar = tamAd.split(/\s+/)
    const soyad = parcalar.length > 1 ? parcalar.pop() : ''
    const ad = parcalar.join(' ') || soyad
    const e = db.prepare(
      'SELECT id FROM musteriler WHERE lower(ad || \' \' || COALESCE(soyad,\'\')) = lower(?)'
    ).get((ad + ' ' + soyad).trim())
    if (e) return e.id
    // 3) Yoksa yeni müşteri ekle (kargodaki bilgilerle)
    const r = db.prepare(`
      INSERT INTO musteriler (ad, soyad, telefon, email, adres, il, ilce, aktif)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).run(ad, soyad, veri.aliciTelefon || veri.aliciCep || null, veri.aliciEmail || null,
           veri.aliciAdres || null, veri.il || null, veri.ilce || null)
    return r.lastInsertRowid
  } catch { return null } // müşteri kaydı kargoyu asla engellemesin
}

// Gönderici (mağaza) bilgilerini soap formatına çevirir. Mağaza override'ı
// (lokasyon_gonderici) verilmişse onun alanları, yoksa global ups_ayarlar kullanılır.
function gonderici(ayar, lok) {
  const al = (lokAlan, ayarAlan) => (lok && lok[lokAlan]) || ayar[ayarAlan]
  return {
    musteriKodu: ayar.musteri_kodu,
    gondericiHesapNo: ayar.gonderici_hesap_no || ayar.musteri_kodu,
    gondericiAd: al('ad', 'gonderici_ad'),
    gondericiYetkili: al('yetkili', 'gonderici_yetkili'),
    gondericiAdres: al('adres', 'gonderici_adres'),
    gondericiIlKodu: al('il_kodu', 'gonderici_il_kodu'),
    gondericiIlceKodu: al('ilce_kodu', 'gonderici_ilce_kodu'),
    gondericiPostaKodu: al('posta_kodu', 'gonderici_posta_kodu'),
    gondericiTelefon: al('telefon', 'gonderici_telefon'),
    gondericiCep: al('cep', 'gonderici_cep'),
    gondericiEmail: al('email', 'gonderici_email'),
  }
}

// Gönderici bilgisini doğrular. lok verilmişse mağaza gönderici alanlarını kontrol eder.
function gondericiKontrol(ayar, lok) {
  const eksik = []
  if (!ayar.musteri_kodu) eksik.push('Müşteri Kodu')
  if (!ayar.kullanici_kodu) eksik.push('Kullanıcı Kodu')
  if (!ayar.sifre) eksik.push('Şifre')
  const g = gonderici(ayar, lok)
  if (!g.gondericiAd) eksik.push('Gönderici Adı')
  if (!g.gondericiAdres) eksik.push('Gönderici Adresi')
  if (!g.gondericiIlKodu) eksik.push('Gönderici İl')
  if (!g.gondericiIlceKodu) eksik.push('Gönderici İlçe')
  if (eksik.length) {
    const nereden = lok ? 'Seçilen mağazanın gönderici adresi eksik. Ayarlar > Mağaza Gönderici Adresleri' : 'Ayarlar > UPS Kargo'
    throw new Error('UPS gönderici bilgisi eksik: ' + eksik.join(', ') + '. ' + nereden + ' bölümünden tamamlayın.')
  }
}

module.exports = {
  // Gönderi oluşturur, DB'ye kaydeder ve etiket PNG'lerini döndürür.
  'kargo:olustur': async (veri) => {
    yetkiKontrol('kargo_yonet')
    const ayar = _ayarlariGetir()
    // Gönderici mağaza seçildiyse o mağazanın gönderici adresini kullan.
    const lok = veri.gondericiLokasyonId ? _gondericiGetir(veri.gondericiLokasyonId) : null
    gondericiKontrol(ayar, lok)

    // İADE gönderisi: paket müşteriden mağazaya gider → UPS isteğinde gönderici=müşteri,
    // alıcı=mağaza (swap). DB kaydında alici_* alanları MÜŞTERİYİ tutmaya devam eder
    // (listede kimin iadesi olduğu görünsün); ayrım tip='iade' ile yapılır.
    const g = gonderici(ayar, lok)
    const taraflar = veri.iade ? {
      // gönderici ← müşteri (formdaki "alıcı" alanları iade eden müşteridir)
      musteriKodu: ayar.musteri_kodu,
      gondericiHesapNo: ayar.gonderici_hesap_no || ayar.musteri_kodu, // fatura bizim hesaba
      gondericiAd: veri.aliciAd,
      gondericiYetkili: veri.aliciYetkili || veri.aliciAd,
      gondericiAdres: veri.aliciAdres,
      gondericiIlKodu: veri.ilKodu,
      gondericiIlceKodu: veri.ilceKodu,
      gondericiPostaKodu: veri.postaKodu,
      gondericiTelefon: veri.aliciTelefon,
      gondericiCep: veri.aliciCep || veri.aliciTelefon,
      gondericiEmail: veri.aliciEmail,
      // alıcı ← mağaza
      aliciAd: g.gondericiAd,
      aliciYetkili: g.gondericiYetkili,
      aliciAdres: g.gondericiAdres,
      aliciIlKodu: g.gondericiIlKodu,
      aliciIlceKodu: g.gondericiIlceKodu,
      aliciPostaKodu: g.gondericiPostaKodu,
      aliciTelefon: g.gondericiTelefon,
      aliciCep: g.gondericiCep,
      aliciEmail: g.gondericiEmail,
    } : {
      ...g,
      aliciAd: veri.aliciAd,
      aliciYetkili: veri.aliciYetkili,
      aliciAdres: veri.aliciAdres,
      aliciIlKodu: veri.ilKodu,
      aliciIlceKodu: veri.ilceKodu,
      aliciPostaKodu: veri.postaKodu,
      aliciTelefon: veri.aliciTelefon,
      aliciCep: veri.aliciCep || veri.aliciTelefon,
      aliciEmail: veri.aliciEmail,
    }
    const istek = {
      ...taraflar,
      aliciSms: veri.aliciSms,
      servisSeviyesi: veri.servisSeviyesi || 3,
      odemeTipi: veri.odemeTipi || 2,
      paketTipi: veri.paketTipi || 'K',
      koliAdedi: veri.koliAdedi || 1,
      agirlik: veri.agirlik || 1,
      uzunluk: veri.uzunluk, yukseklik: veri.yukseklik, genislik: veri.genislik,
      aciklama: veri.aciklama,
      referans: veri.referans,
      faturaNo: veri.faturaNo,
      bildirimEmail: veri.aliciEmail,
    }

    const session = await soap.login(kimlik(ayar))
    const sonuc = await soap.createShipment(session, istek)

    const db = getDb()
    // PC'ler arası sipariş eşleme için stabil ikas_siparis_id (online siparişten).
    const ikasSiparisId = veri.onlineSiparisId
      ? (db.prepare('SELECT ikas_siparis_id FROM online_siparisler WHERE id=?').get(veri.onlineSiparisId)?.ikas_siparis_id || null)
      : null
    const ekle = db.prepare(`INSERT INTO kargolar
      (takip_no, durum, tip, musteri_id, satis_id, online_siparis_id, lokasyon_id, ikas_siparis_id, alici_ad, alici_telefon, alici_adres, il, ilce, il_kodu, ilce_kodu, koli_adedi, agirlik, servis_seviyesi, odeme_tipi, aciklama, barkod_png, etiket_link)
      VALUES (@takip_no, 'olusturuldu', @tip, @musteri_id, @satis_id, @online_siparis_id, @lokasyon_id, @ikas_siparis_id, @alici_ad, @alici_telefon, @alici_adres, @il, @ilce, @il_kodu, @ilce_kodu, @koli_adedi, @agirlik, @servis_seviyesi, @odeme_tipi, @aciklama, @barkod_png, @etiket_link)`)
    // Kargo müşterisini müşteri kartına kaydet (varsa mevcut id kullanılır, üzerine yazılmaz).
    const otoMusteriId = veri.musteriId || musteriKaydet(db, veri)
    const r = ekle.run({
      takip_no: sonuc.shipmentNo,
      tip: veri.iade ? 'iade' : 'gonderi',
      musteri_id: otoMusteriId || null,
      satis_id: veri.satisId || null,
      online_siparis_id: veri.onlineSiparisId || null,
      lokasyon_id: veri.gondericiLokasyonId || null,
      ikas_siparis_id: ikasSiparisId,
      alici_ad: veri.aliciAd,
      alici_telefon: veri.aliciTelefon || veri.aliciCep || '',
      alici_adres: veri.aliciAdres,
      il: veri.il || '',
      ilce: veri.ilce || '',
      il_kodu: veri.ilKodu || null,
      ilce_kodu: veri.ilceKodu || null,
      koli_adedi: veri.koliAdedi || 1,
      agirlik: veri.agirlik || 1,
      servis_seviyesi: veri.servisSeviyesi || 3,
      odeme_tipi: veri.odemeTipi || 2,
      aciklama: veri.aciklama || '',
      barkod_png: JSON.stringify(sonuc.barkodPng || []),
      etiket_link: sonuc.etiketLink || null,
    })
    const kayit = db.prepare('SELECT * FROM kargolar WHERE id = ?').get(r.lastInsertRowid)
    return { ...kayit, barkodPng: sonuc.barkodPng, etiketLink: sonuc.etiketLink }
  },

  // Kayıtlı kargoları listeler (en yeni önce).
  'kargo:listele': () => {
    const satirlar = getDb().prepare(`
      SELECT k.*, m.ad AS musteri_ad, m.soyad AS musteri_soyad, l.ad AS lokasyon_ad
      FROM kargolar k
      LEFT JOIN musteriler m ON m.id = k.musteri_id
      LEFT JOIN lokasyonlar l ON l.id = k.lokasyon_id
      ORDER BY k.id DESC LIMIT 500`).all()
    return satirlar
  },

  // Bir kargonun etiket PNG'lerini döndürür (yeniden basmak için).
  'kargo:etiket': (id) => {
    const k = getDb().prepare('SELECT barkod_png FROM kargolar WHERE id = ?').get(id)
    if (!k) throw new Error('Kargo bulunamadı')
    try { return JSON.parse(k.barkod_png || '[]') } catch { return [] }
  },

  // Birden çok kargonun etiket PNG'lerini tek dizide toplar (toplu basım için).
  // Sıra korunur; etiketi olmayan/bulunmayan kargolar atlanır.
  'kargo:etiket-toplu': (idler) => {
    if (!Array.isArray(idler) || !idler.length) throw new Error('Kargo seçilmedi')
    const stmt = getDb().prepare('SELECT barkod_png FROM kargolar WHERE id = ?')
    let pngler = []
    let kargoSayisi = 0
    for (const id of idler) {
      const k = stmt.get(id)
      if (!k) continue
      let arr = []
      try { arr = JSON.parse(k.barkod_png || '[]') } catch { arr = [] }
      if (arr.length) { pngler = pngler.concat(arr); kargoSayisi++ }
    }
    return { pngler, kargoSayisi, etiketSayisi: pngler.length }
  },

  // --- Supabase Storage köprüsü (PC'ler arası etiket basımı; DB'yi şişirmez) ---
  // Yerel PNG'si olan ama henüz Storage'a yüklenmemiş kargoları döndürür (yükleme için).
  'kargo:etiket-yuklenecekler': () => {
    return getDb().prepare(
      "SELECT id, senk_id, barkod_png FROM kargolar " +
      "WHERE (etiket_storage_yol IS NULL OR etiket_storage_yol = '') " +
      "AND barkod_png IS NOT NULL AND barkod_png NOT IN ('', '[]') AND senk_id IS NOT NULL"
    ).all()
  },

  // Bir kargonun Storage yolunu yazar (yükleme sonrası). senk_guncelleme tetikleyici ile tazelenir → senkron taşır.
  'kargo:etiket-yol-yaz': ({ id, yol }) => {
    getDb().prepare('UPDATE kargolar SET etiket_storage_yol = ? WHERE id = ?').run(yol || null, id)
    return { ok: true }
  },

  // 5 aydan eski, Storage'a yüklenmiş etiketler (temizlik için). ay: kaç aydan eski.
  'kargo:etiket-eskiler': (ay = 5) => {
    return getDb().prepare(
      "SELECT id, etiket_storage_yol FROM kargolar " +
      "WHERE etiket_storage_yol IS NOT NULL AND etiket_storage_yol <> '' " +
      "AND olusturma_tarihi < datetime('now', ?)"
    ).all(`-${Number(ay) || 5} months`)
  },

  // Storage'dan silindikten sonra yolu temizler (tekrar silmeye çalışmasın).
  'kargo:etiket-yol-temizle': (id) => {
    getDb().prepare("UPDATE kargolar SET etiket_storage_yol = NULL WHERE id = ?").run(id)
    return { ok: true }
  },

  // Takip durumunu sorgular ve kaydı günceller.
  'kargo:takip': async (takipNo) => {
    const ayar = _ayarlariGetir()
    const session = await soap.trackingLogin(kimlik(ayar))
    const durum = await soap.trackLast(session, takipNo)
    const sonDurum = [durum.aciklama, durum.sube].filter(Boolean).join(' — ')
    getDb().prepare("UPDATE kargolar SET son_durum = ?, son_durum_tarihi = datetime('now','localtime') WHERE takip_no = ?")
      .run(sonDurum || durum.aciklama || '', takipNo)
    return durum
  },

  // Gönderiyi iptal eder.
  'kargo:iptal': async (id) => {
    yetkiKontrol('kargo_iptal')
    const db = getDb()
    const k = db.prepare('SELECT * FROM kargolar WHERE id = ?').get(id)
    if (!k) throw new Error('Kargo bulunamadı')
    if (!k.takip_no) throw new Error('Bu kaydın takip numarası yok')
    const ayar = _ayarlariGetir()
    const session = await soap.login(kimlik(ayar))
    await soap.cancelShipment(session, ayar.musteri_kodu, k.takip_no)
    db.prepare("UPDATE kargolar SET durum = 'iptal' WHERE id = ?").run(id)
    return db.prepare('SELECT * FROM kargolar WHERE id = ?').get(id)
  },

  // Kurye çağırma (on-demand pickup). İki mod:
  //  - Normal: paket MAĞAZADAN alınır (gönderici = ayarlar/mağaza).
  //  - İade  : paket MÜŞTERİ adresinden alınır → veri.pickupAdresi verilir
  //            (ad/adres/ilKodu/ilceKodu/telefon), alıcı mağaza olur.
  'kargo:pickup': async (veri) => {
    yetkiKontrol('kargo_yonet')
    const ayar = _ayarlariGetir()
    gondericiKontrol(ayar)
    const session = await soap.login(kimlik(ayar))
    const magaza = gonderici(ayar)
    const p = veri.pickupAdresi // iade: paketin alınacağı müşteri adresi
    if (p && (!p.ad || !p.adres || !p.ilKodu || !p.ilceKodu)) {
      throw new Error('Kurye alım adresi eksik (ad, adres, il ve ilçe gerekli).')
    }
    const taraflar = p ? {
      musteriKodu: ayar.musteri_kodu,
      gondericiHesapNo: ayar.gonderici_hesap_no || ayar.musteri_kodu,
      gondericiAd: p.ad, gondericiYetkili: p.ad, gondericiAdres: p.adres,
      gondericiIlKodu: p.ilKodu, gondericiIlceKodu: p.ilceKodu,
      gondericiTelefon: p.telefon || '', gondericiCep: p.cep || p.telefon || '',
      // alıcı = mağaza (iade paketi bize gelir)
      aliciAd: magaza.gondericiAd, aliciAdres: magaza.gondericiAdres,
      aliciIlKodu: magaza.gondericiIlKodu, aliciIlceKodu: magaza.gondericiIlceKodu,
      aliciTelefon: magaza.gondericiTelefon, aliciCep: magaza.gondericiCep,
    } : {
      ...magaza,
      // Normal pickup: alıcı bilgisi de gerekiyor; kullanıcı vermezse gönderici tekrar.
      aliciAd: veri.aliciAd || ayar.gonderici_ad,
      aliciAdres: veri.aliciAdres || ayar.gonderici_adres,
      aliciIlKodu: veri.ilKodu || ayar.gonderici_il_kodu,
      aliciIlceKodu: veri.ilceKodu || ayar.gonderici_ilce_kodu,
      aliciTelefon: veri.aliciTelefon || ayar.gonderici_telefon,
      aliciCep: veri.aliciCep || ayar.gonderici_cep,
    }
    const istek = {
      ...taraflar,
      servisSeviyesi: veri.servisSeviyesi || 3,
      odemeTipi: veri.odemeTipi || 2,
      paketTipi: 'K',
      koliAdedi: veri.koliAdedi || 1,
      agirlik: veri.agirlik || 1,
      aciklama: veri.aciklama || 'Koli',
      tarih: veri.tarih, // YYYY-MM-DD veya ISO
      kutular: veri.kutular || [{ kod: 3, adet: veri.koliAdedi || 1 }],
    }
    return await soap.pickupRequest(session, istek)
  },

  // Çok kolili gönderinin TÜM koli takip numaraları (detay modalı için).
  // UPS'te ana takip no yalnızca bir kolinindir; diğerleri ayrıca sorgulanır.
  'kargo:koliler': async (takipNo) => {
    if (!takipNo) throw new Error('Takip numarası gerekli')
    const ayar = _ayarlariGetir()
    const session = await soap.trackingLogin(kimlik(ayar))
    return await soap.shipmentPackages(session, takipNo)
  },

  // Kargo detay: tek kaydın tüm alanları (detay modalı için).
  'kargo:detay': (id) => {
    const k = getDb().prepare(`
      SELECT k.*, m.ad AS musteri_ad, m.soyad AS musteri_soyad, l.ad AS lokasyon_ad
      FROM kargolar k
      LEFT JOIN musteriler m ON m.id = k.musteri_id
      LEFT JOIN lokasyonlar l ON l.id = k.lokasyon_id
      WHERE k.id = ?`).get(id)
    if (!k) throw new Error('Kargo bulunamadı')
    delete k.barkod_png // ağır PNG verisini renderer'a taşıma
    return k
  },
}
