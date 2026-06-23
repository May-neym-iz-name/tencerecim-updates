// ikas senkron: lokasyon eşleştirme, stok gönderme (yerel→ikas) ve
// sipariş çekme (ikas→yerel). client.js token/GraphQL'i yönetir.
const { getDb } = require('../db/database')
const { _ayarlariGetir: ayarGetir } = require('../db/ikas-ayarlar')
const { graphql } = require('./client')

const PUSH_PARTI = 50      // saveProductStockLocations parti boyutu
const SIPARIS_LIMIT = 50   // listOrder sayfa boyutu
const IPTAL_DURUMU = 'CANCELLED'

// --- yardımcılar -----------------------------------------------------------

function ayarKaydet(anahtar, deger) {
  getDb().prepare(
    'INSERT INTO ikas_ayarlar (anahtar, deger) VALUES (?, ?) ' +
    'ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger'
  ).run(anahtar, deger == null ? '' : String(deger))
}

// ikas stok lokasyonlarını çekip yerel lokasyonlarla ada göre eşler,
// lokasyonlar.ikas_lokasyon_id alanını doldurur. Eşleşme raporu döner.
async function lokasyonEsle() {
  const data = await graphql('{ listStockLocation { id name } }')
  const ikasLok = data?.listStockLocation || []
  const db = getDb()
  const yerel = db.prepare('SELECT id, ad FROM lokasyonlar').all()
  const guncelle = db.prepare('UPDATE lokasyonlar SET ikas_lokasyon_id = ? WHERE id = ?')
  const rapor = []
  for (const l of yerel) {
    const eslesen = ikasLok.find(i => i.name.trim().toLowerCase() === l.ad.trim().toLowerCase())
    if (eslesen) {
      guncelle.run(eslesen.id, l.id)
      rapor.push({ yerel: l.ad, ikas: eslesen.name, eslesti: true })
    } else {
      rapor.push({ yerel: l.ad, ikas: null, eslesti: false })
    }
  }
  return { ikasLokasyonlar: ikasLok, rapor }
}

// --- push: yerel stok → ikas ----------------------------------------------

// Verilen ürün id'lerinin (boşsa tüm eşleşmiş ürünlerin) güncel yerel stoklarını
// ikas'a mutlak değer olarak yazar. Yerel DB doğru kaynaktır.
async function pushUrunStok(urunIdler) {
  const db = getDb()
  let where = `WHERE u.aktif = 1 AND u.ikas_urun_id IS NOT NULL AND u.ikas_varyant_id IS NOT NULL
               AND l.ikas_lokasyon_id IS NOT NULL`
  const params = []
  if (Array.isArray(urunIdler) && urunIdler.length) {
    where += ` AND u.id IN (${urunIdler.map(() => '?').join(',')})`
    params.push(...urunIdler)
  }
  const satirlar = db.prepare(`
    SELECT u.ikas_urun_id AS productId, u.ikas_varyant_id AS variantId,
           l.ikas_lokasyon_id AS stockLocationId, us.miktar AS stockCount
    FROM urun_stoklar us
    JOIN urunler u ON us.urun_id = u.id
    JOIN lokasyonlar l ON us.lokasyon_id = l.id
    ${where}
  `).all(...params)

  if (!satirlar.length) return { gonderilen: 0 }

  const mutation = `mutation Push($input: SaveStockLocationsInput!) {
    saveProductStockLocations(input: $input)
  }`
  let gonderilen = 0
  for (let i = 0; i < satirlar.length; i += PUSH_PARTI) {
    const parti = satirlar.slice(i, i + PUSH_PARTI).map(s => ({
      productId: s.productId,
      variantId: s.variantId,
      stockLocationId: s.stockLocationId,
      stockCount: Number(s.stockCount) || 0,
    }))
    await graphql(mutation, { input: { productStockLocationInputs: parti } })
    gonderilen += parti.length
  }
  return { gonderilen }
}

// Satış/iptal/sayım sonrası arka planda (await edilmeden) stok gönderir.
// Hata olsa bile ana işlemi etkilemez — yalnızca loglanır.
function pushArkaPlan(urunIdler) {
  Promise.resolve()
    .then(() => {
      if (!ayarGetir().otomatik_senk) return
      return pushUrunStok(urunIdler)
    })
    .catch(err => console.error('[ikas] arka plan stok gönderimi başarısız:', err.message))
}

// --- pull: ikas siparişleri → yerel stok -----------------------------------

