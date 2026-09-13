// ikas varyantlarının barkod + stok fotoğrafı (kanal senkronu için).
//
// Sorgu CANLIDA DOĞRULANMIŞTIR (13.09.2026, 424 varyant, 5 sayfa): variant.barcodeList
// ve variant.stocks{stockLocationId,stockCount} alanları çalışıyor.
//
// Neden ikas/index.js'e değil ayrı dosyaya: index.js 827 satır ve bu iş bağımsız —
// yeni kanal eklendiğinde de burası büyümez.
const { graphql } = require('./client')

const SORGU = `query K($p:Int!){ listProduct(pagination:{page:$p,limit:100}){
  count hasNext data { id name
    variants { id sku isActive barcodeList stocks { stockLocationId stockCount } } } } }`

/**
 * Tüm ikas varyantlarını SKU bazında döndürür.
 * @param stokLokasyonId  verilirse YALNIZ o lokasyonun stoğu sayılır; verilmezse
 *                        tüm lokasyonların toplamı alınır (ikas'ta satılabilir olan budur).
 * @returns [{ sku, barkod, miktar, ad }] — eşleşme SKU ile, yazma barkod ile.
 */
async function ikasStokOku({ stokLokasyonId = null, ilerleme } = {}) {
  const satirlar = []
  for (let sayfa = 1; ; sayfa++) {
    const r = await graphql(SORGU, { p: sayfa })
    const d = r?.listProduct
    for (const u of d?.data || []) {
      for (const v of u.variants || []) {
        if (v.isActive === false) continue
        // SKU eşleşme anahtarıdır. Barkodsuz ürünler (ör. Sofram Nesta varyantlarının
        // 8'i) barkod eşleşmesinde tamamen ıskalanıyordu; SKU ile yakalanırlar.
        // barcodeList çoklu olabilir (bkz. hafıza: çoklu barkod) — İLKİ ana barkoddur
        // ve yalnız Trendyol'a YAZARKEN kullanılır.
        const sku = String(v.sku || '').trim()
        if (!sku) continue
        const barkod = (v.barcodeList || []).map(b => String(b || '').trim()).find(Boolean) || null
        const stoklar = v.stocks || []
        const miktar = stokLokasyonId
          ? (stoklar.find(s => s.stockLocationId === stokLokasyonId)?.stockCount ?? 0)
          : stoklar.reduce((t, s) => t + (Number(s.stockCount) || 0), 0)
        satirlar.push({
          sku, barkod,
          miktar: Math.max(0, Math.trunc(Number(miktar) || 0)),
          ad: u.name || null,
        })
      }
    }
    if (typeof ilerleme === 'function') ilerleme(satirlar.length, d?.count ?? null)
    if (!d?.hasNext) break
    if (sayfa > 200) break // güvenlik freni
  }
  return satirlar
}

module.exports = { ikasStokOku }
