// ikas senkron: lokasyon eşleştirme, stok gönderme (yerel→ikas) ve
// sipariş çekme (ikas→yerel). client.js token/GraphQL'i yönetir.
const { getDb } = require('../db/database')
const { _ayarlariGetir: ayarGetir } = require('../db/ikas-ayarlar')
const { graphql } = require('./client')

const PUSH_PARTI = 50      // saveProductStockLocations parti boyutu
const SIPARIS_LIMIT = 200  // listOrder sayfa boyutu (ikas tavanı 200 — daha az istek)
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
  // Stok miktarı senkronu geçici olarak kapatılabilir (sipariş çekme + fiyat push
  // etkilenmez; yalnızca yerel stok → ikas gönderimi durur). '1' = kapalı.
  if (ayarGetir().stok_push_kapali === '1') return { gonderilen: 0, kapali: true }

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

// Görsel URL'si cdn.myikas.com/images/<merchantId>/<imageId>/image_1950.webp
// biçiminde. merchantId mağaza sabiti; getMerchant ile bir kez alınıp cache'lenir.
let _merchantIdCache = null
async function merchantIdAl() {
  if (_merchantIdCache) return _merchantIdCache
  try {
    const d = await graphql('{ getMerchant { id } }', {})
    _merchantIdCache = d?.getMerchant?.id || null
  } catch { _merchantIdCache = null }
  return _merchantIdCache
}

// Kalem birim fiyatı: finalUnitPrice bazen null gelir → price, yoksa finalPrice/adet.
// İptal/iade ikas'a gerçek fiyatı göndermek zorunda (fiyat uyuşmazlığı reddedilir).
function birimFiyatHesapla(kalem) {
  const adet = Number(kalem?.quantity) || 1
  if (kalem?.finalUnitPrice != null) return Number(kalem.finalUnitPrice) || 0
  if (kalem?.price != null) return Number(kalem.price) || 0
  if (kalem?.finalPrice != null) return (Number(kalem.finalPrice) || 0) / adet
  return 0
}

// Sipariş çekme GraphQL sorgusu. updatedAt > gt (Timestamp, epoch-ms).
// İmleç updatedAt: durumu sonradan değişen (kargoya hazır, teslim edildi...)
// siparişler de yeniden gelir; orderedAt imleci ile durum güncellenmiyordu.
const SIPARIS_SORGU = `query Cek($gt: Timestamp, $page: Int, $limit: Int) {
  listOrder(sort: "updatedAt asc", updatedAt: { gt: $gt }, pagination: { page: $page, limit: $limit }) {
    count hasNext page limit
    data {
      id orderNumber orderedAt updatedAt status orderPaymentStatus orderPackageStatus totalFinalPrice currencyCode
      salesChannel { type }
      paymentMethods { type paymentGatewayName }
      customer { firstName lastName email phone }
      shippingAddress { city { name } district { name } addressLine1 postalCode phone }
      billingAddress { company taxNumber taxOffice identityNumber }
      orderPackages { trackingInfo { trackingNumber cargoCompany trackingLink barcode } }
      orderLineItems { id quantity finalUnitPrice finalPrice price stockLocationId variant { id name } }
    }
  }
}`

