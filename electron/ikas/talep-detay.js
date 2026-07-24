// Talebin HANGİ kalemleri kapsadığını çıkarır. Talep PAKET bazlıdır: bir sipariş
// birden çok pakete bölünebilir ve talep yalnız bir paketi ilgilendirebilir.
// Canlı örnek (1141437359): 3 ürün / 2 paket, talep yalnız 2.670 TL'lik pakette —
// sipariş bazlı bakan kod 7.970 TL'lik tam iade önerirdi.
//
// _talepPaketleri SAF ve ağsızdır → gerçek API fixture'ıyla mock'suz test edilir
// (emsal: bildirim-uret.js _durumdanBildirim).

const TALEP_DURUMLARI = ['REFUND_REQUESTED', 'CANCEL_REQUESTED']

// İkas'tan çekilecek alanlar. orderLineItemIds paket↔kalem bağını kurar.
const TALEP_SORGUSU = `query($f: StringFilterInput){
  listOrder(id: $f, pagination:{page:1,limit:1}){
    data {
      id orderNumber status orderPackageStatus cancelReason
      orderPackages { id orderPackageNumber orderPackageFulfillStatus
                      refundReasonId returnShippingMethod note orderLineItemIds }
      orderLineItems { id quantity finalPrice variant { name } }
    }
  }
}`

function _kalem(li) {
  return {
    id: li.id,
    ad: li.variant?.name || 'Ürün',
    miktar: Number(li.quantity) || 0,
    tutar: Number(li.finalPrice) || 0,
  }
}

// Döner: { talepli: [...paket], talepDisi: [...kalem], talepToplami }
function _talepPaketleri(order) {
  const bos = { talepli: [], talepDisi: [], talepToplami: 0 }
  if (!order) return bos

  const kalemler = Array.isArray(order.orderLineItems) ? order.orderLineItems : []
  const kalemHarita = new Map(kalemler.map(li => [li.id, li]))
  const paketler = Array.isArray(order.orderPackages) ? order.orderPackages : []

  const talepliPaketler = paketler.filter(p => TALEP_DURUMLARI.includes(p.orderPackageFulfillStatus))

  // Paket YOKSA (henüz oluşmamış) paket durumu bilgi taşımaz → sipariş durumu tek
  // kaynaktır ve talep tüm kalemleri kapsar. İptal talepleri çoğunlukla bu aşamada
  // gelir; bu dal düşerse hiç görünmezler. (Aynı kural: src/utils/talep.js)
  if (!talepliPaketler.length) {
    if (!TALEP_DURUMLARI.includes(order.status)) return bos
    const hepsi = kalemler.map(_kalem)
    return {
      talepli: [{
        paketNo: order.orderNumber || '—', durum: order.status,
        sebepId: null, notu: null, iadeKargo: null, kalemler: hepsi,
      }],
      talepDisi: [],
      talepToplami: hepsi.reduce((s, k) => s + k.tutar * k.miktar, 0),
    }
  }

  const talepliKalemIdleri = new Set()
  const talepli = talepliPaketler.map(p => {
    const ids = Array.isArray(p.orderLineItemIds) ? p.orderLineItemIds : []
    ids.forEach(id => talepliKalemIdleri.add(id))
    return {
      paketNo: p.orderPackageNumber || p.id,
      durum: p.orderPackageFulfillStatus,
      sebepId: p.refundReasonId || null,
      notu: p.note || null,
      iadeKargo: p.returnShippingMethod || null,
      kalemler: ids.map(id => kalemHarita.get(id)).filter(Boolean).map(_kalem),
    }
  })

  const talepDisi = kalemler.filter(li => !talepliKalemIdleri.has(li.id)).map(_kalem)
  const talepToplami = talepli
    .flatMap(p => p.kalemler)
    .reduce((s, k) => s + k.tutar * k.miktar, 0)

  return { talepli, talepDisi, talepToplami }
}

module.exports = { TALEP_DURUMLARI, TALEP_SORGUSU, _talepPaketleri }
