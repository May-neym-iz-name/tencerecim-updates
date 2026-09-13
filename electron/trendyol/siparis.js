// Trendyol sipariş paketleri: okuma + paket üzerinde yapılabilen tüm işlemler.
//
// Uç adresleri docs/trendyol-api-reference.md'den alınmıştır; client.js başa
// '/integration' ekler, burada ondan sonrası yazılır.
//
// SÜRÜM: sipariş okumada **v2/orders** kullanılıyor. Sipariş API'si 15 Ekim 2026'da
// V2'ye geçiyor; v1 ile yazmak bir ay sonra yeniden yazmak demekti.
const client = require('./client')

const SAYFA_BOYUTU = 200      // belgede max 200
const MAKS_SAYFA = 200        // güvenlik freni

function sid() {
  const s = client.sellerId()
  if (!s) throw new Error('Trendyol Satıcı ID yok.')
  return s
}
const paketYolu = (paketId) => `/order/sellers/${sid()}/shipment-packages/${paketId}`

// --- A1: sipariş paketlerini çekme ----------------------------------------

/**
 * Paketleri sayfa sayfa çeker.
 * @param baslangicMs/bitisMs  epoch ms. Trendyol tarih aralığını 2 haftayla sınırlar;
 *                             çağıran pencereyi kendisi böler (bkz. index.js).
 * @param durum                'Created' gibi tek statü; boşsa hepsi.
 */
async function paketleriCek({ baslangicMs, bitisMs, durum, ilerleme } = {}) {
  const yol = `/order/sellers/${sid()}/v2/orders`
  const hepsi = []
  for (let sayfa = 0; sayfa < MAKS_SAYFA; sayfa++) {
    const sorgu = {
      page: sayfa, size: SAYFA_BOYUTU,
      orderByField: 'PackageLastModifiedDate', orderByDirection: 'DESC',
    }
    if (baslangicMs) sorgu.startDate = baslangicMs
    if (bitisMs) sorgu.endDate = bitisMs
    if (durum) sorgu.status = durum
    const r = await client.get(yol, sorgu)
    const veri = r?.content || []
    hepsi.push(...veri)
    if (typeof ilerleme === 'function') ilerleme(hepsi.length, r?.totalElements ?? null)
    const toplamSayfa = Number(r?.totalPages)
    if (!veri.length) break
    if (Number.isFinite(toplamSayfa) && sayfa + 1 >= toplamSayfa) break
  }
  return hepsi
}

// --- B: kargoya verme akışı -----------------------------------------------

// B1 — paket statüsü. Trendyol yalnız ileri geçişe izin verir (Picking → Invoiced → Shipped).
const STATU_SIRASI = ['Picking', 'Invoiced', 'Shipped']
async function statuGuncelle(paketId, status, { kalemler } = {}) {
  if (!STATU_SIRASI.includes(status)) {
    throw new Error(`Geçersiz statü: ${status}. İzin verilen: ${STATU_SIRASI.join(', ')}`)
  }
  const govde = { status }
  // lines gönderilirse yalnız o kalemler ilerletilir; gönderilmezse paketin tamamı.
  if (Array.isArray(kalemler) && kalemler.length) {
    govde.lines = kalemler.map(k => ({ lineId: Number(k.lineId ?? k.kalem_id), quantity: Number(k.quantity ?? k.miktar) || 1 }))
  }
  return client.put(paketYolu(paketId), govde)
}

// B2 — kargo takip numarası bildirme (aynı uç, farklı gövde).
async function takipNoBildir(paketId, takipNo) {
  const t = String(takipNo || '').trim()
  if (!t) throw new Error('Kargo takip numarası boş olamaz.')
  return client.put(paketYolu(paketId), { trackingNumber: t })
}

// B3 — desi ve koli bilgisi
async function koliBilgisi(paketId, { desi, koliAdedi }) {
  return client.put(`${paketYolu(paketId)}/box-info`, {
    deci: Number(desi) || 0, boxQuantity: Number(koliAdedi) || 1,
  })
}

// B4 — paket kargo firması değiştirme
async function kargoFirmasiDegistir(paketId, kargoKodu) {
  return client.put(`${paketYolu(paketId)}/cargo-providers`, { cargoProvider: String(kargoKodu) })
}

// B5 — depo bilgisi güncelleme
async function depoGuncelle(paketId, depoId) {
  return client.put(`${paketYolu(paketId)}/warehouse`, { warehouseId: Number(depoId) })
}

// B6 — ek tedarik süresi. Paket 'agreedDeliveryDateExtendible' değilse Trendyol reddeder.
async function tedarikSuresiUzat(paketId, yeniTarihMs) {
  return client.put(`${paketYolu(paketId)}/extended-agreed-delivery-date`, {
    agreedDeliveryDate: Number(yeniTarihMs),
  })
}

