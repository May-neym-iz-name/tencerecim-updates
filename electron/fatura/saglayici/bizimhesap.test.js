import { describe, test, expect, vi, afterEach } from 'vitest'
import { EventEmitter } from 'events'
const https = require('https')
const { faturaGonder, SaglayiciHatasi, _yukOlustur } = require('./bizimhesap')

// https.request taklidi — desen electron/fatura/bulut.test.js'ten.
function sahteIstek({ status, govdeMetni, hataMesaji, zamanAsimiTetikle } = {}) {
  return vi.spyOn(https, 'request').mockImplementation((opts, cb) => {
    const req = new EventEmitter()
    req.write = vi.fn()
    req.end = vi.fn(() => {
      if (hataMesaji) { queueMicrotask(() => req.emit('error', new Error(hataMesaji))); return }
      if (zamanAsimiTetikle) { queueMicrotask(() => req.emit('timeout')); return }
      const res = new EventEmitter()
      cb(res)
      res.statusCode = status
      queueMicrotask(() => {
        if (govdeMetni != null) res.emit('data', govdeMetni)
        res.emit('end')
      })
    })
    req.destroy = vi.fn((err) => { if (err) queueMicrotask(() => req.emit('error', err)) })
    return req
  })
}

afterEach(() => { vi.restoreAllMocks() })

describe('_yukOlustur', () => {
  test('KDV dahil fiyattan satır ve toplamları arka uçla aynı sırayla hesaplar', () => {
    const y = _yukOlustur({
      musteri: { id: 7, unvan: 'Deneme Ltd', adres: 'X Mah.' },
      kalemler: [{ sku: 'TNC.LAV.00001', ad: 'Tencere', miktar: 7, birim_fiyat: 10.005, kdv_orani: 20 }],
      fatura_no: 'A1', tarih: '2026-08-31',
    }, { firmId: 'FIRM' })
    // Önce birim fiyat yuvarlanır (10.01), sonra çarpılır → 70.07
    expect(y.details[0].unitPrice).toBe(10.01)
    expect(y.details[0].total).toBe(70.07)
    expect(y.amounts.total).toBe(70.07)
    expect(y.invoiceType).toBe(3)          // 3 = Satış
    expect(y.firmId).toBe('FIRM')
  })

  test('KDV fiyattan ayrıştırılır: net + tax = total', () => {
    const y = _yukOlustur({
      musteri: { id: 1, unvan: 'A', adres: 'B' },
      kalemler: [{ sku: 'S1', ad: 'X', miktar: 2, birim_fiyat: 120, kdv_orani: 20 }],
      fatura_no: 'A', tarih: '2026-08-31',
    }, { firmId: 'F' })
    const d = y.details[0]
    expect(d.total).toBe(240)
    expect(d.tax).toBe(40)                 // 240 × 20 / 120
    expect(d.net).toBe(200)
    expect(yuvarlaTest(d.net + d.tax)).toBe(d.total)
    expect(y.amounts.tax).toBe(40)
    expect(y.amounts.net).toBe(200)
    expect(y.amounts.gross).toBe(240)
    expect(y.amounts.currency).toBe('TL')
  })

  test('çok kalemli faturada toplamlar satır toplamlarının yuvarlanmış toplamıdır', () => {
    const y = _yukOlustur({
      musteri: { id: 1, unvan: 'A', adres: 'B' },
      kalemler: [
        { sku: 'S1', ad: 'X', miktar: 3, birim_fiyat: 33.33, kdv_orani: 10 },
        { sku: 'S2', ad: 'Y', miktar: 1, birim_fiyat: 19.99, kdv_orani: 20 },
      ],
      fatura_no: 'A', tarih: '2026-08-31',
    }, { firmId: 'F' })
    expect(y.details[0].total).toBe(99.99)
    expect(y.details[1].total).toBe(19.99)
    expect(y.amounts.total).toBe(119.98)
    expect(y.amounts.tax).toBe(yuvarlaTest(9.09 + 3.33))
  })

  test('productId alanına SKU yazar (mükerrer ürün açılmasını önler)', () => {
    const y = _yukOlustur({
      musteri: { id: 1, unvan: 'A', adres: 'B' },
      kalemler: [{ sku: 'TNC.SFR.00063', ad: 'Çaydanlık', barkod: '869', miktar: 1, birim_fiyat: 100, kdv_orani: 10 }],
      fatura_no: 'A2', tarih: '2026-08-31',
    }, { firmId: 'F' })
    expect(y.details[0].productId).toBe('TNC.SFR.00063')
    expect(y.details[0].barcode).toBe('869')
  })

  test('SKU boş kalemde hata atar', () => {
    expect(() => _yukOlustur({
      musteri: { id: 1, unvan: 'A', adres: 'B' },
      kalemler: [{ sku: '', ad: 'X', miktar: 1, birim_fiyat: 10, kdv_orani: 20 }],
      fatura_no: 'A3', tarih: '2026-08-31',
    }, { firmId: 'F' })).toThrow(/SKU/)
  })

  test('firmId yoksa yapilandirma hatası', () => {
    expect(() => _yukOlustur({ musteri: {}, kalemler: [], fatura_no: 'A', tarih: 'x' }, {}))
      .toThrow(/firmId/i)
  })

  test('vergi_no yoksa TC kimlik no kullanılır', () => {
    const y = _yukOlustur({
      musteri: { id: 1, unvan: 'A', adres: 'B', tc: '12345678901' },
      kalemler: [{ sku: 'S1', ad: 'X', miktar: 1, birim_fiyat: 10, kdv_orani: 20 }],
      fatura_no: 'A', tarih: '2026-08-31',
    }, { firmId: 'F' })
    expect(y.customer.taxNo).toBe('12345678901')
  })
})

