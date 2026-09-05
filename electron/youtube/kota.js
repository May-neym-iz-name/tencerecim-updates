// YouTube günlük kota sayacı.
//
// Google her projeye günde 10.000 birim verir; bitince API tamamen susar ve
// hata mesajı ("quotaExceeded") olan biteni anlatmaz. Bu modül harcamayı
// ÖNCEDEN sayar, böylece 7. video yüklemesi yarıda kalmak yerine hiç başlamaz.
//
// Kota Pasifik saatiyle gece yarısı sıfırlanır — yerel tarihe göre saymak,
// Türkiye akşamı yapılan yüklemeleri yanlış güne yazar (TR, Pasifik'ten 10 saat ileride).
const { getDb } = require('../db/database')

const GUNLUK_LIMIT = 10000

// Operasyon maliyetleri (Google'ın yayımladığı birim değerleri).
const MALIYET = {
  'videos.insert': 1600,
  'videos.update': 50,
  'videos.list': 1,
  'channels.list': 1,
  'commentThreads.list': 1,
  'comments.insert': 50,
  'search.list': 100,
  'thumbnails.set': 50,
  'playlistItems.insert': 50,
}

// Pasifik saatine göre 'YYYY-MM-DD'. Kotanın sıfırlandığı gün budur.
function pasifikGun(simdi = new Date()) {
  // en-CA biçimi zaten YYYY-MM-DD verir.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(simdi)
}

function harcanan(gun = pasifikGun()) {
  const r = getDb().prepare('SELECT birim FROM youtube_kota WHERE gun = ?').get(gun)
  return r ? Number(r.birim) : 0
}

function kalan(gun = pasifikGun()) {
  return Math.max(0, GUNLUK_LIMIT - harcanan(gun))
}

/**
 * Bir işlemin kotaya sığıp sığmadığını söyler. Sığmıyorsa neden sığmadığını da
 * söyler — "kota doldu" demek yetmez, kullanıcı kaç video daha atabileceğini bilmeli.
 */
function yeterMi(operasyon, adet = 1) {
  const birim = (MALIYET[operasyon] || 0) * adet
  const k = kalan()
  return { yeter: birim <= k, gerekli: birim, kalan: k }
}

/**
 * Harcamayı kaydeder. Çağrı BAŞARILI olduktan sonra çağrılır: Google başarısız
 * isteklerin çoğunda kota düşmez, peşin yazmak sayacı gereksiz şişirir.
 */
function harca(operasyon, adet = 1) {
  const birim = (MALIYET[operasyon] || 0) * adet
  if (!birim) return
  const gun = pasifikGun()
  getDb().prepare(
    'INSERT INTO youtube_kota (gun, birim) VALUES (?, ?) ' +
    'ON CONFLICT(gun) DO UPDATE SET birim = birim + excluded.birim'
  ).run(gun, birim)
}

/** Kota yetmiyorsa açık, sayısal bir hata fırlatır. */
function kotaKontrol(operasyon, adet = 1) {
  const { yeter, gerekli, kalan: k } = yeterMi(operasyon, adet)
  if (yeter) return
  const kacVideo = Math.floor(k / MALIYET['videos.insert'])
  throw Object.assign(
    new Error(
      `YouTube günlük kotası yetmiyor: bu işlem ${gerekli} birim istiyor, kalan ${k} birim. ` +
      (operasyon === 'videos.insert'
        ? `Bugün en fazla ${kacVideo} video daha yüklenebilir. `
        : '') +
      'Kota Pasifik saatiyle gece yarısı (TR ~10:00) sıfırlanır.',
    ),
    { kod: 'kota' },
  )
}

// Arayüz için özet: bugün ne harcandı, kaç video daha sığar.
function durum() {
  const gun = pasifikGun()
  const h = harcanan(gun)
  const k = Math.max(0, GUNLUK_LIMIT - h)
  return {
    gun,
    harcanan: h,
    kalan: k,
    limit: GUNLUK_LIMIT,
    kalan_video: Math.floor(k / MALIYET['videos.insert']),
  }
}

module.exports = {
  GUNLUK_LIMIT,
  MALIYET,
  pasifikGun,
  harcanan,
  kalan,
  yeterMi,
  harca,
  kotaKontrol,
  durum,
}