// --- D: sorun ve istisnalar -----------------------------------------------

// D1 — tedarik edememe. Ürün elimizde yoksa kalem iptal edilir; stoğu geri verir.
async function tedarikEdilemedi(paketId, kalemler) {
  const lines = (kalemler || []).map(k => ({
    lineId: Number(k.lineId ?? k.kalem_id), quantity: Number(k.quantity ?? k.miktar) || 1,
  }))
  if (!lines.length) throw new Error('Tedarik edilemeyen kalem belirtilmedi.')
  return client.put(`${paketYolu(paketId)}/items/unsupplied`, { lines, reasonId: 500 })
}

// D2 — alternatif teslimat (kargo linki / dijital ürün teslimi)
async function alternatifTeslimat(paketId, govde) {
  return client.put(`${paketYolu(paketId)}/alternative-delivery`, govde || {})
}

// D4 — manuel teslim (paket no veya kargo takip no ile)
async function manuelTeslim({ paketId, takipNo }) {
  if (paketId) return client.put(`${paketYolu(paketId)}/manual-deliver`, {})
  if (takipNo) return client.put(`/order/sellers/${sid()}/manual-deliver/${takipNo}`, {})
  throw new Error('Paket kimliği veya kargo takip numarası gerekli.')
}

// D5 — manuel iade
async function manuelIade({ paketId, takipNo }) {
  if (paketId) return client.put(`${paketYolu(paketId)}/manual-return`, {})
  if (takipNo) return client.put(`/order/sellers/${sid()}/manual-return/${takipNo}`, {})
  throw new Error('Paket kimliği veya kargo takip numarası gerekli.')
}

// --- E: iade ve talepler ---------------------------------------------------

// E1 — iadeleri çekme
async function iadeleriCek({ baslangicMs, bitisMs, durum, sayfa = 0, boyut = 50 } = {}) {
  const sorgu = { page: sayfa, size: boyut }
  if (baslangicMs) sorgu.startDate = baslangicMs
  if (bitisMs) sorgu.endDate = bitisMs
  if (durum) sorgu.claimItemStatus = durum
  return client.get(`/order/sellers/${sid()}/claims`, sorgu)
}

// E2 — iade onaylama. ⚠️ 5 istek/dk sınırı var, toplu işte yavaş ilerlet.
async function iadeOnayla(claimId, claimLineItemIdList, { not } = {}) {
  return client.put(`/order/sellers/${sid()}/claims/${claimId}/items/approve`, {
    claimLineItemIdList: [].concat(claimLineItemIdList || []),
    params: not ? { note: not } : {},
  })
}

// E3 — red sebepleri + red talebi. ⚠️ 5 istek/dk.
async function iadeRedSebepleri() {
  return client.get('/order/claim-issue-reasons')
}
async function iadeReddet(claimId, { sebepId, kalemIdler, aciklama, dosyalar }) {
  const sorgu = {
    claimIssueReasonId: Number(sebepId),
    claimItemIdList: [].concat(kalemIdler || []).join(','),
  }
  if (aciklama) sorgu.description = aciklama
  return client.post(`/order/sellers/${sid()}/claims/${claimId}/issue`, dosyalar || {}, { sorgu })
}

// E4 — iade talebi oluşturma (satıcı başlatır)
async function iadeTalebiOlustur(govde) {
  return client.post(`/order/sellers/${sid()}/claims/create`, govde || {})
}

// E5 — iade audit (geçmiş) bilgisi
async function iadeGecmisi(claimItemsId) {
  return client.get(`/order/sellers/${sid()}/claims/items/${claimItemsId}/audit`)
}

// --- F: fatura -------------------------------------------------------------

// F1 — fatura linki gönderme. Bizimhesap'ın verdiği belge URL'i buraya gider.
//
// 🔴 invoiceNumber/invoiceDateTime BİLEREK GÖNDERİLMİYOR (belgeden doğrulandı):
// bu iki alan YALNIZ Mikro İhracat ve Trendyol Yurt Dışı paketlerinde zorunlu, yurt içi
// paketlerde OPSİYONEL. Üstelik invoiceNumber katı bir biçim ister
// ([3 alfanümerik][13 rakam]) ve Bizimhesap fatura NUMARASI döndürmüyor (yalnız guid +
// url). Uydurma bir numara göndermek isteği reddettirirdi. Çağıran gerçek bir numara
// biliyorsa geçebilir; bilmiyorsa alan hiç eklenmez.
async function faturaLinkiGonder({ paketId, faturaNo, faturaTarihiMs, url }) {
  if (!url) throw new Error('Fatura bağlantısı boş olamaz.')
  const govde = { invoiceLink: url, shipmentPackageId: Number(paketId) }
  if (faturaNo) {
    govde.invoiceNumber = String(faturaNo)
    govde.invoiceDateTime = Number(faturaTarihiMs) || Date.now()
  }
  return client.post(`/sellers/${sid()}/seller-invoice-links`, govde)
}

