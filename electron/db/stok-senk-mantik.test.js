// Kanal stok senkronu saf mantığı. Gerçek ölçüm (13.09.2026): ikas'ta 3, Trendyol'da 1
// olan ürünler var; 424 ikas varyantının 161'i Trendyol'da eşleşiyor.
import { describe, test, expect } from 'vitest'
const M = await import('./stok-senk-mantik.js')
const { planUret, parcala, tersPlan, durumGecisi, tekrarKorumasiBitisi, partiSonucuIsle, miktarSinirla } = M

// Ölçülmüş gerçek bir satır (paralel oturumun eslesme.json çıktısından).
const GERCEK = { barkod: '2004406300304', ad: 'Maxx Doria Steel Fusion 24 Cm Basık Tencere' }

describe('planUret', () => {
  test('kaynak adedini hedefe yazar (ikas 3 → Trendyol 1 ise gönderilir)', () => {
    const p = planUret({
      kaynak: [{ ...GERCEK, miktar: 3 }],
      hedef: [{ barkod: GERCEK.barkod, miktar: 1, durum: 'onayli' }],
    })
    expect(p.gonderilecek).toEqual([{ barkod: GERCEK.barkod, ad: GERCEK.ad, eski_miktar: 1, yeni_miktar: 3 }])
    expect(p.ozet.artacak).toBe(1)
  })

  test('eşit olanı göndermez (gereksiz istek = 15 dk koruması riski)', () => {
    const p = planUret({ kaynak: [{ barkod: 'B', miktar: 5 }], hedef: [{ barkod: 'B', miktar: 5, durum: 'onayli' }] })
    expect(p.gonderilecek).toHaveLength(0)
    expect(p.degismeyen).toHaveLength(1)
  })

  test('kaynakta 0 ise hedefi sıfırlar ve AYRI sayar', () => {
    const p = planUret({ kaynak: [{ barkod: 'B', miktar: 0 }], hedef: [{ barkod: 'B', miktar: 4, durum: 'onayli' }] })
    expect(p.gonderilecek[0].yeni_miktar).toBe(0)
    expect(p.ozet.sifirlanacak).toBe(1)
    expect(p.ozet.azalacak).toBe(1)
  })

  test('onaylı olmayan ürün gönderime GİRMEZ, gerekçesiyle listelenir', () => {
    const p = planUret({
      kaynak: [{ barkod: 'A', miktar: 3 }, { barkod: 'B', miktar: 3 }, { barkod: 'C', miktar: 3 }],
      hedef: [
        { barkod: 'A', miktar: 1, durum: 'onaysiz' },
        { barkod: 'B', miktar: 1, durum: 'arsiv' },
        { barkod: 'C', miktar: 1, durum: 'kilitli' },
      ],
    })
    expect(p.gonderilecek).toHaveLength(0)
    expect(p.gonderilemez.map(g => g.sebep)).toEqual([
      'Trendyol onayı bekliyor', "Trendyol'da arşivli", "Trendyol'da kilitli",
    ])
  })

  test('hedefte olmayan barkod eşleşmeyen listesine düşer, plana girmez', () => {
    const p = planUret({ kaynak: [{ barkod: 'YOK', miktar: 3 }], hedef: [] })
    expect(p.gonderilecek).toHaveLength(0)
    expect(p.eslesmeyen).toEqual([{ barkod: 'YOK', ad: null, miktar: 3 }])
  })

  test('barkod boşlukları kırpılır — aynı ürün iki kanalda eşleşir', () => {
    const p = planUret({ kaynak: [{ barkod: ' 123 ', miktar: 2 }], hedef: [{ barkod: '123', miktar: 0, durum: 'onayli' }] })
    expect(p.gonderilecek).toHaveLength(1)
  })

  test('barkodsuz kaynak satırı hiçbir listeye girmez', () => {
    const p = planUret({ kaynak: [{ barkod: null, miktar: 2 }, { barkod: '', miktar: 1 }], hedef: [] })
    expect(p.gonderilecek).toHaveLength(0)
    expect(p.eslesmeyen).toHaveLength(0)
  })

  test('boş girdi boş plan üretir', () => {
    expect(planUret().ozet.toplam).toBe(0)
    expect(planUret({}).gonderilecek).toEqual([])
  })
})

