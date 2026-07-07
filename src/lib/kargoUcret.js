// UPS yurt içi gönderi ücreti TAHMİNİ hesaplayıcı — 2026-FLASH sözleşme tarifesi.
// Kaynak: "UPS GÖNDERİ HESAPLAMA/2026-FLASH.xlsx" + "2026 EK ÜCRETLER YURT İÇİ.pdf".
// FLASH tarifesi PARÇA BAŞI ve tüm bölgelerde AYNI (Şehiriçi–4. Bölge fark yok).
// Fiyatlara dahil edilmesi gerekenler: Yakıt Ek Ücreti (haftalık %, UPS sitesinden),
// Evrensel Hizmet Bedeli %2,35 (navlun üzerine), KDV %20 (hepsinin üzerine).
// Ücret, gerçek kg ile hacimsel desi'den (UxGxY/3000) YÜKSEK olana göre kesilir;
// kesirli değer bir üst bareme yuvarlanır. Fiyatlar 30 Haziran 2026'ya kadar geçerli.

// [alt, üst, parça başı TL (KDV ve yakıt hariç)]
export const FLASH_BAREMLER = [
  [1, 5, 93.31],
  [6, 10, 108.50],
  [11, 15, 130.20],
  [16, 25, 151.90],
  [26, 30, 173.60],
  [31, 40, 217.00],
  [41, 50, 271.25],
]
export const ARTAN_DESI_TL = 7.60      // 50 desi üstü: 50 baremi + artan desi × 7,60
export const EHB_ORANI = 0.0235        // Evrensel Hizmet Bedeli (6475 sayılı kanun)
export const KDV_ORANI = 0.20
export const KONUT_TESLIMAT_TL = 37.75 // konut adresine teslim ek ücreti (KDV hariç)
export const BUYUK_PAKET_TL = 298.90   // 70 kg+ / 160 cm+ paket başına (KDV hariç)

// Tek parçanın navlunu (KDV/yakıt hariç). Desi kesirliyse üste yuvarlanır.
export function parcaNavlun(desi) {
  const d = Math.max(1, Math.ceil(Number(desi) || 0))
  for (const [alt, ust, tl] of FLASH_BAREMLER) {
    if (d >= alt && d <= ust) return tl
  }
  // 50+ : son barem + artan desi
  return 271.25 + (d - 50) * ARTAN_DESI_TL
}

// Gönderi toplam tahmini. desi = gönderinin faturalanabilir toplam desi/kg değeri
// (yüksek olan); koli > 1 ise parça başına eşit bölünmüş varsayılır (UPS her
// parçayı ayrı faturalar). yakitOrani: % (örn. 16.5). konut: konut adresi mi.
export function ucretHesapla({ desi, koli = 1, yakitOrani = 0, konut = true, buyukPaket = false }) {
  const k = Math.max(1, parseInt(koli, 10) || 1)
  const parcaDesi = Math.max(1, Math.ceil((Number(desi) || 0) / k))
  const navlun = parcaNavlun(parcaDesi) * k
  const yakit = navlun * (Number(yakitOrani) || 0) / 100
  const ehb = navlun * EHB_ORANI
  const ekler = (konut ? KONUT_TESLIMAT_TL : 0) + (buyukPaket ? BUYUK_PAKET_TL * k : 0)
  const araToplam = navlun + yakit + ehb + ekler
  const kdv = araToplam * KDV_ORANI
  return {
    navlun: +navlun.toFixed(2),
    yakit: +yakit.toFixed(2),
    ehb: +ehb.toFixed(2),
    ekler: +ekler.toFixed(2),
    kdv: +kdv.toFixed(2),
    toplam: +(araToplam + kdv).toFixed(2),
  }
}

