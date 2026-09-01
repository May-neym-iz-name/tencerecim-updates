import { describe, test, expect } from 'vitest'
const { satisiFaturayaCevir, KanalHatasi } = require('./perakende')

function depo({ satis, kalemler = [], urunler = {}, musteri = null }) {
  return {
    satisGetir: () => satis,
    kalemleriGetir: () => kalemler,
    urunGetir: (id) => urunler[id] || null,
    musteriGetir: () => musteri,
  }
}

const SATIS = { id: 5, fis_no: 'FIS-2026-000123', musteri_id: 9, genel_toplam: 240, tarih: '2026-09-01 15:00:00' }
const URUN = { id: 10, senk_id: 'u-10', sku: 'TNC.LAV.00001', ad: 'Tencere', barkod: '869' }
const MUSTERI = {
  id: 9, ad: 'Deneme', soyad: 'Müşteri', unvan: null, vergi_no: null, vergi_dairesi: null,
  tc_kimlik: '11111111110', adres: 'X Mah.', il: 'Kocaeli', ilce: 'Gölcük',   // sizinti-tara: yok-say (uydurma numara)
  telefon: '5550000000', email: 'a@b.c',
}
const kalem = (d = {}) => ({ urun_id: 10, miktar: 2, birim_fiyat: 120, iskonto_orani: 0, kdv_orani: 20, toplam: 240, ...d })

describe('satisiFaturayaCevir — temel', () => {
  test('fiş numarası kanal sipariş kimliği olur', () => {
    const f = satisiFaturayaCevir(5, depo({ satis: SATIS, kalemler: [kalem()], urunler: { 10: URUN }, musteri: MUSTERI }))
    expect(f.kanal).toBe('perakende')
    expect(f.kanal_siparis_id).toBe('FIS-2026-000123')
  })

  test('kalem gerçek ürüne bağlı: SKU ve bulut kimliği üründen gelir', () => {
    const f = satisiFaturayaCevir(5, depo({ satis: SATIS, kalemler: [kalem()], urunler: { 10: URUN }, musteri: MUSTERI }))
    expect(f.kalemler).toEqual([{
      urun_senk_id: 'u-10', sku: 'TNC.LAV.00001', ad: 'Tencere', barkod: '869',
      miktar: 2, birim_fiyat: 120, kdv_orani: 20, satir_toplam: 240, set_senk_id: null,
    }])
  })

  test('KDV oranı SATIŞ KALEMİNDEN gelir (ürün kaydından değil)', () => {
    // Perakende kalemi kendi kdv_orani'ni saklar; satış anındaki oran geçerlidir.
    const f = satisiFaturayaCevir(5, depo({
      satis: SATIS, kalemler: [kalem({ kdv_orani: 10 })], urunler: { 10: { ...URUN } }, musteri: MUSTERI,
    }))
    expect(f.kalemler[0].kdv_orani).toBe(10)
  })

  test('müşteri: ünvan yoksa ad soyad kullanılır, TC taşınır', () => {
    const f = satisiFaturayaCevir(5, depo({ satis: SATIS, kalemler: [kalem()], urunler: { 10: URUN }, musteri: MUSTERI }))
    expect(f.musteri.unvan).toBe('Deneme Müşteri')
    expect(f.musteri.tc).toBe('11111111110')   // sizinti-tara: yok-say (uydurma numara)
    expect(f.musteri.adres).toContain('Gölcük')
  })

  test('kurumsal müşteride ünvan ve vergi no kullanılır', () => {
    const f = satisiFaturayaCevir(5, depo({
      satis: SATIS, kalemler: [kalem()], urunler: { 10: URUN },
      musteri: { ...MUSTERI, unvan: 'Deneme Ltd', vergi_no: '1234567890', vergi_dairesi: 'Gölcük' },
    }))
    expect(f.musteri.unvan).toBe('Deneme Ltd')
    expect(f.musteri.vergi_no).toBe('1234567890')
  })
})

describe('satisiFaturayaCevir — iskonto', () => {
  test('🔴 iskontolu kalemde faturaya İSKONTOLU birim fiyat gider', () => {
    // satis_kalemleri.birim_fiyat iskonto ÖNCESİ, toplam ise iskonto SONRASI.
    // Ham birim fiyat gönderilseydi sunucu doğrulaması (satir_toplam ≈ miktar ×
    // birim_fiyat) tutmaz ve geçerli fatura reddedilirdi.
    const f = satisiFaturayaCevir(5, depo({
      satis: SATIS,
      kalemler: [kalem({ miktar: 2, birim_fiyat: 120, iskonto_orani: 10, toplam: 216 })],
      urunler: { 10: URUN }, musteri: MUSTERI,
    }))
    expect(f.kalemler[0].birim_fiyat).toBe(108)     // 120 − %10
    expect(f.kalemler[0].satir_toplam).toBe(216)
  })

  test('kuruşlu iskontoda satır toplamı korunur, birim fiyat yuvarlanır', () => {
    const f = satisiFaturayaCevir(5, depo({
      satis: SATIS,
      kalemler: [kalem({ miktar: 3, birim_fiyat: 100, iskonto_orani: 33, toplam: 201 })],
      urunler: { 10: URUN }, musteri: MUSTERI,
    }))
    expect(f.kalemler[0].satir_toplam).toBe(201)
    expect(f.kalemler[0].birim_fiyat).toBe(67)
  })
})

describe('satisiFaturayaCevir — guardlar', () => {
  test('satış bulunamazsa anlaşılır hata', () => {
    expect(() => satisiFaturayaCevir(99, depo({ satis: null }))).toThrow(/satış/i)
  })

  test('🔴 müşterisiz satışa fatura kesilemez', () => {
    // Perakende satışların çoğu müşterisiz; faturada alıcı kimliği ZORUNLU.
    expect(() => satisiFaturayaCevir(5, depo({
      satis: { ...SATIS, musteri_id: null }, kalemler: [kalem()], urunler: { 10: URUN }, musteri: null,
    }))).toThrow(/müşteri/i)
  })

  test('kalemsiz satış faturalanamaz', () => {
    expect(() => satisiFaturayaCevir(5, depo({ satis: SATIS, kalemler: [], musteri: MUSTERI })))
      .toThrow(/kalem/i)
  })

  test('SKU\'su olmayan ürün faturaya yazılamaz', () => {
    expect(() => satisiFaturayaCevir(5, depo({
      satis: SATIS, kalemler: [kalem()], urunler: { 10: { ...URUN, sku: '' } }, musteri: MUSTERI,
    }))).toThrow(/stok kodu|SKU/i)
  })

  test('bulut kimliği olmayan ürün faturaya yazılamaz', () => {
    expect(() => satisiFaturayaCevir(5, depo({
      satis: SATIS, kalemler: [kalem()], urunler: { 10: { ...URUN, senk_id: null } }, musteri: MUSTERI,
    }))).toThrow(/bulut kimliği|senk/i)
  })

  test('iade edilmiş (durum) satış faturalanamaz', () => {
    expect(() => satisiFaturayaCevir(5, depo({
      satis: { ...SATIS, durum: 'iade' }, kalemler: [kalem()], urunler: { 10: URUN }, musteri: MUSTERI,
    }))).toThrow(/iade/i)
  })

  test('hata sınıfı KanalHatasi ve kod dogrulama', () => {
    try { satisiFaturayaCevir(99, depo({ satis: null })) } catch (e) {
      expect(e).toBeInstanceOf(KanalHatasi)
      expect(e.kod).toBe('dogrulama')
    }
  })
})
