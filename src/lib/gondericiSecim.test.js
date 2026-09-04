// Kargo formunda gönderici mağaza seçimi — "varsayılan" kaldırıldı, kurallar burada.
import { describe, test, expect } from 'vitest'
import { gondericiTanimliMi, gondericiSecenekleri, baslangicGondericiId } from './gondericiSecim'

const PENDIK = { ad: 'Tencerecim Store / Pendik', adres: 'E-5 Yanyol No 24', il_kodu: 34, ilce_kodu: 460 }
const GOLCUK = { ad: 'Tencerecim Store / Gölcük', adres: 'F. Turgut Sayın Cd. 31/C', il_kodu: 41, ilce_kodu: 559 }
const LOKASYONLAR = [{ id: 1, ad: 'Tencerecim Pendik' }, { id: 2, ad: 'Tencerecim Gölcük' }]

describe('gondericiTanimliMi', () => {
  test('dört zorunlu alan doluysa tanımlıdır', () => {
    expect(gondericiTanimliMi(PENDIK)).toBe(true)
  })

  test('adres boşsa TANIMLI DEĞİL — UPS isteği global adrese düşerdi', () => {
    expect(gondericiTanimliMi({ ...PENDIK, adres: '   ' })).toBe(false)
  })

  test('ilçe kodu yoksa tanımlı değil', () => {
    expect(gondericiTanimliMi({ ...PENDIK, ilce_kodu: null })).toBe(false)
  })

  test('kayıt hiç yoksa tanımlı değil', () => {
    expect(gondericiTanimliMi(undefined)).toBe(false)
  })
})

describe('gondericiSecenekleri', () => {
  test('yalnız adresi tanımlı mağazalar listelenir', () => {
    const s = gondericiSecenekleri(LOKASYONLAR, { 1: PENDIK, 2: { ad: 'X' } })
    expect(s).toEqual([{ id: 1, ad: 'Tencerecim Pendik' }])
  })

  test('pasif mağaza listelenmez', () => {
    const s = gondericiSecenekleri([{ id: 1, ad: 'Pendik', aktif: 0 }], { 1: PENDIK })
    expect(s).toEqual([])
  })

  test('ikisi de tanımlıysa ikisi de gelir', () => {
    expect(gondericiSecenekleri(LOKASYONLAR, { 1: PENDIK, 2: GOLCUK })).toHaveLength(2)
  })
})

describe('baslangicGondericiId', () => {
  test('TEK tanımlı mağaza varsa doğrudan seçili gelir', () => {
    expect(baslangicGondericiId([{ id: 2, ad: 'Gölcük' }], null)).toBe(2)
  })

  test('İKİ tanımlı mağaza varsa varsayılan YOK — seçim kullanıcıya kalır', () => {
    expect(baslangicGondericiId([{ id: 1, ad: 'Pendik' }, { id: 2, ad: 'Gölcük' }], null)).toBe(null)
  })

  test('çağıranın verdiği mağaza (siparişin çıkış mağazası) korunur', () => {
    expect(baslangicGondericiId([{ id: 1, ad: 'Pendik' }, { id: 2, ad: 'Gölcük' }], 2)).toBe(2)
  })

  test('çağıranın verdiği mağaza artık tanımlı değilse yok sayılır', () => {
    expect(baslangicGondericiId([{ id: 1, ad: 'Pendik' }], 2)).toBe(1)
  })

  test('hiç tanımlı mağaza yoksa null (seçici gösterilmez, global adres kullanılır)', () => {
    expect(baslangicGondericiId([], null)).toBe(null)
  })
})