// F2 — fatura linki silme
async function faturaLinkiSil({ paketId, faturaNo }) {
  return client.post(`/sellers/${sid()}/seller-invoice-links/delete`, {
    shipmentPackageId: Number(paketId),
    ...(faturaNo ? { invoiceNumber: faturaNo } : {}),
  })
}

// F3 — fatura DOSYASI gönderme. Link dışarıdan açılamıyorsa yedek yol budur.
async function faturaDosyasiGonder(govde) {
  return client.post(`/sellers/${sid()}/seller-invoice-file`, govde || {})
}

// --- G: müşteri soruları (Sosyal Medya'ya düşer) ---------------------------

async function sorulariCek({ baslangicMs, bitisMs, durum = 'WAITING_FOR_ANSWER', sayfa = 0, boyut = 50 } = {}) {
  const sorgu = { page: sayfa, size: boyut }
  if (baslangicMs) sorgu.startDate = baslangicMs
  if (bitisMs) sorgu.endDate = bitisMs
  if (durum) sorgu.status = durum
  return client.get(`/qna/sellers/${sid()}/questions/filter`, sorgu)
}
async function soruDetay(soruId) {
  return client.get(`/qna/sellers/${sid()}/questions/${soruId}`)
}
async function soruyuCevapla(soruId, metin) {
  const t = String(metin || '').trim()
  if (!t) throw new Error('Cevap boş olamaz.')
  return client.post(`/qna/sellers/${sid()}/questions/${soruId}/answers`, { text: t })
}

// --- H: etiket ve finans ---------------------------------------------------

// H1 — ortak etiket barkodu. Trendyol'un hazır etiketini basmak yerine barkodu alıp
// KENDİ etiket şablonumuza koyuyoruz (kullanıcı kararı): ikas etiketiyle aynı düzen.
async function ortakEtiketTalep(takipNo, govde) {
  return client.post(`/sellers/${sid()}/common-label/${takipNo}`, govde || {})
}
async function ortakEtiketAl(takipNo) {
  return client.get(`/sellers/${sid()}/common-label/${takipNo}`)
}

// H2 — cari hesap: ödeme emirleri, mutabakat, diğer finansal işlemler
async function odemeEmirleri({ sayfa = 0, boyut = 50 } = {}) {
  return client.get(`/finance/che/sellers/${sid()}/payment-order`, { page: sayfa, size: boyut })
}
async function mutabakat({ baslangicMs, bitisMs, tur, sayfa = 0, boyut = 500 } = {}) {
  return client.get(`/finance/che/sellers/${sid()}/settlements`, {
    startDate: baslangicMs, endDate: bitisMs, transactionType: tur, page: sayfa, size: boyut,
  })
}
async function digerFinansal({ baslangicMs, bitisMs, tur, sayfa = 0, boyut = 500 } = {}) {
  return client.get(`/finance/che/sellers/${sid()}/otherfinancials`, {
    startDate: baslangicMs, endDate: bitisMs, transactionType: tur, page: sayfa, size: boyut,
  })
}

// H3 — kargo faturası kalemleri
async function kargoFaturaKalemleri(faturaSeriNo) {
  return client.get(`/finance/che/sellers/${sid()}/cargo-invoice/${faturaSeriNo}/items`)
}

// H4 — tazmin. YALNIZ kargo firması TEX olan paketler için doludur; UPS ile
// çalışıldığında liste boş döner — bu bir arıza değildir.
async function tazminTalepleri({ baslangicMs, bitisMs, sayfa = 0, boyut = 100 } = {}) {
  return client.get(`/tex/compensation/sellers/${sid()}/tickets`, {
    startDate: baslangicMs, endDate: bitisMs, page: sayfa, size: boyut,
  })
}

module.exports = {
  paketleriCek,
  statuGuncelle, takipNoBildir, koliBilgisi, kargoFirmasiDegistir, depoGuncelle, tedarikSuresiUzat,
  tedarikEdilemedi, alternatifTeslimat, manuelTeslim, manuelIade,
  iadeleriCek, iadeOnayla, iadeRedSebepleri, iadeReddet, iadeTalebiOlustur, iadeGecmisi,
  faturaLinkiGonder, faturaLinkiSil, faturaDosyasiGonder,
  sorulariCek, soruDetay, soruyuCevapla,
  ortakEtiketTalep, ortakEtiketAl,
  odemeEmirleri, mutabakat, digerFinansal, kargoFaturaKalemleri, tazminTalepleri,
  STATU_SIRASI,
}
