// Trendyol stok okuma / yazma / sonuç sorgulama.
//
// Uç noktalar (13.09.2026'da CANLIDA ölçüldü — belgeye değil ölçüme dayanır):
//   oku   GET  /product/sellers/{id}/products?page&size&archived   (x-api-version: 2)
//   yaz   POST /inventory/sellers/{id}/products/price-and-inventory
//   sonuç GET  /product/sellers/{id}/products/batch-requests/{batchId}
//
// NEDEN `/products` VE `/products/approved/inventory-and-price` DEĞİL: ikincisi yalnız
// ONAYLI ürünleri döndürür; onay bekleyen/reddedilen/arşivli ürün orada hiç görünmez ve
// "Trendyol'da yok" ile "onay bekliyor" ayrımı yapılamaz. `/products` hepsini alanlarıyla
// birlikte verir (approved, rejected, archived, locked, onSale) → gönderilemez listesi
// gerekçesiyle doldurulabilir.
const client = require('./client')
const { parcala, partiTamamMi, urunDurumu } = require('../db/stok-senk-mantik')

const SAYFA_BOYUTU = 200
const MAKS_SAYFA = 200 // güvenlik freni: totalPages gelmezse sonsuz döngüye girme

// Tek bir arşiv durumu için tüm sayfaları gezer.
async function sayfalariCek(sid, arsivli, ilerleme, birikim) {
  for (let sayfa = 0; sayfa < MAKS_SAYFA; sayfa++) {
    const r = await client.get(`/product/sellers/${sid}/products`, {
      page: sayfa, size: SAYFA_BOYUTU, archived: arsivli ? 'true' : 'false',
    })
    const veri = r?.content || []
    for (const u of veri) {
      // ÖLÇÜLDÜ (13.09.2026): 162 üründe 162 stockCode bizim TNC.* stok kodumuz.
      // Eşleşme bununla yapılır; barkod yalnız YAZMA için taşınır.
      const sku = String(u.stockCode || '').trim()
      const barkod = String(u.barcode || '').trim()
      if (!sku || !barkod) continue
      birikim.push({
        sku, barkod,
        miktar: Number(u.quantity ?? 0) || 0,
        ad: u.title || u.productMainId || null,
        durum: urunDurumu({ ...u, archived: arsivli || !!u.archived }),
      })
    }
    if (typeof ilerleme === 'function') ilerleme(birikim.length, r?.totalElements ?? null)
    const toplamSayfa = Number(r?.totalPages)
    if (veri.length === 0) return
    if (Number.isFinite(toplamSayfa) && sayfa + 1 >= toplamSayfa) return
  }
}

// Trendyol'daki TÜM ürünlerin barkod + adet + durumunu çeker.
// Arşivliler ayrı bir istekle gelir (tek çağrıda ikisi birden dönmüyor — ölçüldü).
async function stokOku({ ilerleme } = {}) {
  const sid = client.sellerId()
  if (!sid) throw new Error('Trendyol Satıcı ID yok.')
  const satirlar = []
  await sayfalariCek(sid, false, ilerleme, satirlar)
  await sayfalariCek(sid, true, ilerleme, satirlar)
  return satirlar
}

// Stok gönderir. Kalemler: [{ barkod, yeni_miktar }]. 1000'lik partilere bölünür.
//
// FİYAT GÖNDERİLMEZ. Gövdede yalnız { barcode, quantity } var — fiyat alanı eklenirse
// Trendyol fiyatı da günceller ve satış fiyatının tek kaynağı faturalardır
// (bkz. CLAUDE.md "Fiyat"). 13.09'da bu şekilde gönderilip geri okundu: salePrice ve
// listPrice değişmedi.
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

// Parti sonucunu sorar. Tamamlanma kapısı partiTamamMi'dedir — stok partisinde `status`
// alanı GELMEDİĞİ ölçüldü, bu yüzden kalem sayısına bakılır.
async function partiSonucu(batchRequestId) {
  const sid = client.sellerId()
  const r = await client.get(`/product/sellers/${sid}/products/batch-requests/${batchRequestId}`)
  const kalemler = r?.items || []
  return {
    tamam: partiTamamMi(r),
    basarisizlar: kalemler
      .filter(i => (i.status || '').toUpperCase() === 'FAILED')
      .map(i => ({ barcode: i.requestItem?.barcode, failureReasons: i.failureReasons })),
    ham: r,
  }
}

module.exports = { stokOku, stokYaz, partiSonucu }
