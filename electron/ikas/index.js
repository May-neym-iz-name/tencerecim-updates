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

// --- pull: ikas web sitesi siparişleri → yerel kayıt + stok ----------------

const ONLINE_KANAL_TIPI = 1 // salesChannel.type: 1 = web mağaza (storefront)

// Sipariş çekme GraphQL sorgusu. orderedAt > gt (Timestamp, epoch-ms).
const SIPARIS_SORGU = `query Cek($gt: Timestamp, $page: Int, $limit: Int) {
  listOrder(sort: "orderedAt asc", orderedAt: { gt: $gt }, pagination: { page: $page, limit: $limit }) {
    count hasNext page limit
    data {
      id orderNumber orderedAt status orderPaymentStatus totalFinalPrice currencyCode
      salesChannel { type }
      paymentMethods { type paymentGatewayName }
      customer { firstName lastName email phone }
      shippingAddress { city { name } district { name } addressLine1 postalCode phone }
      billingAddress { company taxNumber taxOffice identityNumber }
      orderLineItems { id quantity finalUnitPrice stockLocationId variant { id name } }
    }
  }
}`

// Müşteriyi telefon ya da e-posta ile eşleştirir; yoksa ekler. Mevcut müşterinin
// boş alanlarını siparişten gelen bilgiyle tamamlar (var olanları ezmez).
// shipping: teslimat adresi (adres/il/ilçe), billing: fatura (vergi/ünvan/TC). musteri_id döner.
function musteriUpsert(db, customer, shipping, billing) {
  const tel = (customer.phone || shipping?.phone || '').trim() || null
  const email = (customer.email || '').trim() || null
  const ad = (customer.firstName || '').trim()
  const soyad = (customer.lastName || '').trim()
  if (!tel && !email && !ad) return null

  const adres = (shipping?.addressLine1 || '').trim() || null
  const il = (shipping?.city?.name || '').trim() || null
  const ilce = (shipping?.district?.name || '').trim() || null
  const unvan = (billing?.company || '').trim() || null
  const vergiNo = (billing?.taxNumber || '').trim() || null
  const vergiDairesi = (billing?.taxOffice || '').trim() || null
  const tc = (billing?.identityNumber || '').trim() || null

  let mevcut = null
  if (tel) mevcut = db.prepare('SELECT id FROM musteriler WHERE telefon = ?').get(tel)
  if (!mevcut && email) mevcut = db.prepare('SELECT id FROM musteriler WHERE email = ?').get(email)

  if (mevcut) {
    // Yalnızca boş alanları doldur (manuel girilmiş veriyi koru).
    db.prepare(`UPDATE musteriler SET
      email = COALESCE(NULLIF(email,''), ?), adres = COALESCE(NULLIF(adres,''), ?),
      il = COALESCE(NULLIF(il,''), ?), ilce = COALESCE(NULLIF(ilce,''), ?),
      unvan = COALESCE(NULLIF(unvan,''), ?), vergi_no = COALESCE(NULLIF(vergi_no,''), ?),
      vergi_dairesi = COALESCE(NULLIF(vergi_dairesi,''), ?), tc_kimlik = COALESCE(NULLIF(tc_kimlik,''), ?)
      WHERE id = ?`).run(email, adres, il, ilce, unvan, vergiNo, vergiDairesi, tc, mevcut.id)
    return mevcut.id
  }

  const r = db.prepare(`INSERT INTO musteriler
    (ad, soyad, telefon, email, adres, il, ilce, unvan, vergi_no, vergi_dairesi, tc_kimlik)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(ad || 'Online', soyad || 'Müşteri', tel, email, adres, il, ilce, unvan, vergiNo, vergiDairesi, tc)
  return r.lastInsertRowid
}

// ikas siparişlerini çeker. İlk çalıştırmada tüm geçmiş kaydedilir (stok DÜŞÜLMEZ),
// sonraki çalıştırmalarda sadece yeni siparişler kaydedilir ve stok düşülür.
async function pullSiparisler() {
  const db = getDb()
  const a = ayarGetir()

  // ikas_lokasyon_id → yerel lokasyon_id eşlemesi (stok hangi mağazadan düşecek).
  const lokHaritasi = {}
  for (const l of db.prepare('SELECT id, ikas_lokasyon_id FROM lokasyonlar WHERE ikas_lokasyon_id IS NOT NULL').all()) {
    lokHaritasi[l.ikas_lokasyon_id] = l.id
  }

  const sonSenk = Number(a.son_siparis_senk || 0)
  const ilkKurulum = !sonSenk

  const varExists = db.prepare('SELECT 1 FROM online_siparisler WHERE ikas_siparis_id = ?')
  const sipEkle = db.prepare(`INSERT OR IGNORE INTO online_siparisler
    (ikas_siparis_id, siparis_no, siparis_tarihi, durum, odeme_durumu, odeme_yontemi, toplam, para_birimi,
     musteri_id, musteri_ad, musteri_email, musteri_telefon, teslimat_il, teslimat_ilce, teslimat_adres,
     fatura_unvan, fatura_vergi_no, fatura_vergi_dairesi, fatura_tc, stok_dusuldu)
    VALUES (@ikas_siparis_id, @siparis_no, @siparis_tarihi, @durum, @odeme_durumu, @odeme_yontemi, @toplam, @para_birimi,
     @musteri_id, @musteri_ad, @musteri_email, @musteri_telefon, @teslimat_il, @teslimat_ilce, @teslimat_adres,
     @fatura_unvan, @fatura_vergi_no, @fatura_vergi_dairesi, @fatura_tc, @stok_dusuldu)`)
  const kalemEkle = db.prepare(`INSERT INTO online_siparis_kalemleri
    (siparis_id, urun_id, ikas_kalem_id, ikas_varyant_id, urun_adi, miktar, birim_fiyat, lokasyon_id, ikas_lokasyon_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const varyantUrun = db.prepare('SELECT id FROM urunler WHERE ikas_varyant_id = ? AND aktif = 1')
  const stokDus = db.prepare('UPDATE urun_stoklar SET miktar = MAX(0, miktar - ?) WHERE urun_id = ? AND lokasyon_id = ?')

  let page = 1
  let kaydedilen = 0
  let stokDusulen = 0
  let eslesmeyen = 0
  let enSonOrderedAt = sonSenk

  for (;;) {
    const data = await graphql(SIPARIS_SORGU, { gt: sonSenk || 0, page, limit: SIPARIS_LIMIT })
    const liste = data?.listOrder
    const siparisler = liste?.data || []
    if (!siparisler.length) break

    const partiIsle = db.transaction(() => {
      for (const sip of siparisler) {
        if (sip.orderedAt && sip.orderedAt > enSonOrderedAt) enSonOrderedAt = sip.orderedAt
        if (sip.salesChannel?.type !== ONLINE_KANAL_TIPI) continue // sadece web sitesi siparişleri
        if (varExists.get(sip.id)) continue // zaten kayıtlı

        const iptal = sip.status === IPTAL_DURUMU
        const stokDusecek = !ilkKurulum && !iptal
        const ad = `${sip.customer?.firstName || ''} ${sip.customer?.lastName || ''}`.trim()
        const billing = sip.billingAddress || {}
        const musteriId = musteriUpsert(db, sip.customer || {}, sip.shippingAddress, billing)
        // Ödeme yöntemi: birden çok olabilir; gateway adlarını birleştir ("Havale / EFT").
        const odemeYontemi = (sip.paymentMethods || [])
          .map(p => p.paymentGatewayName || p.type).filter(Boolean).join(', ') || null

        const r = sipEkle.run({
          ikas_siparis_id: sip.id,
          siparis_no: sip.orderNumber || null,
          siparis_tarihi: sip.orderedAt ? new Date(sip.orderedAt).toISOString() : null,
          durum: sip.status || null,
          odeme_durumu: sip.orderPaymentStatus || null,
          odeme_yontemi: odemeYontemi,
          toplam: Number(sip.totalFinalPrice) || 0,
          para_birimi: sip.currencyCode || 'TRY',
          musteri_id: musteriId,
          musteri_ad: ad || null,
          musteri_email: sip.customer?.email || null,
          musteri_telefon: sip.customer?.phone || sip.shippingAddress?.phone || null,
          teslimat_il: sip.shippingAddress?.city?.name || null,
          teslimat_ilce: sip.shippingAddress?.district?.name || null,
          teslimat_adres: sip.shippingAddress?.addressLine1 || null,
          fatura_unvan: billing.company || null,
          fatura_vergi_no: billing.taxNumber || null,
          fatura_vergi_dairesi: billing.taxOffice || null,
          fatura_tc: billing.identityNumber || null,
          stok_dusuldu: stokDusecek ? 1 : 0,
        })
        if (r.changes === 0) continue
        const siparisId = r.lastInsertRowid

        for (const kalem of (sip.orderLineItems || [])) {
          const vId = kalem?.variant?.id || null
          const adet = Number(kalem?.quantity) || 0
          const urun = vId ? varyantUrun.get(vId) : null
          const lokId = lokHaritasi[kalem?.stockLocationId] || null
          kalemEkle.run(siparisId, urun?.id || null, kalem?.id || null, vId, kalem?.variant?.name || null,
            adet, Number(kalem?.finalUnitPrice) || 0, lokId, kalem?.stockLocationId || null)

          if (stokDusecek && adet) {
            if (urun && lokId) stokDus.run(adet, urun.id, lokId)
            else eslesmeyen++
          }
        }
        kaydedilen++
        if (stokDusecek) stokDusulen++
      }
    })
    partiIsle()

    if (!liste.hasNext) break
    page++
  }

  if (enSonOrderedAt > sonSenk) ayarKaydet('son_siparis_senk', String(enSonOrderedAt))
  return { ilkKurulum, kaydedilen, stokDusulen, eslesmeyen }
}

// Tek bir siparişin kalemlerini ikas'tan yeniden çeker ve yerel kalemleri
// yeniden kurar (özellikle eski siparişlerde eksik olan ikas_kalem_id'yi doldurur).
// Manuel atanmış lokasyon_id korunur (varyant bazında).
const TEK_SIPARIS_SORGU = `query Tek($f: StringFilterInput) {
  listOrder(id: $f, pagination: { page: 1, limit: 1 }) {
    data { id status orderLineItems { id quantity finalUnitPrice stockLocationId variant { id name } } }
  }
}`

async function tazeleSiparisKalemleri(db, siparisId) {
  const sip = db.prepare('SELECT id, ikas_siparis_id FROM online_siparisler WHERE id = ?').get(siparisId)
  if (!sip) throw new Error('Sipariş bulunamadı')
  const data = await graphql(TEK_SIPARIS_SORGU, { f: { eq: sip.ikas_siparis_id } })
  const o = data?.listOrder?.data?.[0]
  if (!o) throw new Error('Sipariş ikas tarafında bulunamadı')

  const lokHaritasi = {}
  for (const l of db.prepare('SELECT id, ikas_lokasyon_id FROM lokasyonlar WHERE ikas_lokasyon_id IS NOT NULL').all()) {
    lokHaritasi[l.ikas_lokasyon_id] = l.id
  }
  const varyantUrun = db.prepare('SELECT id FROM urunler WHERE ikas_varyant_id = ? AND aktif = 1')

  // Mevcut manuel lokasyon atamalarını koru (varyant → lokasyon_id).
  const oncekiLok = {}
  for (const k of db.prepare('SELECT ikas_varyant_id, lokasyon_id FROM online_siparis_kalemleri WHERE siparis_id = ?').all(siparisId)) {
    if (k.ikas_varyant_id && k.lokasyon_id) oncekiLok[k.ikas_varyant_id] = k.lokasyon_id
  }

  const kalemEkle = db.prepare(`INSERT INTO online_siparis_kalemleri
    (siparis_id, urun_id, ikas_kalem_id, ikas_varyant_id, urun_adi, miktar, birim_fiyat, lokasyon_id, ikas_lokasyon_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM online_siparis_kalemleri WHERE siparis_id = ?').run(siparisId)
    for (const kalem of (o.orderLineItems || [])) {
      const vId = kalem?.variant?.id || null
      const urun = vId ? varyantUrun.get(vId) : null
      const lokId = (vId && oncekiLok[vId]) || lokHaritasi[kalem?.stockLocationId] || null
      kalemEkle.run(siparisId, urun?.id || null, kalem?.id || null, vId, kalem?.variant?.name || null,
        Number(kalem?.quantity) || 0, Number(kalem?.finalUnitPrice) || 0, lokId, kalem?.stockLocationId || null)
    }
  })
  tx()
  return o.orderLineItems?.length || 0
}

// ikas adres input'unu temizler: __typename ve GraphQL'in kabul etmediği alanları
// atar, geo nesnelerini (city/district/country) yalnız {id, name} olarak bırakır,
// null/boş scalar alanları gönderme (ikas 400 dönebilir).
function adresTemizle(adr) {
  if (!adr || typeof adr !== 'object') return adr
  const SCALAR = ['firstName', 'lastName', 'phone', 'addressLine1', 'addressLine2',
    'postalCode', 'company', 'taxNumber', 'taxOffice', 'identityNumber']
  const out = {}
  for (const k of SCALAR) {
    const v = adr[k]
    if (v != null && String(v).trim() !== '') out[k] = String(v)
  }
  for (const geo of ['city', 'district', 'country']) {
    const g = adr[geo]
    if (g && (g.id || g.name)) {
      out[geo] = {}
      if (g.id) out[geo].id = g.id
      if (g.name) out[geo].name = g.name
    }
  }
  return out
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

  // Tek bir siparişin kalemlerini ikas'tan tazeler (eksik kalem ID'leri doldurur).
  'ikas:siparis-tazele': async ({ id }) => {
    const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
    const adet = await tazeleSiparisKalemleri(getDb(), id)
    return { ok: true, kalemSayisi: adet }
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
    const onlineSiparis = db.prepare('SELECT COUNT(*) n FROM online_siparisler').get().n
    return {
      yapilandirildi: !!(a.store_name && a.client_id && a.client_secret),
      otomatik_senk: !!a.otomatik_senk,
      son_siparis_senk: a.son_siparis_senk ? Number(a.son_siparis_senk) : null,
      eslesmisUrun, eslesmisLok, onlineSiparis,
    }
  },

  // --- ikas sipariş işlemleri (panel düzenlemeleri) ----------------------

  // Siparişi ikas'ta "kargolandı" işaretler + takip numarasını yazar (müşteriye bildirim).
  'ikas:siparis-kargola': async ({ id, takipNo, kargoFirma = 'UPS', trackingLink, bildir = true }) => {
    const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
    const db = getDb()
    const sip = db.prepare('SELECT * FROM online_siparisler WHERE id = ?').get(id)
    if (!sip) throw new Error('Sipariş bulunamadı')
    if (!takipNo) throw new Error('Takip numarası gerekli')
    let kalemSql = db.prepare('SELECT ikas_kalem_id, miktar FROM online_siparis_kalemleri WHERE siparis_id = ? AND ikas_kalem_id IS NOT NULL')
    let lines = kalemSql.all(id).map(k => ({ orderLineItemId: k.ikas_kalem_id, quantity: Number(k.miktar) || 1 }))
    if (!lines.length) {
      // Eski sipariş: kalem ID eksik olabilir → ikas'tan tazele.
      await tazeleSiparisKalemleri(db, id)
      lines = kalemSql.all(id).map(k => ({ orderLineItemId: k.ikas_kalem_id, quantity: Number(k.miktar) || 1 }))
    }
    // trackingInfoDetail: null/boş alanları gönderme (ikas 400 verebilir).
    const trackingInfoDetail = {
      trackingNumber: String(takipNo),
      cargoCompany: kargoFirma || 'UPS',
      isSendNotification: !!bildir,
    }
    if (trackingLink) trackingInfoDetail.trackingLink = trackingLink
    const input = {
      orderId: sip.ikas_siparis_id,
      markAsReadyForShipment: true,
      sendNotificationToCustomer: !!bildir,
      trackingInfoDetail,
      ...(lines.length ? { lines } : {}),
    }
    await graphql('mutation F($input: FulFillOrderInput!){ fulfillOrder(input:$input){ id } }', { input })
    db.prepare("UPDATE online_siparisler SET durum = 'FULFILLED' WHERE id = ?").run(id)
    return { ok: true }
  },

  // Siparişin tüm kalemlerini ikas'ta iptal eder (isteğe bağlı stok iadesi).
  'ikas:siparis-iptal': async ({ id, restock = true }) => {
    const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
    const db = getDb()
    let sip = db.prepare('SELECT * FROM online_siparisler WHERE id = ?').get(id)
    if (!sip) throw new Error('Sipariş bulunamadı')
    let kalemler = db.prepare('SELECT * FROM online_siparis_kalemleri WHERE siparis_id = ? AND ikas_kalem_id IS NOT NULL').all(id)
    if (!kalemler.length) {
      // Eski sipariş: kalem ID eksik olabilir → ikas'tan tazeleyip tekrar dene.
      await tazeleSiparisKalemleri(db, id)
      kalemler = db.prepare('SELECT * FROM online_siparis_kalemleri WHERE siparis_id = ? AND ikas_kalem_id IS NOT NULL').all(id)
    }
    if (!kalemler.length) throw new Error('İptal edilebilir kalem bulunamadı (ikas tarafında sipariş kalemi yok).')
    const orderLineItems = kalemler.map(k => ({
      orderLineItemId: k.ikas_kalem_id, quantity: Number(k.miktar) || 1,
      price: Number(k.birim_fiyat) || 0, restockItems: !!restock,
    }))
    await graphql('mutation C($input: CancelOrderLineInput!){ cancelOrderLine(input:$input){ id } }',
      { input: { orderId: sip.ikas_siparis_id, orderLineItems } })
    // Yerel: durum iptal + (stok düşülmüşse ve restock isteniyorsa) stoğu geri ekle.
    const geriEkle = db.transaction(() => {
      if (restock && sip.stok_dusuldu) {
        const stokArt = db.prepare('UPDATE urun_stoklar SET miktar = miktar + ? WHERE urun_id = ? AND lokasyon_id = ?')
        for (const k of kalemler) if (k.urun_id && k.lokasyon_id) stokArt.run(Number(k.miktar) || 0, k.urun_id, k.lokasyon_id)
      }
      db.prepare("UPDATE online_siparisler SET durum = 'CANCELLED', stok_dusuldu = 0 WHERE id = ?").run(id)
    })
    geriEkle()
    return { ok: true }
  },

  // Siparişin tüm kalemlerini iade eder (isteğe bağlı stok iadesi + kargo iadesi).
  'ikas:siparis-iade': async ({ id, restock = true, refundShipping = false, bildir = true }) => {
    const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
    const db = getDb()
    let sip = db.prepare('SELECT * FROM online_siparisler WHERE id = ?').get(id)
    if (!sip) throw new Error('Sipariş bulunamadı')
    let kalemler = db.prepare('SELECT * FROM online_siparis_kalemleri WHERE siparis_id = ? AND ikas_kalem_id IS NOT NULL').all(id)
    if (!kalemler.length) {
      await tazeleSiparisKalemleri(db, id)
      kalemler = db.prepare('SELECT * FROM online_siparis_kalemleri WHERE siparis_id = ? AND ikas_kalem_id IS NOT NULL').all(id)
    }
    if (!kalemler.length) throw new Error('İade edilebilir kalem bulunamadı (ikas tarafında sipariş kalemi yok).')
    const orderRefundLines = kalemler.map(k => ({
      orderLineItemId: k.ikas_kalem_id, quantity: Number(k.miktar) || 1,
      price: Number(k.birim_fiyat) || 0, restockItems: !!restock,
    }))
    await graphql('mutation R($input: OrderRefundInput!){ refundOrderLine(input:$input){ id } }', {
      input: { orderId: sip.ikas_siparis_id, orderRefundLines, refundShipping: !!refundShipping, sendNotificationToCustomer: !!bildir },
    })
    const geriEkle = db.transaction(() => {
      if (restock && sip.stok_dusuldu) {
        const stokArt = db.prepare('UPDATE urun_stoklar SET miktar = miktar + ? WHERE urun_id = ? AND lokasyon_id = ?')
        for (const k of kalemler) if (k.urun_id && k.lokasyon_id) stokArt.run(Number(k.miktar) || 0, k.urun_id, k.lokasyon_id)
      }
      db.prepare("UPDATE online_siparisler SET durum = 'REFUNDED', stok_dusuldu = 0 WHERE id = ?").run(id)
    })
    geriEkle()
    return { ok: true }
  },

  // Düzenleme için siparişin güncel adreslerini ikas'tan çeker (geo ID'leriyle birlikte).
  'ikas:siparis-adres-getir': async ({ id }) => {
    const db = getDb()
    const sip = db.prepare('SELECT ikas_siparis_id FROM online_siparisler WHERE id = ?').get(id)
    if (!sip) throw new Error('Sipariş bulunamadı')
    const data = await graphql(`query A($f: StringFilterInput){
      listOrder(id: $f, pagination:{page:1,limit:1}){ data {
        shippingAddress { firstName lastName phone addressLine1 addressLine2 postalCode company taxNumber taxOffice identityNumber city{id name} district{id name} country{id name} }
        billingAddress  { firstName lastName phone addressLine1 addressLine2 postalCode company taxNumber taxOffice identityNumber city{id name} district{id name} country{id name} }
      } }
    }`, { f: { eq: sip.ikas_siparis_id } })
    const o = data?.listOrder?.data?.[0]
    return { shippingAddress: o?.shippingAddress || null, billingAddress: o?.billingAddress || null }
  },

  // Sipariş adresini ikas'ta günceller (geo nesneleri korunur, metin alanları değişir).
  'ikas:siparis-adres': async ({ id, shippingAddress, billingAddress }) => {
    const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
    const db = getDb()
    const sip = db.prepare('SELECT * FROM online_siparisler WHERE id = ?').get(id)
    if (!sip) throw new Error('Sipariş bulunamadı')
    const input = { orderId: sip.ikas_siparis_id }
    if (shippingAddress) input.shippingAddress = adresTemizle(shippingAddress)
    if (billingAddress) input.billingAddress = adresTemizle(billingAddress)
    await graphql('mutation U($input: UpdateOrderAddressesInput!){ updateOrderAddresses(input:$input){ id } }', { input })
    // Yerel teslimat alanlarını güncelle.
    if (shippingAddress) {
      db.prepare('UPDATE online_siparisler SET teslimat_adres = ?, teslimat_il = ?, teslimat_ilce = ?, musteri_telefon = COALESCE(?, musteri_telefon) WHERE id = ?')
        .run(shippingAddress.addressLine1 || null, shippingAddress.city?.name || null, shippingAddress.district?.name || null, shippingAddress.phone || null, id)
    }
    return { ok: true }
  },
}
