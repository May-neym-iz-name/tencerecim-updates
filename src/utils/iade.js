// Online sipariş iade özeti — ARAYÜZ tarafı (ESM).
// İKİZİ: electron/ikas/iade-ozet.js (CJS). ESM↔CJS köprüsü yok, proje deseni gereği
// mantık iki yerde tekrarlanıyor (emsal: talep.js ↔ bildirim-uret.js).
// Buradaki tutarOzeti, oradakinin birebir aynısıdır — biri değişirse diğeri de değişmeli.

// Sipariş tutar özeti.
// iade_tutari = ikas'tan okunan GERÇEK para hareketi (başarılı iade işlemleri).
// Yoksa (eski kayıt / elle iade) kalem fiyatlarından tahmin edilir; `tahmini` ile
// bildirilir ki ekranda kesin veriymiş gibi gösterilmesin.
export function tutarOzeti(siparis, kalemler) {
  const toplam = Number(siparis?.toplam) || 0
  let iade = Number(siparis?.iade_tutari) || 0
  let tahmini = false
  if (!iade) {
    const hesap = (Array.isArray(kalemler) ? kalemler : []).reduce(
      (s, k) => s + (Number(k?.birim_fiyat) || 0) * Math.min(Number(k?.miktar) || 0, Number(k?.iade_miktar) || 0), 0)
    if (hesap > 0) { iade = Math.round(hesap * 100) / 100; tahmini = true }
  }
  const kalan = Math.round((toplam - iade) * 100) / 100
  return { toplam, iade, kalan: kalan > 0 ? kalan : 0, tahmini, iadeVar: iade > 0 }
}

// Kalemin tamamı mı iade edildi, bir kısmı mı? (rozet metni için)
export function kalemIadeDurumu(kalem) {
  const miktar = Number(kalem?.miktar) || 0
  const iade = Math.min(miktar, Number(kalem?.iade_miktar) || 0)
  if (iade <= 0) return null
  return iade >= miktar ? { tam: true, iade } : { tam: false, iade }
}
