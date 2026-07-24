// Bekleyen iptal/iade talebi tanımı — TEK KAYNAK (Panel kartı, Online Siparişler
// bildirim butonu/filtresi ve bildirim geri-taraması aynı tanımı kullanır).
// Yalnız BEKLEYEN talepler: kabul/red (REFUND_REQUEST_ACCEPTED, *_REJECTED) dahil DEĞİL —
// onlar aksiyon gerektirmez, sayıma girerse buton gürültüye döner.
// NOT: backend (electron/db/panel.js SQL, ikas/bildirim-uret.js) aynı iki durumu
// literal olarak tekrarlar; ESM↔CJS köprüsü yok (emsal: yetki mantığı iki dilde).
export const BEKLEYEN_TALEP_DURUMLARI = ['REFUND_REQUESTED', 'CANCEL_REQUESTED']

// Talebin SONUÇLANDIĞINI gösteren durumlar. İkas'ta sipariş `status` alanı talepte
// takılı kalırken paket durumu çözüme geçebiliyor (canlı örnek: 8971042426 —
// durum=REFUND_REQUESTED, kargo_durumu=REFUND_REQUEST_ACCEPTED). Bu yüzden salt
// "iki alandan biri talepte" kuralı çözülmüş talepleri de bekleyen sayıyordu.
export const COZULMUS_TALEP_DURUMLARI = [
  'REFUND_REQUEST_ACCEPTED', 'REFUND_REJECTED', 'CANCEL_REJECTED', 'REFUNDED', 'CANCELLED',
]

// Sipariş bekleyen bir iptal/iade talebi taşıyor mu?
// Kural: alanlardan biri talep gösterecek VE hiçbiri çözüm göstermeyecek.
// Çözüm işareti yoksa talep — ne kadar eski olursa olsun — bekliyor sayılır.
export function bekleyenTalepMi(siparis) {
  if (!siparis) return false
  const durumlar = [siparis.durum, siparis.kargo_durumu].filter(Boolean)
  if (durumlar.some(d => COZULMUS_TALEP_DURUMLARI.includes(d))) return false
  return durumlar.some(d => BEKLEYEN_TALEP_DURUMLARI.includes(d))
}
