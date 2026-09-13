import { describe, test, expect } from 'vitest'
const { paketiFaturayaCevir, KanalHatasi } = require('./trendyol')

// ikas adaptör testiyle aynı yaklaşım: gerçek SQLite yerine küçük bir "depo"
// enjekte ediliyor. Adaptörün SQL'i değil KARARLARI test ediliyor.
function depo({ siparis, kalemler = [], urunler = {}, setler = {}, bilesenler = {} }) {
  return {
    siparisGetir: () => siparis,
    kalemleriGetir: () => kalemler,
    urunGetirSku: (sku) => urunler[String(sku || '').toUpperCase()] || null,
    setGetirSku: (sku) => setler[String(sku || '').toUpperCase()] || null,
    setBilesenleriGetir: (id) => bilesenler[id] || [],
  }
}

// Canlıdan alınmış gerçek değerler (sipariş 11553463258, paket 4115823062).
const PAKET = {
  id: 1, paket_id: '4115823062', siparis_no: '11553463258',
  siparis_tarihi: '2026-08-31T10:00:00.000Z', durum: 'Created',
  musteri_ad: 'Ali Veli', musteri_email: 'a@b.c', teslimat_telefon: '5320000001',
  teslimat_adres: 'X Mah. Y Sok. 1', teslimat_il: 'Kocaeli', teslimat_ilce: 'Gölcük',
  fatura_unvan: null, fatura_vergi_no: null, fatura_vergi_dairesi: null,
  fatura_tc: '11111111111', ticari: 0,
}
const URUN = { id: 10, senk_id: 'u-10', sku: 'TNC.MXD.00289', ad: 'Maxx Doria Sahan', barkod: '2004406300496', kdv_orani: 20 }
const KALEM = {
  kalem_id: '6726029076', sku: 'TNC.MXD.00289', barkod: '2004406300496',
  urun_adi: 'Maxx Doria Sahan', miktar: 1, birim_fiyat: 9265, birim_indirim: 0,
  kdv_orani: 20, kalem_durum: 'Created',
}

