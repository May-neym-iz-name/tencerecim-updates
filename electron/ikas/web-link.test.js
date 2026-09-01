import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { adAnahtari, haritalariKur, slugCoz } = require('./web-link.js')

const urun = (name, slug, skular) => ({ name, metaData: slug ? { slug } : null, variants: (skular || []).map((s) => ({ sku: s })) })

describe('adAnahtari', () => {
  it('Türkçe harfleri katlar ve noktalamayı atar', () => {
    expect(adAnahtari("Gülsan Elit 3'lü Granit Tava Seti XXL (28-30-32 cm)"))
      .toBe('gulsan elit 3 lu granit tava seti xxl 28 30 32 cm')
  })

  it('iki boşluk ile bir boşluğu aynı sayar', () => {
    expect(adAnahtari('Falez Osteria 5 Parça  Döküm Granit Tencere Seti'))
      .toBe(adAnahtari('Falez Osteria 5 Parça Döküm Granit Tencere Seti'))
  })

  it('RAKAMLARI KORUR — 5 Parça ile 7 Parça ayrı kalmalı', () => {
    expect(adAnahtari('GÜLSAN Safran 5 Parça Tencere Seti'))
      .not.toBe(adAnahtari('GÜLSAN Safran 7 Parça Tencere Seti'))
  })
})

describe('slugCoz', () => {
  it('SKU tutuyorsa onu kullanır (ad farklı olsa bile)', () => {
    const h = haritalariKur([urun('ikas adı bambaşka', 'dogru-slug', ['TNC.SFR.00001'])])
    expect(slugCoz({ sku: 'TNC.SFR.00001', ad: 'Yerel Ad' }, h)).toEqual({ slug: 'dogru-slug', kaynak: 'sku' })
  })

  it('ikas ürününde SKU yoksa birebir ad ile çözer', () => {
    const h = haritalariKur([urun("Gülsan Elit 3'lü Granit Tava Seti XXL (28-30-32 cm)", 'gulsan-xxl', [])])
    const r = slugCoz({ sku: 'TNC.SET.00024', ad: "Gülsan Elit 3'lü Granit Tava Seti XXL (28-30-32 cm)" }, h)
    expect(r).toEqual({ slug: 'gulsan-xxl', kaynak: 'ad' })
  })

  it('ad tutmuyorsa null döner — yakın ad YETMEZ', () => {
    const h = haritalariKur([urun('Sofram Soft 7 Parça Tencere Seti', 'soft-7', [])])
    expect(slugCoz({ sku: 'TNC.SFR.00046', ad: 'Sofram Soft 6 Parça Tencere Seti' }, h)).toBe(null)
  })

  it('aynı ada iki ikas ürünü düşerse BELİRSİZ sayar ve atlar', () => {
    const h = haritalariKur([urun('Aynı Ürün', 'slug-a', []), urun('AYNI  ürün', 'slug-b', [])])
    expect(slugCoz({ sku: 'X', ad: 'Aynı Ürün' }, h)).toBe(null)
  })

  it('slug’ı olmayan ikas ürünü hiçbir haritaya girmez', () => {
    const h = haritalariKur([urun('Slugsuz Ürün', null, ['TNC.X.1'])])
    expect(h.slugsuz).toEqual(['Slugsuz Ürün'])
    expect(slugCoz({ sku: 'TNC.X.1', ad: 'Slugsuz Ürün' }, h)).toBe(null)
  })

  it('skusuz listesi ikas tarafında düzeltilecekleri raporlar', () => {
    const h = haritalariKur([urun('SKU yok', 'slug-x', []), urun('SKU var', 'slug-y', ['A'])])
    expect(h.skusuz).toEqual(['SKU yok'])
  })
})
