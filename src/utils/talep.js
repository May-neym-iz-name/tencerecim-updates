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
export function bekleyenTalepMi(siparis) {
  if (!siparis) return false
  const paket = siparis.kargo_durumu || ''
  const belirleyici = PAKET_YOK.includes(paket) ? siparis.durum : paket
  return !!belirleyici && BEKLEYEN_TALEP_DURUMLARI.includes(belirleyici)
}
