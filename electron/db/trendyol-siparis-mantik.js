// Trendyol sipariş paketlerinin SAF dönüştürme mantığı: ağ yok, DB yok → testlenebilir.
//
// Trendyol'un birimi SİPARİŞ değil PAKETtir (shipmentPackage). Bir sipariş birden çok
// pakete bölünebilir; her paket ayrı kargolanır ve ayrı statü taşır. Bu yüzden yerel
// birincil anahtar paket kimliğidir.
//
// 🔴 FİYAT TUZAĞI (ikas tarafında YAŞANDI — bkz. hafıza "Sipariş Kalem Fiyat Hatası"):
// lineGrossAmount, lineUnitPrice ve discountDetails[].lineItemPrice alanlarının ÜÇÜ DE
// BİRİM fiyattır, satır toplamı değildir. Miktara BÖLMEYİN; çarpmak gerekir.

// Trendyol paket statüleri (belgeden).
const DURUMLAR = {
  Created: 'Yeni',
  Picking: 'Hazırlanıyor',
  Invoiced: 'Faturalandı',
  Shipped: 'Kargolandı',
  AtCollectionPoint: 'Teslim noktasında',
  Delivered: 'Teslim edildi',
  UnDelivered: 'Teslim edilemedi',
  Returned: 'İade edildi',
  Cancelled: 'İptal',
  UnSupplied: 'Tedarik edilemedi',
  UnPacked: 'Paket bozuldu',
  Repack: 'Yeniden paketleme',
}

// Stoğu gerçekten götüren statüler. İptal/iade/tedarik edilemedi stoğu GERİ verir;
// bunları "satıldı" saymak, iptal olmuş bir siparişten dolayı stoğu düşük tutardı.
const STOK_GOTUREN = new Set([
  'Created', 'Picking', 'Invoiced', 'Shipped', 'AtCollectionPoint', 'Delivered', 'UnPacked', 'Repack',
])

// Artık bizim elimizde olmayan, işlem yapılamayacak statüler.
const KAPANMIS = new Set(['Delivered', 'Cancelled', 'Returned', 'UnSupplied'])

function durumEtiket(durum) {
  return DURUMLAR[durum] || durum || '—'
}

function stoguGoturuyorMu(durum) {
  return STOK_GOTUREN.has(durum)
}

function kapanmisMi(durum) {
  return KAPANMIS.has(durum)
}

// Trendyol tarihleri epoch ms (GMT+3 yorumlanır ama değer UTC ms'dir). ISO'ya çevirir.
function tarih(ms) {
  const n = Number(ms)
  if (!Number.isFinite(n) || n <= 0) return null
  return new Date(n).toISOString()
}

function sayi(deger, varsayilan = 0) {
  const n = Number(deger)
  return Number.isFinite(n) ? n : varsayilan
}

function metin(deger) {
  const s = deger == null ? '' : String(deger).trim()
  return s || null
}

/**
 * Bir Trendyol paketini yerel satıra çevirir.
 * @returns { siparis, kalemler } — kalemler ayrı tabloya yazılır.
 */
