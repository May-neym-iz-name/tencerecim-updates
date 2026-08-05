// Sosyal medya gelen kutusu — DB katmanı (yerel önbellek + personel takibi).
// Meta'dan çekilen yorum/DM'ler buraya idempotent (harici_id UNIQUE) yazılır.
// Ağ çağrıları electron/meta/index.js'te; bu dosya yalnızca yerel okuma/yazma yapar.
const database = require('./database')
const { listeFiltreleri: _listeFiltreleri, CEVAPSIZ_SAYAC, OKUNMAMIS_SAYAC } = require('./sosyal-filtre')
const { kelimeler, likeDeseni } = require('./tr-arama')

// Türkçe duyarsız, kelime bazlı arama koşulları — ADLI parametrelerle.
//
// NEDEN tr-arama.js'teki kelimeKosulu KULLANILMIYOR: o KONUMSAL (?) parametre üretir,
// bu dosyadaki sorgular ise baştan sona ADLI (@platform, @bas, @bit...) kullanıyor.
// better-sqlite3'te ikisini aynı sorguda karıştırmak bağlama sırasını kırılgan hale
// getirir. Mantık aynı, yalnız parametre biçimi farklı.
//
// Neden ham LIKE yetmiyordu (2026-08-05'e kadar öyleydi): SQLite LIKE yalnız ASCII'de
// büyük/küçük duyarsız — "celik" yazan "ÇELİK"i, "lines" yazan "LİNES"i BULAMIYORDU.
// Ayrıca tek parça arandığı için "tencere granit" ancak bitişik geçerse eşleşiyordu.
// tr_ara() harfleri katlar (i/ı/İ/I → i, ş→s, ğ→g, ü→u, ö→o, ç→c); kelimelere bölüp
// her birini AND'lemek de sırayı önemsiz kılar.
function aramaKosullari(alanIfadesi, arama, p, onek = 'ara') {
  return kelimeler(arama).map((k, i) => {
    p[`${onek}${i}`] = likeDeseni(k)
    return `tr_ara(${alanIfadesi}) LIKE @${onek}${i} ESCAPE '\\'`
  })
}

// TEST DİKİŞİ — üretimde her zaman gerçek veritabanı döner.
//
// Neden gerekli: bu dosyadaki SQL'in kendisi test edilecek (sosyal_gonderiler JOIN'i,
// belirsiz sütun adları, geriye dönük okuma). better-sqlite3 Electron ABI'sine derli
// olduğu için vitest'te açılamıyor; node:sqlite ile bellek içi bir DB kullanılıyor.
// vi.mock BU DOSYADA İŞE YARAMAZ: CommonJS require'ı yakalamıyor (aynı tuzak
// kargo-durum köprüsü testlerinde de yaşandı) — bu yüzden açık bir setter var.
// senk-veri.js'teki "db'yi parametre olarak geçir" desenine göre daha küçük bir
// değişiklik: burada 15 fonksiyon getDb() çağırıyor, hepsinin imzasını değiştirmek
// üretim kodunu test uğruna bozardı.
let _testDb = null
function getDb() { return _testDb || database.getDb() }
function _dbAyarla(db) { _testDb = db } // YALNIZ TEST

// Gönderi (konu) meta verisini sosyal_gonderiler'e TEK KOPYA olarak yazar.
//
// Eskiden bu üç alan her mesaj satırına kopyalanıyordu; 1.983 gönderinin bilgisi 97.973
// kez tekrarlanıp veritabanına 100 MB ekliyordu (2026-08-04 ölçümü, bkz. database.js).
//
// Görsel adresinde YENİ değer kazanır (COALESCE ters yönde): Meta görsel adresleri
// SÜRELİ, eskisini korumak ölü adresi kalıcılaştırırdı. Başlık/link ise ilk öğrenilen
// değerde kalır — onlar değişmez ve sonraki çekimlerde boş gelebilir.
function _gonderiKaydet(m) {
  if (!m.konu_id) return
  if (!m.konu_baslik && !m.konu_gorsel && !m.konu_link) return
  getDb().prepare(`
    INSERT INTO sosyal_gonderiler (konu_id, platform, baslik, gorsel, link)
    VALUES (@konu_id, @platform, @baslik, @gorsel, @link)
    ON CONFLICT(konu_id) DO UPDATE SET
      platform   = COALESCE(sosyal_gonderiler.platform, excluded.platform),
      baslik     = COALESCE(sosyal_gonderiler.baslik, excluded.baslik),
      gorsel     = COALESCE(excluded.gorsel, sosyal_gonderiler.gorsel),
      link       = COALESCE(sosyal_gonderiler.link, excluded.link),
      guncelleme = datetime('now','localtime')
  `).run({
    konu_id: m.konu_id,
    platform: m.platform || null,
    baslik: m.konu_baslik || null,
    gorsel: m.konu_gorsel || null,
    link: m.konu_link || null,
  })
}

