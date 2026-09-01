// Fatura kesme çekirdeği — KANAL ve SAĞLAYICI BAĞIMSIZ.
//
// Sıra (spec §⑤): guard → sahiplen + stok düş (tek transaction) → sağlayıcıya
// gönder → sonucu durum makinesine yaz.
//
// NEDEN BAĞIMLILIK ENJEKSİYONU: sağlayıcı (`bizimhesap`) ve RPC katmanı dışarıdan
// verilir. Böylece bu dosya HTTP/DB olmadan test edilebilir, ve sağlayıcı Mikro
// ERP'ye taşınırsa çekirdek hiç değişmez.
//
// 🔴 ÜÇ SONUÇ SINIFI — bu dosyanın varlık sebebi:
//   tamam    → sağlayıcı guid verdi. Stok düşük kalır (doğru).
//   hata     → fatura KESİNLİKLE oluşmadı (is_hatasi / yapilandirma). Telafi
//              çağrılır, stok iade edilir, sipariş yeniden faturalanabilir.
//   belirsiz → sonuç doğrulanamadı (ağ, zaman aşımı, tanınmayan hata). Telafi
//              ÇAĞRILMAZ: fatura karşı tarafta oluşmuş olabilir, stoğu iade
//              edersek hem stok hem fatura mükerrer olur. Kararı insan verir.
const { setCoz } = require('./set-coz')

class FaturaCekirdekHatasi extends Error {
  constructor(mesaj, kod) {
    super(mesaj)
    this.name = 'FaturaCekirdekHatasi'
    this.kod = kod || 'dogrulama'
  }
}

// Belge tipini BİZ belirlemiyoruz — Bizimhesap vergi kimliğine bakıp seçiyor ve
// yanıtında bunu bildirmiyor (spec §③). Alan yalnız TAHMİN olarak doldurulur;
// çağıran `belge_tipi_kaynak: 'tahmin'` ile birlikte yazar, rapor bunu kesin
// bilgi gibi göstermez.
function _belgeTipiTahmin(vergiKimligi) {
  const t = String(vergiKimligi || '').trim()
  if (!/^\d+$/.test(t)) return null
  if (t.length === 10) return 'e_fatura'    // VKN → kurumsal
  if (t.length === 11) return 'e_arsiv'     // TCKN → bireysel
  return null
}

// Sahiplenmeden ÖNCE çalışır. Gerekçe: fatura_kes_basla UNIQUE(kanal, sipariş)
// satırını yazar; eksik veriyle sahiplenirsek sipariş kalıcı olarak işgal edilir.
function _guard(girdi) {
  const kalemler = Array.isArray(girdi.kalemler) ? girdi.kalemler : []
  if (!kalemler.length) {
    throw new FaturaCekirdekHatasi('Siparişte faturalanacak kalem yok', 'dogrulama')
  }
  if (!girdi.musteri || !girdi.musteri.unvan) {
    throw new FaturaCekirdekHatasi(
      'Siparişin fatura ünvanı eksik, fatura kesilemez (ikas siparişinde fatura bilgisini tamamlayın)',
      'dogrulama')
  }
  for (const k of kalemler) {
    if (!k.sku) {
      // SKU'suz kalem Bizimhesap'ta MÜKERRER ÜRÜN açar (spec §③ guard 2).
      throw new FaturaCekirdekHatasi(
        `"${k.ad}" ürününün stok kodu (SKU) yok, faturaya yazılamaz`, 'dogrulama')
    }
    if (!k.urun_senk_id) {
      // Bulut kimliği olmayan ürünün fatura stoğu düşülemez.
      throw new FaturaCekirdekHatasi(
        `"${k.ad}" ürününün bulut kimliği yok, fatura stoğu düşülemez (senkron bekliyor olabilir)`,
        'dogrulama')
    }
  }
}

