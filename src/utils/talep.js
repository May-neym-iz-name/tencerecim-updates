// Bekleyen iptal/iade talebi tanımı — TEK KAYNAK (Panel kartı, Online Siparişler
// bildirim butonu/filtresi ve bildirim geri-taraması aynı tanımı kullanır).
// Yalnız BEKLEYEN talepler: kabul/red (REFUND_REQUEST_ACCEPTED, *_REJECTED) dahil DEĞİL —
// onlar aksiyon gerektirmez, sayıma girerse buton gürültüye döner.
// NOT: backend (electron/db/panel.js SQL, ikas/bildirim-uret.js) aynı iki durumu
// literal olarak tekrarlar; ESM↔CJS köprüsü yok (emsal: yetki mantığı iki dilde).
export const BEKLEYEN_TALEP_DURUMLARI = ['REFUND_REQUESTED', 'CANCEL_REQUESTED']

// Sipariş bekleyen bir iptal/iade talebi taşıyor mu?
// Talep hem sipariş durumunda (status) hem paket durumunda (orderPackageStatus) gelebilir.
export function bekleyenTalepMi(siparis) {
  if (!siparis) return false
  return [siparis.durum, siparis.kargo_durumu]
    .some(d => d && BEKLEYEN_TALEP_DURUMLARI.includes(d))
}