// son_siparis_senk'ten sonra oluşan ikas siparişlerini çeker ve her birinin
// kalemlerini online lokasyondan düşer. İşlenen siparişleri kaydeder (idempotent).
async function pullSiparisler() {
  const db = getDb()
  const a = ayarGetir()
  const onlineLokId = a.online_lokasyon_id
  if (!onlineLokId) return { atlandi: true, sebep: 'online_lokasyon_secilmedi' }

  // İlk çalıştırma: geçmiş siparişleri işleme, başlangıcı şimdiye sabitle.
  let sonSenk = Number(a.son_siparis_senk || 0)
  if (!sonSenk) {
    ayarKaydet('son_siparis_senk', String(Date.now()))
    return { ilkKurulum: true, islenen: 0 }
  }

  const sorgu = `query Cek($gt: Timestamp, $page: Int, $limit: Int) {
    listOrder(sort: "orderedAt asc", orderedAt: { gt: $gt }, pagination: { page: $page, limit: $limit }) {
      count hasNext page limit
      data { id orderNumber orderedAt status orderLineItems { quantity variant { id } } }
    }
  }`

  const islenmisMi = db.prepare('SELECT 1 FROM ikas_islenen_siparisler WHERE ikas_siparis_id = ?')
  const isaretle = db.prepare('INSERT OR IGNORE INTO ikas_islenen_siparisler (ikas_siparis_id, siparis_no) VALUES (?, ?)')
  const varyantUrun = db.prepare('SELECT id FROM urunler WHERE ikas_varyant_id = ? AND aktif = 1')
  const stokDus = db.prepare('UPDATE urun_stoklar SET miktar = MAX(0, miktar - ?) WHERE urun_id = ? AND lokasyon_id = ?')

  let page = 1
  let islenen = 0
  let eslesmeyen = 0
  let enSonOrderedAt = sonSenk

  // Sayfa döngüsü. Her sayfa kendi transaction'ında işlenir.
  for (;;) {
    const data = await graphql(sorgu, { gt: sonSenk, page, limit: SIPARIS_LIMIT })
    const liste = data?.listOrder
    const siparisler = liste?.data || []
    if (!siparisler.length) break

    const partiIsle = db.transaction(() => {
      for (const sip of siparisler) {
        if (sip.orderedAt && sip.orderedAt > enSonOrderedAt) enSonOrderedAt = sip.orderedAt
        if (islenmisMi.get(sip.id)) continue
        if (sip.status === IPTAL_DURUMU) { isaretle.run(sip.id, sip.orderNumber); continue }
        for (const kalem of (sip.orderLineItems || [])) {
          const vId = kalem?.variant?.id
          const adet = Number(kalem?.quantity) || 0
          if (!vId || !adet) continue
          const urun = varyantUrun.get(vId)
          if (urun) stokDus.run(adet, urun.id, onlineLokId)
          else eslesmeyen++
        }
        isaretle.run(sip.id, sip.orderNumber)
        islenen++
      }
    })
    partiIsle()

    if (!liste.hasNext) break
    page++
  }

  if (enSonOrderedAt > sonSenk) ayarKaydet('son_siparis_senk', String(enSonOrderedAt))
  return { islenen, eslesmeyen }
}

// --- IPC handler'ları -------------------------------------------------------

module.exports = {
  // satislar.js / stok.js arka plan push için kullanır (main.js _ önekini atlar).
  _pushArkaPlan: pushArkaPlan,
  _pullSiparisler: pullSiparisler,

  // Bağlantıyı test eder ve lokasyonları eşler.
  'ikas:test': async () => {
    const sonuc = await lokasyonEsle()
    return { baglandi: true, ...sonuc }
  },

  'ikas:lokasyon-esle': async () => lokasyonEsle(),

  // Tüm eşleşmiş ürünlerin stoğunu ikas'a gönderir (manuel tam senkron).
  'ikas:stok-gonder': async () => {
    const { _yetkiKontrol } = require('../yetki')
    _yetkiKontrol('ikas_yonet')
    return pushUrunStok(null)
  },

  // ikas siparişlerini manuel çeker.
  'ikas:siparis-cek': async () => {
    const { _yetkiKontrol } = require('../yetki')
    _yetkiKontrol('ikas_yonet')
    return pullSiparisler()
  },

  // Entegrasyon durum özeti (ekranda göstermek için).
  'ikas:durum': () => {
    const db = getDb()
    const a = ayarGetir()
    const eslesmisUrun = db.prepare(
      'SELECT COUNT(*) n FROM urunler WHERE aktif = 1 AND ikas_varyant_id IS NOT NULL'
    ).get().n
    const eslesmisLok = db.prepare(
      'SELECT COUNT(*) n FROM lokasyonlar WHERE ikas_lokasyon_id IS NOT NULL'
    ).get().n
    const islenenSiparis = db.prepare('SELECT COUNT(*) n FROM ikas_islenen_siparisler').get().n
    return {
      yapilandirildi: !!(a.store_name && a.client_id && a.client_secret),
      otomatik_senk: !!a.otomatik_senk,
      online_lokasyon_id: a.online_lokasyon_id ? Number(a.online_lokasyon_id) : null,
      son_siparis_senk: a.son_siparis_senk ? Number(a.son_siparis_senk) : null,
      eslesmisUrun, eslesmisLok, islenenSiparis,
    }
  },
}
