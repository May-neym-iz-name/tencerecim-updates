import { describe, test, expect, vi, beforeEach } from 'vitest'
const { rpc, FaturaHatasi } = require('./bulut')

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
})
