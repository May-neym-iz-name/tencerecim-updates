// Otomasyon YÜRÜTÜCÜ kilidi (çok-PC).
//
// Neden var: v1.2.114'te otomasyon durumu (sosyal_otomasyonlar) PC'ler arası ORTAK oldu —
// her yetkili PC'den açılıp kapatılabiliyor. Ama YÜRÜTME ortak olamaz: iki PC birden Meta'yı
// yoklarsa aynı yoruma iki DM gider. Üstelik "bu yoruma DM gitti" damgası (sosyal_mesajlar)
// senkronlanmıyor → her PC yorumu cevapsız sanar, dedup da kurtarmaz.
// Tek-örnek kilidi (main.js) yalnız AYNI makinede korur, PC'ler arasında korumaz.
//
// Model: her PC'nin yerel cihaz_id'si var; hangi cihazın yürüteceği ise BULUTLA SENKRON
// (ayar-senk → otomasyon_yurutucu). Yalnız eşleşen PC yoklar/gönderir.
const { getDb } = require('../db/database')

const CIHAZ_ID_ANAHTAR = 'cihaz_id'
const YURUTUCU_ANAHTAR = 'otomasyon_yurutucu'
const YURUTUCU_AD_ANAHTAR = 'otomasyon_yurutucu_ad'

function ayarOku(anahtar) {
  return getDb().prepare('SELECT deger FROM meta_ayarlar WHERE anahtar = ?').get(anahtar)?.deger || ''
}
function ayarYaz(anahtar, deger) {
  getDb().prepare(
    'INSERT INTO meta_ayarlar (anahtar, deger) VALUES (?, ?) ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger'
  ).run(anahtar, String(deger ?? ''))
}

// Bu PC'nin kimliği. meta_ayarlar'dan YALNIZCA hizli_yanitlar senkronlanır (ayar-senk.js),
// bu yüzden cihaz_id kendiliğinden YEREL kalır — ayrı tablo gerekmez.
function cihazId() {
  let id = ayarOku(CIHAZ_ID_ANAHTAR)
  if (!id) {
    id = getDb().prepare("SELECT lower(hex(randomblob(16))) id").get().id
    ayarYaz(CIHAZ_ID_ANAHTAR, id)
  }
  return id
}

function yurutucuId() { return ayarOku(YURUTUCU_ANAHTAR) }
function yurutucuAd() { return ayarOku(YURUTUCU_AD_ANAHTAR) }

/**
 * Bu PC otomasyonu yürütmeli mi?
 * Yürütücü seçilmemişse: Meta token'ı OLAN PC kendini atar. Böylece yükseltme anında
 * otomasyon kesintiye uğramaz (token'sız PC zaten hiç yoklamıyordu). İki PC aynı anda
 * açılırsa kısa bir çakışma olabilir; bu bugünkü durumdan kötü değil (bugün ikisi de
 * yürütüyor) ve senkron turu (60 sn) sonrası kaybeden PC kendiliğinden susar.
 */
function yurutucuMu({ sayfaToken, cihazAd } = {}) {
  const ben = cihazId()
  const secili = yurutucuId()
  if (!secili) {
    if (!sayfaToken) return false // token'sız PC kendini yürütücü yapmaz
    devral(cihazAd)
    return true
  }
  return secili === ben
}

// Bu PC'yi yürütücü yapar (ayar senkronla diğer PC'ye gider → o susar).
function devral(cihazAd) {
  ayarYaz(YURUTUCU_ANAHTAR, cihazId())
  ayarYaz(YURUTUCU_AD_ANAHTAR, cihazAd || require('os').hostname() || 'Bilinmeyen PC')
  return { cihaz_id: cihazId(), ad: yurutucuAd() }
}

module.exports = {
  _cihazId: cihazId,
  _yurutucuMu: yurutucuMu,
  _yurutucuId: yurutucuId,

  // Arayüz: kim yürütüyor, bu PC mi?
  'sosyal:yurutucuDurum': () => ({
    cihaz_id: cihazId(),
    yurutucu_id: yurutucuId(),
    yurutucu_ad: yurutucuAd(),
    bu_pc_mi: !!yurutucuId() && yurutucuId() === cihazId(),
    secilmedi: !yurutucuId(),
    bu_pc_ad: require('os').hostname(),
  }),

  // "Bu PC yürütsün" — ayar senkronuyla diğer PC'ye gider.
  'sosyal:yurutucuDevral': ({ ad } = {}) => {
    require('../yetki')._yetkiKontrol('sosyal_otomasyon_yonet')
    return devral(ad)
  },
}
