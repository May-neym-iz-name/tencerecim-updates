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

// --- hedefli stok yazma (otomatik eşitleme için) ---------------------------

const VARYANT_SORGU = `query V($sku:StringFilterInput){ listProduct(variants:{sku:$sku}){
  data { id name variants { id sku stocks { stockLocationId stockCount } } } } }`

// Tek bir SKU'nun ikas kaydını bulur: ürün/varyant kimliği + lokasyon bazında stok.
async function varyantBul(sku) {
  const s = String(sku || '').trim()
  if (!s) return null
  const r = await graphql(VARYANT_SORGU, { sku: { eq: s } })
  for (const u of r?.listProduct?.data || []) {
    for (const v of u.variants || []) {
      if (String(v.sku || '').trim().toUpperCase() === s.toUpperCase()) {
        return {
          productId: u.id, variantId: v.id, ad: u.name || null,
          stoklar: (v.stocks || []).map(x => ({
            stockLocationId: x.stockLocationId,
            stockCount: Math.trunc(Number(x.stockCount) || 0),
          })),
        }
      }
    }
  }
  return null
}

/**
 * Bir SKU'nun ikas'taki TOPLAM stoğunu hedeflenen sayıya çeker.
 *
 * ikas stoğu lokasyon bazındadır, bizim hedefimiz toplamdır → farkı dağıtmak gerekir:
 *  · Azaltırken EN ÇOK stoğu olan lokasyondan başlanır ve hiçbir lokasyon EKSİYE
 *    düşürülmez (ikas eksi stoğu kabul etse bile sayım gerçeğiyle çelişir).
 *  · Artırırken fark ilk lokasyona eklenir — hangi rafa girdiğini bilmiyoruz,
 *    toplam doğru olsun yeter.
 *
 * Fiyata DOKUNULMAZ (bkz. CLAUDE.md "Fiyat"): yalnız saveProductStockLocations.
 */
async function stokAyarla(sku, yeniToplam) {
  const v = await varyantBul(sku)
  if (!v) throw new Error(`ikas'ta ${sku} bulunamadı.`)
  if (!v.stoklar.length) throw new Error(`${sku} için ikas stok lokasyonu yok.`)

  const eskiToplam = v.stoklar.reduce((t, x) => t + x.stockCount, 0)
  const hedef = Math.max(0, Math.trunc(Number(yeniToplam) || 0))
  let fark = hedef - eskiToplam
  if (fark === 0) return { sku, eskiToplam, yeniToplam: hedef, degisen: 0 }

  const yeni = v.stoklar.map(x => ({ ...x }))
  if (fark < 0) {
    // En dolu lokasyondan başla; hiçbirini eksiye düşürme.
    yeni.sort((a, b) => b.stockCount - a.stockCount)
    for (const l of yeni) {
      if (fark >= 0) break
      const dus = Math.min(l.stockCount, -fark)
      l.stockCount -= dus
      fark += dus
    }
  } else {
    yeni[0].stockCount += fark
    fark = 0
  }

  const degisenler = yeni.filter((l, i) => {
    const eski = v.stoklar.find(x => x.stockLocationId === l.stockLocationId)
    return !eski || eski.stockCount !== l.stockCount
  })
  if (!degisenler.length) return { sku, eskiToplam, yeniToplam: hedef, degisen: 0 }

  await graphql(
    `mutation P($input: SaveStockLocationsInput!){ saveProductStockLocations(input: $input) }`,
    { input: { productStockLocationInputs: degisenler.map(l => ({
      productId: v.productId, variantId: v.variantId,
      stockLocationId: l.stockLocationId, stockCount: l.stockCount,
    })) } },
  )
  return { sku, ad: v.ad, eskiToplam, yeniToplam: hedef, degisen: degisenler.length }
}

module.exports.varyantBul = varyantBul
module.exports.stokAyarla = stokAyarla
