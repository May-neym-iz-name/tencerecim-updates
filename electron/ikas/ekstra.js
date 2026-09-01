// ikas ek yetenekleri (index.js'i şişirmemek için ayrı modül):
//  #1 fiyat senkronu  → saveVariantPrices (yerel fiyat → ikas)
//  #3 müşteri çekme    → listCustomer (orderCount/totalOrderPrice ... yerel müşteriye işle)
//  #4 ürün eşleştirme  → listProduct (SKU/barkod ile ikas_urun_id/ikas_varyant_id doldur)
//  #6 paket durumu     → updateOrderPackageStatus / cancelFulfillment
// client.js token/GraphQL'i yönetir.
const { getDb } = require('../db/database')
const { setVaryantEslestir } = require('./set-varyant')
const { _ayarlariGetir: ayarGetir } = require('../db/ikas-ayarlar')
const { graphql } = require('./client')

const SAYFA_LIMIT = 200 // ikas tavanı
const FIYAT_PARTI = 50

function ayarKaydet(anahtar, deger) {
  getDb().prepare(
    'INSERT INTO ikas_ayarlar (anahtar, deger) VALUES (?, ?) ' +
    'ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger'
  ).run(anahtar, deger == null ? '' : String(deger))
}

// Telefonu son 10 haneye indirger (eşleştirme için; +90/0 ön ekleri elenir).
function telSon10(tel) {
  const d = String(tel || '').replace(/\D/g, '')
  return d.length >= 10 ? d.slice(-10) : (d || null)
}

// =====================================================================
// #1 FİYAT SENKRONU — saveVariantPrices
// =====================================================================

// Varsayılan fiyat listesi id'sini bulur (cache'lenir). saveVariantPrices
// priceListId ister; mağazanın varsayılan (ilk) fiyat listesi kullanılır.
async function varsayilanFiyatListesiId() {
  const kayitli = ayarGetir().fiyat_listesi_id
  if (kayitli) return kayitli
  const data = await graphql('{ listPriceList { id name } }')
  const liste = data?.listPriceList || []
  if (!liste.length) throw new Error('ikas fiyat listesi bulunamadı.')
  const id = liste[0].id
  ayarKaydet('fiyat_listesi_id', id)
  return id
}

// SATIŞ FİYATI SIFIR SÜZGECİ — saf karar, G/Ç yok (bu yüzden mocksuz test edilir).
//
// saveVariantPrices sellPrice'ı olduğu gibi yazar. Yerelde satış fiyatı
// girilmemiş bir ürünü göndermek ikas'taki CANLI satış fiyatını 0'a düşürür,
// yani ürün mağazada bedavaya düşer. Alış fiyatı çalışmasında (2026-08)
// fiyat yazılan 205 ürünün 64'ünde yerel satış fiyatı boştu.
function fiyatSuz(satirlar) {
  const gonderilecek = [], atlanan = []
  for (const s of satirlar) {
    if (Number(s.sellPrice) > 0) gonderilecek.push(s)
    else atlanan.push({ id: s.id, sku: s.sku, ad: s.ad })
  }
  return { gonderilecek, atlanan }
}

