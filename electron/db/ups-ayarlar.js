// UPS kargo ayarları (anahtar-değer) ve il/ilçe kod sorguları.
const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')

// sifre hassas → renderer'a maskeli döner (09.09.2026 güvenlik taraması: eskiden ÇÖZÜLMÜŞ
// şifre her giriş yapan role düz metin gidiyordu). Gerçek değer yalnız main tarafında (_ayarlariGetir).
const HASSAS = new Set(['sifre'])
const MASKE = '********'

// Tüm UPS ayarlarını obje olarak döndürür.
// sifre DİSKTE şifreli durur (bkz. db/gizli-alan.js); burada çözülür.
function ayarlariGetir() {
  const satirlar = getDb().prepare('SELECT anahtar, deger FROM ups_ayarlar').all()
  const obj = {}
  for (const s of satirlar) obj[s.anahtar] = s.deger
  return require('./gizli-alan-canli').objeCoz('ups_ayarlar', obj)
}

// Renderer'a giderken şifreyi maskeler (girilmiş mi bilgisini korur).
function ayarlariGetirGuvenli() {
  const kopya = { ...ayarlariGetir() }
  for (const k of HASSAS) if (kopya[k]) kopya[k] = MASKE
  return kopya
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
      // Maskeli/boş şifre geri gönderildiyse mevcut değeri koru (üzerine yazma).
      if (HASSAS.has(anahtar) && (deger === MASKE || deger === '' || deger == null)) continue
      const duz = deger === null || deger === undefined ? '' : String(deger)
      upsert.run({ anahtar, deger: require('./gizli-alan-canli').yazmaDegeri('ups_ayarlar', anahtar, duz) })
    }
  })
  toplu(Object.entries(veri || {}))
  return ayarlariGetirGuvenli()
}

module.exports = {
  // kargo.js'in ayarları okuyabilmesi için (IPC değil — _ önekli, main.js atlar).
  _ayarlariGetir: ayarlariGetir,

  'ups-ayar:getir': () => ayarlariGetirGuvenli(),
  'ups-ayar:kaydet': (veri) => { yetkiKontrol('ayarlar_duzenle'); return ayarlariKaydet(veri) },

  'ups:iller': () => {
    return getDb().prepare('SELECT DISTINCT il_kodu, il FROM ups_sehir_ilce ORDER BY il').all()
  },

  'ups:ilceler': (ilKodu) => {
    return getDb().prepare('SELECT ilce_kodu, ilce FROM ups_sehir_ilce WHERE il_kodu = ? ORDER BY ilce').all(ilKodu)
  },
}
