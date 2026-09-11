import { describe, it, expect } from 'vitest'
const { siniflandir, celikMi, garantiVarMi, induksiyonDurum, onizle } = require('./index.js')

describe('celikMi', () => {
  it('ad/kategoride çelik/paslanmaz/inox → true', () => {
    expect(celikMi('Lines 26 cm Çelik Tencere')).toBe(true)
    expect(celikMi('X', ['Paslanmaz Setler'])).toBe(true)
    expect(celikMi('Granit Tava', ['Granit'])).toBe(false)
  })
})

describe('garantiVarMi', () => {
  it('outlet/2.kalite/teşhir → false, normal → true', () => {
    expect(garantiVarMi('Çelik Tencere')).toBe(true)
    expect(garantiVarMi('Çelik Tencere OUTLET')).toBe(false)
    expect(garantiVarMi('X', [], ['teşhir ürünü'])).toBe(false)
  })
})

describe('induksiyonDurum — yalnız doğrulanmış veriden', () => {
  it('urunId eşleşmesi', () => {
    expect(induksiyonDurum({ id: 'P1' }, { P1: 'evet' })).toBe('evet')
    expect(induksiyonDurum({ id: 'P1' }, { P1: 'hayir' })).toBe('hayir')
  })
  it('marka eşleşmesi', () => {
    expect(induksiyonDurum({ id: 'X', marka: 'Lines' }, { markalar: { lines: 'evet' } })).toBe('evet')
  })
  it('model (ad alt-dize) eşleşmesi — Lines Zeycan', () => {
    const h = { modeller: [{ eslesme: 'zeycan', durum: 'evet' }] }
    expect(induksiyonDurum({ id: 'X', name: 'Lines Zeycan 26 cm Basık Çelik Tencere' }, h)).toBe('evet')
    expect(induksiyonDurum({ id: 'X', name: 'Falez Black Line Tencere' }, h)).toBe('bilinmiyor')
  })
  it('eşleşme yoksa bilinmiyor (asla varsayma)', () => {
    expect(induksiyonDurum({ id: 'X', marka: 'Falez' }, { P1: 'evet' })).toBe('bilinmiyor')
    expect(induksiyonDurum({ id: 'X' })).toBe('bilinmiyor')
  })
})

describe('siniflandir — kapak tespiti', () => {
  it('"kapaksız" geçen üründe içerikte cam kapak YAZMAZ', () => {
    const u = { id: 'P2', name: 'Çelik Tencere Kapaksız', categories: [], tags: [] }
    expect(siniflandir(u).urunIcerigi).not.toMatch(/cam kapak/i)
  })
  it('normal üründe cam kapak yazar', () => {
    const u = { id: 'P3', name: 'Çelik Tencere', categories: [], tags: [] }
    expect(siniflandir(u).urunIcerigi).toMatch(/cam kapak/i)
  })
})

describe('siniflandir', () => {
  it('çelik tencere: celik=true, garanti=true, induksiyon haritadan', () => {
    const u = { id: 'P1', name: 'Lines Zeycan 26 cm Çelik Tencere', categories: [{ name: 'Çelik Tencereler' }], tags: [] }
    const s = siniflandir(u, { P1: 'evet' })
    expect(s.celik).toBe(true)
    expect(s.garanti).toBe(true)
    expect(s.induksiyon).toBe('evet')
    expect(s.malzeme).toContain('304 kalite 18/10')
  })
})

describe('onizle — uçtan uca (mock gemini)', () => {
  it('HTML üretir; çelik+induksiyon yoksa uyarı verir', async () => {
    const u = { id: 'P9', name: 'Çelik Tencere', categories: [{ name: 'Çelik' }], tags: [] }
    const fakeMetin = async () => ({ seoGiris: 'giris', saglik: 'saglik', model: 'm' })
    const r = await onizle({ urun: u, induksiyonHaritasi: {}, anahtar: 'k', _uretMetin: fakeMetin })
    expect(r.html).toContain('giris')
    expect(r.html).toContain('304 / 18-10')
    expect(r.html).not.toContain('İndüksiyon Uyumlu') // bilinmiyor
    expect(r.uyarilar.join(' ')).toMatch(/İndüksiyon durumu doğrulanmadı/)
  })
  it('induksiyon evet ise rozet çıkar', async () => {
    const u = { id: 'P1', name: 'Çelik Tencere', categories: [], tags: [] }
    const fakeMetin = async () => ({ seoGiris: 'g', saglik: 's', model: 'm' })
    const r = await onizle({ urun: u, induksiyonHaritasi: { P1: 'evet' }, anahtar: 'k', _uretMetin: fakeMetin })
    expect(r.html).toContain('İndüksiyon Uyumlu')
  })
})