// Verilen ürün id'lerinin (boşsa tüm eşleşmiş ürünlerin) yerel fiyatlarını
// ikas'a yazar. sellPrice = satis_fiyati, buyPrice = alis_fiyati.
//
// SATIŞ FİYATI 0 OLAN ÜRÜN GÖNDERİLMEZ. saveVariantPrices sellPrice'ı olduğu
// gibi yazar; yerelde satış fiyatı girilmemiş bir ürünü göndermek ikas'taki
// CANLI satış fiyatını 0'a düşürür. Alış fiyatı çalışmasında 64 ürünün yerel
// satış fiyatı boştu — koruma olmasa bu ürünler mağazada bedavaya düşerdi.
// Atlananlar `atlanan` ile raporlanır ki sessizce kaybolmasınlar.
async function pushUrunFiyat(urunIdler) {
  const db = getDb()
  let where = 'WHERE u.aktif = 1 AND u.ikas_urun_id IS NOT NULL AND u.ikas_varyant_id IS NOT NULL'
  const params = []
  if (Array.isArray(urunIdler) && urunIdler.length) {
    where += ` AND u.id IN (${urunIdler.map(() => '?').join(',')})`
    params.push(...urunIdler)
  }
  const hepsi = db.prepare(`
    SELECT u.id, u.sku, u.ad,
           u.ikas_urun_id AS productId, u.ikas_varyant_id AS variantId,
           u.satis_fiyati AS sellPrice, u.alis_fiyati AS buyPrice
    FROM urunler u ${where}
  `).all(...params)
  const { gonderilecek: satirlar, atlanan } = fiyatSuz(hepsi)
  if (!satirlar.length) return { gonderilen: 0, atlanan }

  const priceListId = await varsayilanFiyatListesiId()
  const mutation = `mutation Fiyat($input: SaveVariantPricesInput!) {
    saveVariantPrices(input: $input)
  }`
  let gonderilen = 0
  for (let i = 0; i < satirlar.length; i += FIYAT_PARTI) {
    // ŞEMA: VariantPriceInput { productId!, variantId!, price: ProductPriceInput! }
    // ProductPriceInput { sellPrice!, buyPrice, discountPrice, currency }.
    // sellPrice/buyPrice DÜZ alan olarak gönderilirse ikas isteği tümden
    // reddeder — bu uç uzun süre böyle yazılmış ve hiç çalışmamıştı
    // (31.08.2026'da introspection ile doğrulandı; docs/ikas-api-reference.md
    // de yanlış yazıyordu).
    const variantPriceInputs = satirlar.slice(i, i + FIYAT_PARTI).map(s => ({
      productId: s.productId,
      variantId: s.variantId,
      price: { sellPrice: Number(s.sellPrice) || 0, buyPrice: Number(s.buyPrice) || 0 },
    }))
    await graphql(mutation, { input: { priceListId, variantPriceInputs } })
    gonderilen += variantPriceInputs.length
  }
  return { gonderilen, atlanan }
}

// ALIŞ FİYATI GÖNDERİMİ — ikas'taki satış fiyatına DOKUNMADAN buyPrice yazar.
//
// Neden ayrı uç: pushUrunFiyat sellPrice'ı da YEREL değerle üzerine yazar. Alış
// maliyetini taşımak isterken mağazadaki güncel satış fiyatlarının bayat yerel
// fiyatlarla ezilmesi kabul edilemez. Bu yüzden ikas'ın KENDİ sellPrice'ı
// okunup aynen geri gönderilir; değişen tek alan buyPrice olur.
//
// ikas'ta satış fiyatı okunamayan (0/boş) varyant ATLANIR — geri yazacak
// güvenli bir sellPrice olmadan gönderim fiyatı sıfırlardı.
const VARYANT_FIYAT_SORGU = `query VaryantFiyat($page: Int, $limit: Int) {
  listProduct(pagination: { page: $page, limit: $limit }) {
    count hasNext page limit
    data { id variants { id prices { sellPrice buyPrice discountPrice currency priceListId } } }
  }
}`

// ikas varyant id -> TEMEL fiyat kaydı (priceListId = null).
//
// Mağazada pazaryeri fiyat listeleri var (TRENDYOL, HEPSİBURADA). Alış maliyeti
// bir pazaryerine ait değil, ürünün KENDİ alanıdır; bu yüzden hedef, fiyat
// listesine bağlı olmayan temel kayıttır. (varsayilanFiyatListesiId() listenin
// İLKİNİ döndürür ve o "TRENDYOL FİYAT LİSTESİ" çıkıyor — maliyet oraya
// yazılırsa ürünün ana maliyet alanı boş kalır.)
//
// sellPrice dışındaki alanlar da saklanır: gönderimde geri yazılmazsa ikas
// bunları siler (emsal: saveProduct'ta variants.images gönderilmeyince
// görsellerin silinmesi). İndirimli fiyat ve para birimi böylece korunur.
async function ikasTemelFiyatlar() {
  const harita = new Map()
  let page = 1
  for (;;) {
    const data = await graphql(VARYANT_FIYAT_SORGU, { page, limit: SAYFA_LIMIT })
    const liste = data?.listProduct
    for (const p of (liste?.data || [])) {
      for (const v of (p.variants || [])) {
        const f = (v.prices || []).find(x => x.priceListId == null)
        if (f && Number(f.sellPrice) > 0) harita.set(v.id, f)
      }
    }
    if (!liste?.hasNext) break
    page++
  }
  return harita
}

