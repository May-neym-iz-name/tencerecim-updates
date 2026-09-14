// TRENDYOL KANAL ADAPTÖRÜ — bir Trendyol sipariş PAKETİNİ fatura çekirdeğinin
// girdisine çevirir.
//
// ikas adaptörüyle aynı sözleşme: tek işi ÇEVİRİ. Fatura kesme kararı (sahiplenme,
// stok, sonuç sınıfı) cekirdek.js'in işidir; buraya HTTP veya RPC girmez.
//
// ikas'tan İKİ FARKI var:
//  1) Eşleşme SKU ile yapılır. Trendyol her satırda `stockCode` gönderiyor ve ölçüldü:
//     162/162 ürünün stok kodu bizim TNC.* kodumuz (ikas'ta varyant kimliği üzerinden
//     gidiliyordu çünkü orada SKU her zaman dolu değil).
//  2) Birim faturalanan şey PAKETtir, sipariş değil. Bir sipariş birden çok pakete
//     bölünebilir ve her paket ayrı kargolanır → her paket ayrı fatura alır.
const { setCoz } = require('../set-coz')
const { yuvarla } = require('../../db/satis-hesapla')

class KanalHatasi extends Error {
  constructor(mesaj) {
    super(mesaj)
    this.name = 'KanalHatasi'
    this.kod = 'dogrulama'   // sahiplenmeden ÖNCE patlar, hiçbir şey işgal edilmez
  }
}

// İptal/iade/tedarik edilememiş kalem faturaya GİRMEZ — müşteri o ürünü almadı.
const FATURALANMAZ = new Set(['Cancelled', 'Returned', 'UnSupplied', 'UnDelivered'])

function _depoKur(db) {
  const siparisS = db.prepare('SELECT * FROM trendyol_siparisler WHERE paket_id = ?')
  const kalemS = db.prepare(`SELECT kalem_id, sku, barkod, urun_adi, miktar, birim_fiyat,
    birim_indirim, kdv_orani, kalem_durum FROM trendyol_siparis_kalemleri WHERE siparis_id = ?`)
  const urunSkuS = db.prepare(
    'SELECT id, senk_id, sku, ad, barkod, kdv_orani FROM urunler WHERE upper(sku) = upper(?) AND aktif = 1')
  const setSkuS = db.prepare('SELECT id, senk_id, sku, ad FROM setler WHERE upper(sku) = upper(?) AND aktif = 1')
  const bilesenS = db.prepare(`SELECT u.senk_id, u.sku, u.ad, u.barkod, u.kdv_orani, u.satis_fiyati, su.miktar
      FROM set_urunler su JOIN urunler u ON u.id = su.urun_id
     WHERE su.set_id = ? ORDER BY su.id`)
  return {
    siparisGetir: (paketId) => siparisS.get(String(paketId)),
    kalemleriGetir: (id) => kalemS.all(id),
    urunGetirSku: (sku) => (sku ? urunSkuS.get(sku) : null),
    setGetirSku: (sku) => (sku ? setSkuS.get(sku) : null),
    setBilesenleriGetir: (setId) => bilesenS.all(setId),
  }
}

// Fatura kimliği: Trendyol kurumsal faturada taxNumber/taxOffice gönderir, bireyselde
// GÖNDERMEZ (belgede yazıyor, canlıda da doğrulandı) — yokluğu hata değil, bireysel satış.
// Belge tipini Bizimhesap seçer, o yüzden vergi no ile TC AYRI alanlarda taşınır.
function _musteriCevir(s) {
  const adres = [s.teslimat_adres, s.teslimat_ilce, s.teslimat_il].filter(Boolean).join(' ')
  const unvan = s.fatura_unvan || s.musteri_ad || ''
  if (!unvan) throw new KanalHatasi('Siparişin fatura ünvanı yok, fatura kesilemez')
  return {
    id: s.id,
    unvan,
    vergi_no: s.fatura_vergi_no || null,
    vergi_dairesi: s.fatura_vergi_dairesi || '',
    tc: s.fatura_tc || null,
    eposta: s.musteri_email || '',
    telefon: s.teslimat_telefon || '',
    adres,
  }
}

function _urunKalemi(u, adet, birimFiyat, kalemAdi) {
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
    // KDV oranı ÜRÜN kaydından gelir. Trendyol da satırda vatRate gönderiyor ama
    // fatura bizim katalog oranımızla kesilmeli — iki kaynak çakışırsa muhasebe bizimkini
    // bekler.
    kdv_orani: Number(u.kdv_orani),
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
  return setCoz({ ad: set.ad || kalemAdi, miktar: adet, birim_fiyat: birimFiyat }, bilesenler)
    .map((k, i) => ({
      urun_senk_id: bilesenler[i].senk_id,
      sku: k.sku, ad: k.ad, barkod: k.barkod,
      miktar: k.miktar, birim_fiyat: k.birim_fiyat,
      kdv_orani: k.kdv_orani, satir_toplam: k.satir_toplam,
      set_senk_id: set.senk_id || null,
      set_adi: set.ad || kalemAdi,
    }))
}