function _rpcKalemleri(kalemler) {
  return kalemler.map(k => ({
    urun_senk_id: k.urun_senk_id,
    urun_adi: k.ad,
    miktar: k.miktar,
    birim_fiyat: k.birim_fiyat,
    kdv_orani: k.kdv_orani,
    satir_toplam: k.satir_toplam,
    set_senk_id: k.set_senk_id || null,
  }))
}

function _saglayiciKalemleri(kalemler) {
  return kalemler.map(k => ({
    sku: k.sku,
    ad: k.ad,
    barkod: k.barkod || '',
    miktar: k.miktar,
    birim_fiyat: k.birim_fiyat,
    kdv_orani: k.kdv_orani,
    // Aynı satır toplamı iki tarafa da gider: sette kuruş artığı son bileşene
    // yazıldığı için yeniden hesaplanırsa fatura ile kaydımız ayrışır.
    satir_toplam: k.satir_toplam,
    not: k.set_adi ? `${k.set_adi} seti` : '',
  }))
}

/**
 * @param {object} girdi kanal adaptöründen gelen fatura girdisi
 * @param {{saglayici: object, rpc: object, ayarlar: object}} bagimliliklar
 */
async function faturaKes(girdi, bagimliliklar) {
  const { saglayici, rpc, ayarlar } = bagimliliklar
  _guard(girdi)

  // 1) Sahiplen + fatura stoğunu düş — TEK transaction, mükerrer engeli UNIQUE'te.
  const senkId = await rpc.faturaKesBasla({
    kanal: girdi.kanal,
    kanal_siparis_id: girdi.kanal_siparis_id,
    kalemler: _rpcKalemleri(girdi.kalemler),
    kullanici: girdi.kullanici,
  })

  // 2) Sağlayıcıya gönder. Buradan sonrası artık geri alınabilir DEĞİL —
  //    sonucu doğru sınıflamak stok ve fatura tutarlılığının tek güvencesi.
  let sonuc
  try {
    sonuc = await saglayici.faturaGonder({
      musteri: girdi.musteri,
      kalemler: _saglayiciKalemleri(girdi.kalemler),
      fatura_no: girdi.fatura_no || '',
      tarih: girdi.tarih,
      not: girdi.not || '',
    }, ayarlar)
  } catch (hata) {
    const kesinBasarisiz = hata && (hata.kod === 'is_hatasi' || hata.kod === 'yapilandirma')
    if (!kesinBasarisiz) {
      // 'ag' ve TANIMSIZ kod: sonuç belirsiz. Telafi YOK.
      await rpc.faturaKesBitir({
        senk_id: senkId, durum: 'belirsiz', hata: hata && hata.message,
      })
      return { durum: 'belirsiz', senk_id: senkId, mesaj: hata && hata.message }
    }
    // Kesin başarısızlık: stoğu iade et.
    let telafiYapilamadi = false
    try {
      await rpc.faturaKesTelafi({ senk_id: senkId, hata: hata.message, kullanici: girdi.kullanici })
    } catch {
      // Telafi de patlarsa asıl hatayı YUTMA — kullanıcı ikisini birden görmeli,
      // stok elle düzeltilecek.
      telafiYapilamadi = true
    }
    return { durum: 'hata', senk_id: senkId, mesaj: hata.message, telafi_yapilamadi: telafiYapilamadi }
  }

  // 3) Sonucu yaz. 'tamam' guid olmadan yazılamaz (sunucu da reddeder).
  const m = girdi.musteri || {}
  await rpc.faturaKesBitir({
    senk_id: senkId,
    durum: 'tamam',
    guid: sonuc.guid,
    url: sonuc.url,
    fatura_no: girdi.fatura_no || null,
    belge_tipi: _belgeTipiTahmin(m.vergi_no || m.tc),
    belge_tipi_kaynak: 'tahmin',
  })
  return { durum: 'tamam', senk_id: senkId, guid: sonuc.guid, url: sonuc.url }
}

module.exports = { faturaKes, setCoz, _belgeTipiTahmin, FaturaCekirdekHatasi }
