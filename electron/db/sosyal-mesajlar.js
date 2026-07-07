// Sosyal medya gelen kutusu — DB katmanı (yerel önbellek + personel takibi).
// Meta'dan çekilen yorum/DM'ler buraya idempotent (harici_id UNIQUE) yazılır.
// Ağ çağrıları electron/meta/index.js'te; bu dosya yalnızca yerel okuma/yazma yapar.
const { getDb } = require('./database')

// Çekilen bir öğeyi ekler/günceller. harici_id çakışırsa metin/durum korunur (idempotent).
// Yeni gelen 'gelen' mesajları 'yeni' durumda kalır; giden (bizim gönderdiğimiz) 'giden'.
function _upsertMesaj(m) {
  const db = getDb()
  const mevcut = db.prepare('SELECT id FROM sosyal_mesajlar WHERE harici_id = ?').get(m.harici_id)
  if (mevcut) {
    // Mevcut satırda gönderi bağlamı eksikse doldur (eski kayıtlar için geriye dönük).
    if (m.konu_baslik || m.konu_gorsel || m.konu_link) {
      db.prepare(`UPDATE sosyal_mesajlar SET
        konu_baslik = COALESCE(konu_baslik, @konu_baslik),
        konu_gorsel = COALESCE(konu_gorsel, @konu_gorsel),
        konu_link   = COALESCE(konu_link, @konu_link)
        WHERE id = @id`).run({
        id: mevcut.id, konu_baslik: m.konu_baslik || null,
        konu_gorsel: m.konu_gorsel || null, konu_link: m.konu_link || null,
      })
    }
    return mevcut.id
  }
  const bilgi = db.prepare(`
    INSERT INTO sosyal_mesajlar
      (platform, tur, harici_id, konu_id, ust_id, gonderen_id, gonderen_ad, metin, yon, durum, mesaj_tarihi, konu_baslik, konu_gorsel, konu_link)
    VALUES (@platform, @tur, @harici_id, @konu_id, @ust_id, @gonderen_id, @gonderen_ad, @metin, @yon, @durum, @mesaj_tarihi, @konu_baslik, @konu_gorsel, @konu_link)
  `).run({
    platform: m.platform,
    tur: m.tur,
    harici_id: m.harici_id,
    konu_id: m.konu_id || null,
    ust_id: m.ust_id || null,
    gonderen_id: m.gonderen_id || null,
    gonderen_ad: m.gonderen_ad || null,
    metin: m.metin || '',
    yon: m.yon || 'gelen',
    durum: m.yon === 'giden' ? 'cevaplandi' : 'yeni',
    mesaj_tarihi: m.mesaj_tarihi || null,
    konu_baslik: m.konu_baslik || null,
    konu_gorsel: m.konu_gorsel || null,
    konu_link: m.konu_link || null,
  })
  return bilgi.lastInsertRowid
}

const SAYFA_BOYUT = 50

// Filtreli + sayfalı liste. Konu bazlı en son mesajı temsilen düz liste döner.
function liste({ platform, tur, durum, arama, sayfa = 1 } = {}) {
  const kosul = []
  const p = {}
  if (platform && platform !== 'hepsi') { kosul.push('platform = @platform'); p.platform = platform }
  if (tur && tur !== 'hepsi') { kosul.push('tur = @tur'); p.tur = tur }
  if (durum && durum !== 'hepsi') { kosul.push('durum = @durum'); p.durum = durum }
  if (arama) { kosul.push('(metin LIKE @ara OR gonderen_ad LIKE @ara)'); p.ara = `%${arama}%` }
  const where = kosul.length ? `WHERE ${kosul.join(' AND ')}` : ''
  const db = getDb()
  const toplam = db.prepare(`SELECT COUNT(*) n FROM sosyal_mesajlar ${where}`).get(p).n
  const offset = (Math.max(1, sayfa) - 1) * SAYFA_BOYUT
  const satirlar = db.prepare(`
    SELECT * FROM sosyal_mesajlar ${where}
    ORDER BY COALESCE(mesaj_tarihi, cekilme_tarihi) DESC
    LIMIT ${SAYFA_BOYUT} OFFSET ${offset}
  `).all(p)
  return { satirlar, toplam, sayfa: Math.max(1, sayfa), sayfaBoyut: SAYFA_BOYUT }
}

// Bir konunun (gönderi/konuşma) tüm mesajları — kronolojik (sohbet görünümü).
function konu(konu_id) {
  return getDb().prepare(
    'SELECT * FROM sosyal_mesajlar WHERE konu_id = ? ORDER BY COALESCE(mesaj_tarihi, cekilme_tarihi) ASC'
  ).all(konu_id)
}

function durumGuncelle({ id, durum }) {
  getDb().prepare('UPDATE sosyal_mesajlar SET durum = ? WHERE id = ?').run(durum, id)
  return { ok: true }
}

// "Kim neye bakıyor" — tek mesaj bazlı personel atama.
function ata({ id, kullanici }) {
  getDb().prepare('UPDATE sosyal_mesajlar SET atanan_kullanici = ? WHERE id = ?').run(kullanici || null, id)
  return { ok: true }
}

