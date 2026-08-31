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

  test('arama ürün adı, SKU ve barkodda Türkçe duyarlı eşleşir', () => {
    const s = durumBirlestir(URUNLER, [], { arama: 'TENCERE' })
    expect(s.map(x => x.urun_id)).toEqual([1])
  })

  test('ASCII klavyeyle yazılan ürün adı ASCII aramayla eşleşir (noktasız I tuzağı)', () => {
    // Ürün adı ASCII "LINES" (noktasız I, U+0049) iken arama da ASCII "lines"
    // (düz i). Ham toLocaleLowerCase('tr') "LINES" → "lınes" (noktasız ı!)
    // üretirdi ve "lines" ile EŞLEŞMEZDİ — kullanıcı ASCII klavyeyle ürün adı
    // girdiğinde tam olarak bu tuzağa düşülüyordu. tr-arama.js'in eslesirMi'si
    // harfleri katlayarak bunu çözer.
    const urunler = [
      { urun_id: 10, urun_adi: 'LINES Tencere', sku: 'TNC.LNS.00001', barkod: '111', senk_id: 'u10', gercek_miktar: 1 },
      { urun_id: 11, urun_adi: 'LAVA Tencere', sku: 'TNC.LAV.00099', barkod: '222', senk_id: 'u11', gercek_miktar: 1 },
    ]
    const s = durumBirlestir(urunler, [], { arama: 'lines' })
    expect(s.map(x => x.urun_id)).toEqual([10])
  })

  test('çok kelimeli arama kelime sırasından bağımsız eşleşir', () => {
    // tr-arama ortak modülü kelime-bazlı AND yapar (eski kod tek bitişik
    // alt-dize arıyordu) — bu ekranda da çalıştığını kanıtlar.
    const urunler = [
      { urun_id: 20, urun_adi: 'Lava Tencere', sku: 'TNC.LAV.00050', barkod: '333', senk_id: 'u20', gercek_miktar: 1 },
      { urun_id: 21, urun_adi: 'Saflon Tava', sku: 'TNC.SFL.00010', barkod: '444', senk_id: 'u21', gercek_miktar: 1 },
    ]
    const s = durumBirlestir(urunler, [], { arama: 'tencere lava' })
    expect(s.map(x => x.urun_id)).toEqual([20])
  })
})
