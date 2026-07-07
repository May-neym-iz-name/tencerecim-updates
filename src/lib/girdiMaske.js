// Girdi maskeleri: telefon / TC kimlik / vergi no — sabit uzunluk kısıtları.
// İlke: DEPOLAMA HAM RAKAM (LIKE aramaları ve whatsappLink bozulmasın),
// GÖRÜNTÜ maskeli. Boş değer her alanda geçerlidir (alanlar opsiyonel);
// doluysa tam uzunluk şartı kayıt sırasında denetlenir.

// Ham telefon: yalnız rakam; +90 / 0 önekleri atılır; en fazla 10 hane (5xx...).
export function telefonHam(v) {
  let r = String(v || '').replace(/\D/g, '')
  if (r.startsWith('90') && r.length > 10) r = r.slice(2) // +90'lı yapıştırma
  if (r.startsWith('0')) r = r.slice(1)                    // baştaki 0
  return r.slice(0, 10)
}

// Görüntü: (553) 863 86 57 — yazarken kademeli tamamlanır.
export function telefonGoster(v) {
  const r = telefonHam(v)
  if (!r) return ''
  let s = '(' + r.slice(0, 3)
  if (r.length >= 3) s += ')'
  if (r.length > 3) s += ' ' + r.slice(3, 6)
  if (r.length > 6) s += ' ' + r.slice(6, 8)
  if (r.length > 8) s += ' ' + r.slice(8, 10)
  return s
}

export const sadeceRakam = (v, max) => String(v || '').replace(/\D/g, '').slice(0, max)

// --- Kayıt öncesi denetimler: hata metni ya da null döner ---

export function telefonHatasi(v, etiket = 'Telefon') {
  const r = telefonHam(v)
  return r && r.length !== 10 ? `${etiket} 10 haneli olmalı: (5xx) xxx xx xx` : null
}

// Resmî TC kimlik algoritması: 11 hane, 0 ile başlamaz, 10. ve 11. hane sağlaması.
export function tcHatasi(v) {
  const r = String(v || '')
  if (!r) return null
  if (!/^[1-9]\d{10}$/.test(r)) return 'TC kimlik 11 haneli olmalı (0 ile başlayamaz)'
  const d = [...r].map(Number)
  const h10 = (((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10 + 10) % 10
  const h11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10
  if (h10 !== d[9] || h11 !== d[10]) return 'Geçersiz TC kimlik numarası (sağlama tutmuyor)'
  return null
}

export function vergiHatasi(v) {
  const r = String(v || '')
  return r && !/^\d{10}$/.test(r) ? 'Vergi numarası 10 haneli olmalı' : null
}
