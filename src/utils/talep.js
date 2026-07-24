// Bekleyen iptal/iade talebi tanımı — TEK KAYNAK (Panel kartı, Online Siparişler
// bildirim butonu/filtresi ve bildirim geri-taraması aynı tanımı kullanır).
// Yalnız BEKLEYEN talepler: kabul/red (REFUND_REQUEST_ACCEPTED, *_REJECTED) dahil DEĞİL —
// onlar aksiyon gerektirmez, sayıma girerse buton gürültüye döner.
// NOT: backend (electron/db/panel.js SQL, ikas/bildirim-uret.js) aynı iki durumu
// literal olarak tekrarlar; ESM↔CJS köprüsü yok (emsal: yetki mantığı iki dilde).
export const BEKLEYEN_TALEP_DURUMLARI = ['REFUND_REQUESTED', 'CANCEL_REQUESTED']

// Paket henüz oluşmamış demek olan kargo durumları — bilgi taşımazlar.
const PAKET_YOK = ['', 'UNFULFILLED']

// Sipariş FİİLEN iptal/iade talebinde mi?
// Kural: paket durumu (orderPackageStatus) daha güncel gerçeği yansıtır, o kazanır.
// Talep sonuçlanınca ya da sipariş akışta ilerleyince ikas paket durumunu günceller;
// sipariş `status` alanı ise eski değerde takılı kalabilir (canlı örnek: 8971042426
// durum=REFUND_REQUESTED / kargo_durumu=REFUND_REQUEST_ACCEPTED).
// İstisna: paket henüz oluşmamışsa paket durumu bilgi taşımaz → sipariş durumuna
// bakılır. İptal talepleri çoğunlukla bu aşamada gelir.
//
// asama: yerel talep aşaması ({ asama: 'onaylandi'|'kapatildi' }) — ikas'a yazılamayan
// bilgi. 'kapatildi' eler: ikas'ta talep REFUND_REQUESTED olarak kalacağı için eleme
// buradan yapılmazsa her senkron talebi geri diriltir. 'onaylandi' ELEMEZ — ürün
// beklendiği sürece görünür kalmalı.
export function bekleyenTalepMi(siparis, asama = null) {
  if (!siparis) return false
  if (asama?.asama === 'kapatildi') return false
  const paket = siparis.kargo_durumu || ''
  const belirleyici = PAKET_YOK.includes(paket) ? siparis.durum : paket
  return !!belirleyici && BEKLEYEN_TALEP_DURUMLARI.includes(belirleyici)
}

// Onaylanmış ama ürünü henüz gelmemiş talep → listede sarı etiketle ayrılır.
export function urunBekleniyorMu(asama) {
  return asama?.asama === 'onaylandi'
}
