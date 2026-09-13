// Trendyol sipariş dönüştürme. Örnek paket, Trendyol'un KENDİ belgesindeki gerçek
// yanıttan alındı (docs/trendyol-api-reference.md) — uydurma alan yok.
import { describe, test, expect } from 'vitest'
const M = await import('./trendyol-siparis-mantik.js')
const { paketiCevir, yanitiCevir, stokEtkisi, durumEtiket, stoguGoturuyorMu, kapanmisMi } = M

const PAKET = {
  shipmentPackageId: 3330111111,
  orderNumber: 'TY-123456',
  orderDate: 1762253333685,
  shipmentPackageStatus: 'Created',
  status: 'Created',
  cargoProviderName: 'Trendyol Express',
  cargoTrackingNumber: 7280027504111111,
  cargoTrackingLink: 'https://tracking.trendyol.com/?id=abc',
  cargoSenderNumber: '210090111111',
  packageTotalPrice: 498.90,
  currencyCode: 'TRY',
  customerFirstName: 'John', customerLastName: 'Doe',
  customerEmail: 'pf+j2jm8x99@trendyolmail.com',
  identityNumber: '11111111111',
  commercial: false,
  lastModifiedDate: 1762865408581,
  estimatedDeliveryEndDate: 1763030936000,
  agreedDeliveryDate: 1762376340000,
  shipmentAddress: {
    city: 'İstanbul', district: 'Sarıyer', fullAddress: "John Doe's House",
    phone: '333333333', fullName: 'John Doe',
  },
  invoiceAddress: { company: '', fullName: 'John Doe' },
  lines: [{
    quantity: 2,
    stockCode: 'TNC.MXD.00173',
    productName: 'Maxx Doria Steel Fusion 24 Cm Basık Tencere',
    lineGrossAmount: 498.90,
    lineUnitPrice: 498.90,
    lineTotalDiscount: 0,
    vatRate: 20,
    barcode: '2004406300304',
    lineId: 4765111111,
    orderLineItemStatusName: 'Created',
    commission: 13,
  }],
}

describe('paketiCevir', () => {
  test('paket kimliği, sipariş no ve durumu okur', () => {
    const { siparis } = paketiCevir(PAKET)
    expect(siparis.paket_id).toBe('3330111111')
    expect(siparis.siparis_no).toBe('TY-123456')
    expect(siparis.durum).toBe('Created')
  })

  test('🔴 lineUnitPrice BİRİM fiyattır — miktara BÖLÜNMEZ', () => {
    const { kalemler } = paketiCevir(PAKET)
    expect(kalemler[0].miktar).toBe(2)
    expect(kalemler[0].birim_fiyat).toBe(498.90)   // 249.45 OLMAZ
  })

  test('stok kodu ve barkod birlikte taşınır (eşleşme SKU, yazma barkod)', () => {
    const { kalemler } = paketiCevir(PAKET)
    expect(kalemler[0].sku).toBe('TNC.MXD.00173')
    expect(kalemler[0].barkod).toBe('2004406300304')
  })

  test('epoch ms tarihler ISO olur', () => {
    const { siparis } = paketiCevir(PAKET)
    expect(siparis.siparis_tarihi).toBe(new Date(1762253333685).toISOString())
  })

  test('bireysel satışta vergi no gelmez ve bu HATA DEĞİLDİR', () => {
    const { siparis } = paketiCevir(PAKET)
    expect(siparis.fatura_vergi_no).toBe(null)
    expect(siparis.fatura_tc).toBe('11111111111')
    expect(siparis.ticari).toBe(0)
  })

  test('kurumsal faturada unvan ve vergi bilgisi okunur', () => {
    const { siparis } = paketiCevir({
      ...PAKET, commercial: true,
      invoiceAddress: { company: 'ACME A.Ş.', taxNumber: '1234567890', taxOffice: 'Kadıköy' },
    })
    expect(siparis.fatura_unvan).toBe('ACME A.Ş.')
    expect(siparis.fatura_vergi_no).toBe('1234567890')
    expect(siparis.ticari).toBe(1)
  })

  test('shipmentPackageId yoksa id kullanılır', () => {
    const { siparis } = paketiCevir({ ...PAKET, shipmentPackageId: undefined, id: 999 })
    expect(siparis.paket_id).toBe('999')
  })

  test('kimliksiz paket null döner (sessizce yanlış satır yazılmasın)', () => {
    expect(paketiCevir({ orderNumber: 'X' })).toBe(null)
    expect(paketiCevir(null)).toBe(null)
  })

  // 🔴 CANLIDA ÖLÇÜLDÜ (14.09.2026, gerçek sipariş 11553463258): Trendyol paketin
  // ÜZERİNDE kendi fatura kaydını da döndürüyor. Bu, "biz gönderdik" ile "Trendyol
  // gerçekten aldı"yı ayırmamızı sağlar — gönderim başarılı dönse bile link
  // işlenmemiş olabilir.
  test('Trendyol tarafindaki fatura durumu ayrica okunur', () => {
    const { siparis } = paketiCevir({
      ...PAKET, invoiceLink: 'https://x/f.pdf', invoiceNumber: 'FTR-1', invoiceStatus: 'Success',
    })
    expect(siparis.ty_fatura_link).toBe('https://x/f.pdf')
    expect(siparis.ty_fatura_no).toBe('FTR-1')
    expect(siparis.ty_fatura_durum).toBe('Success')
  })

  test('fatura gönderilmemişse Trendyol alanları boş gelir (hata değil)', () => {
    const { siparis } = paketiCevir(PAKET)
    expect(siparis.ty_fatura_durum).toBe(null)
  })

  test('kapıda ödeme ve desi okunur', () => {
    const { siparis } = paketiCevir({ ...PAKET, isCod: true, cargoDeci: 12.5, warehouseId: 372389 })
    expect(siparis.kapida_odeme).toBe(1)
    expect(siparis.kargo_desi).toBe(12.5)
    expect(siparis.depo_id).toBe('372389')
  })

  test('ham yanıt saklanır — yeni alan çıkarsa geri dönülebilsin', () => {
    const { siparis } = paketiCevir(PAKET)
    expect(JSON.parse(siparis.ham).orderNumber).toBe('TY-123456')
  })
})

