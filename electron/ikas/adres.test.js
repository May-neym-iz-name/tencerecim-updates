import { describe, test, expect } from 'vitest'
import { adresBirlestir } from './adres.js'

describe('adresBirlestir', () => {
  test('iki adres satırını boşlukla birleştirir', () => {
    const adres = { addressLine1: 'Atatürk Mah. Gül Sok. No:12', addressLine2: 'Daire 5, B Blok' }
    expect(adresBirlestir(adres)).toBe('Atatürk Mah. Gül Sok. No:12 Daire 5, B Blok')
  })

  test('adres satırı 2 yoksa yalnız 1. satırı döner', () => {
    expect(adresBirlestir({ addressLine1: 'Atatürk Mah. No:12', addressLine2: null })).toBe('Atatürk Mah. No:12')
  })

  test('yalnız 2. satır doluysa onu döner', () => {
    expect(adresBirlestir({ addressLine1: '', addressLine2: 'Daire 5' })).toBe('Daire 5')
  })

  test('boşluklar kırpılır, çift boşluk oluşmaz', () => {
    expect(adresBirlestir({ addressLine1: '  Gül Sok.  ', addressLine2: '  Daire 5 ' })).toBe('Gül Sok. Daire 5')
  })

  test('adres yoksa null döner (kolon boş kalsın)', () => {
    expect(adresBirlestir(null)).toBeNull()
    expect(adresBirlestir({})).toBeNull()
    expect(adresBirlestir({ addressLine1: '   ', addressLine2: '' })).toBeNull()
  })
})
