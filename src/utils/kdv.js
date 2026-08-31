// KDV hesabı — alış fiyatının ekranda KDV DAHİL gösterimi için.
//
// KARAR (31.08.2026, kullanıcı): `urunler.alis_fiyati` alanında KDV HARİÇ
// değer tutulur (muhasebe ve marj hesabının standardı), ama kullanıcı her
// yerde KDV dahil karşılığını da görmek ister. Ayrı kolon açılmaz; dahil
// değer ürünün kendi `kdv_orani` ile türetilir — böylece KDV oranı
// değiştiğinde iki alan birbirinden kopamaz.

export const VARSAYILAN_KDV = 20

/**
 * KDV hariç tutarı, KDV dahil tutara çevirir.
 * @param {number|string|null|undefined} haric KDV hariç tutar
 * @param {number|string|null|undefined} oran KDV oranı (%). Boşsa 20 kabul edilir.
 * @returns {number|null} KDV dahil tutar (2 haneye yuvarlı); geçersiz girdide null
 */
export function kdvDahil(haric, oran = VARSAYILAN_KDV) {
  const h = Number(haric)
  if (!Number.isFinite(h) || h <= 0) return null
  // Oran 0 GEÇERLİ bir değerdir (istisna ürünler) ama BOŞ değer 0 sayılmamalı:
  // Number(null) === 0 olduğu için boş oran sessizce "KDV yok"a dönüşür ve
  // maliyet olduğundan düşük görünürdü. Boş/geçersizde varsayılana düşeriz.
  const bos = oran === null || oran === undefined || oran === ''
  const o = Number(oran)
  const kdv = !bos && Number.isFinite(o) && o >= 0 ? o : VARSAYILAN_KDV
  return +(h * (1 + kdv / 100)).toFixed(2)
}

/**
 * Ekranda gösterilecek "₺1.234,56" biçimi. Boş/geçersiz değerde '—'.
 * @param {number|null} tutar
 * @returns {string}
 */
export function paraYaz(tutar) {
  if (tutar == null || !Number.isFinite(Number(tutar))) return '—'
  return '₺' + Number(tutar).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