async function pushAlisFiyati() {
  const db = getDb()
  const yerel = db.prepare(`
    SELECT u.id, u.sku, u.ad, u.ikas_urun_id AS productId, u.ikas_varyant_id AS variantId,
           u.alis_fiyati AS buyPrice
    FROM urunler u
    WHERE u.aktif = 1 AND u.alis_fiyati > 0
      AND u.ikas_urun_id IS NOT NULL AND u.ikas_varyant_id IS NOT NULL
  `).all()
  if (!yerel.length) return { gonderilen: 0, atlanan: [], eslesmeyen: 0 }

  const ikasFiyat = await ikasTemelFiyatlar()

  const gonderilecek = [], atlanan = []
  for (const u of yerel) {
    const f = ikasFiyat.get(u.variantId)
    if (!f || !(Number(f.sellPrice) > 0)) {
      atlanan.push({ id: u.id, sku: u.sku, ad: u.ad, sebep: 'ikas satış fiyatı okunamadı' }); continue
    }
    // ikas'ın kendi fiyat kaydı aynen geri yazılır; DEĞİŞEN TEK ALAN buyPrice.
    const price = { sellPrice: Number(f.sellPrice), buyPrice: Number(u.buyPrice) }
    if (f.discountPrice != null) price.discountPrice = Number(f.discountPrice)
    if (f.currency) price.currency = f.currency
    gonderilecek.push({ productId: u.productId, variantId: u.variantId, price })
  }
  if (!gonderilecek.length) return { gonderilen: 0, atlanan, eslesmeyen: 0 }

  const mutation = `mutation Fiyat($input: SaveVariantPricesInput!) { saveVariantPrices(input: $input) }`
  let gonderilen = 0
  for (let i = 0; i < gonderilecek.length; i += FIYAT_PARTI) {
    const variantPriceInputs = gonderilecek.slice(i, i + FIYAT_PARTI)
    // priceListId GÖNDERİLMEZ: hedef, pazaryeri listeleri değil temel fiyat kaydı.
    await graphql(mutation, { input: { variantPriceInputs } })
    gonderilen += variantPriceInputs.length
  }
  return { gonderilen, atlanan, aday: yerel.length }
}

// Fiyat değişince arka planda (await edilmeden) ikas'a gönderir.
function pushFiyatArkaPlan(urunIdler) {
  Promise.resolve()
    .then(() => {
      if (!ayarGetir().otomatik_senk) return
      return pushUrunFiyat(urunIdler)
    })
    .catch(err => console.error('[ikas] arka plan fiyat gönderimi başarısız:', err.message))
}

// =====================================================================
// #3 MÜŞTERİ ÇEKME — listCustomer
// =====================================================================

const MUSTERI_SORGU = `query Musteri($page: Int, $limit: Int) {
  listCustomer(pagination: { page: $page, limit: $limit }, sort: "updatedAt desc") {
    count hasNext page limit
    data {
      id firstName lastName email phone
      orderCount totalOrderPrice firstOrderDate lastOrderDate
    }
  }
}`

