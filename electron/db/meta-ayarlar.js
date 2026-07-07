// Meta (Facebook/Instagram) entegrasyon ayarları (anahtar-değer). ikas-ayarlar.js modeliyle aynı.
// app_secret ve sayfa_token hassas → renderer'a maskeli döner; gerçek değer DB'de kalır.
const { getDb } = require('./database')

const HASSAS = new Set(['app_secret', 'sayfa_token'])

function ayarlariGetir() {
  const satirlar = getDb().prepare('SELECT anahtar, deger FROM meta_ayarlar').all()
  const obj = {}
  for (const s of satirlar) obj[s.anahtar] = s.deger
  return obj
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
    'INSERT INTO meta_ayarlar (anahtar, deger) VALUES (?, ?) ' +
    'ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger'
  ).run(anahtar, deger == null ? '' : String(deger))
}

function ayarlariKaydet(veri) {
  const db = getDb()
  const upsert = db.prepare(
    'INSERT INTO meta_ayarlar (anahtar, deger) VALUES (@anahtar, @deger) ' +
    'ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger'
  )
  const toplu = db.transaction((girisler) => {
    for (const [anahtar, deger] of girisler) {
      // Maskeli değer geri gönderildiyse mevcut değeri koru (üzerine yazma).
      if (HASSAS.has(anahtar) && (deger === '********' || deger === '' || deger == null)) continue
      upsert.run({ anahtar, deger: deger == null ? '' : String(deger) })
    }
  })
  toplu(Object.entries(veri || {}))
  // Kimlik bilgisi değişmiş olabilir → istemci token cache'ini sıfırla.
  try { require('../meta/client').cacheSifirla() } catch {}
  return ayarlariGetirGuvenli()
}

module.exports = {
  // client.js gerçek (maskelenmemiş) ayarları okuyabilsin diye — _ önekli, main.js atlar.
  _ayarlariGetir: ayarlariGetir,
  _ayarKaydetTek: ayarKaydetTek,

  'meta-ayar:getir': () => ayarlariGetirGuvenli(),
  'meta-ayar:kaydet': (veri) => ayarlariKaydet(veri),
}
