import { describe, test, expect, beforeEach } from 'vitest'
const { siparisiFaturayaCevir, KanalHatasi } = require('./ikas')

// Saf sorgu-tablosu taklidi: gerçek SQLite yerine, adaptörün sorduğu her şeyi
// veren küçük bir "depo" enjekte ediliyor. Adaptörün SQL'i değil KARARLARI test
// ediliyor (hangi kalem faturaya girer, hangisi guard'a takılır).
function depo({ siparis, kalemler = [], urunler = {}, urunVaryant = {}, setler = {}, bilesenler = {} }) {
  return {
    siparisGetir: () => siparis,
    kalemleriGetir: () => kalemler,
    urunGetir: (id) => urunler[id] || null,
    urunGetirVaryanttan: (vid) => urunVaryant[vid] || null,
    setGetirVaryanttan: (vid) => setler[vid] || null,
    setBilesenleriGetir: (setId) => bilesenler[setId] || [],
  }
}

const SIPARIS = {
  id: 1, ikas_siparis_id: 'IKAS-1', siparis_no: 'TNC-1001', siparis_tarihi: '2026-09-01 14:30:00',
  fatura_unvan: 'Deneme Ltd', fatura_vergi_no: '1234567890', fatura_vergi_dairesi: 'Kadıköy',
  fatura_tc: null, musteri_ad: 'Ali Veli', musteri_email: 'a@b.c', musteri_telefon: '5320000001',
  teslimat_adres: 'X Mah. Y Sok. 1', teslimat_il: 'Kocaeli', teslimat_ilce: 'Gölcük',
}
const URUN = { id: 10, senk_id: 'u-10', sku: 'TNC.LAV.00001', ad: 'Tencere', barkod: '869', kdv_orani: 20, satis_fiyati: 120 }

describe('siparisiFaturayaCevir — normal ürün', () => {
  test('sipariş satırından müşteri ve kalemleri kurar', () => {
    const f = siparisiFaturayaCevir(1, depo({
      siparis: SIPARIS,
      kalemler: [{ urun_id: 10, ikas_varyant_id: 'V1', urun_adi: 'Tencere', miktar: 2, birim_fiyat: 120, iade_miktar: 0 }],
      urunler: { 10: URUN },
    }))

    expect(f.kanal).toBe('ikas')
    expect(f.kanal_siparis_id).toBe('IKAS-1')
    expect(f.musteri).toMatchObject({
      unvan: 'Deneme Ltd', vergi_no: '1234567890', vergi_dairesi: 'Kadıköy',
      eposta: 'a@b.c', telefon: '5320000001',
    })
    expect(f.musteri.adres).toContain('Gölcük')
    expect(f.kalemler).toEqual([{
      urun_senk_id: 'u-10', sku: 'TNC.LAV.00001', ad: 'Tencere', barkod: '869',
      miktar: 2, birim_fiyat: 120, kdv_orani: 20, satir_toplam: 240, set_senk_id: null,
    }])
  })

  test('fatura ünvanı yoksa müşteri adına düşer', () => {
    const f = siparisiFaturayaCevir(1, depo({
      siparis: { ...SIPARIS, fatura_unvan: null },
      kalemler: [{ urun_id: 10, urun_adi: 'Tencere', miktar: 1, birim_fiyat: 120, iade_miktar: 0 }],
      urunler: { 10: URUN },
    }))
    expect(f.musteri.unvan).toBe('Ali Veli')
  })

  test('vergi no yoksa TC kullanılır', () => {
    const f = siparisiFaturayaCevir(1, depo({
      siparis: { ...SIPARIS, fatura_vergi_no: null, fatura_tc: '12345678901' },
      kalemler: [{ urun_id: 10, urun_adi: 'Tencere', miktar: 1, birim_fiyat: 120, iade_miktar: 0 }],
      urunler: { 10: URUN },
    }))
    expect(f.musteri.vergi_no).toBe(null)
    expect(f.musteri.tc).toBe('12345678901')
  })

  test('KDV oranı sipariş kaleminde YOK — üründen alınır', () => {
    const f = siparisiFaturayaCevir(1, depo({
      siparis: SIPARIS,
      kalemler: [{ urun_id: 10, urun_adi: 'Tencere', miktar: 1, birim_fiyat: 120, iade_miktar: 0 }],
      urunler: { 10: { ...URUN, kdv_orani: 10 } },
    }))
    expect(f.kalemler[0].kdv_orani).toBe(10)
  })
})

