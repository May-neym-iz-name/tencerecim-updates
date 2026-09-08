import { describe, it, expect } from 'vitest'
import ikas from './index.js'

// `sellPrice` LİSTE fiyatıdır; müşterinin ödediği indirim varsa `discountPrice`'tır.
// 08.09.2026'da otomasyon ürünlerinin 10'unda indirim ölçüldü — yalnız sellPrice okunsaydı
// müşteriye FAZLA fiyat söylenecekti. Bu testler o seçimi sabitler.
const f = ikas._musterininOdedigi

describe('müşterinin ödediği fiyat (liste vs indirimli)', () => {
  it('indirim varsa İNDİRİMLİ fiyatı döner', () => {
    expect(f({ sellPrice: 7129, discountPrice: 5550 })).toBe(5550)
    expect(f({ sellPrice: 10900, discountPrice: 9265 })).toBe(9265)
  })
  it('indirim yoksa liste fiyatını döner', () => {
    expect(f({ sellPrice: 2750, discountPrice: null })).toBe(2750)
    expect(f({ sellPrice: 2750 })).toBe(2750)
  })
  it('indirim 0 ise YOK SAYILIR (0 TL fiyat gönderilmez)', () => {
    expect(f({ sellPrice: 2750, discountPrice: 0 })).toBe(2750)
  })
  it('indirim listeden BÜYÜKSE yok sayılır (bozuk veri)', () => {
    expect(f({ sellPrice: 2750, discountPrice: 3000 })).toBe(2750)
  })
  it('fiyat yoksa null döner — çağıran yerel fiyata düşer', () => {
    expect(f(null)).toBeNull()
    expect(f(undefined)).toBeNull()
    expect(f({ sellPrice: 0 })).toBeNull()
  })
})
