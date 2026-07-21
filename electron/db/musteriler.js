const { getDb } = require('./database')
const { kelimeKosulu } = require('./tr-arama')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')

// Renderer'dan gelen nesnenin ANAHTARLARI doğrudan SQL kolon adı oluyordu. Değerler
// parametrize olsa da kolon adı enjeksiyona açıktı (sorgu semantiğini bozma / şema keşfi).
// id, olusturma_tarihi ve senk_* alanları BİLEREK yok: bunları istemci yazamamalı.
const IZINLI_KOLONLAR = new Set([
  'ad', 'soyad', 'telefon', 'email', 'tc_kimlik', 'vergi_no', 'vergi_dairesi',
  'unvan', 'adres', 'il', 'ilce', 'aktif', 'iskonto_orani',
  'ikas_musteri_id', 'ikas_siparis_sayisi', 'ikas_toplam_harcama',
  'ikas_ilk_siparis', 'ikas_son_siparis',
])

function guvenliKolonlar(veri) {
  const kolonlar = Object.keys(veri)
  if (!kolonlar.length) throw new Error('Kaydedilecek alan yok')
  for (const k of kolonlar) {
    if (!IZINLI_KOLONLAR.has(k)) throw new Error(`Geçersiz alan: ${k}`)
  }
  return kolonlar
}

module.exports = {
  'musteriler:listele': ({ arama, sayfa = 1, boyut = 100 } = {}) => {
    const db = getDb()
    let sorgu = 'SELECT * FROM musteriler WHERE aktif = 1'
    const params = []
    if (arama) {
      // Kelime bazlı arama (sıra önemsiz): "ömer keskin" gibi tam ad sorguları için
      // her kelime ad+soyad+telefon+vergi birleşiminde ayrı ayrı aranır.
      //
      // tr_kucuk → tr_ara: eskisi toLocaleLowerCase('tr') idi ve ASCII "I"yi NOKTASIZ "ı"
      // yapıyordu; "ISMAIL" yazan "İSMAİL"i BULAMIYORDU. tr_ara harfleri katlar
      // (i/ı/İ/I → i, ö→o, ç→c...), böylece "omer keskin" de "ÖMER KESKİN"i bulur.
      const k = kelimeKosulu("ad || ' ' || COALESCE(soyad,'') || ' ' || COALESCE(telefon,'') || ' ' || COALESCE(vergi_no,'')", arama)
      sorgu += k.sql
      params.push(...k.params)
    }
    const toplam = db.prepare(`SELECT COUNT(*) as n FROM (${sorgu})`).get(...params).n
    sorgu += ' ORDER BY ad, soyad'
    if (boyut && boyut > 0) { sorgu += ' LIMIT ? OFFSET ?'; params.push(boyut, (sayfa - 1) * boyut) }
    return { toplam, musteriler: db.prepare(sorgu).all(...params) }
  },

  'musteriler:getir': (id) => {
    return getDb().prepare('SELECT * FROM musteriler WHERE id = ?').get(id)
  },

  'musteriler:olustur': (veri) => {
    yetkiKontrol('musteri_duzenle')
    const db = getDb()
    const kolonlar = guvenliKolonlar(veri)
    const placeholders = kolonlar.map(k => `@${k}`).join(', ')
    const result = db.prepare(
      `INSERT INTO musteriler (${kolonlar.join(', ')}) VALUES (${placeholders})`
    ).run(veri)
    return db.prepare('SELECT * FROM musteriler WHERE id = ?').get(result.lastInsertRowid)
  },

  'musteriler:guncelle': ({ id, ...veri }) => {
    yetkiKontrol('musteri_duzenle')
    const db = getDb()
    const alanlar = guvenliKolonlar(veri).map(k => `${k} = @${k}`).join(', ')
    db.prepare(`UPDATE musteriler SET ${alanlar} WHERE id = @id`).run({ ...veri, id })
    return db.prepare('SELECT * FROM musteriler WHERE id = ?').get(id)
  },

  'musteriler:sil': (id) => {
    yetkiKontrol('musteri_sil')
    getDb().prepare('UPDATE musteriler SET aktif = 0 WHERE id = ?').run(id)
    return { mesaj: 'Müşteri silindi' }
  },
}
