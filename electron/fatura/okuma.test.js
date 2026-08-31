import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock sec fonksiyonu
const mockSec = vi.fn()

// Mock module tanımla ve cache'e koy (require.cache)
// NEDEN: vi.mock CommonJS require() ile çalışmıyor (vitest ESM dönüştürme eksik).
// okuma.js `const { sec } = require()` ile sec'i destructure ediyor, test'teki override'ı görmüyor.
// ÇÖZÜM: require.cache'i mock modülle değiştir (okuma.js yüklemeden ÖNCE).
// VERSİYON: test dosyası top-level require'ı yapıyor, beforeEach yağmıyor —
// bu vitest'in dosya yükleme zamanını reflektör ediyor. Cache manipulation'ı
// vitest'in hook sistemi içinde yapmalıyız; ancak hoisting yüzünden top-level
// code hâlâ require yapıyor. SONUÇ: cache pre-manipulation ile setup yapılıyor.
const path = require.resolve('./bulut')
const mockBulutModule = {
  sec: mockSec,
  FaturaHatasi: class extends Error {
    constructor(msg, kod) {
      super(msg)
      this.kod = kod
    }
  },
}

// Cache'i pre-setup et (module load'lanmadan ÖNCE) — test izolasyonu vitest'in varsayılan davranışına bağlıdır
require.cache[path] = {
  id: path,
  filename: path,
  loaded: true,
  exports: mockBulutModule,
}

// Modülleri require et (cache mock'lu olduğu halde)
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

describe('alisKalemGetir', () => {
  test('doğru tabloyu ve filtreyi çağırır', async () => {
    mockSec.mockResolvedValue([])
    await alisKalemGetir('fatura123', 'jwt')
    const [tablo, sorgu, jwt] = mockSec.mock.calls[0]
    expect(tablo).toBe('alis_fatura_kalemleri')
    expect(sorgu).toContain('select=*')
    expect(sorgu).toContain('alis_fatura_senk_id=eq.fatura123')
    expect(jwt).toBe('jwt')
  })

  test('özel karakterleri kaçırır', async () => {
    mockSec.mockResolvedValue([])
    const idWithSpecialChars = 'fatura&123 abc'
    await alisKalemGetir(idWithSpecialChars, 'jwt')
    const [, sorgu] = mockSec.mock.calls[0]
    // & ve boşluk kaçırılmalı
    expect(sorgu).toContain('alis_fatura_senk_id=eq.fatura%26123%20abc')
    expect(sorgu).not.toContain('alis_fatura_senk_id=eq.fatura&123 abc')
  })
})
