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
