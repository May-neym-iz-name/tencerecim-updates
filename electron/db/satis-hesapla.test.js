import { describe, test, expect } from 'vitest'
import satisHesaplaModule from './satis-hesapla.js'

const { satisHesapla, kalemHesapla, yuvarla } = satisHesaplaModule

describe('yuvarla', () => {
  test('iki ondalık basamağa yuvarlar', () => {
    expect(yuvarla(10.126)).toBe(10.13)
    expect(yuvarla(10.124)).toBe(10.12)
  })
})

describe('kalemHesapla', () => {
  test('KDV dahil fiyattan net ve KDV ayrıştırır (%20)', () => {
    // 120 TL KDV dahil, %20 KDV → net 100, KDV 20
    const h = kalemHesapla({ miktar: 1, birim_fiyat: 120, kdv_orani: 20 })
    expect(yuvarla(h.toplam)).toBe(120)
    expect(yuvarla(h.kdv)).toBe(20)
    expect(yuvarla(h.net)).toBe(100)
    expect(h.iskonto).toBe(0)
  })

  test('miktar ile çarpar', () => {
    const h = kalemHesapla({ miktar: 3, birim_fiyat: 120, kdv_orani: 20 })
    expect(yuvarla(h.toplam)).toBe(360)
  })

  test('kalem iskontosu uygular', () => {
    // 100 TL, %10 iskonto → 90 TL toplam
    const h = kalemHesapla({ miktar: 1, birim_fiyat: 100, kdv_orani: 20, iskonto_orani: 10 })
    expect(yuvarla(h.toplam)).toBe(90)
    expect(yuvarla(h.iskontoTutari)).toBe(10)
  })

  test('genel iskonto ile kalem iskontosunun büyüğünü uygular', () => {
    const h = kalemHesapla({ miktar: 1, birim_fiyat: 100, kdv_orani: 20, iskonto_orani: 5 }, 15)
    expect(h.iskonto).toBe(15)
    expect(yuvarla(h.toplam)).toBe(85)
  })

  test('geçersiz miktarda hata fırlatır', () => {
    expect(() => kalemHesapla({ miktar: 0, birim_fiyat: 100, kdv_orani: 20 })).toThrow()
    expect(() => kalemHesapla({ miktar: -1, birim_fiyat: 100, kdv_orani: 20 })).toThrow()
  })

  test('geçersiz fiyatta hata fırlatır', () => {
    expect(() => kalemHesapla({ miktar: 1, birim_fiyat: -5, kdv_orani: 20 })).toThrow()
  })
})

describe('satisHesapla', () => {
  test('çok kalemli toplamları doğru hesaplar', () => {
    const sonuc = satisHesapla([
      { miktar: 2, birim_fiyat: 120, kdv_orani: 20 }, // 240 dahil, KDV 40, net 200
      { miktar: 1, birim_fiyat: 50, kdv_orani: 20 },  // 50 dahil, KDV ~8.33
    ])
    expect(sonuc.genelToplam).toBe(290)
    expect(sonuc.kdvToplam).toBe(48.33)
    expect(sonuc.araToplam).toBe(241.67)
  })

  test('farklı KDV oranlarını destekler', () => {
    const sonuc = satisHesapla([
      { miktar: 1, birim_fiyat: 110, kdv_orani: 10 }, // net 100, KDV 10
      { miktar: 1, birim_fiyat: 120, kdv_orani: 20 }, // net 100, KDV 20
    ])
    expect(sonuc.genelToplam).toBe(230)
    expect(sonuc.kdvToplam).toBe(30)
    expect(sonuc.araToplam).toBe(200)
  })

  test('boş kalem listesinde hata fırlatır', () => {
    expect(() => satisHesapla([])).toThrow()
    expect(() => satisHesapla(null)).toThrow()
  })

  test('genel iskonto tüm kalemlere uygulanır', () => {
    const sonuc = satisHesapla([
      { miktar: 1, birim_fiyat: 100, kdv_orani: 20 },
      { miktar: 1, birim_fiyat: 200, kdv_orani: 20 },
    ], 10)
    // 300 → %10 iskonto → 270
    expect(sonuc.genelToplam).toBe(270)
    expect(sonuc.iskontoToplam).toBe(30)
  })
})
