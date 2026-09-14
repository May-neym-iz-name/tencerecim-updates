import { describe, it, expect } from 'vitest'
const { DIGER, modelCoz, sozlukHazirla } = require('./model-coz')

const sz = (...adlar) => sozlukHazirla(adlar.map(a =>
  typeof a === 'string' ? { model_adi: a } : a))

describe('model çözümleme sırası', () => {
  it('1. basamak: elle girilen model sözlüğü YENER', () => {
    const s = sz('Venüs')
    expect(modelCoz('Sofram Venüs 18 cm Derin Tencere', 'Atlas', s)).toBe('Atlas')
  })

  it('elle model boş/boşluk ise atlanır, sözlüğe düşülür', () => {
    const s = sz('Venüs')
    expect(modelCoz('Sofram Venüs 18 cm Derin Tencere', '   ', s)).toBe('Venüs')
    expect(modelCoz('Sofram Venüs 18 cm Derin Tencere', null, s)).toBe('Venüs')
    expect(modelCoz('Sofram Venüs 18 cm Derin Tencere', undefined, s)).toBe('Venüs')
  })

  it('2. basamak: sözlük adın HERHANGİ bir yerinde eşleşir (Lava: model ortada)', () => {
    const s = sz('Folk', 'Trendy')
    expect(modelCoz('YUVARLAK TENCERE Ç20 FOLK BEYAZ', null, s)).toBe('Folk')
  })

  it('3. basamak: hiçbiri yoksa "Diğer"', () => {
    expect(modelCoz('LACENA 24 CM TENCERE', null, sz('Venüs'))).toBe(DIGER)
    expect(modelCoz('Herhangi bir ürün', null, [])).toBe(DIGER)
    expect(modelCoz('', null, sz('Venüs'))).toBe(DIGER)
  })
})

describe('en uzun eşleşme kuralı', () => {
  // Spec'in "FOLK SABLE" örneği: kural olmadan hangisinin kazanacağı sorgu sırasına kalır.
  it('sözlükte "folk sable" VARKEN o kazanır (tek kelimelileri yener)', () => {
    const s = sz('Folk', 'Sable', 'Folk Sable')
    expect(modelCoz('LAVA FOLK SABLE GRİ 24 CM', null, s)).toBe('Folk Sable')
  })

  it('sözlükte "folk sable" YOKKEN öncelik karar verir (iki yönde de)', () => {
    const sableOnde = sz({ model_adi: 'Folk', oncelik: 0 }, { model_adi: 'Sable', oncelik: 5 })
    expect(modelCoz('LAVA FOLK SABLE GRİ 24 CM', null, sableOnde)).toBe('Sable')
    const folkOnde = sz({ model_adi: 'Folk', oncelik: 5 }, { model_adi: 'Sable', oncelik: 0 })
    expect(modelCoz('LAVA FOLK SABLE GRİ 24 CM', null, folkOnde)).toBe('Folk')
  })

  it('birleşik kayıt, önceliksiz tek kelimelileri yener', () => {
    const s = sz('Folk', 'Sable', 'Folk Sable')
    expect(modelCoz('LAVA FOLK SABLE GRİ 24 CM', null, s)).toBe('Folk Sable')
  })

  it('sonuç sözlüğün VERİLİŞ sırasından bağımsızdır', () => {
    const ad = 'LAVA FOLK SABLE GRİ 24 CM'
    expect(modelCoz(ad, null, sz('Folk', 'Sable', 'Folk Sable')))
      .toBe(modelCoz(ad, null, sz('Folk Sable', 'Sable', 'Folk')))
  })

  it('öncelik eşitse UZUN olan kazanır', () => {
    // folk (6) < sable (7): öncelikler eşit olduğunda uzunluk devreye girer.
    expect(modelCoz('LAVA FOLK SABLE GRİ 24 CM', null, sz('Folk', 'Sable'))).toBe('Sable')
  })

  it('öncelik ve uzunluk eşitse ad sırası belirler — sonuç yine kararlı', () => {
    const ad = 'LAVA GLAZE TREND 24 CM'
    expect(modelCoz(ad, null, sz('Glaze', 'Trend'))).toBe('Glaze')
    expect(modelCoz(ad, null, sz('Trend', 'Glaze'))).toBe('Glaze')
  })

  it('öncelik UZUNLUĞU yener — sözlük ekranından düzeltme mümkün olsun diye', () => {
    // Kullanıcı kararı 14.09: "Sable, Folk'un bir yüzeyi" denebilsin. Uzunluk önce
    // gelseydi sable her zaman kazanır, öncelik yükseltmek İŞE YARAMAZDI.
    const s = sz({ model_adi: 'Folk', oncelik: 5 }, { model_adi: 'Sable', oncelik: 0 })
    expect(modelCoz('LAVA FOLK SABLE GRİ 24 CM', null, s)).toBe('Folk')
  })
})

