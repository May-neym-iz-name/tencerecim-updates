// Kargo durumu köprüsü: UPS'ten öğrendiğimiz durumu ikas siparişine YAZAR.
//
// Neden var: UPS takip yoklayıcısı (ups/takip.js) durumu yalnız YERELE yazıyordu.
// ikas panelinde sipariş "Hazırlanıyor"da takılı kalıyor, müşteri kargo/teslim
// bildirimini HİÇ almıyordu — bildirimleri ikas kendi sipariş durumu değişince
// gönderir, bizim yerel tablomuza bakmaz.
//
// KONTROL BİZDE: durum UPS'ten gelir, ikas'a biz bildiririz (kullanıcı kararı:
// uygulama kazanır, ikas'taki elle yapılmış işaretlemenin üzerine yazılır).
//
// İdempotanlık: bu modül "durum gerçekten değişti" sinyaliyle çağrılır ve son
// gönderilen durumu online_siparisler.ikas_kargo_durumu'na damgalar. Aynı durum
// ikinci kez gönderilmez — yoksa 30 dakikada bir müşteriye mükerrer bildirim giderdi.
const { getDb } = require('../db/database')
const { graphql } = require('./client')

// UPS durumu → ikas OrderPackageStatusEnum (docs/ikas-api-reference.md satır 209-229).
// 'yok' ve iade gönderileri buraya hiç gelmez (çağıran taraf eler).
const IKAS_KARSILIGI = {
  gonderildi: 'FULFILLED',          // koli UPS ağında → ikas "Kargolandı" + takip linki
  teslim: 'DELIVERED',              // StatusCode 2 → ikas "Teslim Edildi"
  ozel: 'UNABLE_TO_DELIVER',        // StatusCode 3 → ikas "Teslim Edilemedi"
}

// ikas'ta bu durumdaki siparişlere HİÇ DOKUNMA. İptal/iade edilmiş bir siparişe
// "kargolandı" yazmak veriyi bozar ve müşteriye anlamsız bildirim gönderir.
// (Canlı veride 19 CANCELLED + 16 REFUNDED kayıt ölçüldü — teorik bir risk değil.)
const DOKUNMA = new Set([
  'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'REFUND_REQUEST_ACCEPTED',
])

// Durum ilerleme sırası. ikas BİZDEN İLERİDEYSE (rütbesi yüksekse) birileri paneli
// elle güncellemiş demektir — o zaman düzeltiriz ama SESSİZCE (bkz. bildirimKarari).
const RUTBE = {
  UNFULFILLED: 0,
  READY_FOR_SHIPMENT: 1,
  FULFILLED: 2,
  // FULFILLED'dan YÜKSEK (2.5): "teslim edilemedi" bir istisna durumudur ve çoğunlukla
  // ELLE işaretlenir. Oradan FULFILLED'a dönmek geri sarmadır → düzeltilir ama sessizce.
  // Aynı rütbe verilseydi müşteriye ikinci kez "kargoya verildi" mesajı giderdi.
  UNABLE_TO_DELIVER: 2.5,
  DELIVERED: 3,
}

// Müşteriye bildirim gönderilecek durumlar. UNABLE_TO_DELIVER bilerek DIŞARIDA:
// UPS'in "özel durum"u çoğu zaman geçici (adreste bulunamadı, ertesi gün tekrar
// denenecek) — her denemede müşteriye "teslim edilemedi" maili atmak panik yaratır.
// Durum ikas paneline yine de yazılır, personel görür.
const BILDIRIM_GONDER = new Set(['FULFILLED', 'DELIVERED'])

// ikas'ta paket YOKSA önce fulfillOrder ile paket açmak gerekir; updateOrderPackageStatus
// paketsiz siparişte çalışmaz.
//
// IPC kardeşi 'ikas:siparis-kargola' BİLEREK çağrılmıyor: o handler _yetkiKontrol('ikas_yonet')
// yapar ve bu yetki personel rolünün varsayılanlarında YOKTUR (yetki.js). Yoklayıcı ise kim
// giriş yapmışsa ona bakmadan çalışan bir SİSTEM işidir — personel hesabıyla açılmış mağaza
// PC'sinde her bildirim "yetkiniz yok" ile düşerdi. Yetki kontrolü kullanıcı eylemlerini
// korur, otomasyonu değil (emsal: ekstra.js pushFiyatArkaPlan).
async function _paketAc(db, siparisId, ikasSiparisId, takipNo, bildir) {
  const kalemSql = db.prepare(
    'SELECT ikas_kalem_id, miktar FROM online_siparis_kalemleri WHERE siparis_id = ? AND ikas_kalem_id IS NOT NULL'
  )
  let lines = kalemSql.all(siparisId).map(k => ({
    orderLineItemId: k.ikas_kalem_id, quantity: Number(k.miktar) || 1,
  }))
  if (!lines.length) {
    // Eski sipariş: kalem ID eksik olabilir → ikas'tan tazele.
    const { _tazeleSiparisKalemleri } = require('./index')
    await _tazeleSiparisKalemleri(db, siparisId)
    lines = kalemSql.all(siparisId).map(k => ({
      orderLineItemId: k.ikas_kalem_id, quantity: Number(k.miktar) || 1,
    }))
  }
  await graphql('mutation F($input: FulFillOrderInput!){ fulfillOrder(input:$input){ id } }', {
    input: {
      orderId: ikasSiparisId,
      markAsReadyForShipment: true,
      sendNotificationToCustomer: !!bildir,
      trackingInfoDetail: {
        trackingNumber: String(takipNo), cargoCompany: 'UPS', isSendNotification: !!bildir,
      },
      ...(lines.length ? { lines } : {}),
    },
  })
  db.prepare(
    "UPDATE online_siparisler SET kargo_takip_no = ?, kargo_firma = 'UPS', gonderildi_tarihi = COALESCE(gonderildi_tarihi, datetime('now','localtime')) WHERE id = ?"
  ).run(String(takipNo), siparisId)
}

