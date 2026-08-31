import { describe, test, expect, vi, beforeEach } from 'vitest'

// Mock sec fonksiyonu
const mockSec = vi.fn()

// Mock module tanımla ve cache'e koy (require.cache)
import Module from 'module'
const bulutModule = new Module()
bulutModule.exports = {
  sec: mockSec,
  FaturaHatasi: class extends Error {
    constructor(msg, kod) {
      super(msg)
      this.kod = kod
    }
  },
  rpc: vi.fn(),
}

// Resolv edilen path'i bul ve cache'e ekle
const path = require.resolve('./bulut')
require.cache[path] = {
  id: path,
  filename: path,
  loaded: true,
  exports: bulutModule.exports,
}

// Şimdi okuma'yı require et (bulut zaten cache'te)
const { faturaStokGetir, hareketGetir, alisFaturaGetir, alisKalemGetir } = require('./okuma')

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
