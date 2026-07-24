// Talep kalem ayıklama — SAF, ağsız (emsal: ikas/bildirim-uret.js _durumdanBildirim).
// Fixture GERÇEK veridir: sipariş 1141437359 (Sebiha Yıldız), 2026-07-24'te canlı
// ikas API'sinden çekildi. 3 ürün / 2 paket; talep yalnız ikinci pakette.
import { describe, test, expect } from 'vitest'
import { createRequire } from 'module'

const require_ = createRequire(import.meta.url)
const { _talepPaketleri } = require_('./talep-detay.js')

const GERCEK_SIPARIS = {
  orderNumber: '1141437359',
  status: 'REFUND_REQUESTED',
  orderPackageStatus: 'REFUND_REQUESTED',
  cancelReason: null,
  orderPackages: [
    { id: 'ea53d3db', orderPackageNumber: '1141437359-1', orderPackageFulfillStatus: 'DELIVERED',
      refundReasonId: null, returnShippingMethod: null, note: null,
      orderLineItemIds: ['1f309ae7', '024d3e62'] },
    { id: '401d2425', orderPackageNumber: '1141437359-2', orderPackageFulfillStatus: 'REFUND_REQUESTED',
      refundReasonId: null, returnShippingMethod: null, note: null,
      orderLineItemIds: ['32643bdd'] },
  ],
  orderLineItems: [
    { id: '1f309ae7', quantity: 1, finalPrice: 3100, variant: { name: 'Sofram Grand 40x15' } },
    { id: '024d3e62', quantity: 1, finalPrice: 2200, variant: { name: 'Sofram Grand 32x11' } },
    { id: '32643bdd', quantity: 1, finalPrice: 2670, variant: { name: 'Sofram Grand 36x13' } },
  ],
}

describe('_talepPaketleri', () => {
  test('yalnız talepteki paketin kalemlerini döner', () => {
    const r = _talepPaketleri(GERCEK_SIPARIS)
    expect(r.talepli).toHaveLength(1)
    expect(r.talepli[0].paketNo).toBe('1141437359-2')
    expect(r.talepli[0].kalemler).toEqual([
      { id: '32643bdd', ad: 'Sofram Grand 36x13', miktar: 1, tutar: 2670 },
    ])
  })

  // Asıl koruma bu: personel 7.970 değil 2.670 iade etmeli.
  test('talep toplamı sipariş toplamı DEĞİL, yalnız talepteki kalemlerdir', () => {
    expect(_talepPaketleri(GERCEK_SIPARIS).talepToplami).toBe(2670)
  })

  test('talep dışı kalemler ayrı listelenir (bağlam için)', () => {
    const r = _talepPaketleri(GERCEK_SIPARIS)
    expect(r.talepDisi.map(k => k.id)).toEqual(['1f309ae7', '024d3e62'])
  })

  test('iptal talebi de yakalanır', () => {
    const sip = {
      ...GERCEK_SIPARIS,
      orderPackages: [{ id: 'p1', orderPackageNumber: 'X-1', orderPackageFulfillStatus: 'CANCEL_REQUESTED',
                       refundReasonId: null, returnShippingMethod: null, note: null, orderLineItemIds: ['1f309ae7'] }],
    }
    expect(_talepPaketleri(sip).talepli[0].durum).toBe('CANCEL_REQUESTED')
  })

  // Paket henüz oluşmamışken gelen iptal talebi: sipariş durumu tek kaynaktır.
  // Bu düşerse iptal talepleri hiç görünmez (bkz. src/utils/talep.js aynı kural).
  test('paket yokken sipariş durumundan tüm kalemler talep sayılır', () => {
    const sip = { ...GERCEK_SIPARIS, status: 'CANCEL_REQUESTED', orderPackages: [] }
    const r = _talepPaketleri(sip)
    expect(r.talepli).toHaveLength(1)
    expect(r.talepli[0].kalemler).toHaveLength(3)
    expect(r.talepDisi).toEqual([])
  })

  test('talep yoksa boş döner', () => {
    const sip = { ...GERCEK_SIPARIS, status: 'CREATED',
      orderPackages: [{ id: 'p', orderPackageNumber: 'X-1', orderPackageFulfillStatus: 'DELIVERED',
                        refundReasonId: null, returnShippingMethod: null, note: null, orderLineItemIds: ['1f309ae7'] }] }
    const r = _talepPaketleri(sip)
    expect(r.talepli).toEqual([])
    expect(r.talepToplami).toBe(0)
  })

  test('bozuk/eksik veride patlamaz', () => {
    expect(_talepPaketleri(null).talepli).toEqual([])
    expect(_talepPaketleri({}).talepli).toEqual([])
  })

  // Sebep/not canlı veride null geldi — varlığına GÜVENİLMEZ, ama doluysa taşınmalı.
  test('sebep ve not doluysa taşınır', () => {
    const sip = {
      ...GERCEK_SIPARIS,
      orderPackages: [{ id: 'p', orderPackageNumber: 'X-1', orderPackageFulfillStatus: 'REFUND_REQUESTED',
                        refundReasonId: 'R7', returnShippingMethod: 'CARGO', note: 'kapak kırık',
                        orderLineItemIds: ['32643bdd'] }],
    }
    const p = _talepPaketleri(sip).talepli[0]
    expect(p.sebepId).toBe('R7')
    expect(p.notu).toBe('kapak kırık')
    expect(p.iadeKargo).toBe('CARGO')
  })
})
