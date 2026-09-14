import { describe, test, expect } from 'vitest'
import { tutarOzeti, kalemToplami, kalemDustuMu } from './trendyolTutar'

const kalem = (o = {}) => ({ birim_fiyat: 100, miktar: 1, kalem_durum: 'Shipped', ...o })

describe('kalemToplami', () => {
  test('birim fiyatı miktarla ÇARPAR, bölmez', () => {
    expect(kalemToplami(kalem({ birim_fiyat: 250, miktar: 3 }))).toBe(750)
  })

  test('eksik veya bozuk sayılarda 0 döner, NaN yaymaz', () => {
    expect(kalemToplami({ birim_fiyat: 'abc', miktar: 2 })).toBe(0)
    expect(kalemToplami({})).toBe(0)
    expect(kalemToplami(null)).toBe(0)
  })
})

describe('kalemDustuMu', () => {
  test('iptal, iade ve tedarik edilemedi düşer', () => {
    expect(kalemDustuMu(kalem({ kalem_durum: 'Cancelled' }))).toBe(true)
    expect(kalemDustuMu(kalem({ kalem_durum: 'Returned' }))).toBe(true)
    expect(kalemDustuMu(kalem({ kalem_durum: 'UnSupplied' }))).toBe(true)
  })

  test('teslim edilemedi DÜŞMEZ — koli geri dönerken hâlâ satıştır', () => {
    expect(kalemDustuMu(kalem({ kalem_durum: 'UnDelivered' }))).toBe(false)
  })

  test('normal akış statüleri düşmez', () => {
    for (const d of ['Created', 'Picking', 'Invoiced', 'Shipped', 'Delivered']) {
      expect(kalemDustuMu(kalem({ kalem_durum: d }))).toBe(false)
    }
  })
})

describe('tutarOzeti', () => {
  test('kalem yoksa paket toplamını kullanır ve "düşen bilinmiyor" der', () => {
    const o = tutarOzeti({ toplam: 1234.5 }, null)
    expect(o.toplam).toBe(1234.5)
    expect(o.kalan).toBe(1234.5)
    expect(o.dusenVar).toBe(false)
    expect(o.kalemlerden).toBe(false)
  })

  test('boş kalem dizisi de paket toplamına düşer', () => {
    expect(tutarOzeti({ toplam: 90 }, []).kalemlerden).toBe(false)
  })

  test('kalemler varsa toplamı KALEMLERDEN hesaplar, paket toplamına güvenmez', () => {
    // Paket toplamı kasten yanlış: iade sonrası güncellenmemiş bir değeri temsil ediyor.
    const o = tutarOzeti({ toplam: 9999 }, [
      kalem({ birim_fiyat: 200, miktar: 2 }),
      kalem({ birim_fiyat: 50, miktar: 1 }),
    ])
    expect(o.toplam).toBe(450)
    expect(o.kalan).toBe(450)
    expect(o.kalemlerden).toBe(true)
  })

  test('iptal edilen kalem toplamdan düşer, kalan doğru kalır', () => {
    const o = tutarOzeti({ toplam: 0 }, [
      kalem({ birim_fiyat: 300, miktar: 2 }),                            // 600 satışta
      kalem({ birim_fiyat: 100, miktar: 1, kalem_durum: 'Cancelled' }),  // 100 düştü
    ])
    expect(o.toplam).toBe(700)
    expect(o.dusen).toBe(100)
    expect(o.kalan).toBe(600)
    expect(o.dusenVar).toBe(true)
  })

  test('tüm kalemler iade ise kalan sıfırdır', () => {
    const o = tutarOzeti({ toplam: 0 }, [
      kalem({ birim_fiyat: 120, miktar: 2, kalem_durum: 'Returned' }),
    ])
    expect(o.toplam).toBe(240)
    expect(o.dusen).toBe(240)
    expect(o.kalan).toBe(0)
    expect(o.dusenVar).toBe(true)
  })

  test('birim_indirim tutara KARIŞMAZ — ölçülmemiş alan para hesabına girmez', () => {
    const o = tutarOzeti({ toplam: 0 }, [
      kalem({ birim_fiyat: 100, miktar: 2, birim_indirim: 40 }),
    ])
    expect(o.toplam).toBe(200)
    expect(o.kalan).toBe(200)
  })
})
