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

  // GERÇEK VERİ: ikas'ta sipariş `status` talepte kalırken paket durumu çözüme
  // geçebiliyor (8971042426, 7051109769). "OR" mantığı bunları bekleyen sayıyordu.
  test('bir alan talepte kalsa da diğeri çözülmüşse → false', () => {
    expect(bekleyenTalepMi({ durum: 'REFUND_REQUESTED', kargo_durumu: 'REFUND_REQUEST_ACCEPTED' })).toBe(false)
    expect(bekleyenTalepMi({ durum: 'CANCEL_REQUESTED', kargo_durumu: 'CANCEL_REJECTED' })).toBe(false)
    expect(bekleyenTalepMi({ durum: 'REFUND_REQUESTED', kargo_durumu: 'REFUNDED' })).toBe(false)
  })

  // KARAR (kullanıcı, 2026-07-24 — revize): YALNIZ fiilen talepte olanlar listelenir.
  // Paket akışta ilerlemişse (kısmen gönderilmiş/teslim) talep artık aktif değildir.
  test('paket akışta ilerlemişse talep aktif değil → false', () => {
    expect(bekleyenTalepMi({ durum: 'REFUND_REQUESTED', kargo_durumu: 'PARTIALLY_FULFILLED' })).toBe(false)
    expect(bekleyenTalepMi({ durum: 'REFUND_REQUESTED', kargo_durumu: 'PARTIALLY_DELIVERED' })).toBe(false)
    expect(bekleyenTalepMi({ durum: 'REFUND_REQUESTED', kargo_durumu: 'DELIVERED' })).toBe(false)
  })

  // Paket HENÜZ OLUŞMAMIŞSA paket durumu bilgi taşımaz → sipariş durumu tek kaynak.
  // İptal talepleri çoğunlukla bu aşamada gelir; kaçırılırsa özellik anlamsızlaşır.
  test('paket yokken sipariş durumu tek kaynaktır → true', () => {
    expect(bekleyenTalepMi({ durum: 'CANCEL_REQUESTED', kargo_durumu: null })).toBe(true)
    expect(bekleyenTalepMi({ durum: 'CANCEL_REQUESTED', kargo_durumu: 'UNFULFILLED' })).toBe(true)
    expect(bekleyenTalepMi({ durum: 'REFUND_REQUESTED', kargo_durumu: '' })).toBe(true)
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