describe('siparisiFaturayaCevir — iade', () => {
  test('iade edilen adet düşülür', () => {
    const f = siparisiFaturayaCevir(1, depo({
      siparis: SIPARIS,
      kalemler: [{ urun_id: 10, urun_adi: 'Tencere', miktar: 3, birim_fiyat: 120, iade_miktar: 1 }],
      urunler: { 10: URUN },
    }))
    expect(f.kalemler[0].miktar).toBe(2)
    expect(f.kalemler[0].satir_toplam).toBe(240)
  })

  test('tamamı iade edilen kalem faturaya HİÇ girmez', () => {
    const f = siparisiFaturayaCevir(1, depo({
      siparis: SIPARIS,
      kalemler: [
        { urun_id: 10, urun_adi: 'Tencere', miktar: 2, birim_fiyat: 120, iade_miktar: 2 },
        { urun_id: 10, urun_adi: 'Tencere', miktar: 1, birim_fiyat: 120, iade_miktar: 0 },
      ],
      urunler: { 10: URUN },
    }))
    expect(f.kalemler).toHaveLength(1)
    expect(f.kalemler[0].miktar).toBe(1)
  })

  test('tüm kalemleri iade edilmiş sipariş faturalanamaz', () => {
    expect(() => siparisiFaturayaCevir(1, depo({
      siparis: SIPARIS,
      kalemler: [{ urun_id: 10, urun_adi: 'Tencere', miktar: 2, birim_fiyat: 120, iade_miktar: 2 }],
      urunler: { 10: URUN },
    }))).toThrow(/kalem/i)
  })
})

describe('siparisiFaturayaCevir — set', () => {
  const SET = { id: 3, senk_id: 's-3', sku: 'TNC.SET.00001', ad: 'Kahvaltı Seti', ikas_varyant_id: 'VSET' }
  const BILESENLER = [
    { senk_id: 'u-1', sku: 'A', ad: 'Tabak', barkod: '', miktar: 1, satis_fiyati: 60, kdv_orani: 20 },
    { senk_id: 'u-2', sku: 'B', ad: 'Fincan', barkod: '', miktar: 1, satis_fiyati: 40, kdv_orani: 10 },
  ]

  test('urun_id yoksa varyant kimliğinden set bulunur ve BİLEŞENLERE çözülür', () => {
    const f = siparisiFaturayaCevir(1, depo({
      siparis: SIPARIS,
      kalemler: [{ urun_id: null, ikas_varyant_id: 'VSET', urun_adi: 'Kahvaltı Seti', miktar: 1, birim_fiyat: 100, iade_miktar: 0 }],
      setler: { VSET: SET },
      bilesenler: { 3: BILESENLER },
    }))

    expect(f.kalemler).toHaveLength(2)
    expect(f.kalemler.map(k => k.sku)).toEqual(['A', 'B'])
    // Ağırlıklı dağıtım: 60/40. KDV oranları bileşenden.
    expect(f.kalemler[0].satir_toplam).toBe(60)
    expect(f.kalemler[1].satir_toplam).toBe(40)
    expect(f.kalemler.map(k => k.kdv_orani)).toEqual([20, 10])
    // Fatura stoğu BİLEŞENDEN düşer; set kimliği iz olarak taşınır.
    expect(f.kalemler[0].urun_senk_id).toBe('u-1')
    expect(f.kalemler[0].set_senk_id).toBe('s-3')
  })

  test('set kaleminde iade varsa kalan adet üzerinden çözülür', () => {
    const f = siparisiFaturayaCevir(1, depo({
      siparis: SIPARIS,
      kalemler: [{ urun_id: null, ikas_varyant_id: 'VSET', urun_adi: 'Kahvaltı Seti', miktar: 3, birim_fiyat: 100, iade_miktar: 1 }],
      setler: { VSET: SET },
      bilesenler: { 3: BILESENLER },
    }))
    expect(f.kalemler[0].miktar + f.kalemler[1].miktar).toBe(4)   // 2 set × (1+1) bileşen
    expect(f.kalemler[0].satir_toplam + f.kalemler[1].satir_toplam).toBe(200)
  })

  test('bileşeninin bulut kimliği olmayan set faturalanamaz', () => {
    expect(() => siparisiFaturayaCevir(1, depo({
      siparis: SIPARIS,
      kalemler: [{ urun_id: null, ikas_varyant_id: 'VSET', urun_adi: 'Kahvaltı Seti', miktar: 1, birim_fiyat: 100, iade_miktar: 0 }],
      setler: { VSET: SET },
      bilesenler: { 3: [{ ...BILESENLER[0], senk_id: null }] },
    }))).toThrow(/bulut kimliği|senk/i)
  })
})

