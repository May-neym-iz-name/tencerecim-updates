import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'
const https = require('https')
const { rpc, sec, secBasliklarla, FaturaHatasi } = require('./bulut')

// https.request'i taklit eden yardımcı: sahte bir istek (EventEmitter, write/end/destroy
// no-op'lar) döndürür ve çağrı üzerinden ayarlanan (statusCode, gövdeMetni) ile
// yanıtı (veya zaman aşımını / hatayı) simüle eder.
function sahteIstek({ status, gövdeMetni, hataMesaji, zamanAsimiTetikle, headers } = {}) {
  return vi.spyOn(https, 'request').mockImplementation((opts, cb) => {
    const req = new EventEmitter()
    req.write = vi.fn()
    req.end = vi.fn(() => {
      if (hataMesaji) {
        // Gerçek https: hata senkron değil ama testte hemen tetiklemek yeterli
        queueMicrotask(() => req.emit('error', new Error(hataMesaji)))
        return
      }
      if (zamanAsimiTetikle) {
        queueMicrotask(() => req.emit('timeout'))
        return
      }
      const res = new EventEmitter()
      cb(res)
      res.statusCode = status
      res.headers = headers || {}
      queueMicrotask(() => {
        if (gövdeMetni != null) res.emit('data', gövdeMetni)
        res.emit('end')
      })
    })
    req.destroy = vi.fn((err) => {
      // timeout handler'ın req.destroy(err) çağrısı 'error' olayını tetikler (gerçek https davranışı)
      if (err) queueMicrotask(() => req.emit('error', err))
    })
    return req
  })
}

beforeEach(() => {})
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

