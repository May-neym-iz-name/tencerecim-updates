// Satış ekranı gezinme ağacı: Marka → Ana Tip → Model → Ürün.
//
// Saf fonksiyonlar. Satis.jsx içindeki türetmeler buraya alındı ki mantık test
// edilebilsin — özellikle UYARLANIR DERİNLİK, gözle doğrulanması en zor kısım.
//
// Ana tip ve model SUNUCUDA çözümlenir (electron/db/urunler.js modelleriCozumle,
// electron/db/setler.js setModelleriCozumle). Buraya ürünler `ana_tip` ve
// `cozulen_model` alanları DOLU gelir; bu dosya sözlük görmez, çözümleme yapmaz.
// tr-arama.js / arama.js ikizliğinin ikinci bir örneğini üretmemek için böyle.

export const DIGER = 'Diğer'

// Kart sıralaması VERİYE dayanır: en çok ürünü olan dal önde (kasada en sık dokunulan).
// Sabit bir tip sırası tutulsaydı, o liste electron/db/ana-tip.js'in ikizi olurdu ve
// ikisinin aynı kalmasını bir parite testiyle kovalamak gerekirdi.
// "Diğer" DAİMA sonda — kalabalık olsa bile.
function kartSirala(kartlar) {
  return kartlar.sort((a, b) =>
    (a.ad === DIGER ? 1 : 0) - (b.ad === DIGER ? 1 : 0) ||
    b.adet - a.adet ||
    String(a.ad).localeCompare(String(b.ad), 'tr'))
}

function grupla(kalemler, alan) {
  const say = new Map()
  for (const k of kalemler) {
    const ad = k[alan] || DIGER
    say.set(ad, (say.get(ad) || 0) + 1)
  }
  return kartSirala([...say.entries()].map(([ad, adet]) => ({ ad, adet })))
}

/**
 * Seçili markanın ürünleri + setleri tek havuz olur. Set, satış ekranında ürünle
 * aynı düzeylerde gezilir; farkı `tur` alanıdır (sepete ekleme yolu ayrı).
 */
export function havuzKur(urunler = [], setler = []) {
  return [
    ...urunler.map(u => ({ ...u, tur: 'urun' })),
    ...setler.map(s => ({ ...s, tur: 'set' })),
  ]
}

export const anaTipKartlari = (havuz) => grupla(havuz, 'ana_tip')

export const modelKartlari = (havuz, anaTip) =>
  grupla(havuz.filter(k => (k.ana_tip || DIGER) === anaTip), 'cozulen_model')

export function suz(havuz, anaTip, model) {
  return havuz.filter(k =>
    (!anaTip || (k.ana_tip || DIGER) === anaTip) &&
    (!model || (k.cozulen_model || DIGER) === model))
}

/**
 * UYARLANIR DERİNLİK (spec §6.1): bir düzeyde TEK kart kalıyorsa o düzey atlanır.
 *
 * Yeni bir fikir değil — mevcut kod markanın kategorisi yoksa kategori düzeyini
 * zaten atlıyordu; aynı desen sürdürülüyor. Gerekçe ölçüldü: Lacena ve Taç'ta hiç
 * model yok (19+19 ürün), o markalarda model düzeyi tek "Diğer" kartı olur ve
 * kullanıcıyı boşa bir dokunuşa zorlar.
 *
 * DİKKAT: atlama SEÇİM yapmaz, yalnız görünümü ilerletir. Tek kartın adı `zimniAnaTip`
 * / `zimniModel` olarak döner; süzme onunla yapılır. Böylece "geri" davranışı ve
 * gezinme şeridi seçili olmayan bir düzeyi göstermek zorunda kalmaz.
 *
 * @returns {{gorunum:'anatip'|'model'|'urun', zimniAnaTip:string|null, zimniModel:string|null}}
 */
export function gorunumHesapla(havuz, secilenAnaTip, secilenModel) {
  if (!havuz.length) return { gorunum: 'urun', zimniAnaTip: null, zimniModel: null }

  let anaTip = secilenAnaTip
  let zimniAnaTip = null
  if (!anaTip) {
    const tipler = anaTipKartlari(havuz)
    if (tipler.length > 1) return { gorunum: 'anatip', zimniAnaTip: null, zimniModel: null }
    // Tek tip → o düzeyi atla, ama seçimi ZIMNİ tut.
    anaTip = tipler[0].ad
    zimniAnaTip = anaTip
  }

  let model = secilenModel
  let zimniModel = null
  if (!model) {
    const modeller = modelKartlari(havuz, anaTip)
    if (modeller.length > 1) return { gorunum: 'model', zimniAnaTip, zimniModel: null }
    model = modeller.length ? modeller[0].ad : null
    zimniModel = model
  }
  return { gorunum: 'urun', zimniAnaTip, zimniModel }
}
