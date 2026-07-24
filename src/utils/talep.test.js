import { describe, test, expect } from 'vitest'
import { bekleyenTalepMi, BEKLEYEN_TALEP_DURUMLARI, COZULMUS_TALEP_DURUMLARI } from './talep.js'

describe('bekleyenTalepMi', () => {
  test('sipariş durumunda iade talebi → true', () => {
    expect(bekleyenTalepMi({ durum: 'REFUND_REQUESTED', kargo_durumu: null })).toBe(true)
  })

  test('kargo/paket durumunda iptal talebi → true', () => {
    expect(bekleyenTalepMi({ durum: 'CREATED', kargo_durumu: 'CANCEL_REQUESTED' })).toBe(true)
  })

  test('kabul/red bekleyen talep DEĞİL → false', () => {
    expect(bekleyenTalepMi({ durum: 'REFUND_REJECTED' })).toBe(false)
    expect(bekleyenTalepMi({ kargo_durumu: 'REFUND_REQUEST_ACCEPTED' })).toBe(false)
    expect(bekleyenTalepMi({ durum: 'REFUNDED' })).toBe(false)
  })

  // GERÇEK VERİ: ikas'ta sipariş `status` talepte kalırken paket durumu çözüme
  // geçebiliyor (8971042426, 7051109769). "OR" mantığı bunları bekleyen sayıyordu.
  test('bir alan talepte kalsa da diğeri çözülmüşse → false', () => {
    expect(bekleyenTalepMi({ durum: 'REFUND_REQUESTED', kargo_durumu: 'REFUND_REQUEST_ACCEPTED' })).toBe(false)
    expect(bekleyenTalepMi({ durum: 'CANCEL_REQUESTED', kargo_durumu: 'CANCEL_REJECTED' })).toBe(false)
    expect(bekleyenTalepMi({ durum: 'REFUND_REQUESTED', kargo_durumu: 'REFUNDED' })).toBe(false)
  })

  // KARAR (kullanıcı, 2026-07-24): çözüm işareti YOKSA talep bekliyor sayılır —
  // yaşı önemli değil. Eski birikinti sessizce elenmez, kullanıcı ikas'ta kapatır.
  test('çözüm işareti olmayan eski talep hâlâ bekliyor → true', () => {
    expect(bekleyenTalepMi({ durum: 'REFUND_REQUESTED', kargo_durumu: 'PARTIALLY_FULFILLED' })).toBe(true)
    expect(bekleyenTalepMi({ durum: 'REFUND_REQUESTED', kargo_durumu: 'PARTIALLY_DELIVERED' })).toBe(true)
  })

  test('sıradan sipariş → false', () => {
    expect(bekleyenTalepMi({ durum: 'CREATED', kargo_durumu: 'FULFILLED' })).toBe(false)
  })

  test('boş/eksik alanlarda patlamaz', () => {
    expect(bekleyenTalepMi({})).toBe(false)
    expect(bekleyenTalepMi(null)).toBe(false)
  })

  test('durum listesi tam olarak iki bekleyen durumdur', () => {
    expect(BEKLEYEN_TALEP_DURUMLARI).toEqual(['REFUND_REQUESTED', 'CANCEL_REQUESTED'])
  })

  test('çözülmüş durum listesi bekleyenlerle kesişmez', () => {
    expect(COZULMUS_TALEP_DURUMLARI).toContain('REFUND_REQUEST_ACCEPTED')
    expect(COZULMUS_TALEP_DURUMLARI.some(d => BEKLEYEN_TALEP_DURUMLARI.includes(d))).toBe(false)
  })
})