describe('faturaGonder', () => {
  const gecerliFatura = {
    musteri: { id: 1, unvan: 'A', adres: 'B' },
    kalemler: [{ sku: 'S1', ad: 'X', miktar: 1, birim_fiyat: 120, kdv_orani: 20 }],
    fatura_no: 'A1', tarih: '2026-08-31',
  }

  test('başarılı yanıtta guid ve url döndürür', async () => {
    sahteIstek({ status: 200, govdeMetni: JSON.stringify({ error: '', guid: 'G', url: 'U' }) })
    const s = await faturaGonder(gecerliFatura, { firmId: 'F' })
    expect(s.guid).toBe('G')
    expect(s.url).toBe('U')
  })

  test('gövdedeki error alanı iş hatasıdır (200 dönse bile)', async () => {
    sahteIstek({ status: 200, govdeMetni: JSON.stringify({ error: 'Hatalı para birimi', guid: '', url: '' }) })
    await expect(faturaGonder(gecerliFatura, { firmId: 'F' })).rejects.toMatchObject({
      name: 'SaglayiciHatasi', kod: 'is_hatasi',
    })
  })

  test('ağ hatasında kod ag ve mesaj kesinlik iddia etmez', async () => {
    sahteIstek({ hataMesaji: 'ECONNRESET' })
    await expect(faturaGonder(gecerliFatura, { firmId: 'F' })).rejects.toMatchObject({ kod: 'ag' })
    await expect(faturaGonder(gecerliFatura, { firmId: 'F' })).rejects.toThrow(/doğrulanamadı/)
  })

  test('zaman aşımında kod ag', async () => {
    sahteIstek({ zamanAsimiTetikle: true })
    await expect(faturaGonder(gecerliFatura, { firmId: 'F' })).rejects.toMatchObject({ kod: 'ag' })
  })

  test('5xx veya ayrıştırılamayan gövde ag sayılır (sonuç belirsiz)', async () => {
    sahteIstek({ status: 502, govdeMetni: '<html>Bad Gateway</html>' })
    await expect(faturaGonder(gecerliFatura, { firmId: 'F' })).rejects.toMatchObject({ kod: 'ag' })
  })

  test('firmId yokken ağa hiç çıkmaz', async () => {
    const casus = sahteIstek({ status: 200, govdeMetni: '{}' })
    await expect(faturaGonder(gecerliFatura, {})).rejects.toMatchObject({ kod: 'yapilandirma' })
    expect(casus).not.toHaveBeenCalled()
  })
})

function yuvarlaTest(n) { return Math.round(n * 100) / 100 }
