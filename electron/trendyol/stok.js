// Trendyol stok okuma / yazma / sonuç sorgulama.
//
// Uç noktalar (docs/trendyol-api-reference.md, 13.09.2026'da doğrulandı — 15 Eylül V2
// geçişi bu üçünü ETKİLEMİYOR):
//   oku  GET  /product/sellers/{id}/products/approved/inventory-and-price   (V2)
//   yaz  POST /inventory/sellers/{id}/products/price-and-inventory          (V1-V2)
//   sonuç GET /product/sellers/{id}/products/batch-requests/{batchId}       (V2)
const client = require('./client')
const { parcala } = require('../db/stok-senk-mantik')

const SAYFA_BOYUTU = 200

// Onaylı ürünlerin barkod + stok + fiyatını sayfa sayfa çeker.
// NOT: bu uç YALNIZ onaylı ürünleri döndürür. Onaysız/arşivli/kilitli ürünler burada
// hiç görünmez; bu yüzden "Trendyol'da yok" ile "onay bekliyor" ayrımı bu uçtan
// yapılamaz — ikisi de eşleşmeyen görünür. Bilinen sınır (bkz. spec).
async function stokOku({ ilerleme } = {}) {
  const sid = client.sellerId()
  if (!sid) throw new Error('Trendyol Satıcı ID yok.')
  const satirlar = []
  let sayfa = 0
  for (;;) {
    const r = await client.get(`/product/sellers/${sid}/products/approved/inventory-and-price`, {
      page: sayfa, size: SAYFA_BOYUTU,
    })
    const veri = r?.content || r?.items || []
    for (const u of veri) {
      const barkod = u.barcode || u.barkod
      if (!barkod) continue
      satirlar.push({
        barkod: String(barkod).trim(),
        miktar: Number(u.quantity ?? u.stock ?? 0) || 0,
        ad: u.title || u.productName || null,
        durum: 'onayli',
      })
    }
    if (typeof ilerleme === 'function') ilerleme(satirlar.length, r?.totalElements ?? null)
    const toplamSayfa = r?.totalPages
    sayfa++
    if (veri.length === 0) break
    if (Number.isFinite(toplamSayfa) && sayfa >= toplamSayfa) break
    // Güvenlik freni: totalPages gelmezse sonsuz döngüye girmeyelim.
    if (sayfa > 500) break
  }
  return satirlar
}

// Stok gönderir. Kalemler: [{ barkod, yeni_miktar }]. 1000'lik partilere bölünür.
// Fiyat GÖNDERİLMEZ: bu modül yalnız stok senkronudur, fiyata dokunmak ayrı bir karar
// (ve ikas'ta fiyat kaynağı zaten faturalardır — bkz. CLAUDE.md "Fiyat").
async function stokYaz(kalemler) {
  const sid = client.sellerId()
  if (!sid) throw new Error('Trendyol Satıcı ID yok.')
  const batchIdler = []
  for (const parti of parcala(kalemler)) {
    const r = await client.post(`/inventory/sellers/${sid}/products/price-and-inventory`, {
      items: parti.map(k => ({ barcode: k.barkod, quantity: k.yeni_miktar })),
    })
    if (r && r.batchRequestId) batchIdler.push(r.batchRequestId)
  }
  return batchIdler
}

// Parti sonucunu sorar. Trendyol sonucu ASENKRON üretir; status COMPLETED olana kadar
// bekler. Sonuçlar 4 saat saklanır.
async function partiSonucu(batchRequestId) {
  const sid = client.sellerId()
  const r = await client.get(`/product/sellers/${sid}/products/batch-requests/${batchRequestId}`)
  const kalemler = r?.items || []
  return {
    tamam: (r?.status || '').toUpperCase() === 'COMPLETED',
    basarisizlar: kalemler
      .filter(i => (i.status || '').toUpperCase() === 'FAILED')
      .map(i => ({ barcode: i.requestItem?.barcode, failureReasons: i.failureReasons })),
    ham: r,
  }
}

module.exports = { stokOku, stokYaz, partiSonucu }
