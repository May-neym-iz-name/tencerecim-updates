// Yapay zeka ayarları (anahtar-değer). youtube-ayarlar.js modeliyle aynı.
// gemini_anahtar hassas → renderer'a maskeli döner; gerçek değer DB'de
// (gizli-alan ile) şifreli kalır.
//
// Anahtar Google AI Studio'dan alınır (aistudio.google.com → Get API key).
// SENKRONLANMAZ: şifreli değer başka PC'de çözülemez, her PC kendi anahtarını tutar.
const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')

const HASSAS = new Set(['gemini_anahtar'])

function ayarlariGetir() {
  const satirlar = getDb().prepare('SELECT anahtar, deger FROM ai_ayarlar').all()
  const obj = {}
  for (const s of satirlar) obj[s.anahtar] = s.deger
  return require('./gizli-alan-canli').objeCoz('ai_ayarlar', obj)
}

function ayarlariGetirGuvenli() {
  const a = ayarlariGetir()
  const kopya = { ...a }
  for (const k of HASSAS) if (kopya[k]) kopya[k] = '********'
  return kopya
}

function ayarlariKaydet(veri) {
  const db = getDb()
  const upsert = db.prepare(
    'INSERT INTO ai_ayarlar (anahtar, deger) VALUES (@anahtar, @deger) ' +
    'ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger'
  )
  db.transaction((girisler) => {
    for (const [anahtar, deger] of girisler) {
      // Maskeli değer geri gönderildiyse mevcut değeri KORU (üzerine yazma).
      if (HASSAS.has(anahtar) && (deger === '********' || deger === '' || deger == null)) continue
      const duz = deger == null ? '' : String(deger)
      upsert.run({ anahtar, deger: require('./gizli-alan-canli').yazmaDegeri('ai_ayarlar', anahtar, duz) })
    }
  })(Object.entries(veri || {}))
  return ayarlariGetirGuvenli()
}

/** Anahtar girilmiş mi — arayüz "önce anahtarı girin" diyebilsin diye. */
function hazirMi() {
  return Boolean((ayarlariGetir().gemini_anahtar || '').trim())
}

module.exports = {
  _ayarlariGetir: ayarlariGetir,
  _hazirMi: hazirMi,
  'ai-ayar:getir': () => ({ ...ayarlariGetirGuvenli(), hazir: hazirMi() }),
  'ai-ayar:kaydet': (veri) => { yetkiKontrol('ayarlar_duzenle'); return ayarlariKaydet(veri) },
}
