import { describe, test, expect } from 'vitest'
const { setVaryantEslestir, _anahtar } = require('./set-varyant')

const harita = new Map([
  ['TNC.SET.00001', 'v-1'],
  ['TNC.SET.00002', 'v-2'],
])

describe('setVaryantEslestir', () => {
  test('SKU ile eşleşen setlerin varyant kimliğini üretir', () => {
    const s = setVaryantEslestir([
      { id: 1, ad: 'Kahvaltı Seti', sku: 'TNC.SET.00001', ikas_varyant_id: null },
      { id: 2, ad: 'Çay Seti', sku: 'TNC.SET.00002', ikas_varyant_id: null },
    ], harita)
    expect(s.eslesen).toEqual([
      { id: 1, ikas_varyant_id: 'v-1' },
      { id: 2, ikas_varyant_id: 'v-2' },
    ])
    expect(s.skusuz).toEqual([])
    expect(s.ikasta_yok).toEqual([])
  })

  test('değeri zaten doğru olan set yeniden yazılmaz', () => {
    const s = setVaryantEslestir([
      { id: 1, ad: 'Kahvaltı Seti', sku: 'TNC.SET.00001', ikas_varyant_id: 'v-1' },
    ], harita)
    expect(s.eslesen).toEqual([])       // gereksiz UPDATE yok
    expect(s.ikasta_yok).toEqual([])
  })

  test('ikas\'ta varyant kimliği DEĞİŞMİŞSE güncellenir', () => {
    const s = setVaryantEslestir([
      { id: 1, ad: 'Kahvaltı Seti', sku: 'TNC.SET.00001', ikas_varyant_id: 'eski' },
    ], harita)
    expect(s.eslesen).toEqual([{ id: 1, ikas_varyant_id: 'v-1' }])
  })

  test('SKU\'su boş set ayrı raporlanır (ad ile eşleştirme YAPILMAZ)', () => {
    // Ad ile eşleştirme birincil yol değil: "Çay Seti" adı ikas'ta farklı
    // yazılmış olabilir ve yanlış sete fatura kesilmesine yol açar.
    const s = setVaryantEslestir([
      { id: 3, ad: 'Kahvaltı Seti', sku: '', ikas_varyant_id: null },
      { id: 4, ad: 'Çay Seti', sku: null, ikas_varyant_id: null },
    ], harita)
    expect(s.eslesen).toEqual([])
    expect(s.skusuz).toEqual(['Kahvaltı Seti', 'Çay Seti'])
  })

  test('ikas\'ta karşılığı olmayan SKU ayrı raporlanır', () => {
    const s = setVaryantEslestir([
      { id: 5, ad: 'Yeni Set', sku: 'TNC.SET.00099', ikas_varyant_id: null },
    ], harita)
    expect(s.eslesen).toEqual([])
    expect(s.ikasta_yok).toEqual(['TNC.SET.00099 — Yeni Set'])
  })

  test('SKU\'daki boşluk ve harf büyüklüğü farkı eşleşmeyi bozmaz', () => {
    const s = setVaryantEslestir([
      { id: 6, ad: 'Set', sku: '  tnc.set.00001 ', ikas_varyant_id: null },
    ], harita)
    expect(s.eslesen).toEqual([{ id: 6, ikas_varyant_id: 'v-1' }])
  })

  test('boş liste güvenli', () => {
    expect(setVaryantEslestir([], harita)).toEqual({ eslesen: [], skusuz: [], ikasta_yok: [] })
    expect(setVaryantEslestir(null, harita).eslesen).toEqual([])
  })
})

describe('_anahtar', () => {
  test('iki tarafa da AYNI dönüşüm uygulanır', () => {
    expect(_anahtar(' tnc.set.1 ')).toBe(_anahtar('TNC.SET.1'))
  })
  test('boş değerler null döner', () => {
    expect(_anahtar('')).toBe(null)
    expect(_anahtar(null)).toBe(null)
    expect(_anahtar('   ')).toBe(null)
  })
})