describe('rpc', () => {
  test('başarılı yanıtta gövdeyi döndürür', async () => {
    sahteIstek({ status: 200, gövdeMetni: JSON.stringify({ id: 'abc' }) })
    await expect(rpc('deneme', {}, 'jwt')).resolves.toEqual({ id: 'abc' })
  })

  test('23505 (unique ihlali) kodunu cakisma olarak sınıflar', async () => {
    sahteIstek({ status: 409, gövdeMetni: JSON.stringify({ code: '23505', message: 'duplicate key' }) })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'cakisma' })
  })

  test('ağ hatasını ag olarak sınıflar', async () => {
    sahteIstek({ hataMesaji: 'connect ECONNREFUSED' })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'ag' })
  })

  test('500 durumunu ag olarak sınıflar', async () => {
    sahteIstek({ status: 500, gövdeMetni: JSON.stringify({ message: 'sunucu hatası' }) })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'ag' })
  })

  test('gövde ayrıştırılamazsa ag olarak sınıflar', async () => {
    sahteIstek({ status: 400, gövdeMetni: 'not-json{{{' })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'ag' })
  })

  test('YETERSIZ_STOK mesajını yetersiz_stok olarak sınıflar', async () => {
    sahteIstek({ status: 400, gövdeMetni: JSON.stringify({ message: 'YETERSIZ_STOK' }) })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'yetersiz_stok' })
  })

  // I4: SATIR_TOPLAM_UYUSMUYOR ayrı bir iş hatası — stok yetersizliğiyle
  // karıştırılırsa tüketici ('kod' alanı yerine) ham Postgres metnini yeniden
  // ayrıştırmak zorunda kalıyordu (bkz. fatura-stok.js).
  test('SATIR_TOPLAM_UYUSMUYOR mesajını AYRI bir kod (dogrulama) olarak sınıflar', async () => {
    sahteIstek({ status: 400, gövdeMetni: JSON.stringify({ message: 'SATIR_TOPLAM_UYUSMUYOR' }) })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'dogrulama' })
  })

  // Task 2 code review B/5: 40P01 (deadlock) Postgres tarafından KESİN geri
  // alınmıştır — 'ag' (belirsiz) sanılırsa gereksiz insan kontrolüne düşer.
  test('40P01 (deadlock) kodunu yeniden_dene olarak sınıflar ve Türkçe mesaj verir', async () => {
    sahteIstek({ status: 409, gövdeMetni: JSON.stringify({ code: '40P01', message: 'deadlock detected' }) })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({
      kod: 'yeniden_dene',
      message: 'İşlem çakıştı, lütfen tekrar deneyin.',
    })
  })

  test('40001 (serileştirme çakışması) kodunu yeniden_dene olarak sınıflar', async () => {
    sahteIstek({ status: 409, gövdeMetni: JSON.stringify({ code: '40001', message: 'could not serialize access' }) })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'yeniden_dene' })
  })

  // Bulgunun kök sebebi tam olarak buydu: PostgREST 40P01'i 500 ile de
  // döndürebilir; kod bazlı dal `status >= 500` kontrolünden ÖNCE olmazsa
  // bu senaryo yanlışlıkla 'ag' (belirsiz) sınıfına düşer.
  test('500 durumunda gelen 40P01 (deadlock) yine yeniden_dene sınıflanır, ag DEĞİL', async () => {
    sahteIstek({ status: 500, gövdeMetni: JSON.stringify({ code: '40P01', message: 'deadlock detected' }) })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'yeniden_dene' })
  })

  test('23514 (CHECK ihlali) kodunu dogrulama olarak sınıflar', async () => {
    sahteIstek({ status: 400, gövdeMetni: JSON.stringify({ code: '23514', message: 'check constraint violated' }) })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'dogrulama' })
  })

  test('KALEM_YOK mesajını dogrulama olarak sınıflar', async () => {
    sahteIstek({ status: 400, gövdeMetni: JSON.stringify({ message: 'KALEM_YOK: fatura kalemi olmadan...' }) })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'dogrulama' })
  })

  test('GECERSIZ_MIKTAR mesajını dogrulama olarak sınıflar', async () => {
    sahteIstek({ status: 400, gövdeMetni: JSON.stringify({ message: 'GECERSIZ_MIKTAR: urun (-3)' }) })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'dogrulama' })
  })

  test('TELAFI_STOK_SATIRI_YOK mesajını dogrulama olarak sınıflar', async () => {
    sahteIstek({ status: 400, gövdeMetni: JSON.stringify({ message: 'TELAFI_STOK_SATIRI_YOK: urun-id' }) })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'dogrulama' })
  })

  test('jwt yoksa oturum hatasını atar', async () => {
    await expect(rpc('deneme', {}, null)).rejects.toMatchObject({ kod: 'oturum' })
  })

  test('401 (süresi dolmuş jeton) oturum olarak sınıflanır ve mesaj Türkçedir', async () => {
    sahteIstek({ status: 401, gövdeMetni: JSON.stringify({ message: 'JWT expired' }) })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({
      kod: 'oturum',
      message: 'Oturumunuz sona erdi, lütfen tekrar giriş yapın',
    })
  })

  test('zaman aşımı ag olarak sınıflar', async () => {
    sahteIstek({ zamanAsimiTetikle: true })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'ag' })
  })

  test('https.request çağrısına timeout seçeneği geçiriliyor', async () => {
    sahteIstek({ status: 200, gövdeMetni: JSON.stringify({}) })
    await rpc('deneme', {}, 'jwt')
    const opts = https.request.mock.calls[0][0]
    expect(opts.timeout).toBe(20000)
  })

  test('zaman aşımında req.destroy() çağrılır (req.on(timeout) kaydı kurulu)', async () => {
    let yakalananReq
    vi.spyOn(https, 'request').mockImplementation((opts, cb) => {
      const req = new EventEmitter()
      req.write = vi.fn()
      req.end = vi.fn()
      req.destroy = vi.fn((err) => { if (err) queueMicrotask(() => req.emit('error', err)) })
      yakalananReq = req
      return req
    })
    const promise = rpc('deneme', {}, 'jwt').catch(() => {})
    yakalananReq.emit('timeout')
    await promise
    expect(yakalananReq.destroy).toHaveBeenCalled()
  })
})