// ikas müşterilerini çeker; telefon/e-posta ile yerel müşteriye eşler. Eşleşeni
// günceller (istatistik + ikas_musteri_id), eşleşmeyeni (ad + iletişim varsa) ekler.
async function pullMusteriler() {
  const db = getDb()
  const bulEmail = db.prepare('SELECT id FROM musteriler WHERE email = ? COLLATE NOCASE')
  const bulIkasId = db.prepare('SELECT id FROM musteriler WHERE ikas_musteri_id = ?')
  // Telefon son-10 eşleşmesi için tüm telefonları belleğe al.
  const telHarita = new Map()
  for (const m of db.prepare('SELECT id, telefon FROM musteriler WHERE telefon IS NOT NULL').all()) {
    const k = telSon10(m.telefon)
    if (k && !telHarita.has(k)) telHarita.set(k, m.id)
  }
  const guncelle = db.prepare(`UPDATE musteriler SET
    ikas_musteri_id = ?, ikas_siparis_sayisi = ?, ikas_toplam_harcama = ?,
    ikas_ilk_siparis = ?, ikas_son_siparis = ?,
    email = COALESCE(NULLIF(email,''), ?) WHERE id = ?`)
  const ekle = db.prepare(`INSERT INTO musteriler
    (ad, soyad, telefon, email, ikas_musteri_id, ikas_siparis_sayisi, ikas_toplam_harcama, ikas_ilk_siparis, ikas_son_siparis)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)

  let page = 1, eslesen = 0, eklenen = 0, toplam = 0
  for (;;) {
    const data = await graphql(MUSTERI_SORGU, { page, limit: SAYFA_LIMIT })
    const liste = data?.listCustomer
    const musteriler = liste?.data || []
    if (!musteriler.length) break

    const tx = db.transaction(() => {
      for (const m of musteriler) {
        toplam++
        const email = (m.email || '').trim() || null
        const tel = (m.phone || '').trim() || null
        const telK = telSon10(tel)
        const ilk = m.firstOrderDate ? new Date(m.firstOrderDate).toISOString() : null
        const son = m.lastOrderDate ? new Date(m.lastOrderDate).toISOString() : null
        const sayi = Number(m.orderCount) || 0
        const harcama = Number(m.totalOrderPrice) || 0

        let mevcut = bulIkasId.get(m.id)
        if (!mevcut && email) mevcut = bulEmail.get(email)
        if (!mevcut && telK && telHarita.has(telK)) mevcut = { id: telHarita.get(telK) }

        if (mevcut) {
          guncelle.run(m.id, sayi, harcama, ilk, son, email, mevcut.id)
          eslesen++
        } else if (tel || email) {
          const r = ekle.run((m.firstName || 'Online').trim() || 'Online', (m.lastName || 'Müşteri').trim() || 'Müşteri',
            tel, email, m.id, sayi, harcama, ilk, son)
          if (telK) telHarita.set(telK, r.lastInsertRowid)
          eklenen++
        }
      }
    })
    tx()

    if (!liste.hasNext) break
    page++
  }
  return { toplam, eslesen, eklenen }
}

// =====================================================================
// #4 ÜRÜN EŞLEŞTİRME — listProduct (SKU/barkod → ikas id'leri)
// =====================================================================

const URUN_SORGU = `query Urun($page: Int, $limit: Int) {
  listProduct(pagination: { page: $page, limit: $limit }) {
    count hasNext page limit
    data { id name variants { id sku barcodeList } }
  }
}`

// ikas ürünlerini çekip yerel ürünleri SKU → barkod → (tek varyantlı üründe) ürün
// adı ile eşler; eşleşenin ikas_urun_id + ikas_varyant_id alanlarını doldurur.
// adIleEsle=true iken SKU/barkod tutmayan tek varyantlı ürünler ada göre eşlenir
// (ikas'ta SKU/barkod boş olabildiği için Excel ile yüklenen ürünlerde gerekir).
async function urunEsle({ adIleEsle = true } = {}) {
  const db = getDb()
  const bulSku = db.prepare('SELECT id FROM urunler WHERE sku = ? COLLATE NOCASE AND aktif = 1')
  const bulBarkod = db.prepare('SELECT id FROM urunler WHERE barkod = ? COLLATE NOCASE AND aktif = 1')
  // Ada göre eşleşme yalnızca yerelde TEK ürün varsa güvenli (çoğul ad = belirsiz, atla).
  const bulAd = db.prepare('SELECT id FROM urunler WHERE ad = ? COLLATE NOCASE AND aktif = 1')
  const sayAd = db.prepare('SELECT COUNT(*) n FROM urunler WHERE ad = ? COLLATE NOCASE AND aktif = 1')
  const guncelle = db.prepare('UPDATE urunler SET ikas_urun_id = ?, ikas_varyant_id = ? WHERE id = ?')

  let page = 1, eslesen = 0, adEslesen = 0, ikasToplam = 0, eslesmeyen = 0
  // Setler urunler tablosunda DEGIL; ayni cekimden SKU -> varyant kimligi haritasi
  // biriktirilir, dongu bitince setlere yazilir (ikinci bir ikas cagrisi gerekmez).
  const skuVaryant = new Map()
  for (;;) {
    const data = await graphql(URUN_SORGU, { page, limit: SAYFA_LIMIT })
    const liste = data?.listProduct
    const urunler = liste?.data || []
    if (!urunler.length) break

    const tx = db.transaction(() => {
      for (const p of urunler) {
        const tekVaryant = (p.variants || []).length === 1
        for (const v of (p.variants || [])) {
          ikasToplam++
          let yerel = null
          const sku = (v.sku || '').trim()
          if (sku) { skuVaryant.set(sku, v.id); yerel = bulSku.get(sku) }
          if (!yerel && Array.isArray(v.barcodeList)) {
            for (const b of v.barcodeList) {
              const bk = (b || '').trim()
              if (bk) { yerel = bulBarkod.get(bk); if (yerel) break }
            }
          }
          // Ad ile eşleşme: SKU/barkod tutmadıysa, tek varyantlı üründe, ad benzersizse.
          if (!yerel && adIleEsle && tekVaryant) {
            const ad = (p.name || '').trim()
            if (ad && sayAd.get(ad).n === 1) { yerel = bulAd.get(ad); if (yerel) adEslesen++ }
          }
          if (yerel) { guncelle.run(p.id, v.id, yerel.id); eslesen++ }
          else eslesmeyen++
        }
      }
    })
    tx()

    if (!liste.hasNext) break
    page++
  }
  // SETLER — ikas'ta satilan bir set siparis kalemine urun_id ile baglanamaz; fatura
  // kesme icin varyant kimligi sart (Faz 2 / Task 5A). Eslestirme YALNIZ SKU ile.
  const setler = db.prepare("SELECT id, ad, sku, ikas_varyant_id FROM setler WHERE aktif = 1").all()
  const setSonuc = setVaryantEslestir(setler, skuVaryant)
  if (setSonuc.eslesen.length) {
    const setGuncelle = db.prepare('UPDATE setler SET ikas_varyant_id = ? WHERE id = ?')
    db.transaction(() => {
      for (const s of setSonuc.eslesen) setGuncelle.run(s.ikas_varyant_id, s.id)
    })()
  }

  return { ikasToplam, eslesen, adEslesen, eslesmeyen,
    setYazilan: setSonuc.eslesen.length, setSkusuz: setSonuc.skusuz, setIkastaYok: setSonuc.ikasta_yok }
}

// =====================================================================
// #6 PAKET DURUMU — updateOrderPackageStatus / cancelFulfillment
// =====================================================================

// Siparişin ikas paketlerini (id + durum) çeker.
async function siparisPaketleri(ikasSiparisId) {
  const data = await graphql(`query P($f: StringFilterInput){
    listOrder(id: $f, pagination:{page:1,limit:1}){ data {
      id orderPackages { id orderPackageFulfillStatus trackingInfo { trackingNumber cargoCompany trackingLink barcode } }
    } }
  }`, { f: { eq: ikasSiparisId } })
  return data?.listOrder?.data?.[0]?.orderPackages || []
}

module.exports = {
  // urunler.js fiyat değişiminde arka plan push için (main.js _ önekini atlar).
  _pushFiyatArkaPlan: pushFiyatArkaPlan,
  _fiyatSuz: fiyatSuz,
  _pushAlisFiyati: pushAlisFiyati,
  _urunEsle: urunEsle,
  _pushUrunFiyat: pushUrunFiyat,

  // Yalnız ALIŞ fiyatını gönderir; ikas'taki satış fiyatına dokunmaz.
  'ikas:alis-fiyati-gonder': async () => {
    const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
    return pushAlisFiyati()
  },

  // Tüm eşleşmiş ürünlerin fiyatını ikas'a gönderir (manuel tam senkron).
  'ikas:fiyat-gonder': async () => {
    const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
    return pushUrunFiyat(null)
  },

  // ikas müşterilerini çeker + yerel müşterilere işler.
  'ikas:musteri-cek': async () => {
    const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
    return pullMusteriler()
  },

  // ikas ürünlerini SKU/barkod ile yerel ürünlere eşler.
  'ikas:urun-esle': async () => {
    const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
    return urunEsle()
  },

  // Bir siparişin ikas paketlerini (durum + takip) döner (UI için).
  'ikas:siparis-paketler': async ({ id }) => {
    const db = getDb()
    const sip = db.prepare('SELECT ikas_siparis_id FROM online_siparisler WHERE id = ?').get(id)
    if (!sip) throw new Error('Sipariş bulunamadı')
    return { paketler: await siparisPaketleri(sip.ikas_siparis_id) }
  },

  // Paket durumunu günceller (örn. DELIVERED = teslim edildi). orderPackageId
  // verilmezse siparişin tüm paketlerine uygulanır.
  'ikas:siparis-paket-durum': async ({ id, durum, orderPackageId = null }) => {
    const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
    const db = getDb()
    const sip = db.prepare('SELECT ikas_siparis_id FROM online_siparisler WHERE id = ?').get(id)
    if (!sip) throw new Error('Sipariş bulunamadı')
    if (!durum) throw new Error('Paket durumu gerekli')
    let paketIdler = orderPackageId ? [orderPackageId] : (await siparisPaketleri(sip.ikas_siparis_id)).map(p => p.id)
    if (!paketIdler.length) throw new Error('Siparişin ikas paketi yok (önce kargolayın).')
    // CANLI ŞEMA: UpdateOrderPackageStatusInput { orderId, packages: [{ packageId, status }] }.
    const mutation = `mutation S($input: UpdateOrderPackageStatusInput!){ updateOrderPackageStatus(input:$input){ id orderPackageStatus } }`
    await graphql(mutation, {
      input: { orderId: sip.ikas_siparis_id, packages: paketIdler.map(pid => ({ packageId: pid, status: durum })) },
    })
    db.prepare('UPDATE online_siparisler SET kargo_durumu = ? WHERE id = ?').run(durum, id)
    return { ok: true, paket: paketIdler.length }
  },

  // Kargolamayı (fulfillment) geri alır — yanlış kargolama düzeltme.
  'ikas:siparis-kargo-iptal': async ({ id, orderPackageId = null }) => {
    const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
    const db = getDb()
    const sip = db.prepare('SELECT ikas_siparis_id FROM online_siparisler WHERE id = ?').get(id)
    if (!sip) throw new Error('Sipariş bulunamadı')
    let paketIdler = orderPackageId ? [orderPackageId] : (await siparisPaketleri(sip.ikas_siparis_id)).map(p => p.id)
    if (!paketIdler.length) throw new Error('Geri alınacak kargo paketi yok.')
    const mutation = `mutation C($input: CancelFulfillmentInput!){ cancelFulfillment(input:$input){ id } }`
    for (const pid of paketIdler) {
      await graphql(mutation, { input: { orderId: sip.ikas_siparis_id, orderPackageId: pid } })
    }
    db.prepare("UPDATE online_siparisler SET kargo_durumu = 'UNFULFILLED', kargo_takip_no = NULL WHERE id = ?").run(id)
    return { ok: true }
  },
}
