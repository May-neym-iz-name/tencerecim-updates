// ikas entegrasyonu ayarları (anahtar-değer). UPS ayar modeliyle aynı yapı.
const { getDb } = require('./database')

// client_secret hassas olduğu için renderer'a maskeli döner; gerçek değer DB'de kalır.
const HASSAS = new Set(['client_secret'])

function ayarlariGetir() {
  const satirlar = getDb().prepare('SELECT anahtar, deger FROM ikas_ayarlar').all()
  const obj = {}
  for (const s of satirlar) obj[s.anahtar] = s.deger
  return obj
}

// Renderer'a giderken secret'ı maskeler (girilmiş mi bilgisini korur).
function ayarlariGetirGuvenli() {
  const a = ayarlariGetir()
  const kopya = { ...a }
  for (const k of HASSAS) {
    if (kopya[k]) kopya[k] = '********'
  }
  return kopya
}

function ayarlariKaydet(veri) {
  const db = getDb()
  const upsert = db.prepare(
    'INSERT INTO ikas_ayarlar (anahtar, deger) VALUES (@anahtar, @deger) ' +
    'ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger'
  )
  const toplu = db.transaction((girisler) => {
    for (const [anahtar, deger] of girisler) {
      // Maskeli secret geri gönderildiyse mevcut değeri koru (üzerine yazma).
      if (HASSAS.has(anahtar) && (deger === '********' || deger === '' || deger == null)) continue
      upsert.run({ anahtar, deger: deger == null ? '' : String(deger) })
    }
  })
  toplu(Object.entries(veri || {}))
  // Kimlik bilgisi değişmiş olabilir → token cache'ini sıfırla.
  try { require('../ikas/client').tokenSifirla() } catch {}
  return ayarlariGetirGuvenli()
}

module.exports = {
  // client.js'in gerçek (maskelenmemiş) ayarları okuyabilmesi için — _ önekli, main.js atlar.
  _ayarlariGetir: ayarlariGetir,

  'ikas-ayar:getir': () => ayarlariGetirGuvenli(),
  'ikas-ayar:kaydet': (veri) => ayarlariKaydet(veri),
}
