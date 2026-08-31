// alis_fiyati KDV HARİÇ tutulur, ekranda KDV DAHİL de gösterilir (31.08.2026 kararı).
// Türetme yanlış olursa kullanıcı maliyeti olduğundan düşük/yüksek görür ve
// fiyatlama kararını buna göre verir; bu yüzden sınır durumları sabitlenir.
import { describe, test, expect } from 'vitest'
import { kdvDahil, paraYaz, VARSAYILAN_KDV } from './kdv.js'

describe('kdvDahil', () => {
  test('%20 KDV ekler', () => {
    expect(kdvDahil(481.06, 20)).toBe(577.27)
  })

  test('%10 KDV ekler', () => {
    expect(kdvDahil(1000, 10)).toBe(1100)
  })

  test('KDV oranı 0 ise tutar değişmez', () => {
    // 0 geçerli bir orandır; varsayılana DÜŞMEMELİ.
    expect(kdvDahil(500, 0)).toBe(500)
  })

  test('oran verilmezse varsayılan %20 kullanılır', () => {
    expect(kdvDahil(100)).toBe(120)
    expect(VARSAYILAN_KDV).toBe(20)
  })

  test('oran boş/geçersizse varsayılana düşer', () => {
    expect(kdvDahil(100, null)).toBe(120)
    expect(kdvDahil(100, undefined)).toBe(120)
    expect(kdvDahil(100, '')).toBe(120)
  })

  test('oran metin olarak gelirse de çalışır (form input string döndürür)', () => {
    expect(kdvDahil('100', '20')).toBe(120)
  })

  test('alış fiyatı girilmemişse null döner (0 TL yazmaz)', () => {
    expect(kdvDahil(0, 20)).toBeNull()
    expect(kdvDahil(null, 20)).toBeNull()
    expect(kdvDahil('', 20)).toBeNull()
    expect(kdvDahil('abc', 20)).toBeNull()
  })

  test('kuruş yuvarlaması 2 haneye sabittir', () => {
    // 1096,8467 x 1,20 = 1316,21604 -> 1316,22
    expect(kdvDahil(1096.8467, 20)).toBe(1316.22)
  })
})

describe('paraYaz', () => {
  test('Türkçe binlik/ondalık biçimi', () => {
    expect(paraYaz(1234.5)).toBe('₺1.234,50')
  })

  test('boş değerde tire', () => {
    expect(paraYaz(null)).toBe('—')
    expect(paraYaz(undefined)).toBe('—')
  })
})
