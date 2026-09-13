// Trendyol pazaryeri ayarları (anahtar-değer). meta-ayarlar.js modeliyle aynı.
// api_key ve api_secret hassas → renderer'a maskeli döner; gerçek değer DB'de
// DPAPI ile şifreli durur (bkz. db/gizli-alan.js).
//
// SENKRONLANMAZ (ayar-senk.js'e eklenmedi): şifreli değer buluta gidip başka PC'de
// çözülemez. Her PC kendi anahtarını girer.
const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')

const HASSAS = new Set(['api_key', 'api_secret'])

function ayarlariGetir() {
  const satirlar = getDb().prepare('SELECT anahtar, deger FROM trendyol_ayarlar').all()
  const obj = {}
  for (const s of satirlar) obj[s.anahtar] = s.deger
  return require('./gizli-alan-canli').objeCoz('trendyol_ayarlar', obj)
}

// Renderer'a giderken hassas değerleri maskeler (girilmiş mi bilgisini korur).
function ayarlariGetirGuvenli() {
  const a = ayarlariGetir()
  const kopya = { ...a }
  for (const k of HASSAS) if (kopya[k]) kopya[k] = '********'
  return kopya
}

function ayarKaydetTek(anahtar, deger) {
  getDb().prepare(
    'INSERT INTO trendyol_ayarlar (anahtar, deger) VALUES (?, ?) ' +
    'ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger'
  ).run(
    anahtar,
    require('./gizli-alan-canli').yazmaDegeri('trendyol_ayarlar', anahtar, deger == null ? '' : String(deger)),
  )
}

function ayarlariKaydet(veri) {
  const db = getDb()
  const upsert = db.prepare(
    'INSERT INTO trendyol_ayarlar (anahtar, deger) VALUES (@anahtar, @deger) ' +
    'ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger'
  )
  const toplu = db.transaction((girisler) => {
    for (const [anahtar, deger] of girisler) {
      // Maskeli değer geri gönderildiyse mevcut değeri koru (üzerine yazma).
      if (HASSAS.has(anahtar) && (deger === '********' || deger === '' || deger == null)) continue
      const duz = deger == null ? '' : String(deger)
      upsert.run({ anahtar, deger: require('./gizli-alan-canli').yazmaDegeri('trendyol_ayarlar', anahtar, duz) })
    }
  })
  toplu(Object.entries(veri || {}))
  return ayarlariGetirGuvenli()
}

module.exports = {
  // client.js gerçek (maskelenmemiş) ayarları okuyabilsin diye — _ önekli, main.js atlar.
  _ayarlariGetir: ayarlariGetir,
  _ayarKaydetTek: ayarKaydetTek,

  'trendyol-ayar:getir': () => { yetkiKontrol('ayarlar_duzenle'); return ayarlariGetirGuvenli() },
  'trendyol-ayar:kaydet': (veri) => { yetkiKontrol('ayarlar_duzenle'); return ayarlariKaydet(veri) },
}
