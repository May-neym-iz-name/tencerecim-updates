import { describe, test, expect, vi, afterEach } from 'vitest'
import { EventEmitter } from 'events'
const https = require('https')
const { faturaGonder, baglantiSina, SaglayiciHatasi, _yukOlustur } = require('./bizimhesap')

// https.request taklidi — desen electron/fatura/bulut.test.js'ten.
function sahteIstek({ status, govdeMetni, hataMesaji, zamanAsimiTetikle, yarimKesme } = {}) {
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
        if (yarimKesme) {
          // Yanıt başladı ama bitmedi: gerçek hayatta proxy/TLS reset.
          res.emit('data', '{"error":"","gu')
          res.emit(yarimKesme)          // 'aborted' | 'close' | 'error'
          return
        }
        if (govdeMetni != null) res.emit('data', govdeMetni)
        res.emit('end')
      })
    })
    req.destroy = vi.fn((err) => { if (err) queueMicrotask(() => req.emit('error', err)) })
    return req
  })
}

const gecerliKalem = { sku: 'S1', ad: 'X', miktar: 1, birim_fiyat: 120, kdv_orani: 20 }
const gecerliFatura = {
  musteri: { id: 1, unvan: 'A', adres: 'B' },
  kalemler: [gecerliKalem],
  fatura_no: 'A1', tarih: '2026-08-31',
}
function yuk(degisiklik = {}, ayarlar = { firmId: 'F' }) {
  return _yukOlustur({ ...gecerliFatura, ...degisiklik }, ayarlar)
}
function yuvarlaTest(n) { return Math.round(n * 100) / 100 }

afterEach(() => { vi.restoreAllMocks() })

describe('_yukOlustur — tutar matematiği', () => {
  test('KDV dahil fiyattan satır ve toplamları arka uçla aynı sırayla hesaplar', () => {
    const y = yuk({ kalemler: [{ sku: 'TNC.LAV.00001', ad: 'Tencere', miktar: 7, birim_fiyat: 10.005, kdv_orani: 20 }] })
    // Önce birim fiyat yuvarlanır (10.01), sonra çarpılır → 70.07
    expect(y.details[0].unitPrice).toBe(10.01)
    expect(y.details[0].total).toBe(70.07)
    expect(y.amounts.total).toBe(70.07)
    expect(y.invoiceType).toBe(3)          // 3 = Satış
    expect(y.firmId).toBe('FIRM' === 'FIRM' ? 'F' : 'F')
  })

  test('satır toplamı yuvarlanır — kayan nokta artığı faturaya sızmaz', () => {
    // 3 × 1.15 = 3.4499999999999997. yuvarla() kaldırılırsa bu iddia KIRILIR.
    // (Önceki 7 × 10.01 vakası kayan noktada tesadüfen tam çıktığı için
    //  mutasyonu yakalamıyordu — 01.09 incelemesi H4.)
    const y = yuk({ kalemler: [{ sku: 'S1', ad: 'X', miktar: 3, birim_fiyat: 1.15, kdv_orani: 20 }] })
    expect(Object.is(y.details[0].total, 3.45)).toBe(true)
    expect(Object.is(y.amounts.total, 3.45)).toBe(true)
  })

  test('KDV fiyattan ayrıştırılır: net + tax = total', () => {
    const y = yuk({ kalemler: [{ sku: 'S1', ad: 'X', miktar: 2, birim_fiyat: 120, kdv_orani: 20 }] })
    const d = y.details[0]
    expect(d.total).toBe(240)
    expect(d.tax).toBe(40)                 // 240 × 20 / 120
    expect(d.net).toBe(200)
    expect(yuvarlaTest(d.net + d.tax)).toBe(d.total)
    expect(y.amounts).toMatchObject({ currency: 'TL', gross: 240, net: 200, tax: 40, total: 240 })
  })

  test('KDV oranı 0 olan kalemde vergi sıfır, net = total', () => {
    const y = yuk({ kalemler: [{ sku: 'S1', ad: 'X', miktar: 1, birim_fiyat: 50, kdv_orani: 0 }] })
    expect(y.details[0].tax).toBe(0)
    expect(y.details[0].net).toBe(50)
  })

  test('çok kalemli faturada toplamlar satır toplamlarının yuvarlanmış toplamıdır', () => {
    const y = yuk({ kalemler: [
      { sku: 'S1', ad: 'X', miktar: 3, birim_fiyat: 33.33, kdv_orani: 10 },
      { sku: 'S2', ad: 'Y', miktar: 1, birim_fiyat: 19.99, kdv_orani: 20 },
    ] })
    expect(y.details[0].total).toBe(99.99)
    expect(y.details[1].total).toBe(19.99)
    expect(y.amounts.total).toBe(119.98)
    expect(y.amounts.tax).toBe(yuvarlaTest(9.09 + 3.33))
  })
})

