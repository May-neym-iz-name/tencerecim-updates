import { describe, test, expect } from 'vitest'
import { createRequire } from 'module'

const require_ = createRequire(import.meta.url)
const { kalemIadeMiktari, iadeToplami, etiketKalemleri, tutarOzeti } = require_('./iade-ozet.js')

describe('kalemIadeMiktari', () => {
  test('REFUNDED kalemin tamamı iadedir', () => {
    expect(kalemIadeMiktari({ status: 'REFUNDED', quantity: 2 })).toBe(2)
  })

  // ASIL KORUMA: talep/red aşamasındaki ürün müşteriye GİDER. İade sayılırsa
  // etiketten düşer ve kutuya eksik ürün konur.
  test('talep ve red aşamaları iade DEĞİLDİR', () => {
    expect(kalemIadeMiktari({ status: 'REFUND_REQUESTED', quantity: 1 })).toBe(0)
    expect(kalemIadeMiktari({ status: 'REFUND_REJECTED', quantity: 1 })).toBe(0)
    expect(kalemIadeMiktari({ status: 'FULFILLED', quantity: 1 })).toBe(0)
  })

  test('boş/eksik veride patlamaz', () => {
    expect(kalemIadeMiktari(null)).toBe(0)
    expect(kalemIadeMiktari({})).toBe(0)
  })
})

describe('iadeToplami', () => {
  // CANLI VERİ #1381506566: PayTR 3 kez FAILED döndü, 4. deneme SUCCESS oldu.
  // FAILED'lar sayılırsa iade 14.586 TL görünür — gerçekte 3.646,50 TL.
  test('yalnız BAŞARILI iade işlemleri sayılır', () => {
    const islemler = [
      { type: 'SALE', status: 'SUCCESS', amount: 16626 },
      { type: 'REFUND', status: 'FAILED', amount: 3646.5 },
      { type: 'REFUND', status: 'FAILED', amount: 3646.5 },
      { type: 'REFUND', status: 'FAILED', amount: 3646.5 },
      { type: 'REFUND', status: 'SUCCESS', amount: 3646.5 },
    ]
    expect(iadeToplami(islemler)).toBe(3646.5)
  })

  test('birden fazla başarılı iade toplanır', () => {
    expect(iadeToplami([
      { type: 'REFUND', status: 'SUCCESS', amount: 100.25 },
      { type: 'REFUND', status: 'SUCCESS', amount: 50.1 },
    ])).toBe(150.35)
  })

  test('iade yoksa 0', () => {
    expect(iadeToplami([{ type: 'SALE', status: 'SUCCESS', amount: 990 }])).toBe(0)
    expect(iadeToplami([])).toBe(0)
    expect(iadeToplami(null)).toBe(0)
  })
})

describe('etiketKalemleri', () => {
  // Kullanıcı kararı (2026-08-21): iade edilen ürün etiketten TAMAMEN çıksın.
  test('tamamı iade edilen kalem etiketten düşer', () => {
    const k = [
      { urun_adi: 'Krep Tava', miktar: 1, iade_miktar: 0 },
      { urun_adi: '26 Cm Tava', miktar: 1, iade_miktar: 1 },
    ]
    const c = etiketKalemleri(k)
    expect(c).toHaveLength(1)
    expect(c[0].urun_adi).toBe('Krep Tava')
  })

  test('kısmen iade edilen kalemde KALAN adet yazılır', () => {
    const c = etiketKalemleri([{ urun_adi: 'Tava', miktar: 3, iade_miktar: 1 }])
    expect(c).toHaveLength(1)
    expect(c[0].miktar).toBe(2)
  })

  test('iade_miktar miktarı aşarsa kalem düşer (negatif adet yazılmaz)', () => {
    expect(etiketKalemleri([{ miktar: 1, iade_miktar: 5 }])).toHaveLength(0)
  })

  test('iadesiz sipariş aynen kalır', () => {
    const k = [{ urun_adi: 'A', miktar: 2 }, { urun_adi: 'B', miktar: 1 }]
    expect(etiketKalemleri(k)).toHaveLength(2)
    expect(etiketKalemleri(k)[0].miktar).toBe(2)
  })
})

describe('tutarOzeti', () => {
  // CANLI VERİ #1381506566
  test('ölçülen iade tutarı kalan tutarı verir', () => {
    const o = tutarOzeti({ toplam: 16626, iade_tutari: 3646.5 }, [])
    expect(o.iade).toBe(3646.5)
    expect(o.kalan).toBe(12979.5)
    expect(o.tahmini).toBe(false)
    expect(o.iadeVar).toBe(true)
  })

  test('ölçüm yoksa kalem fiyatlarından tahmin edilir ve tahmini işaretlenir', () => {
    const o = tutarOzeti({ toplam: 1000, iade_tutari: 0 },
      [{ birim_fiyat: 250, miktar: 2, iade_miktar: 1 }])
    expect(o.iade).toBe(250)
    expect(o.kalan).toBe(750)
    expect(o.tahmini).toBe(true)
  })

  test('iadesiz siparişte iadeVar false ve kalan = toplam', () => {
    const o = tutarOzeti({ toplam: 500, iade_tutari: 0 }, [{ birim_fiyat: 500, miktar: 1, iade_miktar: 0 }])
    expect(o.iadeVar).toBe(false)
    expect(o.kalan).toBe(500)
  })

  test('iade toplamı aşarsa kalan negatife düşmez', () => {
    expect(tutarOzeti({ toplam: 100, iade_tutari: 150 }, []).kalan).toBe(0)
  })
})
