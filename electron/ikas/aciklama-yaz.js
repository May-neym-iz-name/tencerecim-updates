// GÜVENLİ ÜRÜN AÇIKLAMASI YAZMA (ikas)
//
// Yöntem (kanıtlanmış: URUN-ESLESTIRME/a-grubu-sku-yaz):
//   oku → SADECE description'ı değiştir → TÜM alanları AYNEN geri yaz (saveProduct)
//   → geri oku → görsel/fiyat kaybı doğrula → iskelet (description hariç) karşılaştır.
// saveProduct gönderilmeyen alanı siler; bu yüzden tam-alan echo ZORUNLU.
// Yazmadan önce eski açıklama aciklama_yedek tablosuna yazılır (geri alma).

const GORSEL = require('./gorsel-guvence')

const ALANLAR = `
  id name type description shortDescription weight vendorId googleTaxonomyId maxQuantityPerCart
  brand { id name } categories { id name } salesChannels { id status } tags { id name }
  metaData { id pageTitle description slug }
  productVariantTypes { variantTypeId order variantValueIds }
  variants { id sku isActive barcodeList weight
    prices { priceListId sellPrice buyPrice currency discountPrice }
    images { imageId isMain order isVideo }
    variantValueIds { variantTypeId variantValueId } }
`

async function okuId(gql, id) {
  for (let d = 1; d <= 4; d++) {
    try {
      const r = await gql(`query($f:StringFilterInput){ listProduct(id:$f,pagination:{page:1,limit:1}){ data { ${ALANLAR} } } }`, { f: { eq: id } })
      if (r?.listProduct?.data?.[0]) return r.listProduct.data[0]
    } catch (e) { if (d === 4) throw e }
    await new Promise((r) => setTimeout(r, 500 * d))
  }
  throw new Error('ikas ürünü okunamadı: ' + id)
}

// Tam-alan echo; SADECE description değişir.
function girdi(u, yeniAciklama) {
  return {
    id: u.id, name: u.name, type: u.type,
    vendorId: u.vendorId || undefined,
    description: yeniAciklama,
    shortDescription: u.shortDescription,
    weight: u.weight ?? undefined,
    googleTaxonomyId: u.googleTaxonomyId ?? undefined,
    maxQuantityPerCart: u.maxQuantityPerCart ?? undefined,
    brandId: u.brand?.id ?? undefined,
    categoryIds: (u.categories || []).map((c) => c.id),
    salesChannels: (u.salesChannels || []).map((s) => ({ id: s.id, status: s.status })),
    tagIds: (u.tags || []).map((g) => g.id),
    metaData: u.metaData?.slug ? {
      id: u.metaData.id, slug: u.metaData.slug,
      pageTitle: u.metaData.pageTitle, description: u.metaData.description,
    } : undefined,
    productVariantTypes: u.productVariantTypes || [],
    variants: (u.variants || []).map((v) => ({
      id: v.id, isActive: v.isActive, sku: v.sku,
      barcodeList: v.barcodeList || [],
      weight: v.weight ?? undefined,
      images: GORSEL.gorseller(v, u.name),
      prices: (v.prices || []).filter((p) => !p.priceListId)
        .map((p) => ({ sellPrice: p.sellPrice, buyPrice: p.buyPrice, currency: p.currency, discountPrice: p.discountPrice })),
      variantValueIds: (v.variantValueIds || []).map((x) => ({ variantTypeId: x.variantTypeId, variantValueId: x.variantValueId })),
    })),
  }
}

// description HARİÇ her şeyi karşılaştıran iskelet (yazımın SADECE açıklamayı değiştirdiğini kanıtlar).
function iskelet(u) {
  const k = JSON.parse(JSON.stringify(u))
  delete k.description
  for (const v of (k.variants || [])) v.barcodeList = v.barcodeList || []
  return JSON.stringify(k)
}

function yedekAl(db, u, yeniAciklama) {
  db.prepare('INSERT INTO aciklama_yedek (urun_id, urun_adi, eski_aciklama, yeni_aciklama, tarih) VALUES (?,?,?,?,?)')
    .run(u.id, u.name, u.description || '', yeniAciklama, new Date().toISOString())
}

/**
 * Bir ürünün açıklamasını GÜVENLE yazar.
 * @returns {Promise<{ok:boolean, once:object, sonra:object}>}
 * @throws görsel/fiyat kaybı ya da açıklama dışı alan değişikliğinde.
 */
async function yaz({ id, yeniAciklama, gql, db }) {
  const _gql = gql || require('./client').graphql
  const _db = db || require('../db/database').getDb()

  const once = await okuId(_gql, id)
  yedekAl(_db, once, yeniAciklama)

  await _gql('mutation($i:ProductInput!){ saveProduct(input:$i){ id } }', { i: girdi(once, yeniAciklama) })

  // Yazımın işlenmesini bekle (açıklama güncellenene kadar).
  let sonra = null
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    sonra = await okuId(_gql, id)
    if ((sonra.description || '') === yeniAciklama) break
  }
  if (!sonra) sonra = await okuId(_gql, id)

  // Fiyat-listesi satırı silindiyse geri yaz (saveProduct tuzağı).
  const kayip = (once.variants?.[0]?.prices || []).filter((p) => p.priceListId &&
    !(sonra.variants?.[0]?.prices || []).some((q) => q.priceListId === p.priceListId))
  if (kayip.length) {
    for (const p of kayip) {
      await _gql('mutation($i:SaveVariantPricesInput!){ saveVariantPrices(input:$i) }',
        { i: { priceListId: p.priceListId, variantPriceInputs: [{ productId: id, variantId: sonra.variants[0].id,
              price: { sellPrice: p.sellPrice, ...(p.discountPrice != null ? { discountPrice: p.discountPrice } : {}) } }] } })
    }
    await new Promise((r) => setTimeout(r, 2000))
    sonra = await okuId(_gql, id)
  }

  // Doğrulamalar: "hata vermedi" yeterli değil.
  GORSEL.gorselDogrula(once, sonra, once.name)
  if (iskelet(once) !== iskelet(sonra)) {
    throw new Error(`AÇIKLAMA DIŞI ALAN DEĞİŞTİ [${once.name}] — kontrol edilmeli (ikas panelinden geri al: aciklama_yedek)`)
  }
  if ((sonra.description || '') !== yeniAciklama) {
    throw new Error(`Açıklama ikas'a yazılmadı görünüyor [${once.name}]`)
  }
  return { ok: true, once, sonra }
}

module.exports = { yaz, girdi, iskelet, okuId, _ALANLAR: ALANLAR }
