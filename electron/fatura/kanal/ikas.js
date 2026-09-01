// ikas KANAL ADAPTÖRÜ — bir online siparişi fatura çekirdeğinin girdisine çevirir.
//
// Kanal adaptörünün tek işi ÇEVİRİ: hangi kalem faturaya girer, müşteri kimliği
// nereden okunur, set nasıl çözülür. Fatura kesme kararı (sahiplenme, stok, sonuç
// sınıfı) cekirdek.js'in işidir; buraya HTTP veya RPC girmez.
//
// Depo (repository) enjekte edilir: SQL burada değil, `_depoKur()`te. Böylece
// kararlar gerçek SQLite olmadan test edilebilir.
const { setCoz } = require('../set-coz')
const { yuvarla } = require('../../db/satis-hesapla')

class KanalHatasi extends Error {
  constructor(mesaj) {
    super(mesaj)
    this.name = 'KanalHatasi'
    this.kod = 'dogrulama'   // sahiplenmeden ÖNCE patlar, hiçbir şey işgal edilmez
  }
}

function _depoKur(db) {
  const siparisS = db.prepare('SELECT * FROM online_siparisler WHERE id = ?')
  const kalemS = db.prepare(`SELECT urun_id, ikas_varyant_id, urun_adi, miktar, birim_fiyat,
    COALESCE(iade_miktar, 0) AS iade_miktar FROM online_siparis_kalemleri WHERE siparis_id = ?`)
  const urunS = db.prepare('SELECT id, senk_id, sku, ad, barkod, kdv_orani, satis_fiyati FROM urunler WHERE id = ?')
  // Set, sipariş kalemine urun_id ile bağlanamaz (setler urunler tablosunda değil) —
  // tek bağ ikas varyant kimliği (Faz 2 / Task 5A).
  const setS = db.prepare('SELECT id, senk_id, sku, ad, ikas_varyant_id FROM setler WHERE ikas_varyant_id = ? AND aktif = 1')
  const bilesenS = db.prepare(`SELECT u.senk_id, u.sku, u.ad, u.barkod, u.kdv_orani, u.satis_fiyati, su.miktar
      FROM set_urunler su JOIN urunler u ON u.id = su.urun_id
     WHERE su.set_id = ? ORDER BY su.id`)
  return {
    siparisGetir: (id) => siparisS.get(id),
    kalemleriGetir: (id) => kalemS.all(id),
    urunGetir: (id) => urunS.get(id),
    setGetirVaryanttan: (vid) => (vid ? setS.get(vid) : null),
    setBilesenleriGetir: (setId) => bilesenS.all(setId),
  }
}

function _musteriCevir(s) {
  // Fatura kimliği ÖNCE siparişin fatura alanlarından; ikas'ta bunlar boş bırakılmış
  // olabilir, o zaman müşteri adına düşülür. Belge tipini Bizimhesap seçiyor (spec §③),
  // bu yüzden vergi no ile TC ayrı alanlarda taşınır — birleştirilirse tahmin bozulur.
  const adres = [s.teslimat_adres, s.teslimat_ilce, s.teslimat_il].filter(Boolean).join(' ')
  return {
    id: s.id,
    unvan: s.fatura_unvan || s.musteri_ad || '',
    vergi_no: s.fatura_vergi_no || null,
    vergi_dairesi: s.fatura_vergi_dairesi || '',
    tc: s.fatura_tc || null,
    eposta: s.musteri_email || '',
    telefon: s.musteri_telefon || '',
    adres,
  }
}

function _urunKalemi(u, adet, birimFiyat, kalemAdi) {
  if (!u.sku) {
    throw new KanalHatasi(`"${u.ad || kalemAdi}" ürününün stok kodu (SKU) yok, faturaya yazılamaz`)
  }
  if (!u.senk_id) {
    throw new KanalHatasi(`"${u.ad || kalemAdi}" ürününün bulut kimliği yok, fatura stoğu düşülemez (senkron bekliyor olabilir)`)
  }
  const fiyat = yuvarla(Number(birimFiyat))
  return {
    urun_senk_id: u.senk_id,
    sku: u.sku,
    ad: u.ad || kalemAdi,
    barkod: u.barkod || '',
    miktar: adet,
    birim_fiyat: fiyat,
    kdv_orani: Number(u.kdv_orani),   // sipariş kaleminde KDV YOK, ürün kaydından gelir
    satir_toplam: yuvarla(adet * fiyat),
    set_senk_id: null,
  }
}