describe('yanitiCevir', () => {
  test('content dizisini çevirir ve sayfa bilgisini taşır', () => {
    const r = yanitiCevir({ content: [PAKET], totalPages: 3, totalElements: 250 })
    expect(r.paketler).toHaveLength(1)
    expect(r.toplamSayfa).toBe(3)
    expect(r.toplamKayit).toBe(250)
    expect(r.atlanan).toBe(0)
  })

  test('çevrilemeyen paket SESSİZCE düşmez, sayılır', () => {
    const r = yanitiCevir({ content: [PAKET, { orderNumber: 'kimliksiz' }] })
    expect(r.paketler).toHaveLength(1)
    expect(r.atlanan).toBe(1)
  })

  test('boş yanıt patlamaz', () => {
    expect(yanitiCevir(null).paketler).toEqual([])
    expect(yanitiCevir({}).paketler).toEqual([])
  })
})

describe('durum kuralları', () => {
  test('iptal/iade/tedarik edilemedi stok GÖTÜRMEZ', () => {
    expect(stoguGoturuyorMu('Cancelled')).toBe(false)
    expect(stoguGoturuyorMu('Returned')).toBe(false)
    expect(stoguGoturuyorMu('UnSupplied')).toBe(false)
  })
  test('yeni ve kargolanan stok götürür', () => {
    expect(stoguGoturuyorMu('Created')).toBe(true)
    expect(stoguGoturuyorMu('Shipped')).toBe(true)
    expect(stoguGoturuyorMu('Delivered')).toBe(true)
  })
  test('kapanmış statüler işaretlenir', () => {
    expect(kapanmisMi('Delivered')).toBe(true)
    expect(kapanmisMi('Created')).toBe(false)
  })
  test('bilinmeyen durum ham hâliyle gösterilir, gizlenmez', () => {
    expect(durumEtiket('YepyeniDurum')).toBe('YepyeniDurum')
    expect(durumEtiket('Shipped')).toBe('Kargolandı')
  })
})

describe('stokEtkisi', () => {
  test('SKU bazında toplar', () => {
    expect(stokEtkisi({ durum: 'Created', kalemler: [
      { sku: 'A', miktar: 2 }, { sku: 'A', miktar: 1 }, { sku: 'B', miktar: 3 },
    ] })).toEqual([{ sku: 'A', miktar: 3 }, { sku: 'B', miktar: 3 }])
  })

  test('zaten düşülmüşse İKİNCİ KEZ düşmez', () => {
    expect(stokEtkisi({ durum: 'Created', kalemler: [{ sku: 'A', miktar: 2 }], zatenDusuldu: true })).toEqual([])
  })

  test('iptal olmuş pakette stok düşmez', () => {
    expect(stokEtkisi({ durum: 'Cancelled', kalemler: [{ sku: 'A', miktar: 2 }] })).toEqual([])
  })

  test('stok kodsuz kalem etkiye girmez', () => {
    expect(stokEtkisi({ durum: 'Created', kalemler: [{ sku: '', miktar: 2 }] })).toEqual([])
  })

  test('büyük/küçük harf farkı aynı SKU sayılır', () => {
    expect(stokEtkisi({ durum: 'Created', kalemler: [
      { sku: 'tnc.a.1', miktar: 1 }, { sku: 'TNC.A.1', miktar: 1 },
    ] })).toEqual([{ sku: 'TNC.A.1', miktar: 2 }])
  })
})
