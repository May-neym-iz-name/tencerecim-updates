import { describe, test, expect } from 'vitest'
import sablonMesaj from './sablon-mesaj.js'

const { fiyatYaz, mesajOlustur, MAKS_KARAKTER } = sablonMesaj

const kase = {
  urun_adi: "Çelik Kase Seti 6'lı",
  aciklama: '18/10 paslanmaz çelik, iç içe geçen tasarım',
  fiyat: 1450,
  link: 'tencerecim.store/celik-kase-seti',
  whatsapp: '0555 123 45 67',
}
const granit = {
  urun_adi: 'Granit Tencere Seti 7 Parça',
  aciklama: 'Çizilmez granit kaplama',
  fiyat: 2300,
  link: 'tencerecim.store/granit-set',
  whatsapp: '0555 123 45 67',
}

describe('fiyatYaz', () => {
  test('binlik ayıracı ile TL yazar', () => {
    expect(fiyatYaz(1450)).toBe('1.450 TL')
    expect(fiyatYaz(2300.5)).toBe('2.300,5 TL')
  })

  test('fiyat yoksa null döner (fiyat satırı hiç yazılmasın)', () => {
    expect(fiyatYaz(null)).toBe(null)
    expect(fiyatYaz(0)).toBe(null)
    expect(fiyatYaz(undefined)).toBe(null)
  })
})

describe('mesajOlustur', () => {
  test('tek ürünü selamlama + blok + whatsapp olarak yazar', () => {
    const { metin } = mesajOlustur({ sablonlar: [kase] })
    expect(metin).toContain('Merhaba')
    expect(metin).toContain("Çelik Kase Seti 6'lı")
    expect(metin).toContain('18/10 paslanmaz çelik, iç içe geçen tasarım')
    expect(metin).toContain('1.450 TL')
    expect(metin).toContain('tencerecim.store/celik-kase-seti')
    expect(metin).toContain('0555 123 45 67')
  })

  test('fiyat null ise fiyat satırı yazılmaz ama diğerleri yazılır', () => {
    const { metin } = mesajOlustur({ sablonlar: [{ ...kase, fiyat: null }] })
    expect(metin).not.toContain('TL')
    expect(metin).toContain("Çelik Kase Seti 6'lı")
    expect(metin).toContain('tencerecim.store/celik-kase-seti')
  })

  test('whatsapp AYNI ise mesajda YALNIZCA BİR KEZ görünür', () => {
    const { metin } = mesajOlustur({ sablonlar: [kase, granit] })
    const kac = metin.split('0555 123 45 67').length - 1
    expect(kac).toBe(1)
  })

  test('whatsapp FARKLI ise her ürünün altında ayrı görünür', () => {
    const digerHat = { ...granit, whatsapp: '0555 999 88 77' }
    const { metin } = mesajOlustur({ sablonlar: [kase, digerHat] })
    expect(metin).toContain('0555 123 45 67')
    expect(metin).toContain('0555 999 88 77')
  })

  test('ürünleri verilen sırada yazar', () => {
    const { metin } = mesajOlustur({ sablonlar: [kase, granit] })
    expect(metin.indexOf('Çelik Kase')).toBeLessThan(metin.indexOf('Granit Tencere'))
  })

  test('1000 karakteri aşınca asildi=true döner', () => {
    const uzun = { ...kase, aciklama: 'x'.repeat(400) }
    const { asildi, karakter } = mesajOlustur({ sablonlar: [uzun, uzun, uzun] })
    expect(asildi).toBe(true)
    expect(karakter).toBeGreaterThan(MAKS_KARAKTER)
  })

  test('sınır altında asildi=false', () => {
    const { asildi } = mesajOlustur({ sablonlar: [kase] })
    expect(asildi).toBe(false)
  })

  test('şablon yoksa boş metin döner (otomasyon bunu göndermemeli)', () => {
    const { metin, asildi } = mesajOlustur({ sablonlar: [] })
    expect(metin).toBe('')
    expect(asildi).toBe(false)
  })

  test('metin ASLA kesilmez — asildi bayrağı uyarı içindir, gönderim engellenir', () => {
    const uzun = { ...kase, aciklama: 'x'.repeat(400) }
    const { metin } = mesajOlustur({ sablonlar: [uzun, uzun, uzun] })
    expect(metin).toContain('x'.repeat(400))
  })
})
