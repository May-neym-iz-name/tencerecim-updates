import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
const { rpc, sec, FaturaHatasi } = require('./bulut')

beforeEach(() => { global.fetch = vi.fn() })
afterEach(() => { vi.useRealTimers() })

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

  // I4: SATIR_TOPLAM_UYUSMUYOR ayrı bir iş hatası — stok yetersizliğiyle
  // karıştırılırsa tüketici ('kod' alanı yerine) ham Postgres metnini yeniden
  // ayrıştırmak zorunda kalıyordu (bkz. fatura-stok.js).
  test('SATIR_TOPLAM_UYUSMUYOR mesajını AYRI bir kod (dogrulama) olarak sınıflar', async () => {
    global.fetch.mockResolvedValue({
      ok: false, status: 400,
      json: async () => ({ message: 'SATIR_TOPLAM_UYUSMUYOR' }),
    })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'dogrulama' })
  })

  test('jwt yoksa oturum hatasını atar', async () => {
    await expect(rpc('deneme', {}, null)).rejects.toMatchObject({ kod: 'oturum' })
  })

  test('401 (süresi dolmuş jeton) oturum olarak sınıflanır ve mesaj Türkçedir', async () => {
    global.fetch.mockResolvedValue({
      ok: false, status: 401,
      json: async () => ({ message: 'JWT expired' }),
    })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({
      kod: 'oturum',
      message: 'Oturumunuz sona erdi, lütfen tekrar giriş yapın',
    })
  })

  test('AbortError (zaman aşımı) ag olarak sınıflar', async () => {
    const abortError = new Error('aborted')
    abortError.name = 'AbortError'
    global.fetch.mockRejectedValue(abortError)
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'ag' })
  })

  test('fetch çağrısına signal geçiriliyor', async () => {
    global.fetch.mockResolvedValue({
      ok: true, status: 200, json: async () => ({}),
    })
    await rpc('deneme', {}, 'jwt')
    const init = global.fetch.mock.calls[0][1]
    expect(init.signal).toBeDefined()
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(init.signal.aborted).toBe(false)
  })

  test('timeout dolunca signal abort edilir', async () => {
    vi.useFakeTimers()
    let yakalananSignal
    global.fetch.mockImplementation((url, init) => {
      yakalananSignal = init.signal
      return new Promise(() => {})  // asla çözülmez
    })
    const promise = rpc('deneme', {}, 'jwt')
    vi.advanceTimersByTime(20000)
    expect(yakalananSignal.aborted).toBe(true)
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

  test('500 durumunu ag olarak sınıflar', async () => {
    global.fetch.mockResolvedValue({
      ok: false, status: 500,
      json: async () => ({ message: 'sunucu hatası' }),
    })
    await expect(sec('tablo', 'select=*', 'jwt')).rejects.toMatchObject({ kod: 'ag' })
  })

  test('gövde ayrıştırılamazsa ag olarak sınıflar', async () => {
    global.fetch.mockResolvedValue({
      ok: false, status: 400,
      json: async () => { throw new Error('invalid json') },
    })
    await expect(sec('tablo', 'select=*', 'jwt')).rejects.toMatchObject({ kod: 'ag' })
  })

  test('AbortError (zaman aşımı) ag olarak sınıflar', async () => {
    const abortError = new Error('aborted')
    abortError.name = 'AbortError'
    global.fetch.mockRejectedValue(abortError)
    await expect(sec('tablo', 'select=*', 'jwt')).rejects.toMatchObject({ kod: 'ag' })
  })

  test('fetch çağrısına signal geçiriliyor', async () => {
    global.fetch.mockResolvedValue({
      ok: true, status: 200, json: async () => [],
    })
    await sec('tablo', 'select=*', 'jwt')
    const init = global.fetch.mock.calls[0][1]
    expect(init.signal).toBeDefined()
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(init.signal.aborted).toBe(false)
  })

  test('timeout dolunca signal abort edilir', async () => {
    vi.useFakeTimers()
    let yakalananSignal
    global.fetch.mockImplementation((url, init) => {
      yakalananSignal = init.signal
      return new Promise(() => {})  // asla çözülmez
    })
    const promise = sec('tablo', 'select=*', 'jwt')
    vi.advanceTimersByTime(20000)
    expect(yakalananSignal.aborted).toBe(true)
  })
})
