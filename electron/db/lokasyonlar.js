const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')

// Renderer'dan gelen nesnenin ANAHTARLARI doğrudan SQL kolon adı olarak kullanılıyordu.
// Değerler parametrize olsa da kolon adı enjeksiyona açıktı (sorgu semantiğini bozma / şema keşfi).
// Beyaz liste dışındaki her alan reddedilir.
const IZINLI_KOLONLAR = new Set(['ad', 'adres', 'telefon', 'ikas_lokasyon_id', 'aktif'])

function guvenliKolonlar(veri) {
  const kolonlar = Object.keys(veri)
  if (!kolonlar.length) throw new Error('Güncellenecek alan yok')
  for (const k of kolonlar) {
    if (!IZINLI_KOLONLAR.has(k)) throw new Error(`Geçersiz alan: ${k}`)
  }
  return kolonlar
}

module.exports = {
  'lokasyonlar:listele': () => {
    return getDb().prepare('SELECT * FROM lokasyonlar WHERE aktif = 1 ORDER BY id').all()
  },

  // Yetki ŞART: lokasyon eklemek/değiştirmek ikas_lokasyon_id eşleşmesini de değiştirir,
  // yanlış eşleşme stok senkronunu yanlış mağazaya gönderir.
  'lokasyonlar:olustur': (veri) => {
    yetkiKontrol('ayarlar_duzenle')
    const db = getDb()
    const result = db.prepare(
      'INSERT INTO lokasyonlar (ad, adres, telefon, ikas_lokasyon_id) VALUES (@ad, @adres, @telefon, @ikas_lokasyon_id)'
    ).run(veri)
    return db.prepare('SELECT * FROM lokasyonlar WHERE id = ?').get(result.lastInsertRowid)
  },

  'lokasyonlar:guncelle': ({ id, ...veri }) => {
    yetkiKontrol('ayarlar_duzenle')
    const db = getDb()
    const kolonlar = guvenliKolonlar(veri)
    const alanlar = kolonlar.map(k => `${k} = @${k}`).join(', ')
    db.prepare(`UPDATE lokasyonlar SET ${alanlar} WHERE id = @id`).run({ ...veri, id })
    return db.prepare('SELECT * FROM lokasyonlar WHERE id = ?').get(id)
  },
}
