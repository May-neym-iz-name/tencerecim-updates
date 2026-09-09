import { describe, test, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { kuponMesaji, indirimMetni, VARSAYILAN_SABLON } = require('./kupon-mesaj.js')

const S = 'Merhaba! Size özel hediye kuponunuz: {kod}\nİndirim: {indirim}\nSon kullanım: {bitis}\nMin. sepet: {min_tutar}\nSipariş: {site}'
const K = { title: 'Hoş geldin', type: 'RATIO', fixedDiscount: { amount: 15, priceRange: { min: 500 } }, dateRange: { end: new Date('2026-09-30T23:59').getTime() } }

describe('indirimMetni', () => {
  test('türlere göre', () => {
    expect(indirimMetni({ type: 'RATIO', fixedDiscount: { amount: 15 } })).toBe('%15')
    expect(indirimMetni({ type: 'FIXED_AMOUNT', fixedDiscount: { amount: 250 } })).toBe('250 TL')
    expect(indirimMetni({ type: 'FREE_SHIPPING' })).toBe('Ücretsiz kargo')
    expect(indirimMetni({ type: 'BUY_X_THEN_GET_Y', buyXThenGetY: { buyX: { amount: 3 }, getY: { amount: 1, discountRatio: 100 } } })).toBe('3 al 1 bedava')
    expect(indirimMetni({ type: 'BUY_X_THEN_GET_Y', buyXThenGetY: { buyX: { amount: 2 }, getY: { amount: 1, discountRatio: 50 } } })).toBe('2 al 1 tanesi %50 indirimli')
  })
})

describe('kuponMesaji', () => {
  test('tüm yer tutucular dolar', () => {
    const { metin, asildi } = kuponMesaji({ sablonMetni: S, kampanya: K, kupon: { code: 'TNC123' }, site: 'tencerecim.store' })
    expect(metin).toBe('Merhaba! Size özel hediye kuponunuz: TNC123\nİndirim: %15\nSon kullanım: 30.09.2026\nMin. sepet: 500 TL\nSipariş: tencerecim.store')
    expect(asildi).toBe(false)
  })
  test('bitiş ve min tutar yoksa o SATIRLAR atılır', () => {
    const { metin } = kuponMesaji({ sablonMetni: S, kampanya: { type: 'RATIO', fixedDiscount: { amount: 10 } }, kupon: { code: 'X' }, site: 's' })
    expect(metin).toBe('Merhaba! Size özel hediye kuponunuz: X\nİndirim: %10\nSipariş: s')
  })
  test('MUTASYON KAPANI: kod yazılmazsa kırmızı', () => {
    expect(kuponMesaji({ sablonMetni: 'Kod: {kod}', kampanya: K, kupon: { code: 'ZZ' } }).metin).toBe('Kod: ZZ')
  })
  test('1000 karakter aşımı asildi=true, metin KESİLMEZ', () => {
    const r = kuponMesaji({ sablonMetni: 'a'.repeat(1001), kampanya: K, kupon: { code: 'X' } })
    expect(r.asildi).toBe(true); expect(r.metin.length).toBe(1001)
  })
  test('varsayılan şablon {kod} içerir ve 1000 altındadır', () => {
    expect(VARSAYILAN_SABLON).toContain('{kod}')
    expect(VARSAYILAN_SABLON.length).toBeLessThan(1000)
  })
})