/**
 * @param {string} paketId  trendyol_siparisler.paket_id
 * @param {object} [depo]   test için enjekte edilebilir veri erişimi
 */
function paketiFaturayaCevir(paketId, depo) {
  const d = depo || _depoKur(require('../../db/database').getDb())
  const s = d.siparisGetir(paketId)
  if (!s) throw new KanalHatasi('Trendyol siparişi bulunamadı, fatura kesilemez')

  const kalemler = []
  for (const k of d.kalemleriGetir(s.id)) {
    if (FATURALANMAZ.has(k.kalem_durum)) continue    // iptal/iade edilmiş kalem
    const adet = Math.trunc(Number(k.miktar) || 0)
    if (adet <= 0) continue

    // 🔴 birim_fiyat ZATEN BİRİM fiyattır (Trendyol'un lineUnitPrice'ı). Miktara
    // BÖLÜNMEZ — ikas tarafında bir kez yaşanmış hata.
    //
    // 🔴 birim_indirim BİLEREK DÜŞÜLMÜYOR (karar 14.09.2026). Sütun adı "birim" diyor
    // ama kaynağı Trendyol'un `lineTotalDiscount` alanı (mantik:131) — yani muhtemelen
    // SATIR TOPLAMI indirimi. İkisi aynı değil ve hangisi olduğu CANLI VERİYLE
    // ÖLÇÜLEMEDİ: ölçüm anında tabloda indirimli tek kalem yoktu (2 kalem, ikisi de 0;
    // kalem brütü paket toplamına birebir eşit).
    //
    // Yanlış yorumun bedeli simetrik DEĞİL:
    //   - Satır toplamıysa ve biz birimden düşersek → fatura miktar katı kadar EKSİK
    //     kesilir. Eksik fatura vergisel bir sorundur ve kesilmiş belge geri alınmaz.
    //   - Gerçekten birimse ve biz düşmezsek → fatura indirim kadar FAZLA kesilir;
    //     yanlıştır ama fark faturada görünür ve iade/düzeltme ile kapanır.
    // Ölçülmemiş bir alanla sessizce eksik fatura kesmektense, indirimi hiç uygulamayıp
    // farkı görünür bırakmak tercih edildi.
    //
    // ÇÖZÜM: ilk indirimli Trendyol siparişi geldiğinde birim_indirim'i paket toplamıyla
    // karşılaştır; hangisi olduğu tek seferde belli olur. Sonra burası ve
    // src/utils/trendyolTutar.js BİRLİKTE güncellenir (ikisi aynı varsayıma dayanıyor).
    const birim = Number(k.birim_fiyat)

    // Önce ÜRÜN: eşleşme tekildir, set çözmeye göre daha kesin.
    const u = d.urunGetirSku(k.sku)
    if (u) { kalemler.push(_urunKalemi(u, adet, birim, k.urun_adi)); continue }

    const set = d.setGetirSku(k.sku)
    if (set) {
      kalemler.push(..._setKalemleri(set, d.setBilesenleriGetir(set.id), adet, birim, k.urun_adi))
      continue
    }

    throw new KanalHatasi(
      `"${k.urun_adi}" (${k.sku || 'stok kodsuz'}) uygulamada eşleşmiyor — ürünü girin ya da stok kodunu düzeltin`)
  }

  if (!kalemler.length) {
    throw new KanalHatasi('Pakette faturalanacak kalem yok (tümü iptal/iade edilmiş olabilir)')
  }

  return {
    kanal: 'trendyol',
    // Fatura kimliği PAKET kimliğidir, sipariş numarası değil: aynı sipariş birden
    // çok pakete bölünürse her paket ayrı fatura alır ve UNIQUE(kanal, sipariş)
    // kısıtı ikisini çakıştırmamalı.
    kanal_siparis_id: s.paket_id,
    musteri: _musteriCevir(s),
    kalemler,
    fatura_no: '',                       // numarayı Bizimhesap verir
    // Fatura tarihi KESİM günüdür, sipariş günü değil (geriye tarihleme beyan dönemini kaydırır).
    tarih: new Date().toISOString().slice(0, 10),
    not: s.siparis_no ? `Trendyol siparişi ${s.siparis_no}` : `Trendyol paketi ${s.paket_id}`,
  }
}

module.exports = { paketiFaturayaCevir, KanalHatasi, _depoKur, _musteriCevir, FATURALANMAZ }
