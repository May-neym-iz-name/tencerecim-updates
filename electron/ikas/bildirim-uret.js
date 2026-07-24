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

// Talebin sonuçlandığını gösteren durumlar (karşılığı: src/utils/talep.js).
// REFUNDED/CANCELLED bildirim üretmez (DURUM_HARITASI'nda yok) ama geri-tarama
// sorgusunda elemek için gerekli — liste src/utils/talep.js ile birebir aynı.
const COZULMUS = [
  'REFUND_REQUEST_ACCEPTED', 'REFUND_REJECTED', 'CANCEL_REJECTED', 'REFUNDED', 'CANCELLED',
]

// Döner: bildirim nesnesi ya da null (yakalanacak durum yoksa).
function _durumdanBildirim(sip) {
  const durumlar = [sip.status, sip.orderPackageStatus].filter(d => d && DURUM_HARITASI[d])
  // ÖNCELİK: çözüm > talep. İkas'ta sipariş `status` talepte takılı kalırken paket
  // durumu çözüme geçebiliyor; salt sıra takip edilirse çözülmüş bir talep için
  // "yüksek önem" uyarısı düşer. Çözüm işareti varsa o kazanır.
  const durum = durumlar.find(d => COZULMUS.includes(d)) || durumlar[0]
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

// Bekleyen talep durumları (frontend karşılığı: src/utils/talep.js).
const BEKLEYEN_TALEP = ['REFUND_REQUESTED', 'CANCEL_REQUESTED']

// TEK SEFERLİK geri-tarama: yerel online_siparisler tablosunda BEKLEYEN talepler
// için bildirim üretir. Gerekçe: ikas çekimi updatedAt imleciyle ARTIMLIDIR —
// bildirim özelliğinden önce talebe geçmiş ve o gün bu yana güncellenmemiş
// siparişler yeniden çekilmez, dolayısıyla hiç bildirim üretmezler.
// senk_durum bayrağıyla bir kez koşar (emsal: kargolar_restamp). Dedup zaten
// mükerreri engeller, tekrar koşsa da zararsızdır.
function mevcutTalepleriBildir(db) {
  const BAYRAK = 'bildirim_talep_backfill'
  try {
    const v = db.prepare('SELECT deger FROM senk_durum WHERE anahtar = ?').get(BAYRAK)
    if (v) return 0

    const yer = BEKLEYEN_TALEP.map(() => '?').join(',')
    // Yalnız FİİLEN talepte olanlar. Paket durumu kazanır; paket yoksa sipariş
    // durumuna bakılır (karşılığı: src/utils/talep.js bekleyenTalepMi).
    // Yerelde KAPATILAN talepler atlanır: ikas'ta REFUND_REQUESTED kalacakları için
    // atlanmazsa kapatma anlamsızlaşır, taramada yeniden bildirim doğar.
    const satirlar = db.prepare(`
      SELECT o.ikas_siparis_id, o.siparis_no, o.durum, o.kargo_durumu, o.toplam,
             o.para_birimi, o.musteri_ad
      FROM online_siparisler o
      WHERE (CASE WHEN COALESCE(o.kargo_durumu,'') IN ('','UNFULFILLED')
                  THEN COALESCE(o.durum,'') ELSE o.kargo_durumu END) IN (${yer})
        AND NOT EXISTS (SELECT 1 FROM talep_durumlari t
                        WHERE t.ikas_siparis_id = o.ikas_siparis_id AND t.asama = 'kapatildi')
    `).all(...BEKLEYEN_TALEP)

    let eklenen = 0
    for (const s of satirlar) {
      // _durumdanBildirim ikas sipariş şeklini bekler → yerel satırı ona uyarla.
      const sip = {
        id: s.ikas_siparis_id,
        orderNumber: s.siparis_no,
        status: s.durum,
        orderPackageStatus: s.kargo_durumu,
        totalFinalPrice: s.toplam,
        currencyCode: s.para_birimi,
        customer: { firstName: s.musteri_ad || '', lastName: '' },
      }
      const b = _durumdanBildirim(sip)
      if (b) eklenen += _ekle(db, b)
    }

    db.prepare(
      "INSERT INTO senk_durum (anahtar, deger) VALUES (?, '1') ON CONFLICT(anahtar) DO UPDATE SET deger = '1'"
    ).run(BAYRAK)
    return eklenen
  } catch (e) {
    console.error('Bildirim talep geri-tarama:', e.message)
    return 0
  }
}

module.exports = { _durumdanBildirim, bildirimUret, mevcutTalepleriBildir }