function paketiCevir(p) {
  if (!p) return null
  // shipmentPackageId asıl kimliktir; bazı yanıtlarda yalnız `id` geliyor.
  const paketId = metin(p.shipmentPackageId ?? p.id)
  if (!paketId) return null

  const t = p.shipmentAddress || {}
  const f = p.invoiceAddress || {}
  const durum = metin(p.shipmentPackageStatus || p.status) || 'Created'

  const siparis = {
    paket_id: paketId,
    siparis_no: metin(p.orderNumber),
    siparis_tarihi: tarih(p.orderDate),
    durum,
    kargo_firma: metin(p.cargoProviderName),
    kargo_takip_no: metin(p.cargoTrackingNumber),
    kargo_takip_link: metin(p.cargoTrackingLink),
    kargo_gonderi_no: metin(p.cargoSenderNumber),
    toplam: sayi(p.totalPrice ?? p.packageTotalPrice),
    indirim: sayi(p.totalDiscount ?? p.packageTotalDiscount),
    para_birimi: metin(p.currencyCode) || 'TRY',
    musteri_ad: [metin(p.customerFirstName), metin(p.customerLastName)].filter(Boolean).join(' ') || null,
    musteri_email: metin(p.customerEmail),
    teslimat_il: metin(t.city),
    teslimat_ilce: metin(t.district),
    teslimat_adres: metin(t.fullAddress || t.address1),
    teslimat_telefon: metin(t.phone),
    // Kurumsal fatura değilse taxNumber/taxOffice HİÇ gelmez (belgede yazıyor) —
    // yokluğu hata değildir, bireysel satıştır.
    fatura_unvan: metin(f.company) || metin(f.fullName),
    fatura_vergi_no: metin(f.taxNumber),
    fatura_vergi_dairesi: metin(f.taxOffice),
    fatura_tc: metin(p.identityNumber),
    tahmini_teslim: tarih(p.estimatedDeliveryEndDate),
    kararlastirilan_teslim: tarih(p.agreedDeliveryDate),
    ticari: p.commercial ? 1 : 0,
    son_degisiklik: tarih(p.lastModifiedDate),
    // Trendyol'un KENDİ fatura kaydı. Bizim fatura_gonderildi bayrağımız "biz gönderdik"
    // der; bu alanlar "Trendyol gerçekten aldı mı" der. İkisi ayrıdır: gönderim başarılı
    // dönse bile Trendyol linki işlememiş olabilir (bkz. api-verification kuralı).
    ty_fatura_link: metin(p.invoiceLink),
    ty_fatura_no: metin(p.invoiceNumber),
    ty_fatura_durum: metin(p.invoiceStatus),
    kargo_desi: sayi(p.cargoDeci, 0),
    kapida_odeme: p.isCod ? 1 : 0,
    depo_id: metin(p.warehouseId),
    ham: JSON.stringify(p),
  }

  const kalemler = []
  for (const l of p.lines || []) {
    const miktar = Math.max(0, Math.trunc(sayi(l.quantity, 1)))
    // BİRİM fiyat — miktara bölünmez (bkz. dosya başındaki tuzak notu).
    const birimFiyat = sayi(l.lineUnitPrice ?? l.lineGrossAmount)
    kalemler.push({
      kalem_id: metin(l.lineId ?? l.id),
      barkod: metin(l.barcode),
      sku: metin(l.stockCode),
      urun_adi: metin(l.productName),
      miktar,
      birim_fiyat: birimFiyat,
      birim_indirim: sayi(l.lineTotalDiscount),
      kdv_orani: sayi(l.vatRate, 20),
      komisyon_orani: sayi(l.commission, 0),
      kalem_durum: metin(l.orderLineItemStatusName) || durum,
      iptal_sebep: metin(l.cancelReason),
    })
  }

  return { siparis, kalemler }
}

// Yanıtın tamamını çevirir; çevrilemeyen paket sessizce düşmez, sayısı raporlanır.
function yanitiCevir(yanit) {
  const icerik = (yanit && (yanit.content || yanit.orders)) || []
  const paketler = []
  let atlanan = 0
  for (const p of icerik) {
    const c = paketiCevir(p)
    if (c) paketler.push(c)
    else atlanan++
  }
  return {
    paketler, atlanan,
    toplamSayfa: Number(yanit && yanit.totalPages) || null,
    toplamKayit: Number(yanit && yanit.totalElements) || null,
  }
}

/**
 * Bu paket yüzünden ana kanaldan kaç adet düşmeli?
 * Yalnız stoğu gerçekten götüren statülerde ve YALNIZ bir kez (stok_dusuldu bayrağı).
 * SKU bazında toplar — aynı ürün pakette birden çok satırda olabilir.
 */
function stokEtkisi({ durum, kalemler, zatenDusuldu }) {
  if (zatenDusuldu || !stoguGoturuyorMu(durum)) return []
  const toplam = new Map()
  for (const k of kalemler || []) {
    const sku = String(k.sku || '').trim().toUpperCase()
    if (!sku) continue
    const m = Math.max(0, Math.trunc(Number(k.miktar) || 0))
    if (!m) continue
    toplam.set(sku, (toplam.get(sku) || 0) + m)
  }
  return [...toplam.entries()].map(([sku, miktar]) => ({ sku, miktar }))
}

module.exports = {
  DURUMLAR, STOK_GOTUREN, KAPANMIS,
  durumEtiket, stoguGoturuyorMu, kapanmisMi,
  paketiCevir, yanitiCevir, stokEtkisi,
  _tarih: tarih,
}
