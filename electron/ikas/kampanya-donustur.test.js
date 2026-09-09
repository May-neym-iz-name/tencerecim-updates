import { describe, test, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const d = require('./kampanya-donustur.js')

describe('formdanInput', () => {
  test('yüzde indirim: RATIO + fixedDiscount.amount, boş alanlar yok', () => {
    const f = { ...d.bosForm(), baslik: 'Hoş geldin', tur: 'yuzde', oran: '10', kuponlu: true }
    const i = d.formdanInput(f)
    expect(i.type).toBe('RATIO')
    expect(i.fixedDiscount.amount).toBe(10)
    expect(i.hasCoupon).toBe(true)
    expect(i.canCombineWithOtherCampaigns).toBe(false)
    expect(i.applicablePrice).toBe('SELL_PRICE')
    expect(i).not.toHaveProperty('dateRange')
    expect(i).not.toHaveProperty('usageLimit')
    expect(i.fixedDiscount).not.toHaveProperty('filters')
  })

  test('MUTASYON KAPANI: oran alanı amount dışına yazılırsa kırmızı', () => {
    const i = d.formdanInput({ ...d.bosForm(), baslik: 'x', tur: 'sabit', oran: '250' })
    expect(i.type).toBe('FIXED_AMOUNT')
    expect(i.fixedDiscount).toEqual({ amount: 250 })
  })

  test('ürün süzgeci PRODUCT_AND_VARIANT + p: öneki (canlı sapma)', () => {
    const f = { ...d.bosForm(), baslik: 'x', tur: 'yuzde', oran: '5', kosulTum: false,
      suzgec: { tur: 'urun', idler: ['abc', 'p:def'] } }
    expect(d.formdanInput(f).fixedDiscount.filters).toEqual([{ type: 'PRODUCT_AND_VARIANT', idList: ['p:abc', 'p:def'] }])
  })

  test('kategori süzgeci ham id ile CATEGORY', () => {
    const f = { ...d.bosForm(), baslik: 'x', tur: 'yuzde', oran: '5', kosulTum: false,
      suzgec: { tur: 'kategori', idler: ['k1'] } }
    expect(d.formdanInput(f).fixedDiscount.filters).toEqual([{ type: 'CATEGORY', idList: ['k1'] }])
  })

  test('sepet tutarı sınırı priceRange + isApplyByCartAmount; adet sınırı lineItemQuantityRange', () => {
    const f = { ...d.bosForm(), baslik: 'x', tur: 'yuzde', oran: '5',
      tutarSinir: { acik: true, min: '500', max: '' }, adetSinir: { acik: true, min: '2', max: '4' } }
    const fd = d.formdanInput(f).fixedDiscount
    expect(fd.priceRange).toEqual({ min: 500 })
    expect(fd.isApplyByCartAmount).toBe(true)
    expect(fd.lineItemQuantityRange).toEqual({ min: 2, max: 4 })
  })

  test('tarih datetime-local → ms; yalnız bitiş varsa start yok', () => {
    const f = { ...d.bosForm(), baslik: 'x', tur: 'kargo', bitis: '2026-09-30T23:59' }
    const i = d.formdanInput(f)
    expect(i.type).toBe('FREE_SHIPPING')
    expect(i.dateRange).toEqual({ end: new Date('2026-09-30T23:59').getTime() })
  })

  test('limitler, hesap zorunluluğu, satış kanalları', () => {
    const f = { ...d.bosForm(), baslik: 'x', tur: 'yuzde', oran: '5', toplamLimit: '100', musteriLimit: '1',
      yalnizHesap: true, birlesir: true, satisKanallari: ['sk1'] }
    const i = d.formdanInput(f)
    expect(i.usageLimit).toBe(100); expect(i.usageLimitPerCustomer).toBe(1)
    expect(i.onlyUseCustomer).toBe(true); expect(i.canCombineWithOtherCampaigns).toBe(true)
    expect(i.salesChannelIds).toEqual(['sk1'])
  })

  test('X al Y kazan: buyX/getY, adet kipi, ücretsiz = discountRatio 100', () => {
    const f = { ...d.bosForm(), baslik: 'x', tur: 'xaly', xaly: {
      alKip: 'adet', alMiktar: '3', alMaks: '6', alSuzgec: { tur: 'urun', idler: ['a'] },
      kazanAdet: '1', kazanOran: '100', kazanSuzgec: { tur: 'urun', idler: ['b'] },
      otomatikEkle: true, siparisLimit: '2' } }
    const i = d.formdanInput(f)
    expect(i.type).toBe('BUY_X_THEN_GET_Y')
    expect(i).not.toHaveProperty('fixedDiscount')
    expect(i.buyXThenGetY).toEqual({
      maxUsagePerOrder: 2,
      buyX: { amount: 3, applyByQuantity: true, filter: { type: 'PRODUCT_AND_VARIANT', idList: ['p:a'] } },
      getY: { amount: 1, discountRatio: 100, automaticallyAddItemToCart: true, filter: { type: 'PRODUCT_AND_VARIANT', idList: ['p:b'] } },
    })
  })

  test('X al Y kazan tutar kipi applyByQuantity=false', () => {
    const f = { ...d.bosForm(), baslik: 'x', tur: 'xaly', xaly: { ...d.bosForm().xaly, alKip: 'tutar', alMiktar: '1000',
      alSuzgec: { tur: 'kategori', idler: ['k'] }, kazanAdet: '1', kazanOran: '50', kazanSuzgec: { tur: 'urun', idler: ['b'] } } }
    const b = d.formdanInput(f).buyXThenGetY
    expect(b.buyX.applyByQuantity).toBe(false)
    expect(b.getY.discountRatio).toBe(50)
  })

  test('başlık boşsa hata', () => {
    expect(() => d.formdanInput({ ...d.bosForm(), tur: 'kargo' })).toThrow('Başlık')
  })
  test('yüzde/sabit oran boşsa hata; yüzde 100 üstü hata', () => {
    expect(() => d.formdanInput({ ...d.bosForm(), baslik: 'x', tur: 'yuzde', oran: '' })).toThrow('oran')
    expect(() => d.formdanInput({ ...d.bosForm(), baslik: 'x', tur: 'yuzde', oran: '150' })).toThrow('100')
  })
  test('belirli ürünler seçili ama liste boşsa hata', () => {
    expect(() => d.formdanInput({ ...d.bosForm(), baslik: 'x', tur: 'yuzde', oran: '5', kosulTum: false }))
      .toThrow('en az bir')
  })
})

describe('inputtanForm (ikas Campaign → form)', () => {
  const canli = { id: 'c1', title: 'Maxx Doria İndirim Kuponu ', type: 'RATIO', hasCoupon: true,
    usageLimit: null, usageLimitPerCustomer: null, canCombineWithOtherCampaigns: false,
    applicablePrice: 'SELL_PRICE', isFreeShipping: null, onlyUseCustomer: null, includeDiscountedProducts: null,
    salesChannelIds: null, dateRange: { start: null, end: 1788987600000 },
    fixedDiscount: { amount: 20, isApplyByCartAmount: null, priceRange: null,
      lineItemQuantityRange: { min: null, max: null },
      filters: [{ type: 'PRODUCT_AND_VARIANT', idList: ['p:b13c', 'p:df9f'] }] }, buyXThenGetY: null }
  test('yüzde kampanya forma döner, p: öneki soyulur, tarih datetime-local olur', () => {
    const f = d.inputtanForm(canli)
    expect(f.id).toBe('c1'); expect(f.baslik).toBe('Maxx Doria İndirim Kuponu')
    expect(f.tur).toBe('yuzde'); expect(f.oran).toBe('20'); expect(f.kuponlu).toBe(true)
    expect(f.kosulTum).toBe(false); expect(f.suzgec).toEqual({ tur: 'urun', idler: ['b13c', 'df9f'] })
    expect(f.baslangic).toBe(''); expect(f.bitis).toMatch(/^2026-09-\d{2}T\d{2}:\d{2}$/)
    expect(f.adetSinir.acik).toBe(false)
  })
  test('gidiş-dönüş: formdanInput(inputtanForm(x)) canlı alanları korur', () => {
    const i = d.formdanInput(d.inputtanForm(canli))
    expect(i.fixedDiscount.filters).toEqual(canli.fixedDiscount.filters)
    expect(i.fixedDiscount.amount).toBe(20)
    expect(i.dateRange.end).toBe(canli.dateRange.end)
    expect(i.id).toBe('c1')
  })
})

describe('farklar', () => {
  test('gönderilen ile okunan aynıysa boş; amount farklıysa alan adı döner', () => {
    const i = { title: 'x', type: 'RATIO', hasCoupon: true, canCombineWithOtherCampaigns: false,
      applicablePrice: 'SELL_PRICE', fixedDiscount: { amount: 10 } }
    expect(d.farklar(i, { ...i, id: 'c', usageCount: 0, dateRange: null })).toEqual([])
    expect(d.farklar(i, { ...i, fixedDiscount: { amount: 15 } })).toEqual(['fixedDiscount.amount'])
  })
})

describe('kuponInput', () => {
  test('özel kod', () => {
    expect(d.kuponInput({ campaignId: 'c', kip: 'ozel', kod: ' HOSGELDIN ', toplamLimit: '1', musteriLimit: '', birlesir: false }))
      .toEqual({ campaignId: 'c', coupons: [{ code: 'HOSGELDIN', usageLimit: 1, canCombineWithOtherCampaigns: false }] })
  })
  test('otomatik üret', () => {
    expect(d.kuponInput({ campaignId: 'c', kip: 'uret', onEk: 'tnc', adet: '20', toplamLimit: '1', musteriLimit: '1', birlesir: false }))
      .toEqual({ campaignId: 'c', generateCoupons: { prefix: 'tnc', quantity: 20, usageLimit: 1, usageLimitPerCustomer: 1, canCombineWithOtherCampaigns: false } })
  })
  test('özel kodda kod boşsa, üretimde adet 0 ise hata', () => {
    expect(() => d.kuponInput({ campaignId: 'c', kip: 'ozel', kod: '' })).toThrow('Kod')
    expect(() => d.kuponInput({ campaignId: 'c', kip: 'uret', onEk: 'a', adet: '0' })).toThrow('Adet')
  })
})
