import { describe, test, expect } from 'vitest'
const { setCoz, SetCozmeHatasi } = require('./set-coz')

const setKalemi = { ad: 'Kahvaltı Seti', miktar: 1, birim_fiyat: 100 }

describe('setCoz', () => {
  test('bileşen fiyatlarına göre AĞIRLIKLI dağıtır (eşit bölmez)', () => {
    // Eşit bölme (50/50) beyan edilen KDV'yi yanlış çıkarır: bileşenlerin KDV
    // oranları farklı. Bu test eşit bölmeyi yakalar.
    const k = setCoz(setKalemi, [
      { sku: 'A', ad: 'Tabak', miktar: 1, satis_fiyati: 60, kdv_orani: 20 },
      { sku: 'B', ad: 'Fincan', miktar: 1, satis_fiyati: 40, kdv_orani: 10 },
    ])
    expect(k).toHaveLength(2)
    expect(k[0].satir_toplam).toBe(60)
    expect(k[1].satir_toplam).toBe(40)
    expect(k[0].kdv_orani).toBe(20)
    expect(k[1].kdv_orani).toBe(10)
  })

  test('kuruş artığı SON bileşene yazılır, toplam set fiyatını tutar', () => {
    const k = setCoz(setKalemi, [
      { sku: 'A', ad: 'X', miktar: 1, satis_fiyati: 50, kdv_orani: 20 },
      { sku: 'B', ad: 'Y', miktar: 1, satis_fiyati: 50, kdv_orani: 20 },
      { sku: 'C', ad: 'Z', miktar: 1, satis_fiyati: 50, kdv_orani: 20 },
    ])
    expect(k.map(x => x.satir_toplam)).toEqual([33.33, 33.33, 33.34])
    expect(k.reduce((t, x) => t + x.satir_toplam, 0)).toBe(100)
  })

  test('set adedi > 1: miktarlar ve tutarlar katlanır', () => {
    const k = setCoz({ ...setKalemi, miktar: 2 }, [
      { sku: 'A', ad: 'Tabak', miktar: 1, satis_fiyati: 60, kdv_orani: 20 },
      { sku: 'B', ad: 'Fincan', miktar: 3, satis_fiyati: 40, kdv_orani: 10 },
    ])
    expect(k[0].miktar).toBe(2)          // 1 × 2 set
    expect(k[1].miktar).toBe(6)          // 3 × 2 set
    expect(k[0].satir_toplam + k[1].satir_toplam).toBe(200)
  })

  test('birim fiyat satır toplamından türetilir (adaptörün toleransı içinde)', () => {
    const k = setCoz(setKalemi, [
      { sku: 'A', ad: 'X', miktar: 3, satis_fiyati: 50, kdv_orani: 20 },
    ])
    expect(k[0].miktar).toBe(3)
    expect(k[0].satir_toplam).toBe(100)
    expect(k[0].birim_fiyat).toBe(33.33)
    // Adaptör |satir_toplam − miktar×birim_fiyat| ≤ max(0,01; 0,005×miktar) ister
    const sapma = Math.abs(k[0].satir_toplam - k[0].miktar * k[0].birim_fiyat)
    expect(sapma).toBeLessThanOrEqual(Math.max(0.01, 0.005 * k[0].miktar) + 1e-9)
  })

  test('bileşen fiyatlarının toplamı 0 ise sıfıra bölünmez, Türkçe hata verir', () => {
    expect(() => setCoz(setKalemi, [
      { sku: 'A', ad: 'X', miktar: 1, satis_fiyati: 0, kdv_orani: 20 },
      { sku: 'B', ad: 'Y', miktar: 1, satis_fiyati: 0, kdv_orani: 20 },
    ])).toThrow(/fiyat/i)
  })

  test('bileşeni olmayan set çözülemez', () => {
    expect(() => setCoz(setKalemi, [])).toThrow(/bileşen/i)
  })

  test('SKU\'su olmayan bileşen çözülemez (faturaya yazılamaz)', () => {
    expect(() => setCoz(setKalemi, [
      { sku: '', ad: 'Kapaksız', miktar: 1, satis_fiyati: 50, kdv_orani: 20 },
    ])).toThrow(/SKU/)
  })

  test('hata sınıfı SetCozmeHatasi ve kod is_hatasi', () => {
    try { setCoz(setKalemi, []) } catch (e) {
      expect(e).toBeInstanceOf(SetCozmeHatasi)
      expect(e.kod).toBe('is_hatasi')
    }
  })

  test('KDV oranı bileşenden gelir, setten DEĞİL', () => {
    // Setin kendi kdv_orani alanı olsa bile bileşenlerinki kullanılmalı:
    // farklı oranlı bileşenler tek orana indirgenirse KDV beyanı yanlış olur.
    const k = setCoz({ ...setKalemi, kdv_orani: 20 }, [
      { sku: 'A', ad: 'X', miktar: 1, satis_fiyati: 50, kdv_orani: 1 },
      { sku: 'B', ad: 'Y', miktar: 1, satis_fiyati: 50, kdv_orani: 10 },
    ])
    expect(k.map(x => x.kdv_orani)).toEqual([1, 10])
  })
})
