// Sosyal medya gelen kutusu — DB katmanı (yerel önbellek + personel takibi).
// Meta'dan çekilen yorum/DM'ler buraya idempotent (harici_id UNIQUE) yazılır.
// Ağ çağrıları electron/meta/index.js'te; bu dosya yalnızca yerel okuma/yazma yapar.
const { getDb } = require('./database')
const { listeFiltreleri: _listeFiltreleri, CEVAPSIZ_SAYAC, OKUNMAMIS_SAYAC } = require('./sosyal-filtre')

// Çekilen bir öğeyi ekler/günceller. harici_id çakışırsa metin/durum korunur (idempotent).
// Yeni gelen 'gelen' mesajları 'yeni' durumda kalır; giden (bizim gönderdiğimiz) 'giden'.
function _upsertMesaj(m) {
  const db = getDb()
  const mevcut = db.prepare('SELECT id FROM sosyal_mesajlar WHERE harici_id = ?').get(m.harici_id)
  if (mevcut) {
    // Gerçek ad öğrenildiyse yer tutucu 'Müşteri' adını düzelt (geriye dönük onarım).
    if (m.gonderen_ad && m.gonderen_ad !== 'Müşteri') {
      db.prepare(`UPDATE sosyal_mesajlar SET
        gonderen_ad = @gonderen_ad, gonderen_id = COALESCE(gonderen_id, @gonderen_id)
        WHERE id = @id AND (gonderen_ad IS NULL OR gonderen_ad = 'Müşteri')`).run({
        id: mevcut.id, gonderen_ad: m.gonderen_ad, gonderen_id: m.gonderen_id || null,
      })
    }
    // Mevcut satırda gönderi bağlamı / mesaj eki eksikse doldur (eski kayıtlar için geriye dönük).
    if (m.konu_baslik || m.konu_gorsel || m.konu_link || m.ek_tur) {
      db.prepare(`UPDATE sosyal_mesajlar SET
        konu_baslik = COALESCE(konu_baslik, @konu_baslik),
        -- Görsel adresi TERS yönde birleştirilir (yeni değer kazanır): Meta URL'leri
        -- süreli, eskisini korumak ölü adresi kalıcılaştırırdı. Kalıcılık artık
        -- meta/gorsel-onbellek.js'teki yerel dosyada.
        konu_gorsel = COALESCE(@konu_gorsel, konu_gorsel),
        konu_link   = COALESCE(konu_link, @konu_link),
        ek_tur      = COALESCE(ek_tur, @ek_tur),
        ek_baslik   = COALESCE(ek_baslik, @ek_baslik),
        ek_gorsel   = COALESCE(ek_gorsel, @ek_gorsel),
        ek_link     = COALESCE(ek_link, @ek_link)
        WHERE id = @id`).run({
        id: mevcut.id, konu_baslik: m.konu_baslik || null,
        konu_gorsel: m.konu_gorsel || null, konu_link: m.konu_link || null,
        ek_tur: m.ek_tur || null, ek_baslik: m.ek_baslik || null,
        ek_gorsel: m.ek_gorsel || null, ek_link: m.ek_link || null,
      })
    }
    return mevcut.id
  }
  // ÇİFT GÖRÜNME ÖNLEMİ: bizim gönderdiğimiz DM önce yerel "eko" satırı (harici_id 'giden_…')
  // olarak yazılır; sonra Meta'dan GERÇEK kimliğiyle geri çekilir (Send API kimliği çekim
  // kimliğiyle eşleşmez). Yeni satır açmak yerine aynı konuşmadaki aynı metinli ekoyu
  // benimseriz: eko gerçek kimliği alır, "kim yanıtladı" bilgisi korunur, kopya oluşmaz.
  if (m.tur === 'dm' && m.yon === 'giden' && m.konu_id) {
    const eko = db.prepare(`
      SELECT id FROM sosyal_mesajlar
      WHERE konu_id = ? AND tur = 'dm' AND yon = 'giden' AND metin = ?
        AND harici_id LIKE 'giden\\_%' ESCAPE '\\'
      ORDER BY id ASC LIMIT 1`).get(m.konu_id, m.metin || '')
    if (eko) {
      db.prepare('UPDATE sosyal_mesajlar SET harici_id = ?, mesaj_tarihi = COALESCE(?, mesaj_tarihi) WHERE id = ?')
        .run(m.harici_id, m.mesaj_tarihi || null, eko.id)
      return eko.id
    }
  }
  const bilgi = db.prepare(`
    INSERT INTO sosyal_mesajlar
      (platform, tur, harici_id, konu_id, ust_id, gonderen_id, gonderen_ad, metin, yon, durum, mesaj_tarihi, konu_baslik, konu_gorsel, konu_link, ek_tur, ek_baslik, ek_gorsel, ek_link)
    VALUES (@platform, @tur, @harici_id, @konu_id, @ust_id, @gonderen_id, @gonderen_ad, @metin, @yon, @durum, @mesaj_tarihi, @konu_baslik, @konu_gorsel, @konu_link, @ek_tur, @ek_baslik, @ek_gorsel, @ek_link)
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
    ek_tur: m.ek_tur || null,
    ek_baslik: m.ek_baslik || null,
    ek_gorsel: m.ek_gorsel || null,
    ek_link: m.ek_link || null,
  })
  return bilgi.lastInsertRowid
}

// Silinen gönderi tespiti: çekim turu Meta'dan gelen gönderi id'lerini verir. Turun kapsadığı
// tarih penceresi (en eski görülen gönderiden bugüne) İÇİNDE olup listede GÖRÜNMEYEN yerel
// gönderi = Meta'da silinmiş → işaretle (listeden gizlenir). Pencereden eski gönderilere
// dokunulmaz (listede olmamaları silindikleri anlamına gelmez — sayfalama kapsamı dışılar).
// Görünen gönderilerin işareti kaldırılır (yanlış pozitif kendini onarır).
function _silinenGonderileriIsaretle(platform, gorulenIdler, enEskiTarih) {
  if (!gorulenIdler || !gorulenIdler.size || !enEskiTarih) return
  const db = getDb()
  const adaylar = db.prepare(`
    SELECT id, konu_id, COALESCE(silindi, 0) silindi FROM sosyal_mesajlar
    WHERE platform = ? AND tur = 'gonderi' AND mesaj_tarihi >= ?`).all(platform, enEskiTarih)
  const guncelle = db.prepare('UPDATE sosyal_mesajlar SET silindi = ? WHERE id = ?')
  for (const a of adaylar) {
    const gorunuyor = gorulenIdler.has(a.konu_id)
    if (!gorunuyor && !a.silindi) guncelle.run(1, a.id)
    else if (gorunuyor && a.silindi) guncelle.run(0, a.id)
  }
}

// Yanıtlanmış ama 'yeni' kalmış gelenleri kapatır. Uygulama İÇİNDEN yanıt zaten kapatıyor;
// bu süpürücü uygulama DIŞINDAN (telefon, Business Suite) verilen yanıtları yakalar:
// - DM: gelen mesajdan SONRA bizim giden mesaj varsa o gelen yanıtlanmıştır.
// - Yorum: altına bizim (giden) yanıt yazılmış yorum yanıtlanmıştır.
// Her çekim turunun sonunda + migrate'te çalışır; idempotent.
function _yanitlananlariKapat() {
  const db = getDb()
  db.prepare(`
    UPDATE sosyal_mesajlar SET durum = 'cevaplandi'
    WHERE tur = 'dm' AND yon = 'gelen' AND durum = 'yeni'
      AND EXISTS (SELECT 1 FROM sosyal_mesajlar g
        WHERE g.konu_id = sosyal_mesajlar.konu_id AND g.tur = 'dm' AND g.yon = 'giden'
          AND COALESCE(g.mesaj_tarihi, g.cekilme_tarihi) >= COALESCE(sosyal_mesajlar.mesaj_tarihi, sosyal_mesajlar.cekilme_tarihi))`).run()
  db.prepare(`
    UPDATE sosyal_mesajlar SET durum = 'cevaplandi'
    WHERE tur = 'yorum' AND yon = 'gelen' AND durum = 'yeni'
      AND EXISTS (SELECT 1 FROM sosyal_mesajlar g
        WHERE g.tur = 'yorum' AND g.yon = 'giden' AND g.ust_id = sosyal_mesajlar.harici_id)`).run()
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
  // tur='gonderi' = gönderi işaretçisi (yorum değil) → yorum/mesaj listesinde gösterme.
  return getDb().prepare(
    "SELECT * FROM sosyal_mesajlar WHERE konu_id = ? AND tur != 'gonderi' ORDER BY COALESCE(mesaj_tarihi, cekilme_tarihi) ASC"
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
function gonderiler({ platform, arama, baslangic, bitis, cevapDurumu, okunma, atama, kullanici } = {}) {
  // 'gonderi' = gönderinin kendisi (yorumu olmasa bile listede görünsün); 'yorum' = yorumlar.
  const kosul = ["tur IN ('yorum','gonderi')"]
  const p = {}
  if (platform && platform !== 'hepsi') { kosul.push('platform=@platform'); p.platform = platform }
  if (arama) { kosul.push('(konu_baslik LIKE @ara OR metin LIKE @ara OR gonderen_ad LIKE @ara)'); p.ara = `%${arama}%` }
  // Tarih filtresi: gönderi yayın tarihine göre (gonderi işaretçisi yoksa son aktiviteye).
  const having = []
  const tarihExpr = "substr(COALESCE(MAX(CASE WHEN tur='gonderi' THEN mesaj_tarihi END), MAX(COALESCE(mesaj_tarihi, cekilme_tarihi))),1,10)"
  if (baslangic) { having.push(`${tarihExpr} >= @bas`); p.bas = baslangic }
  if (bitis) { having.push(`${tarihExpr} <= @bit`); p.bit = bitis }
  _listeFiltreleri({ cevapDurumu, okunma, atama, kullanici }, having, p)
  return getDb().prepare(`
    SELECT konu_id, platform,
      MAX(konu_baslik) konu_baslik, MAX(konu_gorsel) konu_gorsel, MAX(konu_link) konu_link,
      COUNT(CASE WHEN tur='yorum' THEN 1 END) yorum_sayisi,
      ${OKUNMAMIS_SAYAC} okunmamis,
      ${CEVAPSIZ_SAYAC} cevapsiz,
      MAX(atanan_kullanici) atanan,
      MAX(COALESCE(mesaj_tarihi, cekilme_tarihi)) son_zaman,
      MAX(CASE WHEN tur='gonderi' THEN COALESCE(mesaj_tarihi, cekilme_tarihi) END) gonderi_tarihi,
      (SELECT gonderen_ad FROM sosyal_mesajlar s2 WHERE s2.konu_id = s.konu_id AND s2.yon='gelen'
         ORDER BY COALESCE(s2.mesaj_tarihi, s2.cekilme_tarihi) DESC LIMIT 1) son_yorumcu
    FROM sosyal_mesajlar s
    WHERE ${kosul.join(' AND ')} AND konu_id IS NOT NULL
      -- Meta'da silinmiş gönderiler listelenmez (yorumları da anlamını yitirir).
      AND konu_id NOT IN (SELECT konu_id FROM sosyal_mesajlar WHERE tur = 'gonderi' AND silindi = 1)
    GROUP BY konu_id, platform
    ${having.length ? 'HAVING ' + having.join(' AND ') : ''}
    ORDER BY COALESCE(gonderi_tarihi, son_zaman) DESC
    LIMIT 500
  `).all(p)
}

// DM sekmeleri için: konuşmalar (konu_id bazlı). Her konuşma: kişi, son mesaj, okunmamış.
function konusmalar({ platform, arama, baslangic, bitis, cevapDurumu, okunma, atama, kullanici } = {}) {
  const kosul = ["tur='dm'"]
  const p = {}
  if (platform && platform !== 'hepsi') { kosul.push('platform=@platform'); p.platform = platform }
  if (arama) { kosul.push('(metin LIKE @ara OR gonderen_ad LIKE @ara)'); p.ara = `%${arama}%` }
  // Tarih filtresi: konuşmanın son mesaj tarihine göre.
  const having = []
  if (baslangic) { having.push("substr(MAX(COALESCE(mesaj_tarihi, cekilme_tarihi)),1,10) >= @bas"); p.bas = baslangic }
  if (bitis) { having.push("substr(MAX(COALESCE(mesaj_tarihi, cekilme_tarihi)),1,10) <= @bit"); p.bit = bitis }
  _listeFiltreleri({ cevapDurumu, okunma, atama, kullanici }, having, p)
  return getDb().prepare(`
    SELECT konu_id, platform,
      ${OKUNMAMIS_SAYAC} okunmamis,
      ${CEVAPSIZ_SAYAC} cevapsiz,
      MAX(atanan_kullanici) atanan,
      MAX(COALESCE(mesaj_tarihi, cekilme_tarihi)) son_zaman,
      -- kisi = MÜŞTERİ: konuşmanın son GELEN mesajının göndereni. Son mesaj bizim
      -- yanıtımızsa (yon='giden') adımızı göstermemeli. Gelen yoksa (biz başlattıysak)
      -- son herhangi bir göndereni yedek al.
      COALESCE(
        (SELECT gonderen_ad FROM sosyal_mesajlar s2 WHERE s2.konu_id = s.konu_id AND s2.yon='gelen'
           ORDER BY COALESCE(s2.mesaj_tarihi, s2.cekilme_tarihi) DESC LIMIT 1),
        (SELECT gonderen_ad FROM sosyal_mesajlar s2b WHERE s2b.konu_id = s.konu_id
           ORDER BY COALESCE(s2b.mesaj_tarihi, s2b.cekilme_tarihi) DESC LIMIT 1)
      ) kisi,
      -- Son mesajın metni; metin boşsa (hikaye yanıtı / paylaşım / medya) ek başlığını göster.
      (SELECT CASE WHEN COALESCE(metin,'') != '' THEN metin
                   WHEN ek_tur IS NOT NULL THEN '📎 ' || COALESCE(ek_baslik, 'Ek içerik')
                   ELSE metin END
         FROM sosyal_mesajlar s3 WHERE s3.konu_id = s.konu_id
         ORDER BY COALESCE(s3.mesaj_tarihi, s3.cekilme_tarihi) DESC LIMIT 1) son_metin
    FROM sosyal_mesajlar s
    WHERE ${kosul.join(' AND ')} AND konu_id IS NOT NULL
    GROUP BY konu_id, platform
    ${having.length ? 'HAVING ' + having.join(' AND ') : ''}
    ORDER BY son_zaman DESC
    LIMIT 200
  `).all(p)
}

module.exports = {
  _upsertMesaj,
  _silinenGonderileriIsaretle,
  _yanitlananlariKapat,
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
