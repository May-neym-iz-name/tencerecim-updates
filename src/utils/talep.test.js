import { describe, test, expect } from 'vitest'
import { bekleyenTalepMi, BEKLEYEN_TALEP_DURUMLARI } from './talep.js'

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
})
