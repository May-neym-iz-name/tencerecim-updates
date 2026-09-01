// Setleri ikas varyant kimliğiyle eşleştiren SAF mantık (veritabanı/ağ yok).
//
// NEDEN: ikas'ta satılan bir SET, sipariş kalemine `urunler.ikas_varyant_id`
// üzerinden bağlanamaz — setler `urunler` tablosunda değil. Varyant kimliği
// olmadan set kaleminin `urun_id`'si NULL kalır, bileşenlerine çözülemez ve o
// siparişe fatura kesilemez (Faz 2 / Task 5A).
//
// 🔴 EŞLEŞTİRME YALNIZ SKU İLE. Ad ile eşleştirme birincil yol DEĞİL: ikas'taki
// ad bir harf farkla yazılmış olabilir ve yanlış sete fatura kesilmesine yol
// açar. SKU'nun ana kaynağı PC uygulamasıdır; SKU'su boş set düzeltilmek üzere
// kullanıcıya raporlanır.
//
// Haritayı çağıran kurar (ikas ürün çekiminde zaten kuruluyor) — bu modül ağa
// çıkmaz, böylece testte gerçek ikas gerekmez.

// Her iki tarafa AYNI dönüşüm uygulanır; SKU'lar ASCII olduğu için yerel-ayara
// duyarsız toUpperCase güvenlidir (Türkçe 'i' tuzağı burada oluşmaz).
function _anahtar(sku) {
  const t = String(sku == null ? '' : sku).trim()
  return t ? t.toUpperCase() : null
}

/**
 * @param {Array<{id:number, ad:string, sku:string, ikas_varyant_id:string|null}>} setler
 * @param {Map<string,string>} skuVaryantHaritasi ikas SKU → varyant kimliği
 * @returns {{eslesen: Array<{id:number, ikas_varyant_id:string}>, skusuz: string[], ikasta_yok: string[]}}
 */
function setVaryantEslestir(setler, skuVaryantHaritasi) {
  const liste = Array.isArray(setler) ? setler : []
  const harita = new Map()
  for (const [k, v] of (skuVaryantHaritasi || new Map())) {
    const a = _anahtar(k)
    if (a) harita.set(a, v)
  }

  const eslesen = []
  const skusuz = []
  const ikasta_yok = []
  for (const s of liste) {
    const a = _anahtar(s.sku)
    if (!a) { skusuz.push(s.ad); continue }
    const varyant = harita.get(a)
    if (!varyant) { ikasta_yok.push(`${s.sku} — ${s.ad}`); continue }
    // Değişmeyen satır için UPDATE üretme: her senkronda tüm setleri yazmak
    // senkron kuyruğunu gereksiz şişirir.
    if (s.ikas_varyant_id === varyant) continue
    eslesen.push({ id: s.id, ikas_varyant_id: varyant })
  }
  return { eslesen, skusuz, ikasta_yok }
}

module.exports = { setVaryantEslestir, _anahtar }
