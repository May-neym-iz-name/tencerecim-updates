import { describe, test, expect } from 'vitest'
const { _durumBirlestir: durumBirlestir } = require('./fatura-stok')

// urunler: yerel SQLite'tan gelen satırlar (gercek_miktar tüm lokasyonların toplamı)
const URUNLER = [
  { urun_id: 1, urun_adi: 'Tencere', sku: 'TNC.LAV.00001', barkod: '869001', senk_id: 'u1', gercek_miktar: 9 },
  { urun_id: 2, urun_adi: 'Tava',    sku: 'TNC.LAV.00002', barkod: '869002', senk_id: 'u2', gercek_miktar: 4 },
]

describe('durumBirlestir', () => {
  test('senk_id üzerinden fatura stoğunu eşleştirir ve farkı hesaplar', () => {
    const s = durumBirlestir(URUNLER, [{ urun_senk_id: 'u1', miktar: 12 }], {})
    const tencere = s.find(x => x.urun_id === 1)
    expect(tencere.fatura_miktar).toBe(12)
    expect(tencere.gercek_miktar).toBe(9)
    expect(tencere.fark).toBe(3)
  })

  test('bulutta karşılığı olmayan ürünü 0 sayar ve negatif fark verir', () => {
    const s = durumBirlestir(URUNLER, [{ urun_senk_id: 'u1', miktar: 12 }], {})
    const tava = s.find(x => x.urun_id === 2)
    expect(tava.fatura_miktar).toBe(0)
    expect(tava.fark).toBe(-4)
  })

  test('sadece_eksik yalnız negatif farkları döndürür', () => {
    const s = durumBirlestir(URUNLER, [{ urun_senk_id: 'u1', miktar: 12 }], { sadece_eksik: true })
    expect(s.map(x => x.urun_id)).toEqual([2])
  })

  test('senk_id henüz atanmamış ürün çökmez, fatura stoğu 0 sayılır', () => {
    const s = durumBirlestir([{ urun_id: 3, urun_adi: 'Yeni', sku: null, barkod: null, senk_id: null, gercek_miktar: 2 }], [], {})
    expect(s[0].fatura_miktar).toBe(0)
    expect(s[0].fark).toBe(-2)
  })
})
