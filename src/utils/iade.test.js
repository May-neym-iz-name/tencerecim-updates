import { describe, test, expect } from 'vitest'
import { tutarOzeti, kalemIadeDurumu } from './iade.js'

// İKİZ DOSYA KORUMASI: electron/ikas/iade-ozet.js içindeki tutarOzeti ile aynı
// sonucu vermeli. Aynı canlı vaka (#1381506566) iki testte de kullanılıyor.
describe('tutarOzeti', () => {
  test('canlı vaka #1381506566: 16.626 toplam, 3.646,50 iade → 12.979,50 kalan', () => {
    const o = tutarOzeti({ toplam: 16626, iade_tutari: 3646.5 }, [])
    expect(o.kalan).toBe(12979.5)
    expect(o.iadeVar).toBe(true)
    expect(o.tahmini).toBe(false)
  })

  test('ölçüm yoksa kalemlerden tahmin eder ve işaretler', () => {
    const o = tutarOzeti({ toplam: 1000 }, [{ birim_fiyat: 250, miktar: 2, iade_miktar: 1 }])
    expect(o.iade).toBe(250)
    expect(o.tahmini).toBe(true)
  })

  test('iadesiz sipariş', () => {
    const o = tutarOzeti({ toplam: 500, iade_tutari: 0 }, [{ birim_fiyat: 500, miktar: 1, iade_miktar: 0 }])
    expect(o.iadeVar).toBe(false)
    expect(o.kalan).toBe(500)
  })

  test('kalan negatife düşmez', () => {
    expect(tutarOzeti({ toplam: 100, iade_tutari: 150 }, []).kalan).toBe(0)
  })

  test('boş veride patlamaz', () => {
    expect(tutarOzeti(null, null).toplam).toBe(0)
  })
})

describe('kalemIadeDurumu', () => {
  test('tamamı iade', () => {
    expect(kalemIadeDurumu({ miktar: 1, iade_miktar: 1 })).toEqual({ tam: true, iade: 1 })
  })

  test('kısmen iade', () => {
    expect(kalemIadeDurumu({ miktar: 3, iade_miktar: 1 })).toEqual({ tam: false, iade: 1 })
  })

  test('iade yoksa null', () => {
    expect(kalemIadeDurumu({ miktar: 2, iade_miktar: 0 })).toBe(null)
    expect(kalemIadeDurumu({})).toBe(null)
  })
})
