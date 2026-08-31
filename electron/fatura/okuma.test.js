import { describe, test, expect, vi, beforeEach } from 'vitest'

// Mock bulut.js modülü
vi.mock('./bulut.js', () => {
  const mockSec = vi.fn()
  return {
    sec: mockSec,
    FaturaHatasi: class extends Error {
      constructor(msg, kod) {
        super(msg)
        this.kod = kod
      }
    },
  }
})

// Import'u after mock tanımla
import { faturaStokGetir, hareketGetir, alisFaturaGetir } from './okuma.js'
import * as buluKir from './bulut.js'

const mockSec = vi.mocked((await import('./bulut.js')).sec)

beforeEach(() => {
  mockSec.mockClear()
})

describe('faturaStokGetir', () => {
  test('fatura_stok tablosundan urun_senk_id ve miktar çeker', async () => {
    mockSec.mockResolvedValue([{ urun_senk_id: 'u1', miktar: 12 }])
    const sonuc = await faturaStokGetir('jwt')
    expect(sonuc).toEqual([{ urun_senk_id: 'u1', miktar: 12 }])
    const [tablo, sorgu, jwt] = mockSec.mock.calls[0]
    expect(tablo).toBe('fatura_stok')
    expect(sorgu).toContain('select=urun_senk_id,miktar')
    expect(jwt).toBe('jwt')
  })
})

describe('hareketGetir', () => {
  test('ürün filtresi verilince sorguya eq koşulu ekler', async () => {
    mockSec.mockResolvedValue([])
    await hareketGetir({ urun_senk_id: 'u1', limit: 50 }, 'jwt')
    const [tablo, sorgu, jwt] = mockSec.mock.calls[0]
    expect(tablo).toBe('fatura_stok_hareketler')
    expect(sorgu).toContain('urun_senk_id=eq.u1')
    expect(sorgu).toContain('limit=50')
    expect(jwt).toBe('jwt')
  })

  test('ürün filtresi yoksa eq koşulu KOYMAZ', async () => {
    mockSec.mockResolvedValue([])
    await hareketGetir({}, 'jwt')
    const [, sorgu] = mockSec.mock.calls[0]
    expect(sorgu).not.toContain('urun_senk_id=eq')
  })
})

describe('alisFaturaGetir', () => {
  test('fatura tarihine göre tersten sıralar', async () => {
    mockSec.mockResolvedValue([])
    await alisFaturaGetir({}, 'jwt')
    const [tablo, sorgu] = mockSec.mock.calls[0]
    expect(tablo).toBe('alis_faturalari')
    expect(sorgu).toContain('order=fatura_tarihi.desc')
  })
})