// Siparişin paketlerinden ilk takip bilgisini çıkarır (kargo no/firma/link).
// ikas UPS entegrasyonu takip no'yu trackingNumber yerine `barcode`'a yazar
// (ör. UPS 1Z numarası) → trackingNumber boşsa barcode'a düşülür.
function takipBilgisi(sip) {
  for (const p of (sip?.orderPackages || [])) {
    const t = p?.trackingInfo
    if (!t) continue
    const no = (t.trackingNumber || t.barcode || '').trim() || null
    if (no || t.trackingLink) {
      return {
        no,
        firma: (t.cargoCompany || '').trim() || null,
        link: (t.trackingLink || '').trim() || null,
      }
    }
  }
  return { no: null, firma: null, link: null }
}

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

  // Bu cihazda geçmiş hiç çekilmediyse ilk çekim TÜM siparişleri getirir (stok
  // düşülmez). Sonraki çekimler yalnızca yeni siparişleri getirir (stok düşülür).
  const sonSenk = Number(a.son_siparis_senk || 0)
  const gecmisCekildi = String(a.gecmis_cekildi || '') === '1'
  const ilkKurulum = !gecmisCekildi
  const gtBaslangic = ilkKurulum ? 0 : sonSenk

  const varExists = db.prepare('SELECT 1 FROM online_siparisler WHERE ikas_siparis_id = ?')
  const sipEkle = db.prepare(`INSERT OR IGNORE INTO online_siparisler
    (ikas_siparis_id, siparis_no, siparis_tarihi, durum, odeme_durumu, kargo_durumu, odeme_yontemi, toplam, para_birimi,
     musteri_id, musteri_ad, musteri_email, musteri_telefon, teslimat_il, teslimat_ilce, teslimat_adres,
     fatura_unvan, fatura_vergi_no, fatura_vergi_dairesi, fatura_tc, stok_dusuldu,
     kargo_takip_no, kargo_firma, kargo_takip_link)
    VALUES (@ikas_siparis_id, @siparis_no, @siparis_tarihi, @durum, @odeme_durumu, @kargo_durumu, @odeme_yontemi, @toplam, @para_birimi,
     @musteri_id, @musteri_ad, @musteri_email, @musteri_telefon, @teslimat_il, @teslimat_ilce, @teslimat_adres,
     @fatura_unvan, @fatura_vergi_no, @fatura_vergi_dairesi, @fatura_tc, @stok_dusuldu,
     @kargo_takip_no, @kargo_firma, @kargo_takip_link)`)
  const kalemEkle = db.prepare(`INSERT INTO online_siparis_kalemleri
    (siparis_id, urun_id, ikas_kalem_id, ikas_varyant_id, urun_adi, miktar, birim_fiyat, lokasyon_id, ikas_lokasyon_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const varyantUrun = db.prepare('SELECT id FROM urunler WHERE ikas_varyant_id = ? AND aktif = 1')
  const stokDus = db.prepare('UPDATE urun_stoklar SET miktar = MAX(0, miktar - ?) WHERE urun_id = ? AND lokasyon_id = ?')
  // Var olan siparişin durum tazeleme + iptal/iade'de stok geri ekleme.
  const mevcutGetir = db.prepare('SELECT id, durum, odeme_durumu, kargo_durumu, stok_dusuldu FROM online_siparisler WHERE ikas_siparis_id = ?')
  const durumGuncelle = db.prepare('UPDATE online_siparisler SET durum = ?, odeme_durumu = ?, kargo_durumu = ? WHERE id = ?')
  const takipGuncelle = db.prepare('UPDATE online_siparisler SET kargo_takip_no = ?, kargo_firma = ?, kargo_takip_link = ? WHERE id = ?')
  const stokGeri = db.prepare('UPDATE urun_stoklar SET miktar = miktar + ? WHERE urun_id = ? AND lokasyon_id = ?')
  const stokSifirla = db.prepare('UPDATE online_siparisler SET stok_dusuldu = 0 WHERE id = ?')
  const kalemlerGetir = db.prepare('SELECT urun_id, lokasyon_id, miktar FROM online_siparis_kalemleri WHERE siparis_id = ?')
  const IADE_DURUMLARI = new Set([IPTAL_DURUMU, 'REFUNDED'])

  let page = 1
  let kaydedilen = 0
  let guncellenen = 0
  let stokDusulen = 0
  let eslesmeyen = 0
  let enSonUpdatedAt = sonSenk

  for (;;) {
    const data = await graphql(SIPARIS_SORGU, { gt: gtBaslangic, page, limit: SIPARIS_LIMIT })
    const liste = data?.listOrder
    const siparisler = liste?.data || []
    if (!siparisler.length) break

    const partiIsle = db.transaction(() => {
      for (const sip of siparisler) {
        if (sip.updatedAt && sip.updatedAt > enSonUpdatedAt) enSonUpdatedAt = sip.updatedAt
        if (sip.salesChannel?.type !== ONLINE_KANAL_TIPI) continue // sadece web sitesi siparişleri

        // Zaten kayıtlı: yeniden ekleme ama durum/ödeme bilgisini ikas'tan tazele.
        const mevcut = mevcutGetir.get(sip.id)
        if (mevcut) {
          const yeniDurum = sip.status || mevcut.durum
          const yeniOdeme = sip.orderPaymentStatus || mevcut.odeme_durumu
          const yeniKargo = sip.orderPackageStatus || mevcut.kargo_durumu
          if (yeniDurum !== mevcut.durum || yeniOdeme !== mevcut.odeme_durumu || yeniKargo !== mevcut.kargo_durumu) {
            durumGuncelle.run(yeniDurum, yeniOdeme, yeniKargo, mevcut.id)
            guncellenen++
          }
          // Kargo takip bilgisi ikas'ta girilmiş/değişmişse tazele.
          const takip = takipBilgisi(sip)
          if (takip.no || takip.link) takipGuncelle.run(takip.no, takip.firma, takip.link, mevcut.id)
          // İkas'ta iptal/iade edildiyse ve stok düşülmüşse yerel stoğu geri ekle.
          if (IADE_DURUMLARI.has(yeniDurum) && mevcut.stok_dusuldu) {
            for (const k of kalemlerGetir.all(mevcut.id)) {
              if (k.urun_id && k.lokasyon_id) stokGeri.run(Number(k.miktar) || 0, k.urun_id, k.lokasyon_id)
            }
            stokSifirla.run(mevcut.id)
          }
          continue
        }

        const iptal = sip.status === IPTAL_DURUMU
        const stokDusecek = !ilkKurulum && !iptal
        const ad = `${sip.customer?.firstName || ''} ${sip.customer?.lastName || ''}`.trim()
        const billing = sip.billingAddress || {}
        const musteriId = musteriUpsert(db, sip.customer || {}, sip.shippingAddress, billing)
        // Ödeme yöntemi: birden çok olabilir; gateway adlarını birleştir ("Havale / EFT").
        const odemeYontemi = (sip.paymentMethods || [])
          .map(p => p.paymentGatewayName || p.type).filter(Boolean).join(', ') || null
        const takip = takipBilgisi(sip)

        const r = sipEkle.run({
          ikas_siparis_id: sip.id,
          siparis_no: sip.orderNumber || null,
          siparis_tarihi: sip.orderedAt ? new Date(sip.orderedAt).toISOString() : null,
          durum: sip.status || null,
          odeme_durumu: sip.orderPaymentStatus || null,
          kargo_durumu: sip.orderPackageStatus || null,
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
          kargo_takip_no: takip.no,
          kargo_firma: takip.firma,
          kargo_takip_link: takip.link,
        })
        if (r.changes === 0) continue
        const siparisId = r.lastInsertRowid

        for (const kalem of (sip.orderLineItems || [])) {
          const vId = kalem?.variant?.id || null
          const adet = Number(kalem?.quantity) || 0
          const urun = vId ? varyantUrun.get(vId) : null
          const lokId = lokHaritasi[kalem?.stockLocationId] || null
          kalemEkle.run(siparisId, urun?.id || null, kalem?.id || null, vId, kalem?.variant?.name || null,
            adet, birimFiyatHesapla(kalem), lokId, kalem?.stockLocationId || null)

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

  if (enSonUpdatedAt > sonSenk) ayarKaydet('son_siparis_senk', String(enSonUpdatedAt))
  // İlk (tüm geçmiş) çekim tamamlandı → işaretle; bundan sonra yalnızca yeniler gelir.
  if (ilkKurulum) ayarKaydet('gecmis_cekildi', '1')
  return { ilkKurulum, kaydedilen, guncellenen, stokDusulen, eslesmeyen }
}

// Tek bir siparişin kalemlerini ikas'tan yeniden çeker ve yerel kalemleri
// yeniden kurar (özellikle eski siparişlerde eksik olan ikas_kalem_id'yi doldurur).
// Manuel atanmış lokasyon_id korunur (varyant bazında).
const TEK_SIPARIS_SORGU = `query Tek($f: StringFilterInput) {
  listOrder(id: $f, pagination: { page: 1, limit: 1 }) {
    data { id status orderPaymentStatus orderPackageStatus
      orderPackages { trackingInfo { trackingNumber cargoCompany trackingLink barcode } }
      orderLineItems { id quantity finalUnitPrice finalPrice price stockLocationId variant { id name } } }
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

  // Sipariş durumu ikas'ta değişmiş olabilir (örn. iptal/iade) → tazele.
  const mevcut = db.prepare('SELECT durum, odeme_durumu, kargo_durumu, stok_dusuldu FROM online_siparisler WHERE id = ?').get(siparisId)
  const yeniDurum = o.status || mevcut?.durum
  const yeniOdeme = o.orderPaymentStatus || mevcut?.odeme_durumu
  const yeniKargo = o.orderPackageStatus || mevcut?.kargo_durumu
  const iadeOldu = (yeniDurum === IPTAL_DURUMU || yeniDurum === 'REFUNDED') && mevcut?.stok_dusuldu

  const tx = db.transaction(() => {
    // İptal/iade olduysa ve stok düşülmüşse, mevcut kalemlerden yerel stoğu geri ekle.
    if (iadeOldu) {
      const stokGeri = db.prepare('UPDATE urun_stoklar SET miktar = miktar + ? WHERE urun_id = ? AND lokasyon_id = ?')
      for (const k of db.prepare('SELECT urun_id, lokasyon_id, miktar FROM online_siparis_kalemleri WHERE siparis_id = ?').all(siparisId)) {
        if (k.urun_id && k.lokasyon_id) stokGeri.run(Number(k.miktar) || 0, k.urun_id, k.lokasyon_id)
      }
    }
    db.prepare('UPDATE online_siparisler SET durum = ?, odeme_durumu = ?, kargo_durumu = ?, stok_dusuldu = CASE WHEN ? THEN 0 ELSE stok_dusuldu END WHERE id = ?')
      .run(yeniDurum, yeniOdeme, yeniKargo, iadeOldu ? 1 : 0, siparisId)

    // ikas kargo takip bilgisini geri doldur (eski siparişlerde boştu).
    const takip = takipBilgisi(o)
    if (takip.no || takip.link) {
      db.prepare('UPDATE online_siparisler SET kargo_takip_no = ?, kargo_firma = ?, kargo_takip_link = ? WHERE id = ?')
        .run(takip.no, takip.firma, takip.link, siparisId)
    }

    db.prepare('DELETE FROM online_siparis_kalemleri WHERE siparis_id = ?').run(siparisId)
    for (const kalem of (o.orderLineItems || [])) {
      const vId = kalem?.variant?.id || null
      const urun = vId ? varyantUrun.get(vId) : null
      const lokId = (vId && oncekiLok[vId]) || lokHaritasi[kalem?.stockLocationId] || null
      kalemEkle.run(siparisId, urun?.id || null, kalem?.id || null, vId, kalem?.variant?.name || null,
        Number(kalem?.quantity) || 0, birimFiyatHesapla(kalem), lokId, kalem?.stockLocationId || null)
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
  // ikas AddressInput 'isDefault' alanını zorunlu (Boolean!) istiyor. Sipariş
  // adresi müşterinin varsayılan adresi olmadığı için false gönderiyoruz.
  out.isDefault = adr.isDefault === true
  return out
}

// Bir kalemin iade/geri-yükleme için ikas stok lokasyon ID'sini bulur:
// önce seçili yerel lokasyonun ikas eşleşmesi, yoksa kalemde kayıtlı ikas lokasyonu.
function kalemIkasLokId(db, kalem) {
  if (kalem.lokasyon_id) {
    const r = db.prepare('SELECT ikas_lokasyon_id FROM lokasyonlar WHERE id = ?').get(kalem.lokasyon_id)
    if (r?.ikas_lokasyon_id) return r.ikas_lokasyon_id
  }
  return kalem.ikas_lokasyon_id || null
}

// --- IPC handler'ları -------------------------------------------------------

module.exports = {
  // satislar.js / stok.js arka plan push için kullanır (main.js _ önekini atlar).
  _pushArkaPlan: pushArkaPlan,
  _pullSiparisler: pullSiparisler,

  // Kargo etiketi için sipariş verisini derler: yerel alanlar + ikas zenginleştirme
  // (satış kanalı adı, kargo kuralı/ücreti, ürün görselleri). ikas erişilemezse
  // yerel veriyle (görselsiz) devam eder — hata fırlatmaz.
  'kargo-etiket:veri': async (id) => {
    const db = getDb()
    const s = db.prepare('SELECT * FROM online_siparisler WHERE id = ?').get(id)
    if (!s) throw new Error('Sipariş bulunamadı')
    const kalemler = db.prepare(`
      SELECT k.*, u.sku AS urun_sku, u.marka AS urun_marka
      FROM online_siparis_kalemleri k
      LEFT JOIN urunler u ON k.urun_id = u.id
      WHERE k.siparis_id = ?`).all(id)
    const takip = db.prepare(
      "SELECT takip_no FROM kargolar WHERE online_siparis_id = ? ORDER BY id DESC LIMIT 1"
    ).get(id)
    const gon = db.prepare('SELECT ad, yetkili FROM lokasyon_gonderici WHERE ad IS NOT NULL LIMIT 1').get()

    let satisKanali = null, kargoKurali = null, kargoUcreti = null
    const resimMap = {}
    const a = ayarGetir()
    if (a.store_name && a.client_id && a.client_secret && s.ikas_siparis_id) {
      try {
        const mid = await merchantIdAl()
        const d = await graphql(
          `query P($eq:String){ listOrder(id:{eq:$eq}, pagination:{page:1,limit:1}){ data {
             salesChannel { name } shippingLines { title price }
             orderLineItems { variant { id mainImageId } } } } }`,
          { eq: s.ikas_siparis_id },
        )
        const o = d?.listOrder?.data?.[0]
        if (o) {
          satisKanali = o.salesChannel?.name || null
          const sl = (o.shippingLines || [])[0]
          if (sl) { kargoKurali = sl.title || null; kargoUcreti = Number(sl.price) || 0 }
          for (const li of (o.orderLineItems || [])) {
            const v = li.variant
            if (v?.id && v?.mainImageId && mid) {
              resimMap[v.id] = `https://cdn.myikas.com/images/${mid}/${v.mainImageId}/image_1950.webp`
            }
          }
        }
      } catch { /* ikas erişilemezse yerel veriyle devam */ }
    }

    return {
      siparis_no: s.siparis_no,
      siparis_tarihi: s.siparis_tarihi,
      odeme_yontemi: s.odeme_yontemi,
      musteri_ad: s.musteri_ad,
      musteri_telefon: s.musteri_telefon,
      teslimat_il: s.teslimat_il,
      teslimat_ilce: s.teslimat_ilce,
      teslimat_adres: s.teslimat_adres,
      takip_no: takip?.takip_no || s.kargo_takip_no || null,
      kargo_firma: s.kargo_firma || 'UPS',
      satisKanali,
      kargoKurali,
      kargoUcreti,
      gonderen: (gon?.ad || a.store_name || 'Tencerecim'),
      kalemler: kalemler.map(k => ({
        ad: k.urun_adi || '',
        marka: k.urun_marka || '',
        sku: k.urun_sku || '',
        miktar: k.miktar || 1,
        birim_fiyat: k.birim_fiyat || 0,
        resim: resimMap[k.ikas_varyant_id] || null,
      })),
    }
  },

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

  // Tüm geçmişi yeniden çeker: son_siparis_senk sıfırlanır → ilk kurulum modu
  // (mevcut siparişler mükerrer eklenmez, eski siparişlerin durumu tazelenir, stok DÜŞÜLMEZ).
  'ikas:siparis-gecmis-cek': async () => {
    const { _yetkiKontrol } = require('../yetki')
    _yetkiKontrol('ikas_yonet')
    ayarKaydet('son_siparis_senk', '0')
    ayarKaydet('gecmis_cekildi', '')
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
      stok_push_kapali: a.stok_push_kapali === '1',
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

    // Sipariş ikas'ta ZATEN paketlenmişse (ör. ikas UPS entegrasyonu paket oluşturmuş)
    // fulfillOrder "order_line_is_already_packaged" hatası verir. Bu durumda yeni paket
    // açmak yerine MEVCUT pakete takip no'yu işleriz (updateOrderPackageStatus).
    const pkData = await graphql(`query P($f: StringFilterInput){
      listOrder(id:$f, pagination:{page:1,limit:1}){ data { orderPackages { id orderPackageFulfillStatus } } }
    }`, { f: { eq: sip.ikas_siparis_id } })
    const paketler = pkData?.listOrder?.data?.[0]?.orderPackages || []

    if (paketler.length) {
      // Zaten paketli → mevcut paketlere takip bilgisini ekle, durumu koru.
      await graphql('mutation S($input: UpdateOrderPackageStatusInput!){ updateOrderPackageStatus(input:$input){ id orderPackageStatus } }', {
        input: {
          orderId: sip.ikas_siparis_id,
          packages: paketler.map(p => ({
            packageId: p.id,
            status: p.orderPackageFulfillStatus || 'READY_FOR_SHIPMENT',
            trackingInfo: trackingInfoDetail,
          })),
        },
      })
    } else {
      // Henüz paket yok → kalemleri paketle + takip (fulfillOrder).
      const input = {
        orderId: sip.ikas_siparis_id,
        markAsReadyForShipment: true,
        sendNotificationToCustomer: !!bildir,
        trackingInfoDetail,
        ...(lines.length ? { lines } : {}),
      }
      await graphql('mutation F($input: FulFillOrderInput!){ fulfillOrder(input:$input){ id } }', { input })
    }
    // Hazırlık paket durumuna geçer; sonraki çekimde teyit edilir.
    db.prepare("UPDATE online_siparisler SET kargo_takip_no = ?, kargo_firma = ?, kargo_durumu = CASE WHEN kargo_durumu IS NULL THEN 'READY_FOR_SHIPMENT' ELSE kargo_durumu END WHERE id = ?")
      .run(String(takipNo), kargoFirma || 'UPS', id)
    return { ok: true }
  },

  // Siparişin tüm kalemlerini ikas'ta iptal eder (isteğe bağlı stok iadesi).
  'ikas:siparis-iptal': async ({ id, restock = true }) => {
    const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
    const db = getDb()
    let sip = db.prepare('SELECT * FROM online_siparisler WHERE id = ?').get(id)
    if (!sip) throw new Error('Sipariş bulunamadı')
    // Kalem ID ve birim fiyatları ikas'tan tazele (yereldeki fiyat 0/eski olabilir;
    // ikas iptalde fiyat uyuşmazlığını reddeder).
    await tazeleSiparisKalemleri(db, id)
    sip = db.prepare('SELECT * FROM online_siparisler WHERE id = ?').get(id)
    const kalemler = db.prepare('SELECT * FROM online_siparis_kalemleri WHERE siparis_id = ? AND ikas_kalem_id IS NOT NULL').all(id)
    if (!kalemler.length) throw new Error('İptal edilebilir kalem bulunamadı (ikas tarafında sipariş kalemi yok).')
    // CANLI ŞEMA: CancelOrderLineItemInput.price ZORUNLU (Float!).
    const orderLineItems = kalemler.map(k => ({
      orderLineItemId: k.ikas_kalem_id, quantity: Number(k.miktar) || 1,
      price: Number(k.birim_fiyat) || 0, restockItems: !!restock,
    }))
    // SADECE iptal et. Eskiden cancel reddedilince sessizce refundOrderLine'a düşülüyordu
    // — bu "İptal Et" diyene İADE yapıyordu (farklı finansal işlem). Artık iade'ye düşmüyoruz;
    // cancel reddedilirse gerçek ikas hatası gösterilir. İade için ayrı "İade Et" butonu var.
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

  // Siparişi iade eder. secimler verilmezse TÜM kalemler (tam iade); verilirse yalnızca
  // seçilen kalemler/adetler iade edilir (ürün bazlı kısmi iade).
  // secimler: [{ ikasKalemId, miktar }]
  'ikas:siparis-iade': async ({ id, restock = true, refundShipping = false, bildir = true, secimler = null }) => {
    const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
    const db = getDb()
    let sip = db.prepare('SELECT * FROM online_siparisler WHERE id = ?').get(id)
    if (!sip) throw new Error('Sipariş bulunamadı')
    // Kalem ID ve birim fiyatları ikas'tan tazele (fiyat uyuşmazlığı iadeyi reddeder).
    await tazeleSiparisKalemleri(db, id)
    sip = db.prepare('SELECT * FROM online_siparisler WHERE id = ?').get(id)
    const kalemler = db.prepare('SELECT * FROM online_siparis_kalemleri WHERE siparis_id = ? AND ikas_kalem_id IS NOT NULL').all(id)
    if (!kalemler.length) throw new Error('İade edilebilir kalem bulunamadı (ikas tarafında sipariş kalemi yok).')

    // İade edilecek kalemler ve adetleri belirle. secimler yoksa tümü.
    let iade
    if (Array.isArray(secimler) && secimler.length) {
      const harita = new Map(secimler.map(s => [String(s.ikasKalemId), Number(s.miktar) || 0]))
      iade = kalemler
        .map(k => ({ k, miktar: Math.min(Number(k.miktar) || 0, Math.max(0, harita.get(String(k.ikas_kalem_id)) || 0)) }))
        .filter(x => x.miktar > 0)
      if (!iade.length) throw new Error('İade için ürün/adet seçilmedi.')
    } else {
      iade = kalemler.map(k => ({ k, miktar: Number(k.miktar) || 1 }))
    }
    const tamIade = iade.length === kalemler.length && iade.every(x => x.miktar >= (Number(x.k.miktar) || 0))

    // ikas iade için stok lokasyonu ister (zorunlu). İlk seçili kalemin ikas lokasyonu.
    const stockLocationId = iade.map(x => kalemIkasLokId(db, x.k)).find(Boolean) || null
    if (restock && !stockLocationId) {
      throw new Error('İade için stok lokasyonu belirlenemedi. Kalemlerin çıkış mağazasını seçin ve mağazanın ikas eşleşmesini yapın.')
    }
    // CANLI ŞEMA: OrderRefundLineInput.price ZORUNLU (Float!). OrderRefundInput'ta paymentGatewayId YOK.
    const orderRefundLines = iade.map(x => ({
      orderLineItemId: x.k.ikas_kalem_id, quantity: x.miktar,
      price: Number(x.k.birim_fiyat) || 0, restockItems: !!restock,
    }))
    await graphql('mutation R($input: OrderRefundInput!){ refundOrderLine(input:$input){ id } }', {
      input: {
        orderId: sip.ikas_siparis_id, orderRefundLines,
        ...(stockLocationId ? { stockLocationId } : {}),
        refundShipping: !!refundShipping, sendNotificationToCustomer: !!bildir,
      },
    })
    const geriEkle = db.transaction(() => {
      if (restock && sip.stok_dusuldu) {
        const stokArt = db.prepare('UPDATE urun_stoklar SET miktar = miktar + ? WHERE urun_id = ? AND lokasyon_id = ?')
        for (const x of iade) if (x.k.urun_id && x.k.lokasyon_id) stokArt.run(x.miktar, x.k.urun_id, x.k.lokasyon_id)
      }
      // Tam iade → REFUNDED + stok kapat. Kısmi → PARTIALLY_REFUNDED (sonraki çekim teyit eder).
      db.prepare('UPDATE online_siparisler SET durum = ?, stok_dusuldu = ? WHERE id = ?')
        .run(tamIade ? 'REFUNDED' : 'PARTIALLY_REFUNDED', tamIade ? 0 : sip.stok_dusuldu, id)
    })
    geriEkle()
    return { ok: true, tamIade, iadeKalemSayisi: iade.length }
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
