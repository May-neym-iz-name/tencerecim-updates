// Bizimhesap kimlik bilgileri (anahtar-değer). ikas/UPS ayar modeliyle AYNI yapı.
//
// firm_id  → addinvoice gövdesinde; fatura kesmenin TEK kimlik doğrulaması.
// token    → products/warehouses/inventory başlığında (fatura stoğu tohumlama).
//
// Panelde ikisi de aynı yerden çıkıyor: E-Ticaret > Ayarlar > (bir entegratör
// uygulaması) > API Key. Değer firma düzeyinde: hangi uygulamayı açarsan aç aynı.
//
// 🔴 ŞİFRELEME YALNIZ DİSKTE (bkz. db/gizli-alan.js): DPAPI anahtarı makineye
// bağlı, şifreli değer buluta giderse 2. PC onu ASLA çözemez ve fatura kesme
// orada sessizce ölür. Buluta düz metin gider, RLS korur.
const { getDb } = require('./database')
const { yetkiKontrol } = require('../yetki')

// Renderer'a maskeli döner; gerçek değer DB'de kalır.
const HASSAS = new Set(['firm_id', 'token'])

function ayarlariGetir() {
  const satirlar = getDb().prepare('SELECT anahtar, deger FROM fatura_ayarlar').all()
  const obj = {}
  for (const s of satirlar) obj[s.anahtar] = s.deger
  return require('./gizli-alan-canli').objeCoz('fatura_ayarlar', obj)
}

// Girilmiş mi bilgisini korur ama değeri sızdırmaz.
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
    'INSERT INTO fatura_ayarlar (anahtar, deger) VALUES (@anahtar, @deger) ' +
    'ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger'
  )
  const toplu = db.transaction((girisler) => {
    for (const [anahtar, deger] of girisler) {
      // Maskeli değer geri gönderildiyse mevcut olanı KORU (üzerine yazma).
      if (HASSAS.has(anahtar) && (deger === '********' || deger === '' || deger == null)) continue
      const duz = deger == null ? '' : String(deger).trim()
      upsert.run({ anahtar, deger: require('./gizli-alan-canli').yazmaDegeri('fatura_ayarlar', anahtar, duz) })
    }
  })
  toplu(Object.entries(veri || {}))
  return ayarlariGetirGuvenli()
}

module.exports = {
  _ayarlariGetir: ayarlariGetir,

  // Yetki: kimlik bilgisini yalnız fatura stoğunu düzenleyebilen görsün/değiştirsin.
  'fatura-ayar:getir': async () => {
    yetkiKontrol('fatura_stok_duzenle')
    return ayarlariGetirGuvenli()
  },

  'fatura-ayar:kaydet': async (veri) => {
    yetkiKontrol('fatura_stok_duzenle')
    return ayarlariKaydet(veri)
  },

  // Bağlantı sınaması: SALT OKUNUR products ucuna gider, fatura KESMEZ.
  'fatura-ayar:sina': async () => {
    yetkiKontrol('fatura_stok_duzenle')
    const a = ayarlariGetir()
    return require('../fatura/saglayici/bizimhesap').baglantiSina(a)
  },
}
