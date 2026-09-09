// Kampanya formu ↔ ikas CampaignInput — DB'siz, ağsız SAF dönüşüm (satis-hesapla.js deseni).
//
// Canlı şema sapmaları (09.09.2026 ölçüldü, docs/superpowers/specs/2026-09-09-kampanya-kupon-design.md):
//   - Ürün süzgeci type 'PRODUCT_AND_VARIANT', id 'p:<productId>' (belgeli enum'da YOK).
//   - Yüzde indirim type 'RATIO' + fixedDiscount.amount (ayrı "ratio" alanı YOK).
//   - dateRange.start/end milisaniye epoch.
// Kural: boş/ilgisiz alan GÖNDERİLMEZ — ikas null'ı "temizle" diye yorumlayabilir.

const SUZGEC_TURLERI = Object.freeze({
  urun: 'PRODUCT_AND_VARIANT', kategori: 'CATEGORY', marka: 'PRODUCT_BRAND', etiket: 'PRODUCT_TAG',
})
const TUR_IKAS = Object.freeze({ yuzde: 'RATIO', sabit: 'FIXED_AMOUNT', kargo: 'FREE_SHIPPING', xaly: 'BUY_X_THEN_GET_Y' })
const TUR_FORM = Object.freeze({ RATIO: 'yuzde', FIXED_AMOUNT: 'sabit', FREE_SHIPPING: 'kargo', BUY_X_THEN_GET_Y: 'xaly' })
const URUN_ONEK = 'p:'

function bosSuzgec() { return { tur: 'urun', idler: [] } }

function bosForm() {
  return {
    id: null, baslik: '', kuponlu: true, tur: 'yuzde', oran: '', kargoUcretsiz: false,
    kosulTum: true, suzgec: bosSuzgec(), indirimliDahil: false,
    tutarSinir: { acik: false, min: '', max: '' }, adetSinir: { acik: false, min: '', max: '' },
    toplamLimit: '', musteriLimit: '', yalnizHesap: false, birlesir: false,
    satisKanallari: [], baslangic: '', bitis: '', uygulananFiyat: 'SELL_PRICE',
    xaly: {
      alKip: 'adet', alMiktar: '', alMaks: '', alSuzgec: bosSuzgec(),
      kazanAdet: '', kazanOran: '100', kazanSuzgec: bosSuzgec(), otomatikEkle: false, siparisLimit: '',
    },
  }
}

const sayi = (v) => (v === '' || v === null || v === undefined) ? null : Number(v)
const tamSayi = (v) => { const n = sayi(v); return n === null ? null : Math.trunc(n) }

