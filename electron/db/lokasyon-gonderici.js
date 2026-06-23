// Mağaza-bazlı UPS gönderici (çıkış) adresleri ve il/ilçe ad→kod yardımcısı.
const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')

const ALANLAR = ['ad', 'yetkili', 'adres', 'il', 'il_kodu', 'ilce', 'ilce_kodu', 'posta_kodu', 'telefon', 'cep', 'email']

// Tek mağazanın gönderici bilgisini döner (yoksa null). kargo.js kullanır.
function gondericiGetir(lokasyonId) {
  if (!lokasyonId) return null
  return getDb().prepare('SELECT * FROM lokasyon_gonderici WHERE lokasyon_id = ?').get(lokasyonId) || null
}

// İl/ilçe adından UPS kodlarını bulur (Türkçe büyük/küçük duyarsız).
function ilIlceKodBul(il, ilce) {
  if (!il) return null
  const db = getDb()
  const norm = (s) => String(s || '').trim().toLocaleUpperCase('tr-TR')
  const sonuc = { ilKodu: null, il: il || null, ilceKodu: null, ilce: ilce || null }
  const ilSatir = db.prepare(
    "SELECT DISTINCT il_kodu, il FROM ups_sehir_ilce WHERE UPPER(il) = ? LIMIT 1"
  ).get(norm(il))
  if (!ilSatir) return sonuc
  sonuc.ilKodu = ilSatir.il_kodu
  sonuc.il = ilSatir.il
  if (ilce) {
    const ilceSatir = db.prepare(
      "SELECT ilce_kodu, ilce FROM ups_sehir_ilce WHERE il_kodu = ? AND UPPER(ilce) = ? LIMIT 1"
    ).get(ilSatir.il_kodu, norm(ilce))
    if (ilceSatir) { sonuc.ilceKodu = ilceSatir.ilce_kodu; sonuc.ilce = ilceSatir.ilce }
  }
  return sonuc
}

module.exports = {
  _gondericiGetir: gondericiGetir,

  // Tüm mağaza gönderici bilgilerini { lokasyon_id: {...} } olarak döner.
  'lokasyon-gonderici:getir': () => {
    const satirlar = getDb().prepare('SELECT * FROM lokasyon_gonderici').all()
    const obj = {}
    for (const s of satirlar) obj[s.lokasyon_id] = s
    return obj
  },

  'lokasyon-gonderici:kaydet': ({ lokasyon_id, ...veri }) => {
    yetkiKontrol('ayarlar_duzenle')
    if (!lokasyon_id) throw new Error('Lokasyon belirtilmedi')
    const db = getDb()
    const kolonlar = ALANLAR.filter(a => a in veri)
    const set = kolonlar.map(k => `${k} = @${k}`).join(', ')
    const params = { lokasyon_id }
    for (const k of kolonlar) params[k] = veri[k] ?? null
    const mevcut = db.prepare('SELECT 1 FROM lokasyon_gonderici WHERE lokasyon_id = ?').get(lokasyon_id)
    if (mevcut) {
      if (kolonlar.length) db.prepare(`UPDATE lokasyon_gonderici SET ${set} WHERE lokasyon_id = @lokasyon_id`).run(params)
    } else {
      const kols = ['lokasyon_id', ...kolonlar]
      db.prepare(`INSERT INTO lokasyon_gonderici (${kols.join(',')}) VALUES (${kols.map(k => '@' + k).join(',')})`).run(params)
    }
    return db.prepare('SELECT * FROM lokasyon_gonderici WHERE lokasyon_id = ?').get(lokasyon_id)
  },

  'ups:il-ilce-bul': ({ il, ilce } = {}) => ilIlceKodBul(il, ilce),
}
