// UPS kargo ayarları (anahtar-değer) ve il/ilçe kod sorguları.
const { getDb } = require('./database')

// Tüm UPS ayarlarını obje olarak döndürür.
function ayarlariGetir() {
  const satirlar = getDb().prepare('SELECT anahtar, deger FROM ups_ayarlar').all()
  const obj = {}
  for (const s of satirlar) obj[s.anahtar] = s.deger
  return obj
}

// Birden çok ayarı topluca kaydeder (upsert).
function ayarlariKaydet(veri) {
  const db = getDb()
  const upsert = db.prepare(
    'INSERT INTO ups_ayarlar (anahtar, deger) VALUES (@anahtar, @deger) ' +
    'ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger'
  )
  const toplu = db.transaction((girisler) => {
    for (const [anahtar, deger] of girisler) {
      upsert.run({ anahtar, deger: deger === null || deger === undefined ? '' : String(deger) })
    }
  })
  toplu(Object.entries(veri || {}))
  return ayarlariGetir()
}

module.exports = {
  // kargo.js'in ayarları okuyabilmesi için (IPC değil — _ önekli, main.js atlar).
  _ayarlariGetir: ayarlariGetir,

  'ups-ayar:getir': () => ayarlariGetir(),
  'ups-ayar:kaydet': (veri) => ayarlariKaydet(veri),

  'ups:iller': () => {
    return getDb().prepare('SELECT DISTINCT il_kodu, il FROM ups_sehir_ilce ORDER BY il').all()
  },

  'ups:ilceler': (ilKodu) => {
    return getDb().prepare('SELECT ilce_kodu, ilce FROM ups_sehir_ilce WHERE il_kodu = ? ORDER BY ilce').all(ilKodu)
  },
}