export const tl = (v) => (Number(v) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺'

// Hacimsel ağırlık (desi) = U × G × Y / 3000 (cm).
export const desiHesapla = (u, g, y) => (Number(u) || 0) * (Number(g) || 0) * (Number(y) || 0) / 3000

// UPS il → [bölge, teslim süresi] tablosu (yurtçi bölge tablosu.pdf, İstanbul çıkışlı).
// Anahtar = UPS şehir kodu (plaka). FLASH tarifesinde fiyat bölgeye göre DEĞİŞMEZ —
// bölge yalnızca bilgi (teslim süresi + uzak bölge farkındalığı) için gösterilir.
export const IL_BOLGE = {
  1: ['3. Bölge', '2 gün'], 2: ['4. Bölge', '2 gün'], 3: ['2. Bölge', '1 gün'], 4: ['4. Bölge', '3 gün'],
  5: ['3. Bölge', '2 gün'], 6: ['2. Bölge', '1 gün'], 7: ['3. Bölge', '2 gün'], 8: ['4. Bölge', '2 gün'],
  9: ['3. Bölge', '2 gün'], 10: ['2. Bölge', '1 gün'], 11: ['2. Bölge', '1 gün'], 12: ['4. Bölge', '2 gün'],
  13: ['4. Bölge', '3 gün'], 14: ['2. Bölge', '1 gün'], 15: ['3. Bölge', '1 gün'], 16: ['2. Bölge', '1 gün'],
  17: ['2. Bölge', '1 gün'], 18: ['2. Bölge', '1 gün'], 19: ['3. Bölge', '2 gün'], 20: ['3. Bölge', '2 gün'],
  21: ['4. Bölge', '2 gün'], 22: ['2. Bölge', '1 gün'], 23: ['4. Bölge', '2 gün'], 24: ['4. Bölge', '2 gün'],
  25: ['4. Bölge', '2 gün'], 26: ['2. Bölge', '1 gün'], 27: ['4. Bölge', '2 gün'], 28: ['3. Bölge', '2 gün'],
  29: ['4. Bölge', '3 gün'], 30: ['4. Bölge', '4 gün'], 31: ['4. Bölge', '2 gün'], 32: ['3. Bölge', '1 gün'],
  33: ['3. Bölge', '2 gün'], 34: ['Şehiriçi', '1 gün'], 35: ['2. Bölge', '1 gün'], 36: ['4. Bölge', '3 gün'],
  37: ['2. Bölge', '2 gün'], 38: ['3. Bölge', '2 gün'], 39: ['2. Bölge', '1 gün'], 40: ['3. Bölge', '1 gün'],
  41: ['1. Bölge', '1 gün'], 42: ['3. Bölge', '2 gün'], 43: ['2. Bölge', '1 gün'], 44: ['4. Bölge', '2 gün'],
  45: ['2. Bölge', '1 gün'], 46: ['4. Bölge', '2 gün'], 47: ['4. Bölge', '2 gün'], 48: ['3. Bölge', '2 gün'],
  49: ['4. Bölge', '3 gün'], 50: ['3. Bölge', '2 gün'], 51: ['3. Bölge', '2 gün'], 52: ['3. Bölge', '2 gün'],
  53: ['4. Bölge', '2 gün'], 54: ['1. Bölge', '1 gün'], 55: ['3. Bölge', '2 gün'], 56: ['4. Bölge', '3 gün'],
  57: ['3. Bölge', '2 gün'], 58: ['3. Bölge', '2 gün'], 59: ['1. Bölge', '1 gün'], 60: ['3. Bölge', '2 gün'],
  61: ['4. Bölge', '2 gün'], 62: ['4. Bölge', '3 gün'], 63: ['4. Bölge', '2 gün'], 64: ['2. Bölge', '1 gün'],
  65: ['4. Bölge', '3 gün'], 66: ['3. Bölge', '2 gün'], 67: ['2. Bölge', '1 gün'], 68: ['3. Bölge', '2 gün'],
  69: ['4. Bölge', '3 gün'], 70: ['3. Bölge', '2 gün'], 71: ['2. Bölge', '1 gün'], 72: ['4. Bölge', '2 gün'],
  73: ['4. Bölge', '3 gün'], 74: ['2. Bölge', '1 gün'], 75: ['4. Bölge', '3 gün'], 76: ['4. Bölge', '3 gün'],
  77: ['1. Bölge', '1 gün'], 78: ['2. Bölge', '1 gün'], 79: ['4. Bölge', '2 gün'], 80: ['4. Bölge', '2 gün'],
  81: ['2. Bölge', '1 gün'],
}