async function _paketleriGuncelle(ikasSiparisId, paketler, durum, takipNo, bildir) {
  const trackingInfo = {
    trackingNumber: String(takipNo),
    cargoCompany: 'UPS',
    isSendNotification: !!bildir,
  }
  await graphql(
    'mutation S($input: UpdateOrderPackageStatusInput!){ updateOrderPackageStatus(input:$input){ id orderPackageStatus } }',
    {
      input: {
        orderId: ikasSiparisId,
        packages: paketler.map(p => ({ packageId: p.id, status: durum, trackingInfo })),
      },
    }
  )
}

/**
 * KARAR: bu durum ikas'a gönderilmeli mi, hangi durumla, bildirimli mi?
 * Saf fonksiyon — ağ/DB yok, mock'suz test edilir (emsal: ups/takip.js durumCevir).
 * Değerli mantığın tamamı burada: mükerrer bildirim, geri sarma ve personelin elle
 * yaptığı işaretlemeyle çakışma korumaları.
 *
 * @param {string} durum - 'gonderildi'|'teslim'|'ozel'|'yok'
 * @param {string|null} sonBildirilen - online_siparisler.ikas_kargo_durumu (BİZİM son yazdığımız)
 * @param {string|null|undefined} ikasDurumu - ikas'ın ŞU ANKİ orderPackageStatus'u.
 *        undefined = henüz sorulmadı (ağ çağrısından önceki ön eleme).
 * @returns {{gonder:boolean, status?:string, bildir?:boolean, atlandi?:string}}
 */
function bildirimKarari(durum, sonBildirilen, ikasDurumu) {
  const hedef = IKAS_KARSILIGI[durum]
  if (!hedef) return { gonder: false, atlandi: 'karsiligi-yok' }

  // Aynı durumu ikinci kez gönderme. Yoklayıcı 30 dakikada bir çalışır; bu koruma
  // olmasa müşteri aynı kargo bildirimini günde 48 kez alırdı.
  // (Ağ çağrısından ÖNCE bakılır — sakin durumda hiç API isteği yapılmaz.)
  if (sonBildirilen === hedef) return { gonder: false, atlandi: 'zaten-bildirildi' }

  // Buradan sonrası ikas'ın CANLI durumunu gerektirir. Yerel kargo_durumu'na
  // güvenilmez: 90 saniye bayat olabilir ve karar müşteriye mail gönderilmesini
  // tetikler. undefined = henüz sorulmadı, çağıran sorup tekrar gelir.
  if (ikasDurumu === undefined) return { gonder: true, status: hedef, sorulacak: true }

  // İptal/iade edilmiş siparişe dokunma.
  if (DOKUNMA.has(ikasDurumu)) return { gonder: false, atlandi: `ikas-${ikasDurumu}` }

  // ikas zaten hedefte — yazacak bir şey yok. Bu, personel elle doğru işaretlemişse
  // gereksiz yazmayı ve bildirimi de önler.
  if (ikasDurumu === hedef) return { gonder: false, atlandi: 'ikas-zaten-ayni' }

  // TESLİM GERİ ALINMAZ. ikas "Teslim Edildi" derken UPS "yolda" diyorsa, sebep neredeyse
  // her zaman bizim takip numaramızın ölü olmasıdır: etiketi biz kestik ama sevkiyat
  // ikas üzerinden başka numarayla çıktı (ölçüldü: uyumsuz 5 kaydın 5'inde de UPS
  // "bulunamadı" dedi). Böyle bir durumda ikas'ı geri düşürmek DOĞRU veriyi bozar.
  if (ikasDurumu === 'DELIVERED' && hedef !== 'DELIVERED') {
    return { gonder: false, atlandi: 'ikas-teslim-geri-alinmaz' }
  }
  if (sonBildirilen === 'DELIVERED' && hedef !== 'DELIVERED') {
    return { gonder: false, atlandi: 'teslim-geri-alinmaz' }
  }

  // ÇAKIŞMA: ikas bizden ileride → paneli birileri ELLE güncellemiş. UPS'e göre
  // düzeltiriz (kullanıcı kararı: UPS kazanır) ama müşteriye BİLDİRİM GÖNDERMEYİZ —
  // personelin işaretlemesini ezip üstüne bir de yanlış mesaj atmak en kötüsü olurdu.
  const cakisma = (RUTBE[ikasDurumu] ?? -1) > (RUTBE[hedef] ?? -1)
  const bildir = BILDIRIM_GONDER.has(hedef) && !cakisma

  return { gonder: true, status: hedef, bildir, ...(cakisma ? { cakisma: true } : {}) }
}

