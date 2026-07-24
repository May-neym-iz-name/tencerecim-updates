// Bildirim algılama KARAR mantığı — saf, DB'siz (emsal: kargo-durum.test.js _bildirimKarari).
import { describe, test, expect } from 'vitest'
import uretModul from './bildirim-uret.js'

const { _durumdanBildirim: karar } = uretModul

const sip = (over = {}) => ({
  id: 'ORD1', orderNumber: '1234', status: 'CREATED', orderPackageStatus: null,
  totalFinalPrice: 500, currencyCode: 'TRY',
  customer: { firstName: 'Ayşe', lastName: 'Yılmaz' }, ...over,
})

describe('_durumdanBildirim: talep durumlarını yakalar', () => {
  test('CANCEL_REQUESTED (paket) → iptal_talebi / yuksek', () => {
    const b = karar(sip({ orderPackageStatus: 'CANCEL_REQUESTED' }))
    expect(b).toMatchObject({ tip: 'iptal_talebi', onem: 'yuksek', ikas_siparis_id: 'ORD1' })
    expect(b.dedup_anahtar).toBe('ORD1:iptal_talebi:CANCEL_REQUESTED')
    expect(b.baslik).toContain('1234')
  })

  test('REFUND_REQUESTED (sipariş durumu) → iade_talebi / yuksek', () => {
    const b = karar(sip({ status: 'REFUND_REQUESTED' }))
    expect(b).toMatchObject({ tip: 'iade_talebi', onem: 'yuksek' })
    expect(b.mesaj).toContain('Ayşe')
  })

  test('REFUND_REQUEST_ACCEPTED → iade_kabul / normal', () => {
    const b = karar(sip({ orderPackageStatus: 'REFUND_REQUEST_ACCEPTED' }))
    expect(b).toMatchObject({ tip: 'iade_kabul', onem: 'normal' })
  })

  test('REFUND_REJECTED → iade_red / normal', () => {
    const b = karar(sip({ status: 'REFUND_REJECTED' }))
    expect(b).toMatchObject({ tip: 'iade_red', onem: 'normal' })
  })

  test('CANCEL_REJECTED (paket) → iade_red / normal', () => {
    const b = karar(sip({ orderPackageStatus: 'CANCEL_REJECTED' }))
    expect(b).toMatchObject({ tip: 'iade_red', onem: 'normal' })
  })

  // GERÇEK VERİ: 8971042426 → status talepte takılı, paket kabul edilmiş.
  // Öncelik status'e verilirse "İade talebi" (yüksek önem) bildirimi düşer ve
  // kullanıcı çözülmüş bir talep için uyarılır. Çözüm durumu status'ü yenmeli.
  test('status talepte ama paket çözülmüş → çözüm kazanır', () => {
    const b = karar(sip({ status: 'REFUND_REQUESTED', orderPackageStatus: 'REFUND_REQUEST_ACCEPTED' }))
    expect(b).toMatchObject({ tip: 'iade_kabul', onem: 'normal' })
  })

  test('status talepte ama paket reddedilmiş → çözüm kazanır', () => {
    const b = karar(sip({ status: 'CANCEL_REQUESTED', orderPackageStatus: 'CANCEL_REJECTED' }))
    expect(b).toMatchObject({ tip: 'iade_red', onem: 'normal' })
  })

  test('çözüm işareti yoksa talep bildirimi düşer', () => {
    const b = karar(sip({ status: 'REFUND_REQUESTED', orderPackageStatus: 'PARTIALLY_FULFILLED' }))
    expect(b).toMatchObject({ tip: 'iade_talebi', onem: 'yuksek' })
  })

  test('sıradan durum (CREATED) → null (bildirim yok)', () => {
    expect(karar(sip())).toBeNull()
  })

  test('teslim/kargo durumu (FULFILLED) → null', () => {
    expect(karar(sip({ status: 'FULFILLED' }))).toBeNull()
  })
})