// Çekilen bir öğeyi ekler/günceller. harici_id çakışırsa metin/durum korunur (idempotent).
// Yeni gelen 'gelen' mesajları 'yeni' durumda kalır; giden (bizim gönderdiğimiz) 'giden'.
function _upsertMesaj(m) {
  const db = getDb()
  // Gönderi bilgisi mesaj satırına DEĞİL, kendi tablosuna yazılır.
  _gonderiKaydet(m)
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
    // Mesaj EKİ eksikse doldur (eski kayıtlar için geriye dönük).
    // konu_baslik/konu_gorsel/konu_link ARTIK YAZILMAZ — yukarıdaki _gonderiKaydet
    // onları sosyal_gonderiler'e tek kopya olarak aldı. Buraya yazmaya devam etseydik
    // tekrar birikmesi durmazdı (asıl sorun buydu).
    // ek_* alanları MESAJA aittir (hikaye yanıtı, paylaşılan gönderi, medya) —
    // gönderi meta verisi değil, bu yüzden mesaj satırında kalır.
    if (m.ek_tur) {
      db.prepare(`UPDATE sosyal_mesajlar SET
        ek_tur      = COALESCE(ek_tur, @ek_tur),
        ek_baslik   = COALESCE(ek_baslik, @ek_baslik),
        ek_gorsel   = COALESCE(ek_gorsel, @ek_gorsel),
        ek_link     = COALESCE(ek_link, @ek_link)
        WHERE id = @id`).run({
        id: mevcut.id,
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
      -- konu_baslik/konu_gorsel/konu_link BİLEREK YOK: gönderi meta verisi
      -- sosyal_gonderiler tablosunda tek kopya durur (_gonderiKaydet).
      (platform, tur, harici_id, konu_id, ust_id, gonderen_id, gonderen_ad, metin, yon, durum, mesaj_tarihi, ek_tur, ek_baslik, ek_gorsel, ek_link)
    VALUES (@platform, @tur, @harici_id, @konu_id, @ust_id, @gonderen_id, @gonderen_ad, @metin, @yon, @durum, @mesaj_tarihi, @ek_tur, @ek_baslik, @ek_gorsel, @ek_link)
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
  // Koşullar BAŞTAN 's.' önekiyle kurulur: liste sorgusu sosyal_gonderiler ile JOIN
  // yaptığı için öneksiz kolon adları belirsiz kalırdı. Sonradan metin değiştirerek
  // önek eklemek denendi ve HATALIYDI — '\bplatform\b' deseni '@platform' parametre
  // adının içindeki kelimeyi de yakalayıp '@s.platform' üretiyordu.
  const kosul = []
  const p = {}
  if (platform && platform !== 'hepsi') { kosul.push('s.platform = @platform'); p.platform = platform }
  if (tur && tur !== 'hepsi') { kosul.push('s.tur = @tur'); p.tur = tur }
  if (durum && durum !== 'hepsi') { kosul.push('s.durum = @durum'); p.durum = durum }
  // Mesaj metni + gönderen adı tek alanda birleştirilip aranır.
  if (arama) kosul.push(...aramaKosullari("COALESCE(s.metin,'') || ' ' || COALESCE(s.gonderen_ad,'')", arama, p))
  const where = kosul.length ? `WHERE ${kosul.join(' AND ')}` : ''
  const db = getDb()
  const toplam = db.prepare(`SELECT COUNT(*) n FROM sosyal_mesajlar s ${where}`).get(p).n
  const offset = (Math.max(1, sayfa) - 1) * SAYFA_BOYUT
  // GÖNDERİ BİLGİSİ İKİ KAYNAKLI: yeni mesajlar konu_* kolonlarını taşımaz (tekrar
  // birikmesin diye), bilgi sosyal_gonderiler'den gelir. ESKİ satırlar hâlâ kendi
  // kolonlarını taşıdığı için önce onlara bakılır → hiçbir eski kayıt boş görünmez.
  // Sıralama önemli: s.* içindeki konu_baslik'i sonraki aynı adlı sütun geçersiz kılar
  // (sosyal-mesajlar.test.js bunu doğruluyor — varsayıma bırakılmadı).
  const satirlar = db.prepare(`
    SELECT s.*,
           COALESCE(s.konu_baslik, g.baslik) konu_baslik,
           COALESCE(s.konu_gorsel, g.gorsel) konu_gorsel,
           COALESCE(s.konu_link,   g.link)   konu_link
    FROM sosyal_mesajlar s
    LEFT JOIN sosyal_gonderiler g ON g.konu_id = s.konu_id
    ${where}
    ORDER BY COALESCE(s.mesaj_tarihi, s.cekilme_tarihi) DESC
    LIMIT ${SAYFA_BOYUT} OFFSET ${offset}
  `).all(p)
  return { satirlar, toplam, sayfa: Math.max(1, sayfa), sayfaBoyut: SAYFA_BOYUT }
}

// Bir konunun (gönderi/konuşma) tüm mesajları — kronolojik (sohbet görünümü).
function konu(konu_id) {
  // tur='gonderi' = gönderi işaretçisi (yorum değil) → yorum/mesaj listesinde gösterme.
  return getDb().prepare(`
    SELECT s.*,
           COALESCE(s.konu_baslik, g.baslik) konu_baslik,
           COALESCE(s.konu_gorsel, g.gorsel) konu_gorsel,
           COALESCE(s.konu_link,   g.link)   konu_link
    FROM sosyal_mesajlar s
    LEFT JOIN sosyal_gonderiler g ON g.konu_id = s.konu_id
    WHERE s.konu_id = ? AND s.tur != 'gonderi'
    ORDER BY COALESCE(s.mesaj_tarihi, s.cekilme_tarihi) ASC`
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
  // JOIN sonrası konu_id ve platform İKİ tabloda birden var → 's.' öneki ŞART,
  // yoksa SQLite "ambiguous column name" ile sorguyu tümden reddeder.
  const kosul = ["s.tur IN ('yorum','gonderi')"]
  const p = {}
  if (platform && platform !== 'hepsi') { kosul.push('s.platform=@platform'); p.platform = platform }
  // Başlık araması iki kaynağa da bakmalı: yeni gönderilerde başlık artık yalnız
  // sosyal_gonderiler'de, eskilerde hâlâ mesaj satırında.
  if (arama) {
    kosul.push(...aramaKosullari("COALESCE(s.konu_baslik, g.baslik, '') || ' ' || COALESCE(s.metin,'') || ' ' || COALESCE(s.gonderen_ad,'')", arama, p))
  }
  // Tarih filtresi: gönderi yayın tarihine göre (gonderi işaretçisi yoksa son aktiviteye).
  const having = []
  const tarihExpr = "substr(COALESCE(MAX(CASE WHEN tur='gonderi' THEN mesaj_tarihi END), MAX(COALESCE(mesaj_tarihi, cekilme_tarihi))),1,10)"
  if (baslangic) { having.push(`${tarihExpr} >= @bas`); p.bas = baslangic }
  if (bitis) { having.push(`${tarihExpr} <= @bit`); p.bit = bitis }
  _listeFiltreleri({ cevapDurumu, okunma, atama, kullanici }, having, p)
  return getDb().prepare(`
    SELECT s.konu_id konu_id, s.platform platform,
      -- Gönderi bilgisi: yeni satırlarda kolon boş, sosyal_gonderiler'den gelir;
      -- eski satırlarda hâlâ kolonda duruyor → MAX(kolon) önce, tablo yedek.
      COALESCE(MAX(s.konu_baslik), MAX(g.baslik)) konu_baslik,
      COALESCE(MAX(s.konu_gorsel), MAX(g.gorsel)) konu_gorsel,
      COALESCE(MAX(s.konu_link),   MAX(g.link))   konu_link,
      COUNT(CASE WHEN tur='yorum' THEN 1 END) yorum_sayisi,
      ${OKUNMAMIS_SAYAC} okunmamis,
      ${CEVAPSIZ_SAYAC} cevapsiz,
      MAX(atanan_kullanici) atanan,
      MAX(COALESCE(mesaj_tarihi, cekilme_tarihi)) son_zaman,
      MAX(CASE WHEN tur='gonderi' THEN COALESCE(mesaj_tarihi, cekilme_tarihi) END) gonderi_tarihi,
      (SELECT gonderen_ad FROM sosyal_mesajlar s2 WHERE s2.konu_id = s.konu_id AND s2.yon='gelen'
         ORDER BY COALESCE(s2.mesaj_tarihi, s2.cekilme_tarihi) DESC LIMIT 1) son_yorumcu
    FROM sosyal_mesajlar s
    LEFT JOIN sosyal_gonderiler g ON g.konu_id = s.konu_id
    WHERE ${kosul.join(' AND ')} AND s.konu_id IS NOT NULL
      -- Meta'da silinmiş gönderiler listelenmez (yorumları da anlamını yitirir).
      AND s.konu_id NOT IN (SELECT konu_id FROM sosyal_mesajlar WHERE tur = 'gonderi' AND silindi = 1)
    GROUP BY s.konu_id, s.platform
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
  if (arama) kosul.push(...aramaKosullari("COALESCE(metin,'') || ' ' || COALESCE(gonderen_ad,'')", arama, p))
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
      -- SON GELEN mesajın zamanı — Meta'nın 24 saatlik yanıt penceresi BUNDAN başlar,
      -- son_zaman'dan DEĞİL. Aradaki fark kritik: son_zaman bizim giden yanıtımızı da
      -- kapsar, onu kullansaydık pencere kendi mesajımızla "uzamış" görünür ve personel
      -- süre dolduğunu geç fark ederdi. (2026-08-04: 125 konuşma bu yüzden yanıtsız kaldı.)
      MAX(CASE WHEN yon='gelen' THEN COALESCE(mesaj_tarihi, cekilme_tarihi) END) son_gelen,
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
  _gonderiKaydet,
  _dbAyarla, // YALNIZ TEST — bkz. dosya başındaki test dikişi notu
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
