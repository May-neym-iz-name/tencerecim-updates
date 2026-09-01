// WEB SİTESİ LİNKİ EŞLEŞTİRME KARARI (saf mantık — IO yok, test edilebilir)
//
// Birincil anahtar SKU'dur ([[sku-tek-kaynak-kurali]]): uygulamadaki her ürünün
// SKU'su var ve ikas'takiyle aynıdır.
//
// Ama ikas'ta 401 üründen 54'ünün HİÇBİR varyantında stok kodu yazılı değil.
// Bunlar sitede yayında olmalarına rağmen SKU ile çözülemiyor ve linksiz
// kalıyorlardı ("Gülsan Elit 3'lü Granit Tava Seti XXL" gibi). Bu yüzden
// SKU tutmazsa BİREBİR AD eşleşmesine düşülür.
//
// ⚠️ Bu BULANIK ad eşleştirmesi DEĞİLDİR — o bilinçli olarak reddedildi, çünkü
// kulp/hacim/varyant farkları yanlış link üretiyor ("Soft 16 cm" ↔ "Soft 16 cm XL").
// Burada yalnızca normalize edildikten sonra TIPATIP aynı olan adlar eşleşir;
// aynı ada birden çok ikas ürünü düşerse hangisi olduğu belirsizdir, ATLANIR.

/**
 * Ad karşılaştırma anahtarı: Türkçe harfleri katlar, noktalama ve fazla boşluğu atar.
 * Rakamlar KORUNUR — "5 Parça" ile "7 Parça"yı ayıran tek şey onlar.
 */
function adAnahtari(ad) {
  return String(ad || '')
    .toLocaleLowerCase('tr')
    .replace(/i̇/g, 'i').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * ikas ürün listesinden iki harita üretir.
 * @param {Array<{name: string, metaData: {slug: string}|null, variants: Array<{sku: string|null}>}>} ikasUrunler
 * @returns {{slugBySku: Map<string,string>, slugByAd: Map<string,string>,
 *            slugsuz: Array<string>, skusuz: Array<string>}}
 */
function haritalariKur(ikasUrunler) {
  const slugBySku = new Map()
  const slugByAd = new Map()
  const belirsizAd = new Set()
  const slugsuz = []
  const skusuz = []
  for (const u of ikasUrunler || []) {
    const slug = u && u.metaData && u.metaData.slug
    if (!slug) { slugsuz.push(u && u.name); continue }
    const skular = ((u.variants || []).map((v) => v && v.sku).filter(Boolean))
    if (!skular.length) skusuz.push(u.name)
    for (const sku of skular) slugBySku.set(String(sku).trim(), slug)

    const anahtar = adAnahtari(u.name)
    if (!anahtar) continue
    // Aynı ada ikinci bir ürün düşerse hangisi olduğu belirsiz: ikisini de kullanma.
    if (slugByAd.has(anahtar) && slugByAd.get(anahtar) !== slug) belirsizAd.add(anahtar)
    slugByAd.set(anahtar, slug)
  }
  for (const a of belirsizAd) slugByAd.delete(a)
  return { slugBySku, slugByAd, slugsuz, skusuz }
}

/**
 * Bir yerel ürün/set için slug çözer. Önce SKU, tutmazsa birebir ad.
 * @returns {{slug: string, kaynak: 'sku'|'ad'}|null}
 */
function slugCoz(kayit, haritalar) {
  const sku = kayit && kayit.sku ? String(kayit.sku).trim() : ''
  if (sku) {
    const s = haritalar.slugBySku.get(sku)
    if (s) return { slug: s, kaynak: 'sku' }
  }
  const s = haritalar.slugByAd.get(adAnahtari(kayit && kayit.ad))
  if (s) return { slug: s, kaynak: 'ad' }
  return null
}

module.exports = { adAnahtari, haritalariKur, slugCoz }