describe('_yukOlustur — set kuruş dağıtımı (satir_toplam)', () => {
  test('verilen satır toplamı faturaya AYNEN yazılır (kuruş artığı son bileşende)', () => {
    // Set çözmede 100,00 TL üç bileşene 33,33 + 33,33 + 33,34 olarak dağıtılır.
    const y = yuk({ kalemler: [{ sku: 'S1', ad: 'Kapak', miktar: 1, birim_fiyat: 33.33, kdv_orani: 20, satir_toplam: 33.34 }] })
    expect(y.details[0].total).toBe(33.34)
    expect(y.details[0].unitPrice).toBe(33.33)
    expect(y.amounts.total).toBe(33.34)
  })

  test('satır toplamı toleransı aşarsa reddedilir', () => {
    expect(() => yuk({ kalemler: [{ sku: 'S1', ad: 'X', miktar: 1, birim_fiyat: 100, kdv_orani: 20, satir_toplam: 150 }] }))
      .toThrow(/uyuşmuyor/)
  })
})

describe('_yukOlustur — guardlar', () => {
  test('productId alanına SKU yazar (mükerrer ürün açılmasını önler)', () => {
    const y = yuk({ kalemler: [{ sku: 'TNC.SFR.00063', ad: 'Çaydanlık', barkod: '869', miktar: 1, birim_fiyat: 100, kdv_orani: 10 }] })
    expect(y.details[0].productId).toBe('TNC.SFR.00063')
    expect(y.details[0].barcode).toBe('869')
  })

  test('SKU boş kalemde hata atar', () => {
    expect(() => yuk({ kalemler: [{ ...gecerliKalem, sku: '' }] })).toThrow(/SKU/)
  })

  test('firmId yoksa yapilandirma hatası', () => {
    expect(() => yuk({}, {})).toThrow(/firmId/i)
    try { yuk({}, {}) } catch (e) { expect(e.kod).toBe('yapilandirma') }
  })

  test.each([
    ['miktar', { miktar: undefined }, /miktar/i],
    ['birim fiyat', { birim_fiyat: 'abc' }, /birim fiyat/i],
    ['KDV oranı', { kdv_orani: null }, /KDV/i],
  ])('%s sayıya çevrilemiyorsa hata atar (null tutarlı fatura üretilmez)', (_ad, degisiklik, kalip) => {
    // Number(undefined) = NaN, JSON.stringify NaN -> null. Kontrol edilmezse
    // tutarı null olan bir fatura ağa çıkar (01.09 incelemesi H2).
    expect(() => yuk({ kalemler: [{ ...gecerliKalem, ...degisiklik }] })).toThrow(kalip)
  })

  test('negatif miktar reddedilir (negatif tutarlı satış faturası üretilmez)', () => {
    expect(() => yuk({ kalemler: [{ ...gecerliKalem, miktar: -2 }] })).toThrow(/miktar/i)
  })

  test('sıfır miktar reddedilir', () => {
    expect(() => yuk({ kalemler: [{ ...gecerliKalem, miktar: 0 }] })).toThrow(/miktar/i)
  })

  test('müşteri ünvanı zorunludur', () => {
    expect(() => yuk({ musteri: { id: 1, adres: 'B' } })).toThrow(/ünvan/i)
  })

  test('fatura tarihi zorunludur', () => {
    expect(() => yuk({ tarih: undefined })).toThrow(/tarih/i)
  })

  test('zorunlu alanlar JSON çıktısından DÜŞMEZ', () => {
    const j = JSON.parse(JSON.stringify(yuk()))
    expect(j.customer).toHaveProperty('title')
    expect(j.customer).toHaveProperty('customerId')
    expect(j.dates).toHaveProperty('invoiceDate')
    expect(j.dates).toHaveProperty('dueDate')
  })

  test('vergi_no yoksa TC kimlik no kullanılır', () => {
    const y = yuk({ musteri: { id: 1, unvan: 'A', adres: 'B', tc: '12345678901' } })
    expect(y.customer.taxNo).toBe('12345678901')
  })
})