describe('paketiFaturayaCevir', () => {
  test('paketi fatura girdisine çevirir; kimlik PAKET kimliğidir', () => {
    const g = paketiFaturayaCevir('4115823062', depo({
      siparis: PAKET, kalemler: [KALEM], urunler: { 'TNC.MXD.00289': URUN },
    }))
    expect(g.kanal).toBe('trendyol')
    // Sipariş numarası DEĞİL: aynı sipariş çok pakete bölünürse her paket ayrı fatura alır.
    expect(g.kanal_siparis_id).toBe('4115823062')
    expect(g.not).toContain('11553463258')
  })

  test('🔴 birim_fiyat BİRİM fiyattır — satır toplamı miktarla ÇARPILIR', () => {
    const g = paketiFaturayaCevir('x', depo({
      siparis: PAKET, kalemler: [{ ...KALEM, miktar: 3 }], urunler: { 'TNC.MXD.00289': URUN },
    }))
    expect(g.kalemler[0].birim_fiyat).toBe(9265)
    expect(g.kalemler[0].satir_toplam).toBe(27795)   // 3 × 9265, BÖLÜNMEZ
  })

  test('birim indirim birim fiyattan düşülür', () => {
    const g = paketiFaturayaCevir('x', depo({
      siparis: PAKET, kalemler: [{ ...KALEM, miktar: 2, birim_indirim: 265 }],
      urunler: { 'TNC.MXD.00289': URUN },
    }))
    expect(g.kalemler[0].birim_fiyat).toBe(9000)
    expect(g.kalemler[0].satir_toplam).toBe(18000)
  })

  test('KDV oranı ÜRÜN kaydından gelir, Trendyol satırından değil', () => {
    const g = paketiFaturayaCevir('x', depo({
      siparis: PAKET, kalemler: [{ ...KALEM, kdv_orani: 8 }],
      urunler: { 'TNC.MXD.00289': { ...URUN, kdv_orani: 20 } },
    }))
    expect(g.kalemler[0].kdv_orani).toBe(20)
  })

  test('iptal/iade/tedarik edilemeyen kalem faturaya GİRMEZ', () => {
    const g = paketiFaturayaCevir('x', depo({
      siparis: PAKET,
      kalemler: [KALEM, { ...KALEM, kalem_id: '2', kalem_durum: 'Cancelled' },
        { ...KALEM, kalem_id: '3', kalem_durum: 'Returned' }],
      urunler: { 'TNC.MXD.00289': URUN },
    }))
    expect(g.kalemler).toHaveLength(1)
  })

  test('tüm kalemler iptalse anlamlı hata verir', () => {
    expect(() => paketiFaturayaCevir('x', depo({
      siparis: PAKET, kalemler: [{ ...KALEM, kalem_durum: 'Cancelled' }],
      urunler: { 'TNC.MXD.00289': URUN },
    }))).toThrow(/faturalanacak kalem yok/i)
  })

  test('SET stok koduyla eşleşir ve BİLEŞENLERE çözülür', () => {
    const g = paketiFaturayaCevir('x', depo({
      siparis: PAKET,
      kalemler: [{ ...KALEM, sku: 'TNC.SET.00010', urun_adi: '3lü Tava Seti', birim_fiyat: 300 }],
      setler: { 'TNC.SET.00010': { id: 5, senk_id: 's-5', sku: 'TNC.SET.00010', ad: '3lü Tava Seti' } },
      bilesenler: { 5: [
        { senk_id: 'u-1', sku: 'A', ad: 'Tava 20', barkod: '1', kdv_orani: 20, satis_fiyati: 100, miktar: 1 },
        { senk_id: 'u-2', sku: 'B', ad: 'Tava 24', barkod: '2', kdv_orani: 20, satis_fiyati: 200, miktar: 1 },
      ] },
    }))
    expect(g.kalemler.length).toBeGreaterThan(1)
    expect(g.kalemler.every(k => k.set_senk_id === 's-5')).toBe(true)
  })

  test('eşleşmeyen stok kodu ANLAŞILIR hata verir, sessizce atlanmaz', () => {
    expect(() => paketiFaturayaCevir('x', depo({
      siparis: PAKET, kalemler: [{ ...KALEM, sku: 'YOK.1' }],
    }))).toThrow(/uygulamada eşleşmiyor/i)
  })

  test('bulut kimliği olmayan ürün faturaya yazılmaz', () => {
    expect(() => paketiFaturayaCevir('x', depo({
      siparis: PAKET, kalemler: [KALEM],
      urunler: { 'TNC.MXD.00289': { ...URUN, senk_id: null } },
    }))).toThrow(/bulut kimliği yok/i)
  })

  test('bireysel satışta unvan müşteri adına düşer, TC taşınır', () => {
    const g = paketiFaturayaCevir('x', depo({
      siparis: PAKET, kalemler: [KALEM], urunler: { 'TNC.MXD.00289': URUN },
    }))
    expect(g.musteri.unvan).toBe('Ali Veli')
    expect(g.musteri.tc).toBe('11111111111')
    expect(g.musteri.vergi_no).toBe(null)   // bireyselde Trendyol GÖNDERMEZ, hata değil
  })

  test('kurumsal satışta ünvan ve vergi bilgisi kullanılır', () => {
    const g = paketiFaturayaCevir('x', depo({
      siparis: { ...PAKET, ticari: 1, fatura_unvan: 'ACME A.Ş.', fatura_vergi_no: '1234567890', fatura_vergi_dairesi: 'Kadıköy' },
      kalemler: [KALEM], urunler: { 'TNC.MXD.00289': URUN },
    }))
    expect(g.musteri.unvan).toBe('ACME A.Ş.')
    expect(g.musteri.vergi_no).toBe('1234567890')
  })

  test('ünvan da ad da yoksa fatura kesilmez', () => {
    expect(() => paketiFaturayaCevir('x', depo({
      siparis: { ...PAKET, fatura_unvan: null, musteri_ad: null },
      kalemler: [KALEM], urunler: { 'TNC.MXD.00289': URUN },
    }))).toThrow(/ünvan/i)
  })

  test('olmayan paket anlamlı hata verir', () => {
    expect(() => paketiFaturayaCevir('yok', depo({ siparis: null }))).toThrow(/bulunamadı/i)
  })

  test('fatura tarihi KESİM günüdür, sipariş günü değil', () => {
    const g = paketiFaturayaCevir('x', depo({
      siparis: PAKET, kalemler: [KALEM], urunler: { 'TNC.MXD.00289': URUN },
    }))
    expect(g.tarih).toBe(new Date().toISOString().slice(0, 10))
  })

  test('stok kodu büyük/küçük harf farkına rağmen eşleşir', () => {
    const g = paketiFaturayaCevir('x', depo({
      siparis: PAKET, kalemler: [{ ...KALEM, sku: 'tnc.mxd.00289' }],
      urunler: { 'TNC.MXD.00289': URUN },
    }))
    expect(g.kalemler).toHaveLength(1)
  })
})
