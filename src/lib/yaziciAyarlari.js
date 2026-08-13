// Cihaza özel yazıcı ayarları — TEK yerden (Ayarlar > 🖨️ Yazıcılar) yönetilir.
// Bilerek localStorage'da ve buluta senkronsuz: her PC'nin yazıcısı/etiket rulosu
// farklıdır, bir PC'nin yazıcı adı diğerine taşınırsa baskı bozulur.
// Barkod anahtarları BarkodModal'ın eski anahtarlarıyla AYNI — mevcut kurulumlarda
// seçili yazıcı/boyut kaybolmaz.

export const BARKOD_YAZICI_KEY = 'barkod_yazici'
export const BARKOD_BOYUT_KEY = 'barkod_etiket_boyut'
export const KARGO_YAZICI_KEY = 'kargo_etiket_yazici'
// Kargo sayfası bu anahtarı eskiden usePersistentState ile yazıyordu → değer JSON'dur ("1").
export const KARGO_SAYFA_KEY = 'kargo_etiket_sayfa_basina'
export const KARGO_OLCU_KEY = 'kargo_etiket_olcu' // "100x150" biçiminde, mm
export const FIS_YAZICI_KEY = 'fis_yazici'
export const FIS_GENISLIK_KEY = 'fis_genislik' // rulo genişliği mm: "80" | "58"

// Fiş rulosu genişliği (mm). Yaygın iki termal rulo: 80mm (varsayılan) ve 58mm.
export function fisGenisligiOku() {
  const n = Number(yaziciAyarOku(FIS_GENISLIK_KEY, '80'))
  return [58, 80].includes(n) ? n : 80
}

// Kargo termal etiket ölçüsü. UPS kuralı gereği varsayılan 100×150mm; farklı rulo
// kullanan yazıcılar için Ayarlar'dan değiştirilir. Bozuk değerde varsayılana döner.
export function kargoOlcuOku() {
  const e = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/.exec(yaziciAyarOku(KARGO_OLCU_KEY, '100x150').trim())
  if (e) {
    const g = Number(e[1]); const y = Number(e[2])
    if (g >= 50 && g <= 300 && y >= 50 && y <= 300) return { genislikMm: g, yukseklikMm: y }
  }
  return { genislikMm: 100, yukseklikMm: 150 }
}

export function yaziciAyarOku(key, varsayilan = '') {
  try { return localStorage.getItem(key) || varsayilan } catch { return varsayilan }
}

export function yaziciAyarYaz(key, deger) {
  try {
    if (deger) localStorage.setItem(key, deger)
    else localStorage.removeItem(key)
  } catch { /* kota/erişim hatası — yok say */ }
}

// Sayfa başına kargo etiketi (1|2|4). JSON sayı olarak saklanır (usePersistentState mirası).
export function kargoSayfaBasinaOku() {
  try {
    const n = Number(JSON.parse(localStorage.getItem(KARGO_SAYFA_KEY)))
    return [1, 2, 4].includes(n) ? n : 1
  } catch { return 1 }
}

export function kargoSayfaBasinaYaz(n) {
  try { localStorage.setItem(KARGO_SAYFA_KEY, JSON.stringify(Number(n) || 1)) } catch { /* yok say */ }
}