// datetime-local ('YYYY-MM-DDTHH:mm', yerel saat) → ms. Boşsa null.
function tarihMs(v) { return v ? new Date(v).getTime() : null }
// ms → datetime-local. ikas null/0 döndürürse ''.
function msTarih(ms) {
  if (!ms) return ''
  const d = new Date(ms); const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function suzgecInput(s, etiket) {
  const idler = (s && s.idler || []).map(x => String(x).trim()).filter(Boolean)
  if (!idler.length) throw new Error(`${etiket}: en az bir ürün/kategori/marka seçin.`)
  const tur = SUZGEC_TURLERI[s.tur]
  if (!tur) throw new Error(`${etiket}: bilinmeyen süzgeç türü "${s.tur}".`)
  const idList = tur === SUZGEC_TURLERI.urun ? idler.map(x => x.startsWith(URUN_ONEK) ? x : URUN_ONEK + x) : idler
  return { type: tur, idList }
}

function suzgecForm(f) {
  if (!f) return bosSuzgec()
  const tur = Object.keys(SUZGEC_TURLERI).find(k => SUZGEC_TURLERI[k] === f.type) || 'urun'
  const idler = (f.idList || []).map(x => (tur === 'urun' && String(x).startsWith(URUN_ONEK)) ? String(x).slice(URUN_ONEK.length) : String(x))
  return { tur, idler }
}

function aralik(sinir) {
  if (!sinir || !sinir.acik) return null
  const r = {}
  if (sayi(sinir.min) !== null) r.min = sayi(sinir.min)
  if (sayi(sinir.max) !== null) r.max = sayi(sinir.max)
  return Object.keys(r).length ? r : null
}

function formdanInput(f) {
  const baslik = (f.baslik || '').trim()
  if (!baslik) throw new Error('Başlık gerekli.')
  const type = TUR_IKAS[f.tur]
  if (!type) throw new Error(`Bilinmeyen kampanya türü "${f.tur}".`)

  const i = {
    title: baslik, type, hasCoupon: !!f.kuponlu,
    canCombineWithOtherCampaigns: !!f.birlesir,
    applicablePrice: f.uygulananFiyat === 'DISCOUNT_PRICE' ? 'DISCOUNT_PRICE' : 'SELL_PRICE',
  }
  if (f.id) i.id = f.id
  if (f.kargoUcretsiz && f.tur !== 'kargo') i.isFreeShipping = true
  if (f.indirimliDahil) i.includeDiscountedProducts = true
  if (f.yalnizHesap) i.onlyUseCustomer = true
  if (tamSayi(f.toplamLimit) !== null) i.usageLimit = tamSayi(f.toplamLimit)
  if (tamSayi(f.musteriLimit) !== null) i.usageLimitPerCustomer = tamSayi(f.musteriLimit)
  if (Array.isArray(f.satisKanallari) && f.satisKanallari.length) i.salesChannelIds = [...f.satisKanallari]
  const start = tarihMs(f.baslangic), end = tarihMs(f.bitis)
  if (start || end) { i.dateRange = {}; if (start) i.dateRange.start = start; if (end) i.dateRange.end = end }

  if (f.tur === 'xaly') {
    const x = f.xaly || {}
    const alMiktar = sayi(x.alMiktar)
    if (alMiktar === null || alMiktar <= 0) throw new Error('"Müşterinin aldıkları" miktarı gerekli.')
    const kazanAdet = sayi(x.kazanAdet)
    if (kazanAdet === null || kazanAdet <= 0) throw new Error('"Müşterinin kazandıkları" adedi gerekli.')
    const oran = sayi(x.kazanOran)
    if (oran === null || oran <= 0 || oran > 100) throw new Error('Kazanılan indirim oranı 1-100 arası olmalı.')
    const buyX = { amount: alMiktar, applyByQuantity: x.alKip !== 'tutar', filter: suzgecInput(x.alSuzgec, 'Müşterinin aldıkları') }
    const getY = { amount: kazanAdet, discountRatio: oran, filter: suzgecInput(x.kazanSuzgec, 'Müşterinin kazandıkları') }
    if (x.otomatikEkle) getY.automaticallyAddItemToCart = true
    i.buyXThenGetY = { buyX, getY }
    if (tamSayi(x.siparisLimit) !== null) i.buyXThenGetY.maxUsagePerOrder = tamSayi(x.siparisLimit)
    return i
  }

  const fd = {}
  if (f.tur === 'yuzde' || f.tur === 'sabit') {
    const oran = sayi(f.oran)
    if (oran === null || oran <= 0) throw new Error('İndirim oranı/tutarı gerekli.')
    if (f.tur === 'yuzde' && oran > 100) throw new Error('Yüzde indirim 100 üstü olamaz.')
    fd.amount = oran
  }
  if (!f.kosulTum) fd.filters = [suzgecInput(f.suzgec, 'Koşullar')]
  const pr = aralik(f.tutarSinir); if (pr) { fd.priceRange = pr; fd.isApplyByCartAmount = true }
  const qr = aralik(f.adetSinir); if (qr) fd.lineItemQuantityRange = qr
  if (Object.keys(fd).length) i.fixedDiscount = fd
  return i
}

function inputtanForm(c) {
  const f = bosForm()
  if (!c) return f
  f.id = c.id || null
  f.baslik = (c.title || '').trim()
  f.kuponlu = !!c.hasCoupon
  f.tur = TUR_FORM[c.type] || 'yuzde'
  f.kargoUcretsiz = !!c.isFreeShipping
  f.indirimliDahil = !!c.includeDiscountedProducts
  f.yalnizHesap = !!c.onlyUseCustomer
  f.birlesir = !!c.canCombineWithOtherCampaigns
  f.uygulananFiyat = c.applicablePrice === 'DISCOUNT_PRICE' ? 'DISCOUNT_PRICE' : 'SELL_PRICE'
  f.toplamLimit = c.usageLimit == null ? '' : String(c.usageLimit)
  f.musteriLimit = c.usageLimitPerCustomer == null ? '' : String(c.usageLimitPerCustomer)
  f.satisKanallari = Array.isArray(c.salesChannelIds) ? [...c.salesChannelIds] : []
  f.baslangic = msTarih(c.dateRange && c.dateRange.start)
  f.bitis = msTarih(c.dateRange && c.dateRange.end)
  const fd = c.fixedDiscount || {}
  if (f.tur === 'yuzde' || f.tur === 'sabit') f.oran = fd.amount == null ? '' : String(fd.amount)
  const filt = Array.isArray(fd.filters) && fd.filters[0]
  if (filt && Array.isArray(filt.idList) && filt.idList.length) { f.kosulTum = false; f.suzgec = suzgecForm(filt) }
  const pr = fd.priceRange || {}, qr = fd.lineItemQuantityRange || {}
  if (pr.min != null || pr.max != null) f.tutarSinir = { acik: true, min: pr.min ?? '', max: pr.max ?? '' }
  if (qr.min != null || qr.max != null) f.adetSinir = { acik: true, min: qr.min ?? '', max: qr.max ?? '' }
  const b = c.buyXThenGetY
  if (b) {
    f.xaly = {
      alKip: b.buyX && b.buyX.applyByQuantity === false ? 'tutar' : 'adet',
      alMiktar: b.buyX && b.buyX.amount != null ? String(b.buyX.amount) : '', alMaks: '',
      alSuzgec: suzgecForm(b.buyX && b.buyX.filter),
      kazanAdet: b.getY && b.getY.amount != null ? String(b.getY.amount) : '',
      kazanOran: b.getY && b.getY.discountRatio != null ? String(b.getY.discountRatio) : '100',
      kazanSuzgec: suzgecForm(b.getY && b.getY.filter),
      otomatikEkle: !!(b.getY && b.getY.automaticallyAddItemToCart),
      siparisLimit: b.maxUsagePerOrder == null ? '' : String(b.maxUsagePerOrder),
    }
  }
  return f
}

// Geri okuma karşılaştırması: input'ta GÖNDERİLEN her alan okunan nesnede aynı mı?
// Okunanda fazladan alan olması fark değildir (usageCount, id vb.).
function farklar(input, okunan, yol = '') {
  const out = []
  for (const [k, v] of Object.entries(input || {})) {
    if (k === 'id') continue
    const o = okunan ? okunan[k] : undefined
    const p = yol ? `${yol}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) { out.push(...farklar(v, o || {}, p)); continue }
    if (JSON.stringify(v) !== JSON.stringify(o)) out.push(p)
  }
  return out
}

function kuponInput({ campaignId, kip, kod, onEk, adet, toplamLimit, musteriLimit, birlesir }) {
  if (!campaignId) throw new Error('Kampanya seçilmedi.')
  const ortak = { canCombineWithOtherCampaigns: !!birlesir }
  if (tamSayi(toplamLimit) !== null) ortak.usageLimit = tamSayi(toplamLimit)
  if (tamSayi(musteriLimit) !== null) ortak.usageLimitPerCustomer = tamSayi(musteriLimit)
  if (kip === 'uret') {
    const q = tamSayi(adet)
    if (!(onEk || '').trim()) throw new Error('Kod ön eki gerekli.')
    if (!q || q <= 0) throw new Error('Adet 1 veya daha büyük olmalı.')
    return { campaignId, generateCoupons: { prefix: onEk.trim(), quantity: q, ...ortak } }
  }
  const code = (kod || '').trim()
  if (!code) throw new Error('Kod gerekli.')
  return { campaignId, coupons: [{ code, ...ortak }] }
}

module.exports = { SUZGEC_TURLERI, URUN_ONEK, bosForm, formdanInput, inputtanForm, farklar, kuponInput, _msTarih: msTarih }