describe('Türkçe harf katlaması', () => {
  it('VENÜS / venüs / VENUS aynı modele düşer', () => {
    const s = sz('Venüs')
    for (const ad of ['SOFRAM VENÜS 22 CM', 'sofram venüs 22 cm', 'SOFRAM VENUS 22 CM'])
      expect(modelCoz(ad, null, s)).toBe('Venüs')
  })

  it('sözlük ASCII yazılmışsa da Türkçe adı yakalar', () => {
    expect(modelCoz('LAVA ÇEKİÇ DESENLİ 20 CM', null, sz('Cekic'))).toBe('Cekic')
  })

  it('i/ı ayrımı eşleşmeyi bozmaz (LİNES / LINES tuzağı)', () => {
    const s = sz('Lines Oscar')
    expect(modelCoz('LİNES OSCAR 18 X 10 ÇELİK TENCERE', null, s)).toBe('Lines Oscar')
    expect(modelCoz('LINES OSCAR 18 X 10 CELIK TENCERE', null, s)).toBe('Lines Oscar')
  })
})

describe('kelime sınırı', () => {
  it('model bir kelimenin İÇİNDE geçiyorsa eşleşmez', () => {
    expect(modelCoz('VENTOLIN ŞURUP', null, sz('Vento'))).toBe(DIGER)
    expect(modelCoz('SOFTWARE KUTUSU', null, sz('Soft'))).toBe(DIGER)
  })

  it('tam kelime olarak geçiyorsa eşleşir', () => {
    expect(modelCoz('FALEZ VENTO 24 CM TENCERE', null, sz('Vento'))).toBe('Vento')
  })

  it('noktalama kelime sınırı sayılır', () => {
    expect(modelCoz('FALEZ (VENTO) 24 CM', null, sz('Vento'))).toBe('Vento')
    expect(modelCoz('LAVA BLACK-LINE 24', null, sz('Black Line'))).toBe('Black Line')
  })
})

describe('sözlük hazırlama', () => {
  it('aktif=0 satırlar eşleştirmeye HİÇ girmez', () => {
    const s = sozlukHazirla([{ model_adi: 'Venüs', aktif: 0 }, { model_adi: 'Atlas', aktif: 1 }])
    expect(modelCoz('SOFRAM VENÜS 22 CM', null, s)).toBe(DIGER)
    expect(modelCoz('SOFRAM ATLAS 22 CM', null, s)).toBe('Atlas')
  })

  it('boş/bozuk satırlar sessizce atılır, çökmez', () => {
    const s = sozlukHazirla([null, { model_adi: '' }, { model_adi: '   ' }, { model_adi: 'Atlas' }])
    expect(s).toHaveLength(1)
    expect(modelCoz('SOFRAM ATLAS 22 CM', null, s)).toBe('Atlas')
  })

  it('sözlük verilmezse çökmez, "Diğer" döner', () => {
    expect(modelCoz('SOFRAM ATLAS', null, undefined)).toBe(DIGER)
    expect(modelCoz('SOFRAM ATLAS', null, null)).toBe(DIGER)
  })
})