describe('sec', () => {
  test('başarılı yanıtta dizi döndürür', async () => {
    sahteIstek({ status: 200, gövdeMetni: JSON.stringify([{ id: '1' }, { id: '2' }]) })
    await expect(sec('tablo', 'select=*', 'jwt')).resolves.toEqual([{ id: '1' }, { id: '2' }])
  })

  test('hatalı durumda doğru kod atanır', async () => {
    sahteIstek({ status: 400, gövdeMetni: JSON.stringify({ message: 'bilinmeyen_hata' }) })
    await expect(sec('tablo', 'select=*', 'jwt')).rejects.toMatchObject({ kod: 'bilinmeyen' })
  })

  test('jwt yoksa oturum hatasını atar', async () => {
    await expect(sec('tablo', 'select=*', null)).rejects.toMatchObject({ kod: 'oturum' })
  })

  test('500 durumunu ag olarak sınıflar', async () => {
    sahteIstek({ status: 500, gövdeMetni: JSON.stringify({ message: 'sunucu hatası' }) })
    await expect(sec('tablo', 'select=*', 'jwt')).rejects.toMatchObject({ kod: 'ag' })
  })

  test('gövde ayrıştırılamazsa ag olarak sınıflar', async () => {
    sahteIstek({ status: 400, gövdeMetni: 'not-json{{{' })
    await expect(sec('tablo', 'select=*', 'jwt')).rejects.toMatchObject({ kod: 'ag' })
  })

  test('ağ hatasını ag olarak sınıflar', async () => {
    sahteIstek({ hataMesaji: 'connect ECONNREFUSED' })
    await expect(sec('tablo', 'select=*', 'jwt')).rejects.toMatchObject({ kod: 'ag' })
  })

  test('https.request çağrısına timeout seçeneği geçiriliyor', async () => {
    sahteIstek({ status: 200, gövdeMetni: JSON.stringify([]) })
    await sec('tablo', 'select=*', 'jwt')
    const opts = https.request.mock.calls[0][0]
    expect(opts.timeout).toBe(20000)
  })

  test('zaman aşımında req.destroy() çağrılır (req.on(timeout) kaydı kurulu)', async () => {
    let yakalananReq
    vi.spyOn(https, 'request').mockImplementation((opts, cb) => {
      const req = new EventEmitter()
      req.write = vi.fn()
      req.end = vi.fn()
      req.destroy = vi.fn((err) => { if (err) queueMicrotask(() => req.emit('error', err)) })
      yakalananReq = req
      return req
    })
    const promise = sec('tablo', 'select=*', 'jwt').catch(() => {})
    yakalananReq.emit('timeout')
    await promise
    expect(yakalananReq.destroy).toHaveBeenCalled()
  })
})

describe('secBasliklarla', () => {
  test('Content-Range başlığından toplamı ayrıştırır (0-24/573 → 573)', async () => {
    sahteIstek({
      status: 200,
      gövdeMetni: JSON.stringify([{ id: '1' }]),
      headers: { 'content-range': '0-24/573' },
    })
    await expect(secBasliklarla('tablo', 'select=*', 'jwt')).resolves.toEqual({
      satirlar: [{ id: '1' }],
      toplam: 573,
    })
  })

  test('toplam bilinmiyorsa (*) null döner', async () => {
    sahteIstek({
      status: 200,
      gövdeMetni: JSON.stringify([]),
      headers: { 'content-range': '*/*' },
    })
    await expect(secBasliklarla('tablo', 'select=*', 'jwt')).resolves.toEqual({
      satirlar: [],
      toplam: null,
    })
  })

  test('Content-Range başlığı hiç yoksa null döner', async () => {
    sahteIstek({ status: 200, gövdeMetni: JSON.stringify([{ id: '1' }]) })
    await expect(secBasliklarla('tablo', 'select=*', 'jwt')).resolves.toEqual({
      satirlar: [{ id: '1' }],
      toplam: null,
    })
  })

  test('gövde null dönerse satirlar boş dizi olur (çökmez)', async () => {
    sahteIstek({ status: 200, gövdeMetni: null, headers: { 'content-range': '*/0' } })
    await expect(secBasliklarla('tablo', 'select=*', 'jwt')).resolves.toEqual({
      satirlar: [],
      toplam: 0,
    })
  })

  test('Prefer: count=exact başlığını gönderir', async () => {
    sahteIstek({ status: 200, gövdeMetni: JSON.stringify([]) })
    await secBasliklarla('tablo', 'select=*', 'jwt')
    const opts = https.request.mock.calls[0][0]
    expect(opts.headers['Prefer']).toBe('count=exact')
  })

  test('hatalı durumda sec ile aynı şekilde kod atanır', async () => {
    sahteIstek({ status: 500, gövdeMetni: JSON.stringify({ message: 'sunucu hatası' }) })
    await expect(secBasliklarla('tablo', 'select=*', 'jwt')).rejects.toMatchObject({ kod: 'ag' })
  })

  test('jwt yoksa oturum hatasını atar', async () => {
    await expect(secBasliklarla('tablo', 'select=*', null)).rejects.toMatchObject({ kod: 'oturum' })
  })
})
