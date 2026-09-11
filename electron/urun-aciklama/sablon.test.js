import { describe, test, expect } from 'vitest'
import sablon from './sablon.js'
import metin from './metin.js'
import siniflandir from './siniflandir.js'

describe('şablon', () => {
  test('boş bölüm için akordeon üretmez', () => {
    const html = sablon.uret({ seo: 'Kısa tanıtım.', icerik: '', malzeme: '   ', saglik: null })
    expect(html).not.toContain('<details')
    expect(html).toContain('Kısa tanıtım.')
  })

  test('dolu bölümler sabit sırada gelir', () => {
    const html = sablon.uret({ seo: 'x', icerik: 'A', malzeme: 'B', saglik: 'C' })
    expect(html.indexOf('Ürün İçeriği')).toBeLessThan(html.indexOf('🧪 Malzeme'))
    expect(html.indexOf('🧪 Malzeme')).toBeLessThan(html.indexOf('❤️ Sağlık'))
  })

  // 11.09: list-style:none okları siliyordu, müşteri açılabildiğini göremiyordu.
  // Bu test o gerilemeyi kilitler.
  test('açılır-kapanır oku SİLİNMEZ (list-style ayarlanmaz)', () => {
    const html = sablon.uret({ icerik: 'A', malzeme: 'B' })
    expect(html).toContain('<details')
    expect(html).not.toContain('list-style')
  })

  test('ilk bölme açık, diğerleri kapalı başlar', () => {
    const html = sablon.uret({ icerik: 'A', malzeme: 'B', saglik: 'C' })
    expect(html.match(/<details open/g)).toHaveLength(1)
    expect(html.match(/<details/g)).toHaveLength(3)
    // Açık olan İLK bölme (Ürün İçeriği) olmalı
    expect(html.indexOf('<details open')).toBe(html.indexOf('<details'))
  })

  test('içerik bölümü boşsa açık bayrağı bir sonrakine SIÇRAMAZ', () => {
    const html = sablon.uret({ malzeme: 'B', saglik: 'C' })
    expect(html.match(/<details open/g)).toBeNull()
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

describe('rozetler — doğrulanmamış iddia yazılmaz', () => {
  test('indüksiyon yalnız evet ise rozet yazar', () => {
    expect(sablon.uret({ icerik: 'A', induksiyon: 'evet' })).toContain('İndüksiyon Uyumlu')
    expect(sablon.uret({ icerik: 'A', induksiyon: 'bilinmiyor' })).not.toContain('İndüksiyon')
    expect(sablon.uret({ icerik: 'A', induksiyon: 'hayir' })).not.toContain('İndüksiyon')
    expect(sablon.uret({ icerik: 'A' })).not.toContain('İndüksiyon')
  })

  test('çelik rozeti yalnız celik=true ile gelir', () => {
    expect(sablon.uret({ icerik: 'A', celik: true })).toContain('304 / 18-10 Çelik')
    expect(sablon.uret({ icerik: 'A', celik: false })).not.toContain('304')
  })

  test('outlet üründe garanti rozeti yok', () => {
    expect(sablon.uret({ icerik: 'A', garanti: true })).toContain('2 Yıl Garanti')
    expect(sablon.uret({ icerik: 'A', garanti: false })).not.toContain('Garanti')
  })

  test('hiç rozet yoksa rozet satırı da yok', () => {
    expect(sablon.uret({ icerik: 'A' })).not.toContain('flex-wrap')
  })
})

describe('sınıflandırma', () => {
  test('outlet/teşhir/2. kalite garantiyi kaldırır', () => {
    expect(siniflandir.garantiVarMi('Tencere', [], [])).toBe(true)
    expect(siniflandir.garantiVarMi('Tencere OUTLET', [], [])).toBe(false)
    expect(siniflandir.garantiVarMi('Tencere', [], ['teşhir'])).toBe(false)
    expect(siniflandir.garantiVarMi('Tencere', ['2. Kalite'], [])).toBe(false)
  })

  test('çelik ad veya kategoriden anlaşılır', () => {
    expect(siniflandir.celikMi('Zeycan Çelik Tencere', [])).toBe(true)
    expect(siniflandir.celikMi('Tencere', ['Paslanmaz Çelik'])).toBe(true)
    expect(siniflandir.celikMi('Granit Tencere', ['Granitler'])).toBe(false)
  })

  test('indüksiyon haritada yoksa bilinmiyor döner — varsayım yapmaz', () => {
    expect(siniflandir.induksiyonDurum({ id: 'x', name: 'Granit Tencere' }, {})).toBe('bilinmiyor')
  })

  test('model eşleşmesi haritadan gelir', () => {
    const h = { modeller: [{ eslesme: 'zeycan', durum: 'evet' }] }
    expect(siniflandir.induksiyonDurum({ id: 'x', name: 'Lines Zeycan 26 cm' }, h)).toBe('evet')
    expect(siniflandir.induksiyonDurum({ id: 'x', name: 'Lines Başka 26 cm' }, h)).toBe('bilinmiyor')
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

describe('SEO yeniden deneme', () => {
  const yanit = (seo) => ({ metin: JSON.stringify({ seo, icerik: 'i', malzeme: 'm', saglik: 's' }) })

  test('kısa gelirse tekrar sorar ve düzeleni kabul eder', async () => {
    const uzunluklar = [200, 300]      // 1. deneme kısa, 2. deneme uygun
    let cagri = 0
    const sahte = async () => yanit('a'.repeat(uzunluklar[cagri++]))
    const r = await metin.bolumleriUret({ ad: 'X', mevcut: '<p>kaynak</p>', anahtar: 'k', _uret: sahte })
    expect(cagri).toBe(2)
    expect(r.uyari).toBeNull()
    expect(r.bilgi.seo).toHaveLength(300)
  })

  test('düzelmezse 3 denemede durur — sonsuz denemez', async () => {
    let cagri = 0
    const sahte = async () => { cagri++; return yanit('a'.repeat(100)) }
    const r = await metin.bolumleriUret({ ad: 'X', mevcut: '<p>kaynak</p>', anahtar: 'k', _uret: sahte })
    expect(cagri).toBe(3)
    expect(r.uyari).toMatch(/denemede düzelmedi/)
  })

  test('ilk deneme uygunsa tekrar sormaz', async () => {
    let cagri = 0
    const sahte = async () => { cagri++; return yanit('a'.repeat(300)) }
    await metin.bolumleriUret({ ad: 'X', mevcut: '<p>kaynak</p>', anahtar: 'k', _uret: sahte })
    expect(cagri).toBe(1)
  })

  test('düzeltme isteminde modele ne yapacağı SÖYLENİR', async () => {
    const istemler = []
    let cagri = 0
    const sahte = async ({ istem }) => { istemler.push(istem); return yanit('a'.repeat(cagri++ === 0 ? 100 : 300)) }
    await metin.bolumleriUret({ ad: 'X', mevcut: '<p>kaynak</p>', anahtar: 'k', _uret: sahte })
    expect(istemler[0]).not.toContain('REDDEDİLDİ')
    expect(istemler[1]).toContain('ÇOK KISA')
  })
})

describe('geçici Gemini arızası', () => {
  const yanit = (seo) => ({ metin: JSON.stringify({ seo, icerik: 'i', malzeme: 'm', saglik: 's' }) })
  const hemen = async () => {}            // beklemeyi atla (test hızlı kalsın)

  test('yoğunluk hatasında geri çekilip tekrar dener', async () => {
    let cagri = 0
    const sahte = async () => {
      if (++cagri < 3) throw new Error('Gemini yanit vermedi: This model is currently experiencing high demand.')
      return yanit('a'.repeat(300))
    }
    const r = await metin.bolumleriUret({ ad: 'X', mevcut: '<p>k</p>', anahtar: 'k', _uret: sahte, _uyu: hemen })
    expect(cagri).toBe(3)
    expect(r.uyari).toBeNull()
  })

  test('KALICI hatada beklemeden fırlatır — gerçek hatayı geciktirmez', async () => {
    let cagri = 0
    const sahte = async () => { cagri++; throw new Error('Gemini anahtari girilmemis.') }
    await expect(metin.bolumleriUret({ ad: 'X', mevcut: '<p>k</p>', anahtar: '', _uret: sahte, _uyu: hemen }))
      .rejects.toThrow(/anahtari girilmemis/)
    expect(cagri).toBe(1)
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
