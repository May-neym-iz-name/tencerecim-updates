// İkas sipariş durumundan bildirim üretir. KARAR (_durumdanBildirim) saf ve DB'siz
// tutulur → mock gerektirmeden test edilir (emsal: ikas/kargo-durum.js _bildirimKarari).
const { _ekle } = require('../db/bildirimler')

// İkas durum kodu → bildirim tipi/önem. Hem sipariş `status` hem paket
// `orderPackageStatus` alanları kontrol edilir; ilki eşleşen kazanır.
const DURUM_HARITASI = {
  CANCEL_REQUESTED: { tip: 'iptal_talebi', onem: 'yuksek', etiket: 'İptal talebi' },
  REFUND_REQUESTED: { tip: 'iade_talebi', onem: 'yuksek', etiket: 'İade talebi' },
  REFUND_REQUEST_ACCEPTED: { tip: 'iade_kabul', onem: 'normal', etiket: 'İade talebi kabul edildi' },
  REFUND_REJECTED: { tip: 'iade_red', onem: 'normal', etiket: 'İade/iptal talebi reddedildi' },
  CANCEL_REJECTED: { tip: 'iade_red', onem: 'normal', etiket: 'İade/iptal talebi reddedildi' },
}

// Döner: bildirim nesnesi ya da null (yakalanacak durum yoksa).
function _durumdanBildirim(sip) {
  // Öncelik sırası sabit: eşleşen ilk durumu al (status → orderPackageStatus).
  const durum = [sip.status, sip.orderPackageStatus].find(d => d && DURUM_HARITASI[d])
  if (!durum) return null
  const { tip, onem, etiket } = DURUM_HARITASI[durum]

  const musteri = `${sip.customer?.firstName || ''} ${sip.customer?.lastName || ''}`.trim()
  const no = sip.orderNumber || sip.id
  const tutar = Number(sip.totalFinalPrice) || 0
  const birim = sip.currencyCode || 'TRY'

  return {
    tip,
    onem,
    ikas_siparis_id: sip.id,
    baslik: `${etiket} — Sipariş #${no}`,
    mesaj: `${musteri || 'Müşteri'} · ${tutar.toLocaleString('tr-TR')} ${birim}`,
    // Aynı sipariş aynı durumda kaldıkça tek bildirim; durum değişince yenisi düşer.
    dedup_anahtar: `${sip.id}:${tip}:${durum}`,
  }
}

// İkas çekiminde çağrılır. İlk kurulumda (geçmiş toplu çekim) bildirim ÜRETMEZ.
// Döner: eklenen bildirim sayısı (0 = yok / zaten vardı / ilk kurulum).
function bildirimUret(db, sip, ilkKurulum) {
  if (ilkKurulum) return 0
  const b = _durumdanBildirim(sip)
  if (!b) return 0
  return _ekle(db, b)
}

module.exports = { _durumdanBildirim, bildirimUret }