function _setKalemleri(set, bilesenler, adet, birimFiyat, kalemAdi) {
  if (!bilesenler.length) {
    throw new KanalHatasi(`"${set.ad || kalemAdi}" setinin bileşenleri tanımlı değil, faturaya yazılamaz`)
  }
  for (const b of bilesenler) {
    if (!b.senk_id) {
      throw new KanalHatasi(`"${b.ad}" bileşeninin bulut kimliği yok, fatura stoğu düşülemez (senkron bekliyor olabilir)`)
    }
  }
  // Fatura stoğu BİLEŞEN bazında tutulur; set kimliği yalnız iz olarak taşınır.
  return setCoz({ ad: set.ad || kalemAdi, miktar: adet, birim_fiyat: birimFiyat }, bilesenler)
    .map((k, i) => ({
      urun_senk_id: bilesenler[i].senk_id,
      sku: k.sku,
      ad: k.ad,
      barkod: k.barkod,
      miktar: k.miktar,
      birim_fiyat: k.birim_fiyat,
      kdv_orani: k.kdv_orani,
      satir_toplam: k.satir_toplam,
      set_senk_id: set.senk_id || null,
      set_adi: set.ad || kalemAdi,
    }))
}

/**
 * @param {number} siparisId yerel online_siparisler.id
 * @param {object} [depo] test için enjekte edilebilir veri erişimi
 */
function siparisiFaturayaCevir(siparisId, depo) {
  const d = depo || _depoKur(require('../../db/database').getDb())
  const s = d.siparisGetir(siparisId)
  if (!s) throw new KanalHatasi('Sipariş bulunamadı, fatura kesilemez')

  const kalemler = []
  for (const k of d.kalemleriGetir(siparisId)) {
    // İade edilmiş adede fatura kesilmez: ikas sipariş toplamını iade sonrası
    // güncellemiyor, kalan adedi biz tutuyoruz (v1.2.174).
    const adet = Number(k.miktar) - Number(k.iade_miktar || 0)
    if (adet <= 0) continue

    if (k.urun_id) {
      const u = d.urunGetir(k.urun_id)
      if (!u) throw new KanalHatasi(`"${k.urun_adi}" ürünü katalogda bulunamadı, faturaya yazılamaz`)
      kalemler.push(_urunKalemi(u, adet, k.birim_fiyat, k.urun_adi))
      continue
    }

    const set = d.setGetirVaryanttan(k.ikas_varyant_id)
    if (set) {
      kalemler.push(..._setKalemleri(set, d.setBilesenleriGetir(set.id), adet, k.birim_fiyat, k.urun_adi))
      continue
    }

    // Ne ürün ne set: ikas'ta olup uygulamaya girilmemiş bir ürün. Adı mesaja
    // konur ki kullanıcı hangi kaydı açacağını bilsin.
    throw new KanalHatasi(
      `"${k.urun_adi}" siparişteki ürün uygulamada eşleşmiyor — ürünü girin veya ikas eşleştirmesini çalıştırın`)
  }

  if (!kalemler.length) {
    throw new KanalHatasi('Siparişte faturalanacak kalem yok (tümü iade edilmiş olabilir)')
  }

  return {
    kanal: 'ikas',
    kanal_siparis_id: s.ikas_siparis_id,
    musteri: _musteriCevir(s),
    kalemler,
    fatura_no: '',                       // numarayı Bizimhesap verir
    // Fatura tarihi KESİM günüdür, sipariş günü değil: geçmişe fatura kesmek
    // (geriye tarihleme) beyan dönemini kaydırır.
    tarih: new Date().toISOString().slice(0, 10),
    not: s.siparis_no ? `ikas siparişi ${s.siparis_no}` : '',
  }
}

module.exports = { siparisiFaturayaCevir, KanalHatasi, _depoKur, _musteriCevir }
