import { describe, test, expect } from 'vitest'
import { havuzKur, anaTipKartlari, modelKartlari, suz, gorunumHesapla, DIGER } from './satis-hiyerarsi'

const u = (id, ana_tip, cozulen_model, ad = 'Ürün ' + id) => ({ id, ad, ana_tip, cozulen_model })
const s = (id, cozulen_model, ad = 'Set ' + id) => ({ id, ad, ana_tip: 'Set', cozulen_model })

describe('havuz', () => {
  test('ürün ve setler tek havuzda, tür etiketiyle', () => {
    const h = havuzKur([u(1, 'Tencere', 'Folk')], [s(9, 'Atlas')])
    expect(h.map(k => k.tur)).toEqual(['urun', 'set'])
  })

  test('set DAİMA "Set" ana tipinde — tedarikçi setleriyle aynı dal', () => {
    const h = havuzKur([u(1, 'Set', 'Creamy')], [s(9, 'Atlas')])
    expect(anaTipKartlari(h)).toEqual([{ ad: 'Set', adet: 2 }])
  })
})

describe('ana tip kartları', () => {
  test('ürün sayısına göre azalan sıralanır', () => {
    const h = havuzKur([u(1, 'Tava', 'A'), u(2, 'Tencere', 'A'), u(3, 'Tencere', 'B'), u(4, 'Tencere', 'C')], [])
    expect(anaTipKartlari(h).map(k => k.ad)).toEqual(['Tencere', 'Tava'])
  })

  test('"Diğer" kalabalık OLSA BİLE sonda', () => {
    const h = havuzKur([u(1, DIGER, 'A'), u(2, DIGER, 'A'), u(3, DIGER, 'A'), u(4, 'Tava', 'B')], [])
    expect(anaTipKartlari(h).map(k => k.ad)).toEqual(['Tava', DIGER])
  })

  test('ana_tip boşsa "Diğer" sayılır — ürün KAYBOLMAZ', () => {
    const h = havuzKur([u(1, null, 'A'), u(2, undefined, 'B'), u(3, '', 'C')], [])
    expect(anaTipKartlari(h)).toEqual([{ ad: DIGER, adet: 3 }])
  })

  test('eşit sayıda ise ad sırası — sonuç kararlı', () => {
    const h = havuzKur([u(1, 'Tava', 'A'), u(2, 'Cezve', 'B')], [])
    expect(anaTipKartlari(h).map(k => k.ad)).toEqual(['Cezve', 'Tava'])
  })
})

describe('model kartları', () => {
  test('yalnız seçili ana tipin modelleri gelir', () => {
    const h = havuzKur([u(1, 'Tencere', 'Folk'), u(2, 'Tencere', 'Sable'), u(3, 'Tava', 'Glaze')], [])
    expect(modelKartlari(h, 'Tencere').map(k => k.ad)).toEqual(['Folk', 'Sable'])
  })

  test('"Diğer" model sonda', () => {
    const h = havuzKur([u(1, 'Tencere', DIGER), u(2, 'Tencere', DIGER), u(3, 'Tencere', 'Folk')], [])
    expect(modelKartlari(h, 'Tencere').map(k => k.ad)).toEqual(['Folk', DIGER])
  })

  test('set modeli ürün modeliyle aynı dalda birleşir', () => {
    const h = havuzKur([u(1, 'Set', 'Atlas')], [s(9, 'Atlas')])
    expect(modelKartlari(h, 'Set')).toEqual([{ ad: 'Atlas', adet: 2 }])
  })
})

describe('süzme', () => {
  const h = havuzKur([u(1, 'Tencere', 'Folk'), u(2, 'Tencere', 'Sable'), u(3, 'Tava', 'Folk')], [s(9, 'Atlas')])

  test('ana tip + model birlikte süzer', () => {
    expect(suz(h, 'Tencere', 'Folk').map(k => k.id)).toEqual([1])
  })

  test('model verilmezse ana tipin tamamı gelir', () => {
    expect(suz(h, 'Tencere', null).map(k => k.id)).toEqual([1, 2])
  })

  test('hiçbiri verilmezse havuzun tamamı gelir', () => {
    expect(suz(h, null, null)).toHaveLength(4)
  })

  test('set süzmede kaybolmaz', () => {
    expect(suz(h, 'Set', 'Atlas').map(k => k.id)).toEqual([9])
  })
})

describe('uyarlanır derinlik (spec §6.1)', () => {
  test('çok kartlı ana tip düzeyi ATLANMAZ', () => {
    const h = havuzKur([u(1, 'Tencere', 'Folk'), u(2, 'Tava', 'Glaze')], [])
    expect(gorunumHesapla(h, '', '')).toEqual({ gorunum: 'anatip', zimniAnaTip: null, zimniModel: null })
  })

  test('tek ana tip varsa o düzey ATLANIR, model düzeyine geçilir', () => {
    const h = havuzKur([u(1, 'Tencere', 'Folk'), u(2, 'Tencere', 'Sable')], [])
    expect(gorunumHesapla(h, '', '')).toEqual({ gorunum: 'model', zimniAnaTip: 'Tencere', zimniModel: null })
  })

  test('Lacena/Taç durumu: hiç model yok → model düzeyi de ATLANIR, doğrudan ürün', () => {
    // Ölçüldü: bu iki markada model sözlüğü hiç eşleşmiyor, hepsi "Diğer".
    const h = havuzKur([u(1, 'Tencere', DIGER), u(2, 'Tencere', DIGER)], [])
    expect(gorunumHesapla(h, '', '')).toEqual({ gorunum: 'urun', zimniAnaTip: 'Tencere', zimniModel: DIGER })
  })

  test('ana tip seçilmişse ama tek model varsa model düzeyi atlanır', () => {
    const h = havuzKur([u(1, 'Tencere', 'Folk'), u(2, 'Tava', 'Glaze'), u(3, 'Tava', 'Glaze')], [])
    expect(gorunumHesapla(h, 'Tava', '')).toEqual({ gorunum: 'urun', zimniAnaTip: null, zimniModel: 'Glaze' })
  })

  test('ana tip seçilmiş, çok model varsa model düzeyi GÖSTERİLİR', () => {
    const h = havuzKur([u(1, 'Tencere', 'Folk'), u(2, 'Tencere', 'Sable')], [])
    expect(gorunumHesapla(h, 'Tencere', '').gorunum).toBe('model')
  })

  test('ikisi de seçilmişse ürün görünümü', () => {
    const h = havuzKur([u(1, 'Tencere', 'Folk'), u(2, 'Tencere', 'Sable')], [])
    expect(gorunumHesapla(h, 'Tencere', 'Folk')).toEqual({ gorunum: 'urun', zimniAnaTip: null, zimniModel: null })
  })

  test('boş havuz çökmez, ürün görünümü döner ("ürün bulunamadı" mesajı çıksın)', () => {
    expect(gorunumHesapla([], '', '')).toEqual({ gorunum: 'urun', zimniAnaTip: null, zimniModel: null })
  })

  test('atlama SEÇİM yapmaz — zımni değer süzmeye gider, şeride değil', () => {
    const h = havuzKur([u(1, 'Set', 'Atlas'), u(2, 'Set', 'Atlas')], [])
    const r = gorunumHesapla(h, '', '')
    expect(r.zimniAnaTip).toBe('Set')
    expect(suz(h, r.zimniAnaTip, r.zimniModel)).toHaveLength(2)
  })
})