// Konuşma/gönderi bazlı atama: liste gruplaması konu_id bazlı olduğundan atamayı
// o konunun tüm satırlarına yazarız (böylece grup satırında "atanan" tutarlı görünür).
// kullanici boş/null verilirse atama kaldırılır ("bırak").
function ataKonu({ konu_id, kullanici }) {
  getDb().prepare('UPDATE sosyal_mesajlar SET atanan_kullanici = ? WHERE konu_id = ?').run(kullanici || null, konu_id)
  return { ok: true }
}

function notKaydet({ id, ic_not }) {
  getDb().prepare('UPDATE sosyal_mesajlar SET ic_not = ? WHERE id = ?').run(ic_not || null, id)
  return { ok: true }
}

// Okunmamış (yeni) öğe sayısı — navigasyon rozeti için.
function sayac() {
  return getDb().prepare("SELECT COUNT(*) n FROM sosyal_mesajlar WHERE durum = 'yeni' AND yon = 'gelen'").get().n
}

// Üst sekme sayaçları (Meta Business Suite tarzı): her sekmedeki okunmamış adet.
function sayaclar() {
  const db = getDb()
  const q = (kosul) => db.prepare(
    `SELECT COUNT(*) n FROM sosyal_mesajlar WHERE durum='yeni' AND yon='gelen' AND ${kosul}`
  ).get().n
  return {
    hepsi: q('1=1'),
    messenger: q("tur='dm' AND platform='facebook'"),
    instagram_dm: q("tur='dm' AND platform='instagram'"),
    fb_yorum: q("tur='yorum' AND platform='facebook'"),
    ig_yorum: q("tur='yorum' AND platform='instagram'"),
  }
}

// Yorum sekmeleri için: yorumların geldiği GÖNDERİLER (konu_id bazlı gruplama).
// Her gönderi: başlık, görsel, yorum sayısı, okunmamış, son yorum zamanı.
function gonderiler({ platform, arama } = {}) {
  const kosul = ["tur='yorum'"]
  const p = {}
  if (platform && platform !== 'hepsi') { kosul.push('platform=@platform'); p.platform = platform }
  if (arama) { kosul.push('(konu_baslik LIKE @ara OR metin LIKE @ara OR gonderen_ad LIKE @ara)'); p.ara = `%${arama}%` }
  return getDb().prepare(`
    SELECT konu_id, platform,
      MAX(konu_baslik) konu_baslik, MAX(konu_gorsel) konu_gorsel, MAX(konu_link) konu_link,
      COUNT(*) yorum_sayisi,
      SUM(CASE WHEN durum='yeni' AND yon='gelen' THEN 1 ELSE 0 END) okunmamis,
      MAX(atanan_kullanici) atanan,
      MAX(COALESCE(mesaj_tarihi, cekilme_tarihi)) son_zaman,
      (SELECT gonderen_ad FROM sosyal_mesajlar s2 WHERE s2.konu_id = s.konu_id AND s2.yon='gelen'
         ORDER BY COALESCE(s2.mesaj_tarihi, s2.cekilme_tarihi) DESC LIMIT 1) son_yorumcu
    FROM sosyal_mesajlar s
    WHERE ${kosul.join(' AND ')} AND konu_id IS NOT NULL
    GROUP BY konu_id, platform
    ORDER BY son_zaman DESC
    LIMIT 100
  `).all(p)
}

// DM sekmeleri için: konuşmalar (konu_id bazlı). Her konuşma: kişi, son mesaj, okunmamış.
function konusmalar({ platform, arama } = {}) {
  const kosul = ["tur='dm'"]
  const p = {}
  if (platform && platform !== 'hepsi') { kosul.push('platform=@platform'); p.platform = platform }
  if (arama) { kosul.push('(metin LIKE @ara OR gonderen_ad LIKE @ara)'); p.ara = `%${arama}%` }
  return getDb().prepare(`
    SELECT konu_id, platform,
      SUM(CASE WHEN durum='yeni' AND yon='gelen' THEN 1 ELSE 0 END) okunmamis,
      MAX(atanan_kullanici) atanan,
      MAX(COALESCE(mesaj_tarihi, cekilme_tarihi)) son_zaman,
      (SELECT gonderen_ad FROM sosyal_mesajlar s2 WHERE s2.konu_id = s.konu_id
         ORDER BY COALESCE(s2.mesaj_tarihi, s2.cekilme_tarihi) DESC LIMIT 1) kisi,
      (SELECT metin FROM sosyal_mesajlar s3 WHERE s3.konu_id = s.konu_id
         ORDER BY COALESCE(s3.mesaj_tarihi, s3.cekilme_tarihi) DESC LIMIT 1) son_metin
    FROM sosyal_mesajlar s
    WHERE ${kosul.join(' AND ')} AND konu_id IS NOT NULL
    GROUP BY konu_id, platform
    ORDER BY son_zaman DESC
    LIMIT 100
  `).all(p)
}

module.exports = {
  _upsertMesaj,
  'sosyal:liste': (arg) => liste(arg),
  'sosyal:konu': (konu_id) => konu(konu_id),
  'sosyal:durumGuncelle': (arg) => durumGuncelle(arg),
  'sosyal:ata': (arg) => ata(arg),
  'sosyal:ataKonu': (arg) => ataKonu(arg),
  'sosyal:not': (arg) => notKaydet(arg),
  'sosyal:sayac': () => sayac(),
  'sosyal:sayaclar': () => sayaclar(),
  'sosyal:gonderiler': (arg) => gonderiler(arg),
  'sosyal:konusmalar': (arg) => konusmalar(arg),
}
