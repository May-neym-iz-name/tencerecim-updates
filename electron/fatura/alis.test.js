import { describe, test, expect } from 'vitest'
const { kalemleriHesapla } = require('./alis')

describe('kalemleriHesapla', () => {
  test('KDV dahil fiyattan satır toplamı ve KDV ayrıştırır', () => {
    const s = kalemleriHesapla([
      { urun_id: 1, urun_adi: 'Tencere', miktar: 2, birim_fiyat: 120, kdv_orani: 20 },
    ])
    expect(s.kalemler[0].satir_toplam).toBe(240)
    expect(s.kdvToplam).toBe(40)      // 240 × 20/120
    expect(s.araToplam).toBe(200)
    expect(s.genelToplam).toBe(240)
  })

  test('farklı KDV oranlarını satır bazında ayrı hesaplar', () => {
    const s = kalemleriHesapla([
      { urun_id: 1, urun_adi: 'A', miktar: 1, birim_fiyat: 120, kdv_orani: 20 },
      { urun_id: 2, urun_adi: 'B', miktar: 1, birim_fiyat: 110, kdv_orani: 10 },
    ])
    expect(s.kdvToplam).toBe(30)      // 20 + 10
    expect(s.genelToplam).toBe(230)
  })

  test('boş kalem listesinde sıfır döndürür', () => {
    const s = kalemleriHesapla([])
    expect(s.genelToplam).toBe(0)
    expect(s.kalemler).toEqual([])
  })
})
