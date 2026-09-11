import { describe, it, expect } from 'vitest'
const { uretHtml, kacisla } = require('./sablon.js')

const temel = {
  seoGiris: 'SEO giris metni',
  urunIcerigi: '1 govde 1 kapak',
  malzeme: '304 kalite 18/10',
  saglik: 'BPA icermez',
}

describe('uretHtml — zorunlu bloklar', () => {
  it('SEO giris + 3 akordeon bolmesi (Icerik/Malzeme/Saglik) her zaman bulunur', () => {
    const h = uretHtml(temel)
    expect(h).toContain('SEO giris metni')
    expect(h).toContain('Ürün İçeriği')
    expect(h).toContain('Malzeme')
    expect(h).toContain('Sağlık')
    // 3 details bolmesi
    expect((h.match(/<details/g) || []).length).toBe(3)
    // ilk bolme acik baslar
    expect(h).toMatch(/<details open/)
  })
})

describe('uretHtml — kosullu rozetler', () => {
  it('celik=true ise 304/18-10 rozeti VAR, false ise YOK', () => {
    expect(uretHtml({ ...temel, celik: true })).toContain('304 / 18-10')
    expect(uretHtml({ ...temel, celik: false })).not.toContain('304 / 18-10')
  })

  it('induksiyon rozeti YALNIZ dogrulanmis (evet) urunde yazilir', () => {
    expect(uretHtml({ ...temel, induksiyon: 'evet' })).toContain('İndüksiyon Uyumlu')
    expect(uretHtml({ ...temel, induksiyon: 'hayir' })).not.toContain('İndüksiyon Uyumlu')
    expect(uretHtml({ ...temel, induksiyon: 'bilinmiyor' })).not.toContain('İndüksiyon Uyumlu')
    // varsayilan bilinmiyor → yazilmaz
    expect(uretHtml(temel)).not.toContain('İndüksiyon Uyumlu')
  })

  it('garanti=false (outlet) ise 2 Yil Garanti rozeti YOK', () => {
    expect(uretHtml({ ...temel, garanti: true })).toContain('2 Yıl Garanti')
    expect(uretHtml({ ...temel, garanti: false })).not.toContain('2 Yıl Garanti')
  })
})

describe('kacisla — HTML enjeksiyonu kirmaz', () => {
  it('< > & " karakterleri kacislanir', () => {
    expect(kacisla('<b>"a"&<')).toBe('&lt;b&gt;&quot;a&quot;&amp;&lt;')
  })
  it('Gemini metni <script> gomerse cikti icinde ham <script> OLMAZ', () => {
    const h = uretHtml({ ...temel, seoGiris: '<script>alert(1)</script>' })
    expect(h).not.toContain('<script>')
    expect(h).toContain('&lt;script&gt;')
  })
})
