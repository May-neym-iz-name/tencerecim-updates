// Talep aşaması: ikas'a YAZILAMAYAN "onaylandı (ürün bekleniyor)" ve "kapatıldı"
// bilgisi. İkas API'sinde ne reddetme mutation'ı var ne de REFUND_REQUEST_ACCEPTED'ı
// set etme imkânı (2026-07-24 canlı introspection). Bu yüzden yerel + çok-PC senkron.
//
// KARAR mantığı (_dogrula, _haritala) SAF ve DB'sizdir → mock gerektirmeden test
// edilir. Gerçek DB testi bu projede mümkün DEĞİL: better-sqlite3 Electron için
// derlenmiştir, vitest Node ile koşar ve modülü yükleyemez. Emsal: ikas/kargo-durum.js
// _bildirimKarari, ikas/bildirim-uret.js _durumdanBildirim.

const ASAMALAR = ['onaylandi', 'kapatildi']

// Girdi doğrulama — saf. Hata fırlatır ya da normalleşmiş kaydı döner.
// UI doğrulamasına GÜVENİLMEZ: IPC ucu doğrudan da çağrılabilir.
function _dogrula({ ikasSiparisId, asama, notMetni = null, kullanici = null } = {}) {
  if (!ikasSiparisId) throw new Error('Sipariş kimliği (ikas_siparis_id) gerekli.')
  if (!ASAMALAR.includes(asama)) throw new Error(`Geçersiz aşama: ${asama}`)
  // Kapatma gerekçesiz kalırsa sonradan "bunu neden kapatmışız" cevapsız kalır.
  const not = (notMetni || '').trim()
  if (asama === 'kapatildi' && !not) throw new Error('Talebi kapatmak için not (sebep) zorunludur.')
  return { ikasSiparisId, asama, not: not || null, kullanici: kullanici || null }
}

// Satır listesi → { ikas_siparis_id: kayit }. Renderer tek seferde alır;
// sipariş başına sorgu atmak 400+ satırlık listede N+1 olurdu.
function _haritala(satirlar) {
  return Object.fromEntries((satirlar || []).map(s => [s.ikas_siparis_id, s]))
}

function asamalar(db) {
  return _haritala(db.prepare(
    'SELECT ikas_siparis_id, asama, not_metni, kullanici, tarih FROM talep_durumlari'
  ).all())
}

// Upsert: sipariş başına TEK kayıt. Aşama ilerler (onaylandi → kapatildi) ya da düzeltilir.
function asamaYaz(db, girdi) {
  const k = _dogrula(girdi)
  db.prepare(`
    INSERT INTO talep_durumlari (ikas_siparis_id, asama, not_metni, kullanici, tarih)
    VALUES (@ikasSiparisId, @asama, @not, @kullanici, datetime('now','localtime'))
    ON CONFLICT(ikas_siparis_id) DO UPDATE SET
      asama = excluded.asama, not_metni = excluded.not_metni,
      kullanici = excluded.kullanici, tarih = excluded.tarih
  `).run(k)
  return { ok: true }
}

function asamaSil(db, ikasSiparisId) {
  db.prepare('DELETE FROM talep_durumlari WHERE ikas_siparis_id = ?').run(ikasSiparisId)
  return { ok: true }
}

module.exports = { ASAMALAR, _dogrula, _haritala, asamalar, asamaYaz, asamaSil }
