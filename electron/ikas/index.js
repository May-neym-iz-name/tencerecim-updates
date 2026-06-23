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
      customer { firstName lastName email phone }
      shippingAddress { city { name } district { name } addressLine1 }
      orderLineItems { quantity finalUnitPrice stockLocationId variant { id name } }
    }
  }
}`

// Müşteriyi telefon ya da e-posta ile eşleştirir; yoksa ekler. musteri_id döner.
function musteriUpsert(db, m) {
  const tel = (m.phone || '').trim() || null
  const email = (m.email || '').trim() || null
  const ad = (m.firstName || '').trim()
  const soyad = (m.lastName || '').trim()
  if (!tel && !email && !ad) return null

  let mevcut = null
  if (tel) mevcut = db.prepare('SELECT id FROM musteriler WHERE telefon = ?').get(tel)
  if (!mevcut && email) mevcut = db.prepare('SELECT id FROM musteriler WHERE email = ?').get(email)
  if (mevcut) return mevcut.id

  const r = db.prepare(
    'INSERT INTO musteriler (ad, soyad, telefon, email) VALUES (?, ?, ?, ?)'
  ).run(ad || 'Online', soyad || 'Müşteri', tel, email)
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
    (ikas_siparis_id, siparis_no, siparis_tarihi, durum, odeme_durumu, toplam, para_birimi,
     musteri_id, musteri_ad, musteri_email, musteri_telefon, teslimat_il, teslimat_ilce, teslimat_adres, stok_dusuldu)
    VALUES (@ikas_siparis_id, @siparis_no, @siparis_tarihi, @durum, @odeme_durumu, @toplam, @para_birimi,
     @musteri_id, @musteri_ad, @musteri_email, @musteri_telefon, @teslimat_il, @teslimat_ilce, @teslimat_adres, @stok_dusuldu)`)
  const kalemEkle = db.prepare(`INSERT INTO online_siparis_kalemleri
    (siparis_id, urun_id, ikas_varyant_id, urun_adi, miktar, birim_fiyat, lokasyon_id, ikas_lokasyon_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
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
        const musteriId = musteriUpsert(db, sip.customer || {})

        const r = sipEkle.run({
          ikas_siparis_id: sip.id,
          siparis_no: sip.orderNumber || null,
          siparis_tarihi: sip.orderedAt ? new Date(sip.orderedAt).toISOString() : null,
          durum: sip.status || null,
          odeme_durumu: sip.orderPaymentStatus || null,
          toplam: Number(sip.totalFinalPrice) || 0,
          para_birimi: sip.currencyCode || 'TRY',
          musteri_id: musteriId,
          musteri_ad: ad || null,
          musteri_email: sip.customer?.email || null,
          musteri_telefon: sip.customer?.phone || null,
          teslimat_il: sip.shippingAddress?.city?.name || null,
          teslimat_ilce: sip.shippingAddress?.district?.name || null,
          teslimat_adres: sip.shippingAddress?.addressLine1 || null,
          stok_dusuldu: stokDusecek ? 1 : 0,
        })
        if (r.changes === 0) continue
        const siparisId = r.lastInsertRowid

        for (const kalem of (sip.orderLineItems || [])) {
          const vId = kalem?.variant?.id || null
          const adet = Number(kalem?.quantity) || 0
          const urun = vId ? varyantUrun.get(vId) : null
          const lokId = lokHaritasi[kalem?.stockLocationId] || null
          kalemEkle.run(siparisId, urun?.id || null, vId, kalem?.variant?.name || null,
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
    const onlineSiparis = db.prepare('SELECT COUNT(*) n FROM online_siparisler').get().n
    return {
      yapilandirildi: !!(a.store_name && a.client_id && a.client_secret),
      otomatik_senk: !!a.otomatik_senk,
      son_siparis_senk: a.son_siparis_senk ? Number(a.son_siparis_senk) : null,
      eslesmisUrun, eslesmisLok, onlineSiparis,
    }
  },
}
