// Satış tutar hesaplaması — veritabanından bağımsız SAF mantık (test edilebilir).
// KDV, Türk perakende standardına göre fiyata DAHİL kabul edilir; net tutar
// (ara toplam) KDV-hariç olarak fiyattan ayrıştırılır.

/** @param {number} n */
function yuvarla(n) {
  return Math.round(n * 100) / 100
}

/**
 * Tek bir satış kalemini hesaplar.
 * @param {{ miktar: number, birim_fiyat: number, kdv_orani: number, iskonto_orani?: number }} kalem
 * @param {number} genelIskonto - Tüm satışa uygulanan genel iskonto oranı (%)
 */
function kalemHesapla(kalem, genelIskonto = 0) {
  const miktar = Number(kalem.miktar)
  const birimFiyat = Number(kalem.birim_fiyat)
  const kdvOrani = Number(kalem.kdv_orani)

  if (!Number.isFinite(miktar) || miktar <= 0) throw new Error('Geçersiz miktar')
  if (!Number.isFinite(birimFiyat) || birimFiyat < 0) throw new Error('Geçersiz birim fiyat')

  // Kalem bazlı iskonto ile genel iskontonun büyüğü uygulanır
  const iskonto = Math.max(Number(kalem.iskonto_orani) || 0, Number(genelIskonto) || 0)
  const iskontoluFiyat = birimFiyat * (1 - iskonto / 100)
  const toplamBrut = birimFiyat * miktar
  const toplamIskontolu = iskontoluFiyat * miktar
  const kdv = toplamIskontolu * kdvOrani / (100 + kdvOrani)

  return {
    iskonto,
    birimFiyat,
    net: toplamIskontolu - kdv,        // KDV hariç tutar
    iskontoTutari: toplamBrut - toplamIskontolu,
    kdv,
    toplam: toplamIskontolu,            // KDV dahil tutar
  }
}

/**
 * Tüm satışın toplamlarını hesaplar.
 * @param {Array} kalemler
 * @param {number} genelIskonto
 */
function satisHesapla(kalemler, genelIskonto = 0) {
  if (!Array.isArray(kalemler) || kalemler.length === 0) {
    throw new Error('Satış en az bir kalem içermelidir')
  }

  let araToplam = 0, iskontoToplam = 0, kdvToplam = 0, genelToplam = 0
  const kalemSonuc = []

  for (const kalem of kalemler) {
    const h = kalemHesapla(kalem, genelIskonto)
    araToplam += h.net
    iskontoToplam += h.iskontoTutari
    kdvToplam += h.kdv
    genelToplam += h.toplam
    kalemSonuc.push(h)
  }

  return {
    araToplam: yuvarla(araToplam),
    iskontoToplam: yuvarla(iskontoToplam),
    kdvToplam: yuvarla(kdvToplam),
    genelToplam: yuvarla(genelToplam),
    kalemSonuc,
  }
}

module.exports = { satisHesapla, kalemHesapla, yuvarla }
