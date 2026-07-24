// Talep aşaması KARAR mantığı — saf, DB'siz.
// NOT: gerçek DB testi bu projede mümkün değil — better-sqlite3 Electron için
// derlenmiştir, vitest Node ile koşar ("compiled against a different Node.js version").
// Bu yüzden doğrulama ve dönüşüm saf fonksiyonlara ayrıldı ve testler onları hedefliyor
// (emsal: ikas/bildirim-uret.js _durumdanBildirim).
import { describe, test, expect } from 'vitest'
import { createRequire } from 'module'

const require_ = createRequire(import.meta.url)
const { _dogrula, _haritala, ASAMALAR } = require_('./talep-durumlari.js')

describe('_dogrula', () => {
  test('geçerli onay kaydı normalleşerek döner', () => {
    expect(_dogrula({ ikasSiparisId: 'ORD1', asama: 'onaylandi', kullanici: 'Burak' }))
      .toEqual({ ikasSiparisId: 'ORD1', asama: 'onaylandi', not: null, kullanici: 'Burak' })
  })

  test('kapatma notu kırpılarak taşınır', () => {
    expect(_dogrula({ ikasSiparisId: 'ORD1', asama: 'kapatildi', notMetni: '  müşteri vazgeçti  ' }))
      .toEqual({ ikasSiparisId: 'ORD1', asama: 'kapatildi', not: 'müşteri vazgeçti', kullanici: null })
  })

  // Notsuz kapatma sonradan "bunu neden kapatmışız" sorusunu cevapsız bırakır.
  // Doğrulama UI'da DEĞİL burada: IPC ucu doğrudan da çağrılabilir.
  test('kapatma notsuz reddedilir', () => {
    expect(() => _dogrula({ ikasSiparisId: 'ORD1', asama: 'kapatildi' })).toThrow(/not/i)
    expect(() => _dogrula({ ikasSiparisId: 'ORD1', asama: 'kapatildi', notMetni: '   ' })).toThrow(/not/i)
  })

  test('onay notsuz kabul edilir', () => {
    expect(() => _dogrula({ ikasSiparisId: 'ORD1', asama: 'onaylandi' })).not.toThrow()
  })

  test('bilinmeyen aşama reddedilir', () => {
    expect(() => _dogrula({ ikasSiparisId: 'ORD1', asama: 'saçma' })).toThrow(/aşama/i)
  })

  test('sipariş kimliği yoksa reddedilir', () => {
    expect(() => _dogrula({ asama: 'onaylandi' })).toThrow(/sipariş/i)
    expect(() => _dogrula()).toThrow(/sipariş/i)
  })

  test('aşama listesi tam olarak iki değerdir', () => {
    expect(ASAMALAR).toEqual(['onaylandi', 'kapatildi'])
  })
})

describe('_haritala', () => {
  test('satırlar ikas_siparis_id ile anahtarlanır', () => {
    const h = _haritala([
      { ikas_siparis_id: 'A', asama: 'onaylandi' },
      { ikas_siparis_id: 'B', asama: 'kapatildi' },
    ])
    expect(h.A.asama).toBe('onaylandi')
    expect(h.B.asama).toBe('kapatildi')
  })

  test('boş/eksik girdide patlamaz', () => {
    expect(_haritala([])).toEqual({})
    expect(_haritala(null)).toEqual({})
  })
})
