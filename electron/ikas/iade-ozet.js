// Online sipariş iadelerinin ÖZETİ — saf fonksiyonlar (DB/ağ yok, test edilebilir).
//
// NEDEN VAR: ikas iade sonrası siparişin TOPLAMINI güncellemiyor (16.626 TL iade
// sonrası da 16.626 TL kalıyor) ve kargo etiketi iade edilen ürünü listelemeye
// devam ediyordu. Kalan tutarı ve gönderilecek kalemleri kendimiz hesaplıyoruz.
// Canlı örnek: #1381506566 — 4 kalemden biri (3.646,50 TL) iade edildi.

// ikas kalem durumu: iade TAMAMLANDI demek. Talep/red aşamaları iade DEĞİLDİR —
// REFUND_REQUESTED henüz onaylanmamış, REFUND_REJECTED reddedilmiş; ikisinde de
// ürün müşteriye gider, etiketten düşerse yanlış kargo çıkar.
const IADE_EDILDI = 'REFUNDED'

// Bir kalemin kaç adedinin iade edildiği.
// ikas kısmi adet iadesinde kalemi böler; kalem durumu REFUNDED ise tamamı iadedir.
function kalemIadeMiktari(kalem) {
  if (!kalem) return 0
  if (String(kalem.status || '') !== IADE_EDILDI) return 0
  return Number(kalem.quantity) || 0
}

// Siparişten GERÇEKTEN geri ödenen para: yalnız başarılı iade işlemleri.
// FAILED olanlar sayılmaz — PayTR başarısız denemeleri de kayıt bırakıyor
// (#1381506566'da 3 FAILED + 1 SUCCESS vardı; sadece SUCCESS para hareketidir).
function iadeToplami(islemler) {
  if (!Array.isArray(islemler)) return 0
  const t = islemler
    .filter(x => x && x.type === 'REFUND' && x.status === 'SUCCESS')
    .reduce((s, x) => s + (Number(x.amount) || 0), 0)
  return Math.round(t * 100) / 100
}

// Kargo etiketinde görünecek kalemler: tamamı iade edilenler düşer, kısmen iade
// edilenlerde kalan adet yazılır. Etiketin işi kutuya ne konacağını söylemek.
function etiketKalemleri(kalemler) {
  if (!Array.isArray(kalemler)) return []
  const out = []
  for (const k of kalemler) {
    const miktar = Number(k?.miktar) || 0
    const iade = Math.min(miktar, Number(k?.iade_miktar) || 0)
    const kalan = miktar - iade
    if (kalan > 0) out.push({ ...k, miktar: kalan })
  }
  return out
}

// Sipariş tutar özeti. iadeTutari ölçülen para hareketidir; yoksa (elle/eski iade)
// kalem fiyatlarından tahmin edilir — tahmin edildiği `tahmini` ile bildirilir ki
// ekranda kesin veriymiş gibi sunulmasın.
function tutarOzeti(siparis, kalemler) {
  const toplam = Number(siparis?.toplam) || 0
  const olculen = Number(siparis?.iade_tutari) || 0
  let iade = olculen
  let tahmini = false
  if (!iade) {
    const hesap = (Array.isArray(kalemler) ? kalemler : []).reduce(
      (s, k) => s + (Number(k?.birim_fiyat) || 0) * (Math.min(Number(k?.miktar) || 0, Number(k?.iade_miktar) || 0)), 0)
    if (hesap > 0) { iade = Math.round(hesap * 100) / 100; tahmini = true }
  }
  const kalan = Math.round((toplam - iade) * 100) / 100
  return { toplam, iade, kalan: kalan > 0 ? kalan : 0, tahmini, iadeVar: iade > 0 }
}

module.exports = { IADE_EDILDI, kalemIadeMiktari, iadeToplami, etiketKalemleri, tutarOzeti }