/**
 * Bir siparişin kargo durumunu ikas'a yazar.
 * @param {number} siparisId - online_siparisler.id (YEREL id)
 * @param {'gonderildi'|'teslim'|'ozel'} durum - takip.js durumCevir çıktısı
 * @param {string} takipNo
 * @returns {Promise<{ok:boolean, atlandi?:string, durum?:string}>}
 *
 * Hata FIRLATMAZ — yoklayıcının turunu kesmemeli. Hatayı kaydeder ve döner.
 */
async function ikasaBildir(siparisId, durum, takipNo, { sessiz = false } = {}) {
  if (!IKAS_KARSILIGI[durum]) return { ok: false, atlandi: 'karsiligi-yok' }

  const db = getDb()
  const sip = db.prepare(
    'SELECT id, ikas_siparis_id, ikas_kargo_durumu FROM online_siparisler WHERE id = ?'
  ).get(siparisId)
  if (!sip || !sip.ikas_siparis_id) return { ok: false, atlandi: 'ikas-siparisi-degil' }

  // 1. AŞAMA — ağa çıkmadan ön eleme (sakin durumda hiç API isteği yapılmaz).
  const on = bildirimKarari(durum, sip.ikas_kargo_durumu, undefined)
  if (!on.gonder) return { ok: true, atlandi: on.atlandi }

  try {
    // ikas'ın CANLI durumunu paket sorgusuyla BİRLİKTE al — ekstra çağrı yok.
    // Yerel kargo_durumu'na güvenilmez: pull 90 saniyede bir çalışır, o kadar bayat
    // bir veriyle müşteriye mail gönderilmesine karar veremeyiz.
    const veri = await graphql(
      `query P($f: StringFilterInput){
        listOrder(id:$f, pagination:{page:1,limit:1}){
          data { orderPackageStatus orderPackages { id } }
        }
      }`,
      { f: { eq: sip.ikas_siparis_id } }
    )
    const kayit = veri?.listOrder?.data?.[0]
    const paketler = kayit?.orderPackages || []

    // 2. AŞAMA — canlı duruma göre nihai karar (çakışma/iptal/teslim korumaları).
    const karar = bildirimKarari(durum, sip.ikas_kargo_durumu, kayit?.orderPackageStatus ?? null)
    if (!karar.gonder) return { ok: true, atlandi: karar.atlandi }
    const { status: hedef, cakisma } = karar
    // sessiz: telafi turu (gecmisi tarama). Gunler once teslim olmus bir siparis icin
    // simdi "teslim edildi" maili atmak musteriye anlamsiz gelir - panel duzelsin yeter.
    const bildir = karar.bildir && !sessiz

    if (!paketler.length) {
      // Paket yok → fulfillOrder ile aç (takip no'yu da yazar, sipariş FULFILLED olur).
      await _paketAc(db, siparisId, sip.ikas_siparis_id, takipNo, bildir)
      // Hedef DELIVERED ise paket yeni açıldı; şimdi teslime çek.
      if (hedef === 'DELIVERED') {
        const yeni = await graphql(
          `query P($f: StringFilterInput){
            listOrder(id:$f, pagination:{page:1,limit:1}){ data { orderPackages { id } } }
          }`,
          { f: { eq: sip.ikas_siparis_id } }
        )
        const yeniPaketler = yeni?.listOrder?.data?.[0]?.orderPackages || []
        if (yeniPaketler.length) {
          await _paketleriGuncelle(sip.ikas_siparis_id, yeniPaketler, hedef, takipNo, bildir)
        }
      }
    } else {
      await _paketleriGuncelle(sip.ikas_siparis_id, paketler, hedef, takipNo, bildir)
    }

    db.prepare(
      "UPDATE online_siparisler SET ikas_kargo_durumu = ?, ikas_kargo_hata = NULL, ikas_kargo_bildirim_tarihi = datetime('now','localtime') WHERE id = ?"
    ).run(hedef, siparisId)
    return { ok: true, durum: hedef, ...(cakisma ? { cakisma: true } : {}) }
  } catch (e) {
    // Yut ama SESSİZCE yutma: hata kayda geçer, ekranda gösterilebilir, sonraki
    // turda yeniden denenir (ikas_kargo_durumu yazılmadığı için).
    db.prepare(
      "UPDATE online_siparisler SET ikas_kargo_hata = ? WHERE id = ?"
    ).run(String(e.message).slice(0, 300), siparisId)
    return { ok: false, hata: e.message }
  }
}

module.exports = {
  _ikasaBildir: ikasaBildir,
  _bildirimKarari: bildirimKarari,
  _IKAS_KARSILIGI: IKAS_KARSILIGI,
}
