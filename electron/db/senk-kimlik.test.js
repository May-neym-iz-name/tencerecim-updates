import { describe, test, expect } from 'vitest'
const { kimlikAnahtari, kimlikHaritasi } = require('./senk-kimlik')

// Gerçek değerler (01.09.2026 canlı veriden):
const YEREL = '8e109721a3730efcfcf45126842f5606'                 // SQLite: tiresiz
const BULUT = '8e109721-a373-0efc-fcf4-5126842f5606'             // Postgres uuid: tireli

describe('kimlikAnahtari', () => {
  test('🔴 tireli bulut uuid ile tiresiz yerel senk_id AYNI anahtara düşer', () => {
    // Bu tutmazsa fatura stoğu ekranda 0 görünür (canlıda böyle oldu).
    expect(kimlikAnahtari(BULUT)).toBe(kimlikAnahtari(YEREL))
  })

  test('harf büyüklüğü farkı eşleşmeyi bozmaz', () => {
    expect(kimlikAnahtari(BULUT.toUpperCase())).toBe(kimlikAnahtari(YEREL))
  })

  test('baştaki/sondaki boşluk temizlenir', () => {
    expect(kimlikAnahtari('  ' + BULUT + ' ')).toBe(kimlikAnahtari(YEREL))
  })

  test('boş değerler boş anahtar döner (yanlış eşleşme üretmez)', () => {
    expect(kimlikAnahtari(null)).toBe('')
    expect(kimlikAnahtari(undefined)).toBe('')
    expect(kimlikAnahtari('')).toBe('')
  })

  test('farklı kimlikler farklı kalır', () => {
    expect(kimlikAnahtari('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'))
      .not.toBe(kimlikAnahtari(YEREL))
  })
})

describe('kimlikHaritasi', () => {
  test('bulut satırlarından kurulan harita yerel kimlikle bulunur', () => {
    const h = kimlikHaritasi([{ urun_senk_id: BULUT, miktar: 26 }], 'urun_senk_id', s => s.miktar)
    expect(h.get(kimlikAnahtari(YEREL))).toBe(26)
  })

  test('kimliksiz satır haritaya girmez', () => {
    const h = kimlikHaritasi([{ urun_senk_id: null, miktar: 5 }], 'urun_senk_id', s => s.miktar)
    expect(h.size).toBe(0)
  })

  test('deger fonksiyonu verilmezse satırın kendisi tutulur', () => {
    const satir = { urun_senk_id: BULUT, ad: 'X' }
    const h = kimlikHaritasi([satir], 'urun_senk_id')
    expect(h.get(kimlikAnahtari(YEREL))).toBe(satir)
  })
})
