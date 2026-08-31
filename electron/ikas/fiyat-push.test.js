// ikas'a fiyat gönderiminde SATIŞ FİYATI SIFIR koruması.
//
// Gerçek risk (2026-08 alış fiyatı çalışması): saveVariantPrices sellPrice'ı
// olduğu gibi yazar. Yerelde satış fiyatı girilmemiş (0) bir ürünü göndermek
// ikas'taki CANLI satış fiyatını 0'a düşürür — ürün mağazada bedavaya düşer.
// Alış fiyatı yazılan 205 üründen 64'ünün yerel satış fiyatı boştu; ürün
// eşleştirmesi çalıştırılıp fiyat gönderilseydi bu ürünler sıfırlanacaktı.
//
// Süzgeç saf bir karar olduğu için burada mock YOK (emsal: kargo-durum.test.js).
import { describe, test, expect } from 'vitest'
import ekstra from './ekstra.js'

const suz = ekstra._fiyatSuz

const urun = (id, sku, sellPrice, buyPrice) =>
  ({ id, sku, ad: 'Ürün ' + sku, productId: 'P' + id, variantId: 'V' + id, sellPrice, buyPrice })

describe('ikas fiyat gönderimi — satış fiyatı sıfır süzgeci', () => {
  test('satış fiyatı 0 olan ürün GÖNDERİLMEZ, atlanan olarak raporlanır', () => {
    const r = suz([urun(1, 'TNC.X.00001', 0, 481.06)])

    expect(r.gonderilecek).toHaveLength(0)
    expect(r.atlanan).toEqual([{ id: 1, sku: 'TNC.X.00001', ad: 'Ürün TNC.X.00001' }])
  })

  test('satış fiyatı NULL olan da atlanır (0 ile aynı risk)', () => {
    const r = suz([urun(1, 'A', null, 50)])

    expect(r.gonderilecek).toHaveLength(0)
    expect(r.atlanan.map(a => a.sku)).toEqual(['A'])
  })

  test('satış fiyatı olan ürün alış fiyatıyla birlikte geçer', () => {
    const r = suz([urun(1, 'TNC.X.00002', 1390, 831.25)])

    expect(r.atlanan).toHaveLength(0)
    expect(r.gonderilecek).toHaveLength(1)
    expect(r.gonderilecek[0].sellPrice).toBe(1390)
    expect(r.gonderilecek[0].buyPrice).toBe(831.25)
  })

  test('alış fiyatı 0 olsa bile satış fiyatı varsa gönderilir', () => {
    // Alış fiyatı henüz girilmemiş ürünün satış fiyatı ikas'a yazılmaya devam
    // etmeli; koruma yalnızca SATIŞ fiyatını hedefler.
    const r = suz([urun(1, 'B', 250, 0)])

    expect(r.gonderilecek).toHaveLength(1)
    expect(r.atlanan).toHaveLength(0)
  })

  test('karışık listede yalnız fiyatlı olanlar geçer, sıra korunur', () => {
    const r = suz([urun(1, 'A', 100, 60), urun(2, 'B', 0, 70), urun(3, 'C', 200, 120)])

    expect(r.gonderilecek.map(s => s.sku)).toEqual(['A', 'C'])
    expect(r.atlanan.map(a => a.sku)).toEqual(['B'])
  })

  test('boş liste çökmez', () => {
    expect(suz([])).toEqual({ gonderilecek: [], atlanan: [] })
  })
})
