// Set (paket) kalemini fatura satırlarına çözer.
//
// NEDEN GEREKLİ: set müşteriye TEK fiyatla satılır ama fatura bileşen bazında
// kesilir — hem fatura stoğu bileşen bazında tutulduğu için, hem de bileşenlerin
// KDV oranları farklı olabildiği için. Set toplamını eşit bölmek beyan edilen
// KDV'yi yanlış çıkarır; dağıtım bileşen satış fiyatlarıyla AĞIRLIKLI yapılır.
//
// Formül (spec §③):
//   pay_i    = (satis_fiyati_i × miktar_i) / Σ(satis_fiyati_j × miktar_j)
//   brüt_i   = yuvarla(set_fiyatı × set_adedi × pay_i)
//   brüt_son = set_toplamı − Σ(diğer bileşenler)      ← kuruş artığı SON satıra
//
// Kuruş artığı neden son satıra: üç eşit bileşene 100,00 TL bölünürse
// 33,33 × 3 = 99,99 eder ve fatura toplamı siparişten 1 kuruş sapar. Artık son
// bileşene yazılınca fatura ile müşterinin ödediği tutar birebir tutar.
const { yuvarla } = require('../db/satis-hesapla')

class SetCozmeHatasi extends Error {
  constructor(mesaj) {
    super(mesaj)
    this.name = 'SetCozmeHatasi'
    this.kod = 'is_hatasi'   // set çözülemiyorsa fatura KESİNLİKLE kesilmemeli
  }
}

/**
 * @param {{ad: string, miktar: number, birim_fiyat: number}} setKalemi sipariş satırındaki set
 * @param {Array<{sku: string, ad: string, barkod?: string, miktar: number, satis_fiyati: number, kdv_orani: number}>} bilesenler
 * @returns {Array<{sku, ad, barkod, miktar, birim_fiyat, kdv_orani, satir_toplam, set_adi}>}
 */
function setCoz(setKalemi, bilesenler) {
  const liste = Array.isArray(bilesenler) ? bilesenler : []
  if (!liste.length) {
    throw new SetCozmeHatasi(`"${setKalemi.ad}" setinin bileşenleri tanımlı değil, faturaya yazılamaz`)
  }
  const setAdedi = Number(setKalemi.miktar)
  const setFiyati = Number(setKalemi.birim_fiyat)
  if (!Number.isFinite(setAdedi) || setAdedi <= 0) {
    throw new SetCozmeHatasi(`"${setKalemi.ad}" setinin adedi geçersiz`)
  }
  if (!Number.isFinite(setFiyati) || setFiyati <= 0) {
    throw new SetCozmeHatasi(`"${setKalemi.ad}" setinin fiyatı geçersiz`)
  }

  const agirliklar = liste.map(b => {
    if (!b.sku) {
      throw new SetCozmeHatasi(`"${setKalemi.ad}" setindeki "${b.ad}" bileşeninin SKU'su yok, faturaya yazılamaz`)
    }
    const adet = Number(b.miktar)
    const fiyat = Number(b.satis_fiyati)
    if (!Number.isFinite(adet) || adet <= 0) {
      throw new SetCozmeHatasi(`"${b.ad}" bileşeninin set içindeki adedi geçersiz`)
    }
    if (!Number.isFinite(fiyat) || fiyat < 0) {
      throw new SetCozmeHatasi(`"${b.ad}" bileşeninin satış fiyatı geçersiz`)
    }
    return adet * fiyat
  })
  const agirlikToplam = agirliklar.reduce((t, a) => t + a, 0)
  if (agirlikToplam <= 0) {
    // Sıfıra bölme yerine anlaşılır hata: bileşenlerin hiçbirinde fiyat yoksa
    // dağıtım oranı hesaplanamaz (fiyatlar önce girilmeli).
    throw new SetCozmeHatasi(
      `"${setKalemi.ad}" setinin bileşenlerinde satış fiyatı yok, dağıtım yapılamaz`)
  }

  const setToplami = yuvarla(setFiyati * setAdedi)
  let dagitilan = 0
  return liste.map((b, i) => {
    const sonMu = i === liste.length - 1
    const satirToplam = sonMu
      ? yuvarla(setToplami - dagitilan)                       // kuruş artığı burada kapanır
      : yuvarla(setToplami * (agirliklar[i] / agirlikToplam))
    dagitilan = yuvarla(dagitilan + satirToplam)
    const miktar = Number(b.miktar) * setAdedi
    return {
      sku: b.sku,
      ad: b.ad,
      barkod: b.barkod || '',
      miktar,
      // Birim fiyat satır toplamından türetilir; sapma adaptörün (ve RPC'nin)
      // toleransı olan 0,005 × miktar sınırının içinde kalır.
      birim_fiyat: yuvarla(satirToplam / miktar),
      kdv_orani: Number(b.kdv_orani),   // 🔴 bileşenden gelir, setten DEĞİL
      satir_toplam: satirToplam,
      set_adi: setKalemi.ad,
    }
  })
}

module.exports = { setCoz, SetCozmeHatasi }
