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

describe('durumBirlestir — bulut/yerel kimlik biçimi (01.09.2026 canlı hatası)', () => {
  // Yerel SQLite senk_id TİRESİZ üretir; Postgres uuid tipi TİRELİ döndürür.
  // Normalize edilmezse hiçbir ürün eşleşmez: bulutta 238 satır varken ekranda
  // her ürünün fatura stoğu 0 görünüyordu ve hiçbir hata patlamıyordu.
  const YEREL = '8e109721a3730efcfcf45126842f5606'
  const BULUT = '8e109721-a373-0efc-fcf4-5126842f5606'

  test('tireli bulut uuid, tiresiz yerel senk_id ile EŞLEŞİR', () => {
    const s = durumBirlestir(
      [{ urun_id: 1, urun_adi: 'Fagor Duo 6 lt', sku: 'TNC.FGR.00006', barkod: null, senk_id: YEREL, gercek_miktar: 0 }],
      [{ urun_senk_id: BULUT, miktar: 26 }], {})
    expect(s[0].fatura_miktar).toBe(26)
    expect(s[0].fark).toBe(26)
  })

  test('büyük harfli uuid de eşleşir', () => {
    const s = durumBirlestir(
      [{ urun_id: 1, urun_adi: 'X', sku: 'S', barkod: null, senk_id: YEREL, gercek_miktar: 0 }],
      [{ urun_senk_id: BULUT.toUpperCase(), miktar: 5 }], {})
    expect(s[0].fatura_miktar).toBe(5)
  })

  test('gerçekten farklı kimlik eşleşmez (normalize gevşetme yapmıyor)', () => {
    const s = durumBirlestir(
      [{ urun_id: 1, urun_adi: 'X', sku: 'S', barkod: null, senk_id: YEREL, gercek_miktar: 0 }],
      [{ urun_senk_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', miktar: 5 }], {})
    expect(s[0].fatura_miktar).toBe(0)
  })
})