describe('faturaGonder', () => {
  test('başarılı yanıtta guid ve url döndürür', async () => {
    sahteIstek({ status: 200, govdeMetni: JSON.stringify({ error: '', guid: 'G', url: 'U' }) })
    const s = await faturaGonder(gecerliFatura, { firmId: 'F' })
    expect(s).toMatchObject({ guid: 'G', url: 'U' })
  })

  test('gövdedeki error alanı iş hatasıdır (200 dönse bile)', async () => {
    sahteIstek({ status: 200, govdeMetni: JSON.stringify({ error: 'Hatalı para birimi', guid: '', url: '' }) })
    await expect(faturaGonder(gecerliFatura, { firmId: 'F' })).rejects.toMatchObject({
      name: 'SaglayiciHatasi', kod: 'is_hatasi',
    })
  })

  test.each([400, 404, 422])('%i durum kodu BAŞARI sayılmaz (fatura oluşmadı)', async (s) => {
    // Bu kontrol olmazsa gövdesi JSON olan bir 4xx "başarılı" sayılır, sipariş
    // UNIQUE kısıtı yüzünden kalıcı olarak faturalanamaz kalır (inceleme C1).
    sahteIstek({ status: s, govdeMetni: JSON.stringify({ message: 'reddedildi' }) })
    await expect(faturaGonder(gecerliFatura, { firmId: 'F' })).rejects.toMatchObject({ kod: 'is_hatasi' })
  })

  test.each([401, 403])('%i yapilandirma hatasıdır (firmId/Token)', async (s) => {
    sahteIstek({ status: s, govdeMetni: JSON.stringify({ message: 'unauthorized' }) })
    await expect(faturaGonder(gecerliFatura, { firmId: 'F' })).rejects.toMatchObject({ kod: 'yapilandirma' })
  })

  test('200 dönse de guid boşsa başarı sayılmaz, belirsiz kalır', async () => {
    sahteIstek({ status: 200, govdeMetni: '{}' })
    await expect(faturaGonder(gecerliFatura, { firmId: 'F' })).rejects.toMatchObject({ kod: 'ag' })
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

  test.each(['aborted', 'close', 'error'])(
    'yanıt yarıda kesilirse (%s) Promise ASILI KALMAZ, ag ile reddedilir',
    async (olay) => {
      // Gerçek https'te yanıt başlıkları geldikten sonra soket koparsa req 'error'
      // yaymaz, res 'end' yaymaz. Dinleyiciler olmadan bu test zaman aşımına
      // düşerdi (inceleme C2 — canlı sunucuyla doğrulandı).
      sahteIstek({ status: 200, yarimKesme: olay })
      await expect(faturaGonder(gecerliFatura, { firmId: 'F' })).rejects.toMatchObject({ kod: 'ag' })
    },
    2000,
  )

  test.each([500, 502, 503])('%i ag sayılır (sonuç belirsiz)', async (s) => {
    sahteIstek({ status: s, govdeMetni: '<html>Bad Gateway</html>' })
    await expect(faturaGonder(gecerliFatura, { firmId: 'F' })).rejects.toMatchObject({ kod: 'ag' })
  })

  test('firmId yokken ağa hiç çıkmaz', async () => {
    const casus = sahteIstek({ status: 200, govdeMetni: '{}' })
    await expect(faturaGonder(gecerliFatura, {})).rejects.toMatchObject({ kod: 'yapilandirma' })
    expect(casus).not.toHaveBeenCalled()
  })

  test('firmId ve müşteri kişisel verisi hata nesnesine sızmaz (faturaGonder)', async () => {
    sahteIstek({ status: 502, govdeMetni: 'patlak' })
    try {
      await faturaGonder({ ...gecerliFatura, musteri: { id: 1, unvan: 'A', adres: 'B', tc: '12345678901', telefon: '5320000001' } }, { firmId: 'GIZLI' })
    } catch (e) {
      const metin = e.message + JSON.stringify(e.ayrinti || {})
      expect(metin).not.toContain('GIZLI')
      expect(metin).not.toContain('12345678901')
      expect(metin).not.toContain('5320000001')
    }
  })
})

describe('baglantiSina — salt okunur kimlik denemesi', () => {
  test('token yoksa ağa HİÇ çıkmaz', async () => {
    const casus = sahteIstek({ status: 200, govdeMetni: '{}' })
    await expect(baglantiSina({ firm_id: 'F' })).rejects.toMatchObject({ kod: 'yapilandirma' })
    expect(casus).not.toHaveBeenCalled()
  })

  test('başarılı yanıtta ürün sayısı ve firmId durumu döner', async () => {
    sahteIstek({ status: 200, govdeMetni: JSON.stringify({ products: [{ id: 1 }, { id: 2 }] }) })
    const s = await baglantiSina({ token: 'T', firm_id: 'F' })
    expect(s).toMatchObject({ ok: true, urunSayisi: 2, firmIdGirilmis: true })
  })

  test('firmId girilmemişse bunu bildirir (bu uç firmId doğrulamaz)', async () => {
    sahteIstek({ status: 200, govdeMetni: JSON.stringify({ products: [] }) })
    const s = await baglantiSina({ token: 'T' })
    expect(s.firmIdGirilmis).toBe(false)
  })

  test.each([401, 403])('%i: token reddedildi, mesaj kullanıcıya ne yapacağını söyler', async (st) => {
    sahteIstek({ status: st, govdeMetni: '{}' })
    await expect(baglantiSina({ token: 'T' })).rejects.toThrow(/API Key/)
  })

  test('SALT OKUNUR: GET ile products ucuna gider, fatura kesme ucuna DEGIL', async () => {
    const casus = sahteIstek({ status: 200, govdeMetni: '{}' })
    await baglantiSina({ token: 'T' })
    const secenekler = casus.mock.calls[0][0]
    expect(secenekler.method).toBe('GET')
    expect(secenekler.path).toBe('/api/b2b/products')
    expect(secenekler.headers.Token).toBe('T')
    expect(secenekler.headers.Key).toMatch(/^BZMHB2B/)
  })

  test('ağ hatası belirsiz değil, doğrudan bildirilir (yazma yok, tekrar denenebilir)', async () => {
    sahteIstek({ hataMesaji: 'ECONNRESET' })
    await expect(baglantiSina({ token: 'T' })).rejects.toMatchObject({ kod: 'ag' })
  })
})
