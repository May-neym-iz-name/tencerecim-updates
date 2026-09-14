// Trendyol paket tutar özeti — SAF fonksiyon (ağ yok, DB yok, React yok) → testlenebilir.
//
// Neden ayrı modül: ikas tarafında tutar hesabı ekranın içine gömülüydü ve iade sonrası
// yanlış rakam gösteriyordu (bkz. utils/iade.js). Aynı hatayı Trendyol'da baştan
// yapmamak için hesap ekrandan AYRI ve testli tutuluyor.
//
// 🔴 birim_fiyat BİRİM fiyattır — miktara BÖLÜNMEZ, ÇARPILIR.
//    (lineUnitPrice / lineGrossAmount / discountDetails[].lineItemPrice ÜÇÜ DE birimdir.)
//
// 🔴 birim_indirim BİLEREK KULLANILMIYOR. Kaynağı `lineTotalDiscount` (satır toplamı gibi
//    okunuyor) ama sütun adı "birim". İkisi aynı şey değil ve hangisi olduğu CANLI VERİYLE
//    ÖLÇÜLMEDİ. Ölçülmemiş bir alanı para aritmetiğine sokmak, düzeltmekten daha pahalı bir
//    hata sınıfıdır. Ölçüldüğünde burası tek noktadan güncellenir.

// Kalemi artık "satılmış" saymayan statüler — tutardan DÜŞÜLÜR.
// UnDelivered (teslim edilemedi) BİLEREK YOK: koli geri dönerken hâlâ satıştır,
// iadeye dönerse statü Returned olur ve o zaman düşer.
const DUSEN_KALEM_DURUMLARI = new Set(['Cancelled', 'Returned', 'UnSupplied'])

function sayi(d) {
  const n = Number(d)
  return Number.isFinite(n) ? n : 0
}

/** Kalem satıştan düştü mü (iptal / iade / tedarik edilemedi)? */
export function kalemDustuMu(kalem) {
  return DUSEN_KALEM_DURUMLARI.has(kalem?.kalem_durum)
}

/** Kalemin satır toplamı: BİRİM fiyat × miktar. */
export function kalemToplami(kalem) {
  return sayi(kalem?.birim_fiyat) * sayi(kalem?.miktar)
}

/**
 * Paketin tutar özeti.
 *
 * Kalem listesi yoksa (liste ekranında kalemler çekilmez) pakette duran `toplam`
 * kullanılır ve `dusenVar: false` döner — yani "düşen yok" DEĞİL, "bilinmiyor" demektir;
 * ekran bu durumda indirimli/üstü çizili gösterim yapmaz.
 *
 * @returns {{toplam:number, dusen:number, kalan:number, dusenVar:boolean, kalemlerden:boolean}}
 */
export function tutarOzeti(siparis, kalemler) {
  const liste = Array.isArray(kalemler) ? kalemler : null
  if (!liste || !liste.length) {
    const t = sayi(siparis?.toplam)
    return { toplam: t, dusen: 0, kalan: t, dusenVar: false, kalemlerden: false }
  }
  let toplam = 0
  let dusen = 0
  for (const k of liste) {
    const satir = kalemToplami(k)
    toplam += satir
    if (kalemDustuMu(k)) dusen += satir
  }
  return {
    toplam,
    dusen,
    kalan: toplam - dusen,
    dusenVar: dusen > 0,
    kalemlerden: true,
  }
}
