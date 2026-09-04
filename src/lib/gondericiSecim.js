// Kargo formundaki "Gönderici Mağaza" seçiminin kuralları — saf mantık (test edilebilir).
//
// Eskiden listenin başında "Varsayılan (Ayarlar'daki gönderici)" seçeneği vardı ve form
// HEP onunla açılıyordu. İki mağazanın da gönderici adresi tanımlıyken bu, sessizce
// Ayarlar > UPS'teki global adresi kullanmak demekti: personel Gölcük'ten gönderirken
// paket Pendik adresiyle çıkabiliyordu. Yeni kural (kullanıcı, 04.09.2026):
//   - tek mağazanın adresi tanımlıysa → o mağaza doğrudan seçili gelir,
//   - ikisi de tanımlıysa → varsayılan YOK, seçim ZORUNLU,
//   - hiçbiri tanımlı değilse → seçici gösterilmez, global adrese düşülür (eski davranış).

// Bir mağazanın gönderici adresi "tanımlı" sayılır mı? UPS'in zorunlu tuttuğu dört alan
// (electron/ups/kargo.js gondericiKontrol) SATIRIN KENDİSİNDE dolu olmalı — eksikse
// global ayara düşer, yani o mağaza gerçekte tanımlı değildir.
export function gondericiTanimliMi(satir) {
  if (!satir) return false
  const dolu = (v) => v != null && String(v).trim() !== ''
  return dolu(satir.ad) && dolu(satir.adres) && dolu(satir.il_kodu) && dolu(satir.ilce_kodu)
}

/**
 * Seçilebilecek mağazalar: gönderici adresi TANIMLI olanlar.
 * @param {Array<{id: number, ad: string, aktif?: number}>} magazalar lokasyonlar tablosu
 * @param {Object} gondericiler { lokasyon_id: satır } ('lokasyon-gonderici:getir' çıktısı)
 */
export function gondericiSecenekleri(magazalar, gondericiler) {
  const g = gondericiler || {}
  return (magazalar || [])
    .filter(m => m && m.aktif !== 0)
    .filter(m => gondericiTanimliMi(g[m.id]))
    .map(m => ({ id: m.id, ad: m.ad }))
}

/**
 * Form açılırken seçili gelecek mağaza.
 * Tek seçenek varsa O; birden çoksa null (kullanıcı seçmek ZORUNDA).
 * Çağıran bir değer geçirdiyse (ör. siparişin çıkış mağazası) ve o hâlâ geçerliyse korunur.
 */
export function baslangicGondericiId(secenekler, mevcut) {
  const liste = secenekler || []
  if (mevcut && liste.some(s => s.id === Number(mevcut))) return Number(mevcut)
  return liste.length === 1 ? liste[0].id : null
}
