// ikas senkron: lokasyon eşleştirme, stok gönderme (yerel→ikas) ve
// sipariş çekme (ikas→yerel). client.js token/GraphQL'i yönetir.
const { getDb } = require('../db/database')
const { _ayarlariGetir: ayarGetir } = require('../db/ikas-ayarlar')
const { graphql } = require('./client')
const { bildirimUret, mevcutTalepleriBildir } = require('./bildirim-uret')
const { asamalar, asamaYaz } = require('../db/talep-durumlari')
const { TALEP_SORGUSU, _talepPaketleri } = require('./talep-detay')
const { adresBirlestir } = require('./adres')
const { kalemIadeMiktari, iadeToplami, etiketKalemleri } = require('./iade-ozet')

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

// Kalem birim fiyatı — MÜŞTERİNİN ÖDEDİĞİ tutar, liste fiyatı DEĞİL.
//
// SIRA KRİTİK (2026-08-05'te canlı siparişte yakalandı): `price` ikas'ta LİSTE fiyatıdır
// (indirimsiz sellPrice), `finalPrice` ise gerçekte tahsil edilen tutardır. Eskiden sıra
// finalUnitPrice → price → finalPrice idi; `price` önce geldiği için indirimli siparişlerde
// liste fiyatı kaydediliyordu.
//
// Sipariş 8461469470'te ölçülen: price=2100, finalUnitPrice=null, finalPrice=1890.
// Müşteri 1890 ödedi, kayda 2100 yazıldı → kargo etiketine yanlış tutar basıldı.
//
// Bu hata iki yıl görünmedi çünkü katalogda hiç indirimli ürün yoktu (price === finalPrice).
// İlk indirim uygulandığı gün ilk siparişte ortaya çıktı.
//
// İade/iptal açısından da kritik: ikas'a gerçek fiyat gönderilmek zorunda, uyuşmazlıkta
// işlem REDDEDİLİR. Liste fiyatı gönderilseydi indirimli siparişler iade edilemezdi.
//
// İKİNCİ VAKA (2026-08-11, sipariş 3581484666): yukarıdaki düzeltme `finalPrice`i satır
// toplamı sanıp ADEDE BÖLÜYORDU. ikas'ta HER ÜÇ alan da BİRİM fiyattır — bölme YOK.
// Canlı ölçüm: quantity=2, price=3200, finalUnitPrice=null, finalPrice=3200,
// totalFinalPrice=6400. Bölme yüzünden 1600 kaydedildi, kargo etiketine 3200 basıldı.
// (8461469470'te quantity=1 olduğu için bölme görünmemişti.)
function birimFiyatHesapla(kalem) {
  // Üçü de BİRİM fiyat: finalUnitPrice (en kesin) → finalPrice (ödenen) → price (liste).
  if (kalem?.finalUnitPrice != null) return Number(kalem.finalUnitPrice) || 0
  if (kalem?.finalPrice != null) return Number(kalem.finalPrice) || 0
  if (kalem?.price != null) return Number(kalem.price) || 0 // son çare: liste fiyatı
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
      shippingAddress { city { name } district { name } addressLine1 addressLine2 postalCode phone }
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

  const adres = adresBirlestir(shipping)
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

  // Özellik öncesi oluşmuş, hâlâ BEKLEYEN talepleri bir kez bildirime dönüştür
  // (artımlı çekim onları yeniden getirmez). İlk kurulumda anlamsız — atlanır.
  if (!ilkKurulum) mevcutTalepleriBildir(db)

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
  const kalemFiyatsizVar = db.prepare('SELECT 1 FROM online_siparis_kalemleri WHERE siparis_id = ? AND (birim_fiyat IS NULL OR birim_fiyat = 0) LIMIT 1')
  const kalemSil = db.prepare('DELETE FROM online_siparis_kalemleri WHERE siparis_id = ?')
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

        // Bildirim merkezi: iptal/iade talebi vb. durumları yakala (ilk kurulumda üretmez;
        // dedup_anahtar UNIQUE olduğu için aynı olay tekrar bildirilmez).
        bildirimUret(db, sip, ilkKurulum)

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
          // FİYAT BACKFILL: eski senkronlarda birim_fiyat kaydedilmiyordu (raporda ciro=0).
          // Kalemlerinde fiyat 0 kalan mevcut sipariş yeniden gelince kalemleri ikas
          // fiyatlarıyla TAZELE — stok DÜŞÜLMEZ (yalnız birim_fiyat/ad/ürün eşleşmesi).
          const fiyatEksik = kalemFiyatsizVar.get(mevcut.id)
          if (fiyatEksik && (sip.orderLineItems || []).length) {
            kalemSil.run(mevcut.id)
            for (const kalem of sip.orderLineItems) {
              const vId = kalem?.variant?.id || null
              const urun = vId ? varyantUrun.get(vId) : null
              const lokId = lokHaritasi[kalem?.stockLocationId] || null
              kalemEkle.run(mevcut.id, urun?.id || null, kalem?.id || null, vId, kalem?.variant?.name || null,
                Number(kalem?.quantity) || 0, birimFiyatHesapla(kalem), lokId, kalem?.stockLocationId || null)
            }
            guncellenen++
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
          teslimat_adres: adresBirlestir(sip.shippingAddress),
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
  const adresOnarilan = await adresGeriTarama(db)
  const fiyatOnarilan = await kalemFiyatGeriTarama(db)
  return { ilkKurulum, kaydedilen, guncellenen, stokDusulen, eslesmeyen, adresOnarilan, fiyatOnarilan }
}

// TEK SEFERLİK: birimFiyatHesapla iki kez yanlış çalıştı (bkz. fonksiyon üstündeki notlar):
// önce indirimli siparişlerde LİSTE fiyatı, sonra çok adetli siparişlerde ADEDE BÖLÜNMÜŞ
// fiyat kaydedildi. Kayıtlı birim fiyatlar ikas'taki gerçek değerle yeniden hizalanır.
// Yalnızca birim_fiyat yazar: sipariş/kalem EKLEMEZ, stok/durum'a DOKUNMAZ.
const KALEM_FIYAT_TARAMA_SORGU = `query FiyatTara($page: Int, $limit: Int) {
  listOrder(sort: "orderedAt asc", pagination: { page: $page, limit: $limit }) {
    hasNext
    data { id orderLineItems { id quantity finalUnitPrice finalPrice price } }
  }
}`

async function kalemFiyatGeriTarama(db) {
  const ONARIM_ADI = 'kalem_birim_fiyat_2026_08'
  try {
    db.exec('CREATE TABLE IF NOT EXISTS yerel_onarimlar (ad TEXT PRIMARY KEY, tarih TEXT)')
    if (db.prepare('SELECT 1 FROM yerel_onarimlar WHERE ad = ?').get(ONARIM_ADI)) return 0

    // ikas_kalem_id doğal anahtar; yoksa hangi satır olduğu belirsiz → dokunulmaz.
    const kalemGetir = db.prepare('SELECT id, birim_fiyat FROM online_siparis_kalemleri WHERE ikas_kalem_id = ?')
    const kalemGuncelle = db.prepare('UPDATE online_siparis_kalemleri SET birim_fiyat = ? WHERE id = ?')

    let onarilan = 0
    for (let page = 1; ; page++) {
      const data = await graphql(KALEM_FIYAT_TARAMA_SORGU, { page, limit: SIPARIS_LIMIT })
      const liste = data?.listOrder
      const siparisler = liste?.data || []
      if (!siparisler.length) break

      db.transaction(() => {
        for (const sip of siparisler) {
          for (const kalem of (sip.orderLineItems || [])) {
            if (!kalem?.id) continue
            const dogru = birimFiyatHesapla(kalem)
            if (!dogru) continue // fiyatsız kalemi 0'a çekme
            const mevcut = kalemGetir.get(kalem.id)
            if (!mevcut || Math.abs(Number(mevcut.birim_fiyat) - dogru) < 0.01) continue
            kalemGuncelle.run(dogru, mevcut.id)
            onarilan++
          }
        }
      })()

      if (!liste.hasNext) break
    }

    db.prepare("INSERT INTO yerel_onarimlar (ad, tarih) VALUES (?, datetime('now','localtime'))").run(ONARIM_ADI)
    console.log(`ikas kalem fiyat geri taraması: ${onarilan} kalem onarıldı`)
    return onarilan
  } catch (e) {
    // Onarım işareti YAZILMAZ → bir sonraki senkronda yeniden denenir.
    console.error('ikas kalem fiyat geri taraması:', e.message)
    return 0
  }
}

// TEK SEFERLİK: 2026-08 öncesi çekilen siparişlerde adres satırı 2 (daire/blok/kat)
// hiç istenmediği için kayıptı → kargo etiketine eksik adres basılıyordu. Yalnızca
// adres alanlarını tazeler: sipariş EKLEMEZ, stok/durum/kalem'e DOKUNMAZ.
// yerel_onarimlar kullanılır (uygulama_ayarlar PC'ler arası senkronlanır; işaret
// yayılsaydı diğer PC kendi yerel verisini hiç onaramazdı).
const ADRES_TARAMA_SORGU = `query AdresTara($page: Int, $limit: Int) {
  listOrder(sort: "orderedAt asc", pagination: { page: $page, limit: $limit }) {
    hasNext
    data { id shippingAddress { addressLine1 addressLine2 } }
  }
}`

async function adresGeriTarama(db) {
  const ONARIM_ADI = 'teslimat_adres2_2026_08'
  try {
    db.exec('CREATE TABLE IF NOT EXISTS yerel_onarimlar (ad TEXT PRIMARY KEY, tarih TEXT)')
    if (db.prepare('SELECT 1 FROM yerel_onarimlar WHERE ad = ?').get(ONARIM_ADI)) return 0

    const sipGetir = db.prepare('SELECT id, musteri_id, teslimat_adres FROM online_siparisler WHERE ikas_siparis_id = ?')
    const sipGuncelle = db.prepare('UPDATE online_siparisler SET teslimat_adres = ? WHERE id = ?')
    // Müşteri kartındaki adres YALNIZCA eski (eksik) değerle birebir aynıysa güncellenir;
    // farklıysa elle düzenlenmiş demektir, ezilmez.
    const musteriGuncelle = db.prepare('UPDATE musteriler SET adres = ? WHERE id = ? AND adres = ?')

    let onarilan = 0
    for (let page = 1; ; page++) {
      const data = await graphql(ADRES_TARAMA_SORGU, { page, limit: SIPARIS_LIMIT })
      const liste = data?.listOrder
      const siparisler = liste?.data || []
      if (!siparisler.length) break

      db.transaction(() => {
        for (const sip of siparisler) {
          const tam = adresBirlestir(sip.shippingAddress)
          if (!tam) continue
          const mevcut = sipGetir.get(sip.id)
          if (!mevcut || mevcut.teslimat_adres === tam) continue
          sipGuncelle.run(tam, mevcut.id)
          if (mevcut.musteri_id && mevcut.teslimat_adres) {
            musteriGuncelle.run(tam, mevcut.musteri_id, mevcut.teslimat_adres)
          }
          onarilan++
        }
      })()

      if (!liste.hasNext) break
    }

    db.prepare("INSERT INTO yerel_onarimlar (ad, tarih) VALUES (?, datetime('now','localtime'))").run(ONARIM_ADI)
    console.log(`ikas adres geri taraması: ${onarilan} sipariş onarıldı`)
    return onarilan
  } catch (e) {
    // Onarım işareti YAZILMAZ → bir sonraki senkronda yeniden denenir.
    console.error('ikas adres geri taraması:', e.message)
    return 0
  }
}

// Tek bir siparişin kalemlerini ikas'tan yeniden çeker ve yerel kalemleri
// yeniden kurar (özellikle eski siparişlerde eksik olan ikas_kalem_id'yi doldurur).
// Manuel atanmış lokasyon_id korunur (varyant bazında).
const TEK_SIPARIS_SORGU = `query Tek($f: StringFilterInput) {
  listOrder(id: $f, pagination: { page: 1, limit: 1 }) {
    data { id status orderPaymentStatus orderPackageStatus
      orderPackages { trackingInfo { trackingNumber cargoCompany trackingLink barcode } }
      orderLineItems { id quantity status finalUnitPrice finalPrice price stockLocationId variant { id name } } }
  }
}`

// Siparişin başarılı iade tutarı (PayTR FAILED denemeleri sayılmaz — bkz. iade-ozet.js).
// ikas'ı boş yere yormamak için YALNIZ durumu iade/iptal içeren siparişlerde çağrılır.
const IADE_IZI = ['REFUND', 'CANCEL']
async function iadeTutariGetir(ikasSiparisId, ...durumlar) {
  if (!durumlar.some(d => d && IADE_IZI.some(x => String(d).includes(x)))) return 0
  try {
    const d = await graphql(
      `query($o:String!){ listOrderTransactions(orderId:$o, includeAll:true){ amount type status } }`,
      { o: ikasSiparisId })
    return iadeToplami(d?.listOrderTransactions || [])
  } catch { return 0 }   // iade özeti kritik değil; senkronu düşürmesin
}

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
    (siparis_id, urun_id, ikas_kalem_id, ikas_varyant_id, urun_adi, miktar, birim_fiyat, lokasyon_id, ikas_lokasyon_id,
     iade_miktar, ikas_kalem_durum)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)

  // Sipariş durumu ikas'ta değişmiş olabilir (örn. iptal/iade) → tazele.
  const mevcut = db.prepare('SELECT durum, odeme_durumu, kargo_durumu, stok_dusuldu FROM online_siparisler WHERE id = ?').get(siparisId)
  const yeniDurum = o.status || mevcut?.durum
  const yeniOdeme = o.orderPaymentStatus || mevcut?.odeme_durumu
  const yeniKargo = o.orderPackageStatus || mevcut?.kargo_durumu
  const iadeOldu = (yeniDurum === IPTAL_DURUMU || yeniDurum === 'REFUNDED') && mevcut?.stok_dusuldu
  // Gerçekten geri ödenen para (ağ çağrısı — transaction DIŞINDA yapılmalı).
  const iadeTutari = await iadeTutariGetir(sip.ikas_siparis_id, yeniDurum, yeniKargo)

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

    db.prepare('UPDATE online_siparisler SET iade_tutari = ? WHERE id = ?').run(iadeTutari, siparisId)

    db.prepare('DELETE FROM online_siparis_kalemleri WHERE siparis_id = ?').run(siparisId)
    for (const kalem of (o.orderLineItems || [])) {
      const vId = kalem?.variant?.id || null
      const urun = vId ? varyantUrun.get(vId) : null
      const lokId = (vId && oncekiLok[vId]) || lokHaritasi[kalem?.stockLocationId] || null
      kalemEkle.run(siparisId, urun?.id || null, kalem?.id || null, vId, kalem?.variant?.name || null,
        Number(kalem?.quantity) || 0, birimFiyatHesapla(kalem), lokId, kalem?.stockLocationId || null,
        kalemIadeMiktari(kalem), kalem?.status || null)
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

// Web sitesi (storefront) ürün linki: https://tencerecim.store/<slug>.
// Ara ek YOK — ikas storefront ürünü kökten servis ediyor (canlı doğrulandı).
// Domain sabit çünkü tek mağazamız var; ikas Admin API storefront domain'ini
// (listStorefront.routings.domain) NULL döndürüyor, yani oradan okunamıyor.
const WEB_SITESI = 'https://tencerecim.store'

/**
 * ikas'taki tüm ürünlerin metaData.slug'ını çekip yerel urunler.web_link'e yazar.
 * Eşleştirme SKU ile: uygulamadaki 2823 aktif ürünün tamamında SKU var ama yalnız 58'inde
 * ikas_urun_id dolu — ikas_urun_id'ye bağlanmak ürünlerin neredeyse tamamını linksiz bırakırdı.
 * Ad eşleştirmesi bilinçli olarak KULLANILMAZ (kulp/varyant farkları yanlış link üretir).
 * @returns {{yazilan: number, ikasToplam: number, ikasSku: number, eslesen: number,
 *            sitedeYokSayi: number, slugsuz: Array<string>, skusuz: Array<string>}}
 */
async function webLinkleriCek() {
  const db = getDb()
  const slugBySku = new Map()
  const slugsuz = []   // ikas'ta sayfa adresi (slug) tanımsız ürünler
  const skusuz = []    // ikas'ta hiçbir varyantında stok kodu olmayan ürünler — eşleşemezler
  let ikasToplam = 0
  for (let page = 1; page <= 100; page++) {
    const r = await graphql(
      `query P($page:Int!){ listProduct(pagination:{page:$page,limit:100}) {
        count data { name metaData { slug } variants { sku } } } }`,
      { page },
    )
    const veri = r?.listProduct?.data || []
    ikasToplam = r?.listProduct?.count ?? ikasToplam
    if (!veri.length) break
    for (const u of veri) {
      const slug = u?.metaData?.slug
      if (!slug) { slugsuz.push(u.name); continue }
      const skular = (u.variants || []).map(v => v.sku).filter(Boolean)
      if (!skular.length) { skusuz.push(u.name); continue }
      for (const sku of skular) slugBySku.set(String(sku).trim(), slug)
    }
    if (veri.length < 100) break
  }

  const yerel = db.prepare("SELECT id, sku, ad, web_link FROM urunler WHERE aktif=1 AND sku IS NOT NULL AND sku != ''").all()
  const yaz = db.prepare('UPDATE urunler SET web_link = ? WHERE id = ?')
  // "Eşleşmeyen" ürünlerin ÇOĞU hata değil: katalogda 2800+ ürün var, sitede yalnız ~400'ü
  // satılıyor. Bu yüzden sayı ayrı raporlanır ama uyarı diliyle sunulmaz; asıl uyarı,
  // ikas'ta OLUP stok kodu/slug'ı eksik olan ürünlerdir (skusuz/slugsuz) — onlar düzeltilebilir.
  const sitedeYok = []
  let yazilan = 0
  const tx = db.transaction(() => {
    for (const u of yerel) {
      const slug = slugBySku.get(String(u.sku).trim())
      if (!slug) { sitedeYok.push(`${u.sku} — ${u.ad}`); continue }
      const link = `${WEB_SITESI}/${slug}`
      if (u.web_link === link) continue // değişmediyse yazma (senkron kuyruğunu şişirmesin)
      yaz.run(link, u.id)
      yazilan++
    }
  })
  tx()
  return { yazilan, ikasToplam, ikasSku: slugBySku.size, eslesen: yerel.length - sitedeYok.length,
    sitedeYokSayi: sitedeYok.length, slugsuz, skusuz }
}

// --- IPC handler'ları -------------------------------------------------------

module.exports = {
  _webLinkleriCek: webLinkleriCek,
  _WEB_SITESI: WEB_SITESI,

  // Ürünlerin web sitesi linklerini ikas'tan toplu doldurur. Eşleşmeyenleri SESSİZCE
  // geçmez — arayüz listeyi gösterir, hangi ürünün linksiz kaldığı görünür olsun.
  'ikas:web-link-cek': async () => {
    require('../yetki')._yetkiKontrol('urun_duzenle')
    return webLinkleriCek()
  },

  // Kalem fiyat seçimi — sırası indirimli siparişlerde kritik, testle sabitlendi.
  _birimFiyatHesapla: birimFiyatHesapla,
  // satislar.js / stok.js arka plan push için kullanır (main.js _ önekini atlar).
  _pushArkaPlan: pushArkaPlan,
  _pullSiparisler: pullSiparisler,
  // Arka plan kargo bildirimi (ikas/kargo-durum.js) kalem ID'lerini tazelemek için kullanır.
  _tazeleSiparisKalemleri: tazeleSiparisKalemleri,

  // Kargo etiketi için sipariş verisini derler: yerel alanlar + ikas zenginleştirme
  // (satış kanalı adı, kargo kuralı/ücreti, ürün görselleri). ikas erişilemezse
  // yerel veriyle (görselsiz) devam eder — hata fırlatmaz.
  'kargo-etiket:veri': async (id) => {
    const db = getDb()
    const s = db.prepare('SELECT * FROM online_siparisler WHERE id = ?').get(id)
    if (!s) throw new Error('Sipariş bulunamadı')
    // İade edilen ürün etikete YAZILMAZ (kullanıcı kararı 2026-08-21): etiketin işi
    // kutuya ne konacağını söylemek. Kısmen iade edilen kalemde kalan adet yazılır.
    const kalemler = etiketKalemleri(db.prepare(`
      SELECT k.*, u.sku AS urun_sku, u.marka AS urun_marka, u.kdv_orani AS urun_kdv
      FROM online_siparis_kalemleri k
      LEFT JOIN urunler u ON k.urun_id = u.id
      WHERE k.siparis_id = ?`).all(id))
    const takip = db.prepare(
      `SELECT takip_no, barkod_png FROM kargolar
       WHERE online_siparis_id = ? OR (ikas_siparis_id IS NOT NULL AND ikas_siparis_id = ?)
       ORDER BY id DESC LIMIT 1`
    ).get(id, s.ikas_siparis_id)
    // barkod_png: koli başına bir base64 PNG içeren JSON dizisi.
    let barkodlar = []
    if (takip?.barkod_png) {
      try { barkodlar = JSON.parse(takip.barkod_png) } catch { barkodlar = [] }
      if (!Array.isArray(barkodlar)) barkodlar = []
    }
    const gon = db.prepare('SELECT ad, yetkili, telefon, cep FROM lokasyon_gonderici WHERE ad IS NOT NULL LIMIT 1').get()
    // Gönderen telefonu: mağaza gönderici kaydından; yoksa UPS ayarlarındaki genel gönderici.
    const upsTel = db.prepare(
      "SELECT anahtar, deger FROM ups_ayarlar WHERE anahtar IN ('gonderici_telefon','gonderici_cep')"
    ).all().reduce((h, r) => { h[r.anahtar] = r.deger; return h }, {})

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
      barkodlar,
      satisKanali,
      kargoKurali,
      kargoUcreti,
      gonderen: (gon?.ad || a.store_name || 'Tencerecim'),
      gonderen_telefon: gon?.cep || gon?.telefon || upsTel.gonderici_cep || upsTel.gonderici_telefon || null,
      kalemler: kalemler.map(k => ({
        ad: k.urun_adi || '',
        marka: k.urun_marka || '',
        sku: k.urun_sku || '',
        miktar: k.miktar || 1,
        birim_fiyat: k.birim_fiyat || 0,
        kdv: k.urun_kdv != null ? k.urun_kdv : 20,
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
    // gonderildi_tarihi BURADA DAMGALANMAZ (eski hata): etiket oluşturmak "UPS'e verildi"
    // demek değildir — 20 gönderinin 15'i hiç UPS'e verilmeden ikas'tan çıkmıştı. Damgayı
    // yalnız UPS takip yoklayıcısı (ups/takip.js), koli gerçekten ağa girince basar;
    // müşteri "kargoya verildi" bildirimi de o teyitle gider (ikas/kargo-durum.js).
    db.prepare("UPDATE online_siparisler SET kargo_takip_no = ?, kargo_firma = ?, kargo_durumu = CASE WHEN kargo_durumu IS NULL THEN 'READY_FOR_SHIPMENT' ELSE kargo_durumu END WHERE id = ?")
      .run(String(takipNo), kargoFirma || 'UPS', id)
    return { ok: true }
  },

  // Siparişin tüm kalemlerini ikas'ta iptal eder (isteğe bağlı stok iadesi).
  // Bekleyen ödemeyi (havale/EFT, kapıda ödeme) ONAYLAR → ikas'ta ödeme durumu PAID olur.
  // approvePendingOrderTransactions(orderId, paymentMethods:[PaymentMethodTypeEnum]) → Boolean.
  // paymentMethods: siparişin gerçek ödeme yöntemi tip(ler)i ikas'tan tazelenip verilir.
  'ikas:siparis-odeme-onayla': async ({ id }) => {
    const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
    const db = getDb()
    const sip = db.prepare('SELECT * FROM online_siparisler WHERE id = ?').get(id)
    if (!sip) throw new Error('Sipariş bulunamadı')
    if (!sip.ikas_siparis_id) throw new Error('ikas sipariş kimliği yok')
    // Ödeme yöntemi tip(ler)ini ikas'tan güncel al (yereldeki metin görüntüleme amaçlı olabilir).
    const veri = await graphql(
      `query($f: StringFilterInput){ listOrder(id: $f, pagination:{page:1,limit:1}){ data { id orderPaymentStatus paymentMethods { type } } } }`,
      { f: { eq: sip.ikas_siparis_id } })
    const o = veri?.listOrder?.data?.[0]
    if (!o) throw new Error('Sipariş ikas\'ta bulunamadı')
    if (o.orderPaymentStatus === 'PAID') { db.prepare("UPDATE online_siparisler SET odeme_durumu = 'PAID' WHERE id = ?").run(id); return { ok: true, zatenOdenmis: true } }
    const yontemler = [...new Set((o.paymentMethods || []).map(p => p.type).filter(Boolean))]
    if (!yontemler.length) throw new Error('Ödeme yöntemi belirlenemedi')
    const sonuc = await graphql(
      `mutation A($input: ApproveOrderTransactionsInput!){ approvePendingOrderTransactions(input: $input) }`,
      { input: { orderId: sip.ikas_siparis_id, paymentMethods: yontemler } })
    if (sonuc?.approvePendingOrderTransactions !== true) throw new Error('ikas ödeme onayını kabul etmedi')
    db.prepare("UPDATE online_siparisler SET odeme_durumu = 'PAID' WHERE id = ?").run(id)
    return { ok: true }
  },

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

    // ikas iade için stok lokasyonu ister (para iadesi orderRefundTransactions dahil ZORUNLU
    // tutuyor — restock false olsa bile). İlk seçili kalemin ikas lokasyonu.
    const stockLocationId = iade.map(x => kalemIkasLokId(db, x.k)).find(Boolean) || null
    if (!stockLocationId) {
      throw new Error('İade için stok lokasyonu belirlenemedi. Kalemlerin çıkış mağazasını seçin ve mağazanın ikas eşleşmesini yapın.')
    }
    // CANLI ŞEMA: OrderRefundLineInput.price ZORUNLU (Float!). OrderRefundInput'ta paymentGatewayId YOK.
    const orderRefundLines = iade.map(x => ({
      orderLineItemId: x.k.ikas_kalem_id, quantity: x.miktar,
      price: Number(x.k.birim_fiyat) || 0, restockItems: !!restock,
    }))
    // PARA İADESİ: orderRefundLines yalnızca kalemleri iade eder (sipariş REFUNDED olur) ama
    // parayı GERİ ÖDEMEZ → ödeme durumu OVER_PAID'de kalır. Gerçek tahsilat iadesi için
    // orderRefundTransactions ŞART ve her biri transactionId ister (String!). Bu yüzden önce
    // siparişin SALE (tahsilat) işlemlerini çekip iade tutarını onlara dağıtırız.
    // refundToStoreCredit:false → müşterinin ödediği yönteme (kart/havale) geri döner.
    const kalemToplam = orderRefundLines.reduce((s, l) => s + (Number(l.price) || 0) * (Number(l.quantity) || 0), 0)
    const iadeTutari = Math.round((kalemToplam + (refundShipping ? (Number(sip.kargo_tutari) || 0) : 0)) * 100) / 100
    let orderRefundTransactions = []
    if (iadeTutari > 0) {
      const txVeri = await graphql(
        `query($o:String!){ listOrderTransactions(orderId:$o, includeAll:true){ id amount type status } }`,
        { o: sip.ikas_siparis_id })
      const txlar = txVeri?.listOrderTransactions || []
      const satislar = txlar.filter(t => t.type === 'SALE' && t.status === 'SUCCESS')
      const zatenIade = txlar.filter(t => t.type === 'REFUND' && t.status === 'SUCCESS')
        .reduce((s, t) => s + (Number(t.amount) || 0), 0)
      const tahsilat = satislar.reduce((s, t) => s + (Number(t.amount) || 0), 0)
      // İade edilebilir tavan: tahsil edilen − daha önce iade edilen. İade tutarını aşma.
      let kalan = Math.min(iadeTutari, Math.round((tahsilat - zatenIade) * 100) / 100)

      // BİLİNEN SINIR: bu dağıtım TOPLAM tavanı korur ama tek bir SALE işlemine, o işlemin
      // KALAN kapasitesinden fazlasını atayabilir. Sebep: ikas API'si REFUND'u hangi SALE'e
      // ait olduğunu söylemiyor — PublicTransaction tipinde ilişki alanı YOK (2026-07-18'de
      // şema introspection ile doğrulandı: relatedTransactionId/parentTransactionId/... hiçbiri
      // mevcut değil). Yani işlem-bazlı kalan hesaplanamıyor.
      // Pratikte ölçüldü: son 25 siparişin 25'i TEK SALE → senaryo gerçekleşmiyor.
      // Yine de çok-SALE + önceden iade durumunda sessiz başarısızlık olmasın diye uyarıyoruz.
      if (satislar.length > 1 && zatenIade > 0) {
        console.warn('[ikas] Kısmi iade uyarısı: sipariş', sip.siparis_no,
          '— birden fazla ödeme işlemi (' + satislar.length + ') ve önceden yapılmış iade var.',
          'İade tutarı işlemlere sırayla dağıtılıyor; ikas "amount exceeds transaction" hatası',
          'verirse iadeyi ikas panelinden manuel yapmak gerekir.')
      }

      for (const t of satislar) {
        if (kalan <= 0.001) break
        const pay = Math.round(Math.min(kalan, Number(t.amount) || 0) * 100) / 100
        if (pay > 0) { orderRefundTransactions.push({ transactionId: t.id, amount: pay, refundToStoreCredit: false }); kalan -= pay }
      }
    }
    try {
      await graphql('mutation R($input: OrderRefundInput!){ refundOrderLine(input:$input){ id } }', {
        input: {
          orderId: sip.ikas_siparis_id, orderRefundLines,
          ...(orderRefundTransactions.length ? { orderRefundTransactions } : {}),
          ...(stockLocationId ? { stockLocationId } : {}),
          refundShipping: !!refundShipping, sendNotificationToCustomer: !!bildir,
        },
      })
    } catch (e) {
      // Ham API hatası kullanıcıya anlamsız gelir; en olası sebebi açıkça söyle.
      // (Stok geri ekleme AŞAĞIDA — buraya düşersek yerel veriye HİÇ dokunulmamış olur.)
      const m = String(e?.message || '')
      if (/exceed|amount|transaction/i.test(m)) {
        throw new Error('ikas iadeyi reddetti (tutar/işlem uyuşmazlığı): ' + m +
          '\n\nBu siparişte birden fazla ödeme işlemi varsa iadeyi ikas panelinden manuel yapın.')
      }
      throw e
    }
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

  // Talebin İÇERİĞİ: müşteri hangi ürünleri talep etti. Paket bazlı — bkz. talep-detay.js.
  'ikas:talep-detay': async ({ id }) => {
    const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
    const db = getDb()
    const sip = db.prepare('SELECT * FROM online_siparisler WHERE id = ?').get(id)
    if (!sip) throw new Error('Sipariş bulunamadı')
    if (!sip.ikas_siparis_id) throw new Error('ikas sipariş kimliği yok')
    const veri = await graphql(TALEP_SORGUSU, { f: { eq: sip.ikas_siparis_id } })
    const o = veri?.listOrder?.data?.[0]
    if (!o) throw new Error('Sipariş ikas\'ta bulunamadı')
    const detay = _talepPaketleri(o)
    return { ...detay, asama: asamalar(db)[sip.ikas_siparis_id] || null }
  },

  // Onay: ikas'a HİÇBİR ŞEY yazılmaz (API'de karşılığı yok), para/stok değişmez.
  // Yalnız "onaylandı, ürün bekleniyor" işareti — çok-PC senkronla paylaşılır.
  'ikas:talep-onayla': async ({ id, kullanici = null }) => {
    const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
    const db = getDb()
    const sip = db.prepare('SELECT ikas_siparis_id FROM online_siparisler WHERE id = ?').get(id)
    if (!sip?.ikas_siparis_id) throw new Error('ikas sipariş kimliği yok')
    return asamaYaz(db, { ikasSiparisId: sip.ikas_siparis_id, asama: 'onaylandi', kullanici })
  },

  // Kapatma: ikas'ta talep REFUND_REQUESTED olarak KALIR (reddetme mutation'ı yok).
  // Bu yüzden eleme yerelden yapılır; aksi halde her senkron talebi geri diriltirdi.
  'ikas:talep-kapat': async ({ id, not, kullanici = null }) => {
    const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
    const db = getDb()
    const sip = db.prepare('SELECT ikas_siparis_id FROM online_siparisler WHERE id = ?').get(id)
    if (!sip?.ikas_siparis_id) throw new Error('ikas sipariş kimliği yok')
    return asamaYaz(db, { ikasSiparisId: sip.ikas_siparis_id, asama: 'kapatildi', notMetni: not, kullanici })
  },

  // Liste ekranı için toplu okuma: sipariş başına sorgu N+1 olurdu.
  'ikas:talep-asamalari': async () => {
    const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
    return asamalar(getDb())
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
        .run(adresBirlestir(shippingAddress), shippingAddress.city?.name || null, shippingAddress.district?.name || null, shippingAddress.phone || null, id)
    }
    return { ok: true }
  },
}