describe('miktarSinirla', () => {
  test('negatif ve tanımsız 0 olur (satışta bırakmak aşırı satış riski)', () => {
    expect(miktarSinirla(-5)).toBe(0)
    expect(miktarSinirla(null)).toBe(0)
    expect(miktarSinirla('abc')).toBe(0)
  })
  test('Trendyol tavanı 20.000 uygulanır', () => {
    expect(miktarSinirla(99999)).toBe(20000)
  })
  test('ondalık aşağı yuvarlanır', () => {
    expect(miktarSinirla(3.9)).toBe(3)
  })
})

describe('parcala', () => {
  test('1000 kalemi tek partide bırakır, 1001 kalemi ikiye böler', () => {
    expect(parcala(Array(1000).fill({}))).toHaveLength(1)
    const iki = parcala(Array(1001).fill({}))
    expect(iki).toHaveLength(2)
    expect(iki[1]).toHaveLength(1)
  })
  test('boş girdide HİÇ parti üretmez (boş istek atılmasın)', () => {
    expect(parcala([])).toEqual([])
    expect(parcala(undefined)).toEqual([])
  })
})

describe('tersPlan', () => {
  test('anlık görüntüdeki eski miktarı geri yazar', () => {
    expect(tersPlan([{ barkod: 'B', ad: 'X', eski_miktar: 1, yeni_miktar: 3, sonuc: 'basarili' }]))
      .toEqual([{ barkod: 'B', ad: 'X', eski_miktar: 3, yeni_miktar: 1 }])
  })
  test('gönderilememiş kalemi geri ALMAZ (hedefte değişiklik olmadı)', () => {
    expect(tersPlan([{ barkod: 'B', eski_miktar: 1, yeni_miktar: 3, sonuc: 'hata' }])).toEqual([])
  })
  test('değişmeyen kalem ters plana girmez', () => {
    expect(tersPlan([{ barkod: 'B', eski_miktar: 2, yeni_miktar: 2, sonuc: 'basarili' }])).toEqual([])
  })
})

describe('durumGecisi', () => {
  test('hazır → uygulandı geçerli', () => {
    expect(durumGecisi('hazir', 'uygulandi')).toBe('uygulandi')
  })
  test('uygulandı → hazır YASAK (ikinci kez gönderim demek)', () => {
    expect(() => durumGecisi('uygulandi', 'hazir')).toThrow(/Geçersiz durum geçişi/)
  })
  test('geri alınmış işlem tekrar geri alınamaz', () => {
    expect(() => durumGecisi('geri_alindi', 'geri_alindi')).toThrow()
  })
  test('bilinmeyen durum sessizce geçmez', () => {
    expect(() => durumGecisi('uyduruk', 'uygulandi')).toThrow(/Bilinmeyen işlem durumu/)
  })
})

describe('tekrarKorumasiBitisi', () => {
  test('uygulamadan 15 dakika sonrasını verir', () => {
    const t = Date.parse('2026-09-13T18:00:00Z')
    expect(tekrarKorumasiBitisi(t)).toBe(Date.parse('2026-09-13T18:15:00Z'))
  })
  test('uygulanmamış işlemde null', () => {
    expect(tekrarKorumasiBitisi(null)).toBe(null)
  })
})

describe('partiSonucuIsle', () => {
  test('dönmeyen kalem başarılı, dönen kalem gerekçesiyle hatalı sayılır', () => {
    const s = partiSonucuIsle(
      [{ barkod: 'A' }, { barkod: 'B' }],
      [{ barcode: 'B', failureReasons: ['Ürün bulunamadı'] }],
    )
    expect(s[0]).toMatchObject({ barkod: 'A', sonuc: 'basarili', hata: null })
    expect(s[1]).toMatchObject({ barkod: 'B', sonuc: 'hata', hata: 'Ürün bulunamadı' })
  })
  test('hata listesi boşsa hepsi başarılı', () => {
    expect(partiSonucuIsle([{ barkod: 'A' }], []).every(k => k.sonuc === 'basarili')).toBe(true)
  })
})