describe('siparisiFaturayaCevir — guardlar', () => {
  test('ne ürün ne set bulunan kalem: ürün ADI mesajda geçer', () => {
    expect(() => siparisiFaturayaCevir(1, depo({
      siparis: SIPARIS,
      kalemler: [{ urun_id: null, ikas_varyant_id: 'BILINMEYEN', urun_adi: 'Gizemli Ürün', miktar: 1, birim_fiyat: 50, iade_miktar: 0 }],
    }))).toThrow(/Gizemli Ürün/)
  })

  test('SKU\'su olmayan ürün faturaya yazılamaz', () => {
    expect(() => siparisiFaturayaCevir(1, depo({
      siparis: SIPARIS,
      kalemler: [{ urun_id: 10, urun_adi: 'Tencere', miktar: 1, birim_fiyat: 120, iade_miktar: 0 }],
      urunler: { 10: { ...URUN, sku: '' } },
    }))).toThrow(/stok kodu|SKU/i)
  })

  test('bulut kimliği olmayan ürün faturaya yazılamaz', () => {
    expect(() => siparisiFaturayaCevir(1, depo({
      siparis: SIPARIS,
      kalemler: [{ urun_id: 10, urun_adi: 'Tencere', miktar: 1, birim_fiyat: 120, iade_miktar: 0 }],
      urunler: { 10: { ...URUN, senk_id: null } },
    }))).toThrow(/bulut kimliği|senk/i)
  })

  test('sipariş bulunamazsa anlaşılır hata', () => {
    expect(() => siparisiFaturayaCevir(99, depo({ siparis: null }))).toThrow(/sipariş/i)
  })

  test('hata sınıfı KanalHatasi ve kod dogrulama', () => {
    try { siparisiFaturayaCevir(99, depo({ siparis: null })) } catch (e) {
      expect(e).toBeInstanceOf(KanalHatasi)
      expect(e.kod).toBe('dogrulama')
    }
  })
})

describe('siparisiFaturayaCevir — urun_id boş kalem (geçmiş siparişler)', () => {
  // 🔴 Sipariş kalemleri ikas çekiminde ürüne YALNIZ ikas_varyant_id ile bağlanıyor;
  // o alan çoğu üründe boş olduğu için 763 kalemin 754'ü urun_id'siz kaydedilmiş
  // (01.09.2026 canlı tespit). Eşleştirmeyi sonradan çalıştırmak GEÇMİŞ kalemleri
  // düzeltmez — çözüm fatura anında varyant kimliğinden çözmek.
  test('urun_id yoksa varyant kimliğinden ÜRÜN çözülür', () => {
    const f = siparisiFaturayaCevir(1, depo({
      siparis: SIPARIS,
      kalemler: [{ urun_id: null, ikas_varyant_id: 'V-9', urun_adi: 'Tencere', miktar: 2, birim_fiyat: 120, iade_miktar: 0 }],
      urunVaryant: { 'V-9': URUN },
    }))
    expect(f.kalemler).toHaveLength(1)
    expect(f.kalemler[0]).toMatchObject({ urun_senk_id: 'u-10', sku: 'TNC.LAV.00001', miktar: 2, satir_toplam: 240 })
  })

  test('ürün varyantı SET varyantından ÖNCE denenir', () => {
    const f = siparisiFaturayaCevir(1, depo({
      siparis: SIPARIS,
      kalemler: [{ urun_id: null, ikas_varyant_id: 'V-9', urun_adi: 'X', miktar: 1, birim_fiyat: 120, iade_miktar: 0 }],
      urunVaryant: { 'V-9': URUN },
      setler: { 'V-9': { id: 3, senk_id: 's-3', sku: 'TNC.SET.1', ad: 'Set' } },
      bilesenler: { 3: [{ senk_id: 'u-1', sku: 'A', ad: 'Tabak', miktar: 1, satis_fiyati: 60, kdv_orani: 20 }] },
    }))
    // Ürün eşleşmesi tekildir; set çözme yalnız ürün bulunamadığında devreye girer.
    expect(f.kalemler).toHaveLength(1)
    expect(f.kalemler[0].sku).toBe('TNC.LAV.00001')
  })

  test('varyant kimliği de boşsa anlaşılır hata (ürün adıyla)', () => {
    expect(() => siparisiFaturayaCevir(1, depo({
      siparis: SIPARIS,
      kalemler: [{ urun_id: null, ikas_varyant_id: null, urun_adi: 'Gizemli', miktar: 1, birim_fiyat: 10, iade_miktar: 0 }],
    }))).toThrow(/Gizemli/)
  })
})
