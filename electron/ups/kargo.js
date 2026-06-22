// UPS kargo işlemleri: gönderi oluşturma, takip, iptal, kurye çağırma.
const { getDb } = require('../db/database')
const { _ayarlariGetir } = require('../db/ups-ayarlar')
const soap = require('./soap')

function kimlik(ayar) {
  return {
    musteriKodu: ayar.musteri_kodu,
    kullaniciKodu: ayar.kullanici_kodu,
    sifre: ayar.sifre,
  }
}

// Ayarlardaki gönderici (mağaza) bilgilerini soap formatına çevirir.
function gonderici(ayar) {
  return {
    musteriKodu: ayar.musteri_kodu,
    gondericiHesapNo: ayar.gonderici_hesap_no || ayar.musteri_kodu,
    gondericiAd: ayar.gonderici_ad,
    gondericiYetkili: ayar.gonderici_yetkili,
    gondericiAdres: ayar.gonderici_adres,
    gondericiIlKodu: ayar.gonderici_il_kodu,
    gondericiIlceKodu: ayar.gonderici_ilce_kodu,
    gondericiPostaKodu: ayar.gonderici_posta_kodu,
    gondericiTelefon: ayar.gonderici_telefon,
    gondericiCep: ayar.gonderici_cep,
    gondericiEmail: ayar.gonderici_email,
  }
}

function gondericiKontrol(ayar) {
  const eksik = []
  if (!ayar.musteri_kodu) eksik.push('Müşteri Kodu')
  if (!ayar.kullanici_kodu) eksik.push('Kullanıcı Kodu')
  if (!ayar.sifre) eksik.push('Şifre')
  if (!ayar.gonderici_ad) eksik.push('Gönderici Adı')
  if (!ayar.gonderici_adres) eksik.push('Gönderici Adresi')
  if (!ayar.gonderici_il_kodu) eksik.push('Gönderici İl')
  if (!ayar.gonderici_ilce_kodu) eksik.push('Gönderici İlçe')
  if (eksik.length) {
    throw new Error('UPS ayarları eksik: ' + eksik.join(', ') + '. Ayarlar > UPS Kargo bölümünden tamamlayın.')
  }
}

module.exports = {
  // Gönderi oluşturur, DB'ye kaydeder ve etiket PNG'lerini döndürür.
  'kargo:olustur': async (veri) => {
    const ayar = _ayarlariGetir()
    gondericiKontrol(ayar)

    const istek = {
      ...gonderici(ayar),
      aliciAd: veri.aliciAd,
      aliciYetkili: veri.aliciYetkili,
      aliciAdres: veri.aliciAdres,
      aliciIlKodu: veri.ilKodu,
      aliciIlceKodu: veri.ilceKodu,
      aliciPostaKodu: veri.postaKodu,
      aliciTelefon: veri.aliciTelefon,
      aliciCep: veri.aliciCep || veri.aliciTelefon,
      aliciEmail: veri.aliciEmail,
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
    const ekle = db.prepare(`INSERT INTO kargolar
      (takip_no, durum, musteri_id, satis_id, alici_ad, alici_telefon, alici_adres, il, ilce, il_kodu, ilce_kodu, koli_adedi, agirlik, servis_seviyesi, odeme_tipi, aciklama, barkod_png)
      VALUES (@takip_no, 'olusturuldu', @musteri_id, @satis_id, @alici_ad, @alici_telefon, @alici_adres, @il, @ilce, @il_kodu, @ilce_kodu, @koli_adedi, @agirlik, @servis_seviyesi, @odeme_tipi, @aciklama, @barkod_png)`)
    const r = ekle.run({
      takip_no: sonuc.shipmentNo,
      musteri_id: veri.musteriId || null,
      satis_id: veri.satisId || null,
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
    })
    const kayit = db.prepare('SELECT * FROM kargolar WHERE id = ?').get(r.lastInsertRowid)
    return { ...kayit, barkodPng: sonuc.barkodPng, etiketLink: sonuc.etiketLink }
  },

  // Kayıtlı kargoları listeler (en yeni önce).
  'kargo:listele': () => {
    const satirlar = getDb().prepare(`
      SELECT k.*, m.ad AS musteri_ad, m.soyad AS musteri_soyad
      FROM kargolar k LEFT JOIN musteriler m ON m.id = k.musteri_id
      ORDER BY k.id DESC LIMIT 500`).all()
    return satirlar
  },

  // Bir kargonun etiket PNG'lerini döndürür (yeniden basmak için).
  'kargo:etiket': (id) => {
    const k = getDb().prepare('SELECT barkod_png FROM kargolar WHERE id = ?').get(id)
    if (!k) throw new Error('Kargo bulunamadı')
    try { return JSON.parse(k.barkod_png || '[]') } catch { return [] }
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

  // Kurye çağırma (on-demand pickup).
  'kargo:pickup': async (veri) => {
    const ayar = _ayarlariGetir()
    gondericiKontrol(ayar)
    const session = await soap.login(kimlik(ayar))
    const istek = {
      ...gonderici(ayar),
      // Pickup için alıcı bilgisi de gerekiyor; kullanıcı vermezse gönderici tekrar.
      aliciAd: veri.aliciAd || ayar.gonderici_ad,
      aliciAdres: veri.aliciAdres || ayar.gonderici_adres,
      aliciIlKodu: veri.ilKodu || ayar.gonderici_il_kodu,
      aliciIlceKodu: veri.ilceKodu || ayar.gonderici_ilce_kodu,
      aliciTelefon: veri.aliciTelefon || ayar.gonderici_telefon,
      aliciCep: veri.aliciCep || ayar.gonderici_cep,
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
}
