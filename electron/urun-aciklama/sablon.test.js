import { describe, test, expect } from 'vitest'
import sablon from './sablon.js'
import metin from './metin.js'

describe('şablon', () => {
  test('boş bölüm için akordeon üretmez', () => {
    const html = sablon.uret({ seo: 'Kısa tanıtım.', icerik: '', malzeme: '   ', saglik: null })
    expect(html).not.toContain('<details')
    expect(html).toContain('Kısa tanıtım.')
  })

  test('dolu bölümler sabit sırada gelir', () => {
    const html = sablon.uret({ seo: 'x', icerik: 'A', malzeme: 'B', saglik: 'C' })
    expect(html.indexOf('Ürün İçeriği')).toBeLessThan(html.indexOf('Malzeme ve Yapı'))
    expect(html.indexOf('Malzeme ve Yapı')).toBeLessThan(html.indexOf('Kullanım ve Bakım'))
  })

  test('dizi verilirse madde listesi üretir', () => {
    const html = sablon.uret({ icerik: ['20 cm tencere', '', '24 cm tencere'] })
    expect(html).toContain('<li>20 cm tencere</li>')
    expect(html).toContain('<li>24 cm tencere</li>')
    expect(html).not.toContain('<li></li>')   // boş madde atlanır
  })

  test('HTML enjeksiyonu kaçışlanır', () => {
    const html = sablon.uret({ seo: '<script>kotu()</script> & "tırnak"' })
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&amp;')
    expect(html).toContain('&quot;')
  })
})

describe('metin ayrıştırma', () => {
  test('``` bloğuna sarılı JSON okunur', () => {
    const b = metin.jsonAyristir('İşte sonuç:\n```json\n{"seo":"a","icerik":"b"}\n```')
    expect(b.seo).toBe('a')
    expect(b.icerik).toBe('b')
    expect(b.malzeme).toBe('')      // eksik alan boş string olur, undefined değil
  })

  test('JSON yoksa fırlatır — sessizce boş dönmez', () => {
    expect(() => metin.jsonAyristir('özür dilerim, yardımcı olamam')).toThrow(/JSON döndürmedi/)
  })

  test('bozuk JSON fırlatır', () => {
    expect(() => metin.jsonAyristir('{"seo": "a",,}')).toThrow(/bozuk/)
  })

  test('HTML düz metne indirgenir', () => {
    const d = metin.duzMetin('<p>Bir</p><ul><li>iki</li></ul>&nbsp;üç')
    expect(d).not.toContain('<')
    expect(d).toContain('Bir')
    expect(d).toContain('iki')
    expect(d).toContain('üç')
  })
})

describe('SEO uzunluk kapısı', () => {
  test('kısa metin uyarı verir', () => {
    expect(metin.seoDenetle('a'.repeat(100))).toMatch(/kısa/)
  })
  test('uzun metin uyarı verir', () => {
    expect(metin.seoDenetle('a'.repeat(500))).toMatch(/uzun/)
  })
  test('aralıktaki metin geçer', () => {
    expect(metin.seoDenetle('a'.repeat(300))).toBeNull()
  })
  test('boş metin uyarı verir', () => {
    expect(metin.seoDenetle('')).toMatch(/boş/)
  })
})
