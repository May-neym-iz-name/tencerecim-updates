import { describe, test, expect } from 'vitest'
const { tohumKalemleriKur } = require('./tohumlama')

const yerel = [
  { sku: 'TNC.LAV.00001', senk_id: 'u-1', ad: 'Tencere' },
  { sku: 'TNC.SFR.00002', senk_id: 'u-2', ad: 'Çaydanlık' },
]
const bh = (kod, miktar, ad = 'X') => ({ code: kod, quantity: miktar, title: ad })

describe('tohumKalemleriKur', () => {
  test('SKU eşleşen ürünlerin bulut kimliğiyle kalem üretir', () => {
    const r = tohumKalemleriKur([bh('TNC.LAV.00001', 5), bh('TNC.SFR.00002', 3)], yerel)
    expect(r.kalemler).toEqual([
      { urun_senk_id: 'u-1', miktar: 5 },
      { urun_senk_id: 'u-2', miktar: 3 },
    ])
    expect(r.rapor.eslesen).toBe(2)
    expect(r.rapor.toplamAdet).toBe(8)
  })

  test('miktarı 0 veya negatif olan ürün kalem ÜRETMEZ', () => {
    // Açılış bakiyesi olarak sıfır yazmanın anlamı yok; satır açmak denetim
    // izini anlamsız kayıtlarla şişirir.
    const r = tohumKalemleriKur([bh('TNC.LAV.00001', 0), bh('TNC.SFR.00002', -2)], yerel)
    expect(r.kalemler).toEqual([])
    expect(r.rapor.stoksuz).toBe(2)
  })

  test('aynı SKU birden çok satırda gelirse TOPLANIR', () => {
    const r = tohumKalemleriKur([bh('TNC.LAV.00001', 4), bh('TNC.LAV.00001', 6)], yerel)
    expect(r.kalemler).toEqual([{ urun_senk_id: 'u-1', miktar: 10 }])
  })

  test('harf büyüklüğü ve boşluk eşleşmeyi bozmaz', () => {
    const r = tohumKalemleriKur([bh('  tnc.lav.00001  ', 2)], yerel)
    expect(r.kalemler).toEqual([{ urun_senk_id: 'u-1', miktar: 2 }])
  })

  test('bizde olmayan SKU raporlanır, kalem üretmez', () => {
    const r = tohumKalemleriKur([bh('TNC.YOK.00099', 7, 'Bilinmeyen')], yerel)
    expect(r.kalemler).toEqual([])
    expect(r.rapor.bizdeYok).toEqual(['TNC.YOK.00099 — Bilinmeyen'])
  })

  test('kodu boş Bizimhesap ürünü ayrı raporlanır', () => {
    const r = tohumKalemleriKur([{ code: '', quantity: 3, title: 'Kodsuz Ürün' }], yerel)
    expect(r.kalemler).toEqual([])
    expect(r.rapor.kodsuz).toEqual(['Kodsuz Ürün'])
  })

  test('🔴 bulut kimliği olmayan yerel ürün ATLANIR ve raporlanır', () => {
    // senk_id yoksa fatura stoğu hangi satıra yazılacağı belirsizdir; sessizce
    // atlamak yerine kullanıcıya söylenir (senkron bekliyor olabilir).
    const r = tohumKalemleriKur([bh('TNC.YENI.00003', 9, 'Yeni Ürün')],
      [...yerel, { sku: 'TNC.YENI.00003', senk_id: null, ad: 'Yeni Ürün' }])
    expect(r.kalemler).toEqual([])
    expect(r.rapor.senkBekleyen).toEqual(['TNC.YENI.00003 — Yeni Ürün'])
  })

  test('miktar metin olarak gelirse sayıya çevrilir (qty string dönüyor)', () => {
    const r = tohumKalemleriKur([{ code: 'TNC.LAV.00001', quantity: '12', title: 'X' }], yerel)
    expect(r.kalemler).toEqual([{ urun_senk_id: 'u-1', miktar: 12 }])
  })

  test('sayıya çevrilemeyen miktar kalem üretmez', () => {
    const r = tohumKalemleriKur([{ code: 'TNC.LAV.00001', quantity: 'abc', title: 'X' }], yerel)
    expect(r.kalemler).toEqual([])
    expect(r.rapor.stoksuz).toBe(1)
  })

  test('ondalıklı miktar aşağı yuvarlanır (fatura stoğu ADET tutar)', () => {
    const r = tohumKalemleriKur([{ code: 'TNC.LAV.00001', quantity: '2.7', title: 'X' }], yerel)
    expect(r.kalemler).toEqual([{ urun_senk_id: 'u-1', miktar: 2 }])
  })

  test('boş girdiler güvenli', () => {
    expect(tohumKalemleriKur([], yerel).kalemler).toEqual([])
    expect(tohumKalemleriKur(null, null).kalemler).toEqual([])
  })
})
