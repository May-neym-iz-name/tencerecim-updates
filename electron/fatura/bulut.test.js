import { describe, test, expect, vi, beforeEach } from 'vitest'
const { rpc, sec, FaturaHatasi } = require('./bulut')

beforeEach(() => { global.fetch = vi.fn() })

describe('rpc', () => {
  test('başarılı yanıtta gövdeyi döndürür', async () => {
    global.fetch.mockResolvedValue({
      ok: true, status: 200, json: async () => ({ id: 'abc' }),
    })
    await expect(rpc('deneme', {}, 'jwt')).resolves.toEqual({ id: 'abc' })
  })

  test('23505 (unique ihlali) kodunu cakisma olarak sınıflar', async () => {
    global.fetch.mockResolvedValue({
      ok: false, status: 409,
      json: async () => ({ code: '23505', message: 'duplicate key' }),
    })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'cakisma' })
  })

  test('ağ hatasını ag olarak sınıflar', async () => {
    global.fetch.mockRejectedValue(new Error('fetch failed'))
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'ag' })
  })

  test('500 durumunu ag olarak sınıflar', async () => {
    global.fetch.mockResolvedValue({
      ok: false, status: 500,
      json: async () => ({ message: 'sunucu hatası' }),
    })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'ag' })
  })

  test('gövde ayrıştırılamazsa ag olarak sınıflar', async () => {
    global.fetch.mockResolvedValue({
      ok: false, status: 400,
      json: async () => { throw new Error('invalid json') },
    })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'ag' })
  })

  test('YETERSIZ_STOK mesajını yetersiz_stok olarak sınıflar', async () => {
    global.fetch.mockResolvedValue({
      ok: false, status: 400,
      json: async () => ({ message: 'YETERSIZ_STOK' }),
    })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'yetersiz_stok' })
  })

  test('SATIR_TOPLAM_UYUSMUYOR mesajını yetersiz_stok olarak sınıflar', async () => {
    global.fetch.mockResolvedValue({
      ok: false, status: 400,
      json: async () => ({ message: 'SATIR_TOPLAM_UYUSMUYOR' }),
    })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'yetersiz_stok' })
  })

  test('jwt yoksa oturum hatasını atar', async () => {
    await expect(rpc('deneme', {}, null)).rejects.toMatchObject({ kod: 'oturum' })
  })
})

describe('sec', () => {
  test('başarılı yanıtta dizi döndürür', async () => {
    global.fetch.mockResolvedValue({
      ok: true, status: 200, json: async () => [{ id: '1' }, { id: '2' }],
    })
    await expect(sec('tablo', 'select=*', 'jwt')).resolves.toEqual([{ id: '1' }, { id: '2' }])
  })

  test('hatalı durumda doğru kod atanır', async () => {
    global.fetch.mockResolvedValue({
      ok: false, status: 400,
      json: async () => ({ message: 'bilinmeyen_hata' }),
    })
    await expect(sec('tablo', 'select=*', 'jwt')).rejects.toMatchObject({ kod: 'bilinmeyen' })
  })

  test('jwt yoksa oturum hatasını atar', async () => {
    await expect(sec('tablo', 'select=*', null)).rejects.toMatchObject({ kod: 'oturum' })
  })
})
