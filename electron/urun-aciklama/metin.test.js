import { describe, it, expect } from 'vitest'
const { istemKur, ayristir, uretMetin } = require('./metin.js')

describe('istemKur — kurallar isteme giriyor', () => {
  it('fiyat yazma ve klise yasagi her zaman var', () => {
    const s = istemKur({ ad: 'X' })
    expect(s).toMatch(/Fiyat.*YAZMA/i)
    expect(s).toMatch(/Klişe yasak/i)
  })
  it('celik=true → 304/18-10 ilk cumle talimati; false → uydurma yasagi', () => {
    expect(istemKur({ ad: 'X', celik: true })).toContain('304 kalite 18/10')
    expect(istemKur({ ad: 'X', celik: false })).not.toContain('304 kalite 18/10')
  })
  it('induksiyon evet → belirtilebilir; degilse HICBIR SEY yazma', () => {
    expect(istemKur({ ad: 'X', induksiyon: 'evet' })).toMatch(/indüksiyon uyumludur/i)
    expect(istemKur({ ad: 'X', induksiyon: 'hayir' })).toMatch(/HİÇBİR ŞEY yazma/i)
    expect(istemKur({ ad: 'X', induksiyon: 'bilinmiyor' })).toMatch(/HİÇBİR ŞEY yazma/i)
  })
})

describe('ayristir — Gemini yanitini cozer', () => {
  it('duz JSON', () => {
    expect(ayristir('{"seoGiris":"a","saglik":"b"}')).toEqual({ seoGiris: 'a', saglik: 'b' })
  })
  it('```json sarmali temizlenir', () => {
    expect(ayristir('```json\n{"seoGiris":"a","saglik":"b"}\n```')).toEqual({ seoGiris: 'a', saglik: 'b' })
  })
  it('eksik alan → hata', () => {
    expect(() => ayristir('{"seoGiris":"a"}')).toThrow()
  })
  it('JSON yoksa → hata', () => {
    expect(() => ayristir('merhaba')).toThrow()
  })
})

describe('uretMetin — gemini cagrisi (mock)', () => {
  it('enjekte edilen _uret ile calisir ve alanlari doner', async () => {
    const sahte = async ({ istem }) => {
      expect(istem).toContain('ÜRÜN ADI: Test Tencere')
      return { metin: '{"seoGiris":"giris","saglik":"saglikli"}', model: 'gemini-test' }
    }
    const r = await uretMetin({ urun: { ad: 'Test Tencere', celik: true }, anahtar: 'k', _uret: sahte })
    expect(r).toEqual({ seoGiris: 'giris', saglik: 'saglikli', model: 'gemini-test' })
  })
  it('anahtar yoksa hata', async () => {
    await expect(uretMetin({ urun: { ad: 'X' }, anahtar: '' })).rejects.toThrow(/anahtar/i)
  })
})
