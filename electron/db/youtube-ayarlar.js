// YouTube entegrasyon ayarları (anahtar-değer). meta-ayarlar.js modeliyle aynı.
// client_secret / refresh_token / access_token hassas → renderer'a maskeli döner;
// gerçek değer DB'de (gizli-alan ile şifreli) kalır.
//
// Google Cloud projesi: tencerecim-youtube
// Kurulum notu: client_id ve client_secret Google Cloud konsolundan alınır
// (API'ler ve Hizmetler → Kimlik Bilgileri → Masaüstü uygulaması istemcisi).
const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')

const HASSAS = new Set(['client_secret', 'refresh_token', 'access_token'])

function ayarlariGetir() {
  const satirlar = getDb().prepare('SELECT anahtar, deger FROM youtube_ayarlar').all()
  const obj = {}
  for (const s of satirlar) obj[s.anahtar] = s.deger
  return require('./gizli-alan-canli').objeCoz('youtube_ayarlar', obj)
}

// Renderer'a giderken hassas değerleri maskeler (girilmiş mi bilgisini korur).
function ayarlariGetirGuvenli() {
  const a = ayarlariGetir()
  const kopya = { ...a }
  for (const k of HASSAS) {
    if (kopya[k]) kopya[k] = '********'
  }
  return kopya
}

function ayarKaydetTek(anahtar, deger) {
  getDb().prepare(
    'INSERT INTO youtube_ayarlar (anahtar, deger) VALUES (?, ?) ' +
    'ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger'
  ).run(
    anahtar,
    require('./gizli-alan-canli').yazmaDegeri('youtube_ayarlar', anahtar, deger == null ? '' : String(deger)),
  )
}

function ayarlariKaydet(veri) {
  const db = getDb()
  const upsert = db.prepare(
    'INSERT INTO youtube_ayarlar (anahtar, deger) VALUES (@anahtar, @deger) ' +
    'ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger'
  )
  const toplu = db.transaction((girisler) => {
    for (const [anahtar, deger] of girisler) {
      // Maskeli değer geri gönderildiyse mevcut değeri koru (üzerine yazma).
      if (HASSAS.has(anahtar) && (deger === '********' || deger === '' || deger == null)) continue
      const duz = deger == null ? '' : String(deger)
      upsert.run({ anahtar, deger: require('./gizli-alan-canli').yazmaDegeri('youtube_ayarlar', anahtar, duz) })
    }
  })
  toplu(Object.entries(veri || {}))
  // Kimlik bilgisi değişmiş olabilir → istemcinin bellekteki token'ı geçersiz.
  try { require('../youtube/client').cacheSifirla() } catch {}
  return ayarlariGetirGuvenli()
}

// Bağlantıyı koparır: yetki verileri silinir, client_id/secret korunur
// (kullanıcı yeniden bağlanırken tekrar girmek zorunda kalmasın).
function baglantiSil() {
  const db = getDb()
  const sil = db.prepare('DELETE FROM youtube_ayarlar WHERE anahtar = ?')
  db.transaction(() => {
    for (const k of ['refresh_token', 'access_token', 'token_bitis', 'kanal_id', 'kanal_adi']) sil.run(k)
  })()
  try { require('../youtube/client').cacheSifirla() } catch {}
  return ayarlariGetirGuvenli()
}

module.exports = {
  // client.js/giris.js gerçek (maskelenmemiş) ayarları okuyabilsin diye — _ önekli, main.js atlar.
  _ayarlariGetir: ayarlariGetir,
  _ayarKaydetTek: ayarKaydetTek,
  _baglantiSil: baglantiSil,

  'youtube-ayar:getir': () => ayarlariGetirGuvenli(),
  'youtube-ayar:kaydet': (veri) => { yetkiKontrol('ayarlar_duzenle'); return ayarlariKaydet(veri) },
}
