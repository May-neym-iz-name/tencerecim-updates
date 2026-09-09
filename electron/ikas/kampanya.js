// ikas kampanya & kupon katmanı (09.09.2026). Yerel tablo YOK — her açılışta ikas'tan okunur;
// tek doğruluk kaynağı ikas. Kupon DAĞITIMI (kime verildi) yerelde tutulur: db/kupon-havuz.js.
//
// Yazma sonrası GERİ OKUMA zorunlu (api-verification kuralı): saveCampaign "success" dönse de
// ikas alanı sessizce yorumlayabilir; fark listesi arayüze döner.
const { graphql } = require('./client')
const { formdanInput, inputtanForm, farklar, kuponInput } = require('./kampanya-donustur')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')

const KAMPANYA_ALANLARI = `
  id title type hasCoupon usageCount usageLimit usageLimitPerCustomer canCombineWithOtherCampaigns
  applicableCustomerGroupIds applicableCustomerIds currencyCodes
  applicablePrice isFreeShipping onlyUseCustomer includeDiscountedProducts salesChannelIds
  dateRange { start end }
  fixedDiscount { amount isApplyByCartAmount priceRange { min max } lineItemQuantityRange { min max } filters { type idList } }
  buyXThenGetY { maxUsagePerOrder
    buyX { amount applyByQuantity filter { type idList } }
    getY { amount discountRatio automaticallyAddItemToCart filter { type idList } } }`
const KUPON_ALANLARI = `id campaignId code usageCount usageLimit usageLimitPerCustomer canCombineWithOtherCampaigns`
const SAYFA = 100

async function kampanyalariListele() {
  const out = []
  for (let page = 1; ; page++) {
    const d = await graphql(`query($p:Int!){ listCampaign(pagination:{page:$p,limit:${SAYFA}}) { count data { ${KAMPANYA_ALANLARI} } } }`, { p: page })
    const veri = d.listCampaign && d.listCampaign.data || []
    out.push(...veri)
    if (veri.length < SAYFA) break
  }
  return out
}

async function kampanyaGetir(id) {
  const d = await graphql(`query($id:String!){ listCampaign(id:{eq:$id}) { data { ${KAMPANYA_ALANLARI} } } }`, { id })
  const k = d.listCampaign && d.listCampaign.data && d.listCampaign.data[0]
  if (!k) throw new Error('Kampanya ikas\'ta bulunamadı (silinmiş olabilir).')
  return k
}

async function kampanyaKaydet(form) {
  const input = formdanInput(form)
  // Formda OLMAYAN ama ikas'ta dolu olabilen alanlar (müşteri grubu/spesifik müşteri/kur) panelden
  // ayarlanmış olabilir; saveCampaign gönderilmeyen alanı SİLER → mevcut değerleri aynen taşı.
  if (input.id) {
    const mevcut = await kampanyaGetir(input.id)
    for (const alan of ['applicableCustomerGroupIds', 'applicableCustomerIds', 'currencyCodes']) {
      if (Array.isArray(mevcut[alan]) && mevcut[alan].length) input[alan] = mevcut[alan]
    }
  }
  const d = await graphql(`mutation($i:CampaignInput!){ saveCampaign(input:$i) { id } }`, { i: input })
  const id = d.saveCampaign && d.saveCampaign.id
  if (!id) throw new Error('ikas kampanya id döndürmedi.')
  const okunan = await kampanyaGetir(id)
  return { id, farklar: farklar(input, okunan) }
}

async function kampanyaSil(id) {
  const d = await graphql(`mutation($ids:[String!]!){ deleteCampaignList(idList:$ids) }`, { ids: [id] })
  if (d.deleteCampaignList !== true) throw new Error('ikas kampanyayı silemedi.')
  return true
}

async function kuponlariListele(campaignId) {
  const out = []
  for (let page = 1; ; page++) {
    const d = await graphql(`query($c:String!,$p:Int!){ listCoupon(campaignId:{eq:$c}, pagination:{page:$p,limit:${SAYFA}}) { data { ${KUPON_ALANLARI} } } }`, { c: campaignId, p: page })
    const veri = d.listCoupon && d.listCoupon.data || []
    out.push(...veri)
    if (veri.length < SAYFA) break
  }
  return out
}

async function kuponEkle(kuponFormu) {
  const input = kuponInput(kuponFormu)
  const d = await graphql(`mutation($i:AddCouponsInput!){ campaignAddCoupons(input:$i) { ${KUPON_ALANLARI} } }`, { i: input })
  const eklenen = d.campaignAddCoupons || []
  const beklenen = input.coupons ? input.coupons.length : input.generateCoupons.quantity
  if (eklenen.length !== beklenen) throw new Error(`ikas ${beklenen} kupon yerine ${eklenen.length} döndürdü.`)
  return eklenen
}

async function kuponSil(idList) {
  const d = await graphql(`mutation($ids:[String!]!){ deleteCouponList(idList:$ids) }`, { ids: idList })
  if (d.deleteCouponList !== true) throw new Error('ikas kuponları silemedi.')
  return true
}

// Formdaki seçiciler için ikas sözlükleri (kategori/marka/etiket/satış kanalı). Ürünler
// YEREL urunler tablosundan gelir (ikas_urun_id dolu olanlar) — Kampanyalar.jsx urunlerApi ile arar.
async function sozlukler() {
  const d = await graphql(`{
    listCategory { id name }
    listProductBrand { id name }
    listProductTag { id name }
    listSalesChannel { id name type }
  }`)
  return {
    kategoriler: d.listCategory || [], markalar: d.listProductBrand || [],
    etiketler: d.listProductTag || [], satisKanallari: d.listSalesChannel || [],
  }
}

module.exports = {
  _kampanyalariListele: kampanyalariListele,
  _kuponlariListele: kuponlariListele,

  'kampanya:liste': () => { yetkiKontrol('kampanya_yonet'); return kampanyalariListele() },
  'kampanya:getir': async (id) => { yetkiKontrol('kampanya_yonet'); const k = await kampanyaGetir(id); return { form: inputtanForm(k), kampanya: k } },
  'kampanya:kaydet': (form) => { yetkiKontrol('kampanya_yonet'); return kampanyaKaydet(form) },
  'kampanya:sil': (id) => { yetkiKontrol('kampanya_yonet'); return kampanyaSil(id) },
  'kampanya:kuponlar': (campaignId) => { yetkiKontrol('kampanya_yonet'); return kuponlariListele(campaignId) },
  'kampanya:kuponEkle': (kf) => { yetkiKontrol('kampanya_yonet'); return kuponEkle(kf) },
  'kampanya:kuponSil': (idList) => { yetkiKontrol('kampanya_yonet'); return kuponSil(idList) },
  'kampanya:sozlukler': () => { yetkiKontrol('kampanya_yonet'); return sozlukler() },
  // Kupon dağıtım kaydı (kim, kime, ne zaman) — db/kupon-havuz.js; Kampanyalar sayfası kupon panelinde gösterir.
  'kampanya:dagitimlar': (kampanyaId) => {
    yetkiKontrol('kampanya_yonet')
    return require('../db/kupon-havuz').dagitimlar(require('../db/database').getDb(), kampanyaId)
  },
}
