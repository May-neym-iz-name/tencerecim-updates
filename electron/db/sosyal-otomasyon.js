// Gönderi bazlı otomatik yorum cevabı: şablon kütüphanesi + gönderi otomasyonu CRUD.
// Çalıştırıcı ayrı dosyada (electron/meta/otomasyon.js) — burası yalnız veri katmanı.
const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')

const SAYFA_ADI = 'tenceremtava' // kendi yorumlarımızı elemek için (bkz. _adaylar)
const PENCERE_GUN = 7            // Meta: yoruma özel mesaj yalnız 7 gün içinde gönderilebilir
const MAKS_DENEME = 3            // bu kadar hatadan sonra o yorumdan vazgeç (sonsuz deneme olmasın)

// Şablonun fiyatını çözer. Öncelik: sablon.fiyat (elle yazılmış) → ürünün canlı satış fiyatı
// → setin canlı fiyatı. NULL fiyat = "kaynağa sor" — zam yapılınca şablon kendiliğinden güncel kalır.
// Şablon ya ürüne ya sete bağlanır (ikisi birden değil); setler ayrı tabloda çünkü satışta
// bileşenlerine açılıyorlar, urunler'de karşılıkları yok.
function _sablonlariCoz(db, otomasyonId) {
  return db.prepare(`
    SELECT s.urun_adi, s.aciklama, s.link, s.whatsapp, s.tur, s.serbest_metin,
           COALESCE(s.fiyat, u.satis_fiyati, st.fiyat) AS fiyat
    FROM sosyal_otomasyon_sablonlar os
    JOIN sosyal_sablonlar s ON s.id = os.sablon_id
    LEFT JOIN urunler u ON u.id = s.urun_id
    LEFT JOIN setler st ON st.id = s.set_id
    WHERE os.otomasyon_id = ? AND s.aktif = 1
    ORDER BY os.sira, s.id
  `).all(otomasyonId)
}

// Gönderiye özel seçilmiş ürünleri, mesaj üreticisinin beklediği biçimde çözer.
// Ad önceliği: ou.ozel_ad (gönderiye özel görünen ad) → kataloğun canlı adı. ozel_ad NULL ise
// katalogdaki ad değişince mesaj da güncel kalır. Fiyat önceliği: ou.ozel_fiyat (gönderiye özel) → ürünün canlı satış fiyatı →
// setin fiyatı. ozel_fiyat NULL ise zam kendiliğinden mesaja yansır.
// web_link hem üründe hem sette var (setlerin de sitede kendi sayfası oluyor). Link yoksa
// mesaj üreticisi o satırı atlar — ürün yine de ad+fiyatıyla yazılır.
function _gonderiUrunleriCoz(db, otomasyonId) {
  return db.prepare(`
    SELECT COALESCE(ou.ozel_ad, u.ad, st.ad) AS ad,
           COALESCE(ou.ozel_fiyat, u.satis_fiyati, st.fiyat) AS fiyat,
           COALESCE(u.web_link, st.web_link) AS web_link
    FROM sosyal_otomasyon_urunler ou
    LEFT JOIN urunler u ON u.id = ou.urun_id
    LEFT JOIN setler st ON st.id = ou.set_id
    WHERE ou.otomasyon_id = ?
    ORDER BY ou.sira, ou.id
  `).all(otomasyonId).filter(u => u.ad)
}

// Gönderinin WhatsApp sipariş hatlarını çözer (v1.2.177).
//
// İki alanda da NULL "kaynağa sor" demek — kod tabanının ozel_fiyat/ozel_ad deyimi:
//   numara → mağaza kaydındaki telefon KAZANIR (Ayarlar > Mağazalar): numara değişince
//            20 otomasyonun hepsi kendiliğinden güncellenir. numara kolonu mağaza hatlarında
//            ANLIK GÖRÜNTÜ olarak tutulur ve yalnız mağaza kaydı bulunamazsa devreye girer —
//            lokasyonlar tablosu PC'ler arası SENKRONLANMIYOR, otomasyonu yürüten makinede
//            o mağaza kaydı olmayabilir; anlık görüntü olmasaydı satır sessizce düşerdi.
//            Mağazasız (elle) hatlarda lokasyon_ad NULL'dır, numara kullanıcının girdisidir.
//   baslik NULL → "<Mağaza> WhatsApp Sipariş Hattı". Kullanıcı gönderi bazında
//                 değiştirebilir; değiştirmediği sürece mağaza adını takip eder.
//
// Mağaza ADLA bağlanır (lokasyon_ad), id ile değil — lokasyonlar tablosu PC'ler arası
// senkronlanmıyor, id'lerin her makinede aynı olduğu garanti değil.
function _numaralariCoz(db, otomasyonId) {
  return db.prepare(`
    SELECT n.sira, n.lokasyon_ad, n.baslik AS ozel_baslik, n.numara AS ozel_numara,
           COALESCE(n.baslik, l.ad || ' WhatsApp Sipariş Hattı') AS baslik,
           COALESCE(l.telefon, n.numara) AS numara
    FROM sosyal_otomasyon_numaralar n
    LEFT JOIN lokasyonlar l ON l.ad = n.lokasyon_ad
    WHERE n.otomasyon_id = ?
    ORDER BY n.sira, n.id
  `).all(otomasyonId)
    .map(n => ({ ...n, baslik: n.ozel_baslik ? n.baslik : _basligiSadelestir(n.baslik) }))
}

// Mağaza adları depoda "Tencerecim Gölcük" diye kayıtlı; müşteriye giden mesajda
// "Tencerecim Gölcük WhatsApp Sipariş Hattı" gereksiz uzun ve marka adı zaten belli.
// Yalnız VARSAYILAN başlığa uygulanır — kullanıcının elle yazdığı başlığa dokunulmaz
// (elle yazılan başlık zaten `baslik` kolonundan gelir ve bu ön ek onda bulunmaz).
function _basligiSadelestir(baslik) {
  return (baslik || '').replace(/^Tencerecim\s+/i, '')
}

// Cevaplanacak yorumlar. konuId verilirse yalnız o gönderi (açma onayındaki sayı için),
// verilmezse aktif tüm otomasyonlar (çalıştırıcı için).
//
// KRİTİK FİLTRELER:
//  - gonderen_ad != SAYFA_ADI : kendi açık yanıtımız sonraki polling turunda yorum olarak
//    geri gelir; bu filtre olmazsa otomasyon kendi yanıtına cevap verir → SONSUZ DÖNGÜ.
//  - NOT EXISTS(...) : kişi başına gönderide TEK DM (aynı kişi 6 yorum atarsa 6 DM gitmesin).
//    Tekilleştirme gonderen_ad ile — IG yorumlarında 'from' istenemez (tüm çekimi kırar),
//    bu yüzden gonderen_id hep NULL. Instagram'da kullanıcı adı benzersiz, güvenli.
//    YALNIZ ozel_mesaj_tarihi (başarılı gönderim) sayılır — başarısız deneme kişiyi engellemez.
//  - ozel_mesaj_deneme < MAKS_DENEME : kalıcı hatalarda (tek hak dolmuş, 7 gün geçmiş) vazgeç.
//  - GROUP BY : aynı kişinin bu turdaki birden çok yorumundan yalnız biri alınsın.
function _adaylar(db, konuId = null) {
  const kosul = konuId ? 'o.konu_id = ?' : 'o.aktif = 1'
  const params = konuId ? [konuId] : []
  return db.prepare(`
    SELECT m.id, m.konu_id, m.gonderen_ad, m.harici_id, m.platform, o.id AS otomasyon_id
    FROM sosyal_mesajlar m
    JOIN sosyal_otomasyonlar o ON o.konu_id = m.konu_id
    WHERE ${kosul}
      AND m.tur = 'yorum'
      AND m.yon = 'gelen'
      AND m.gonderen_ad != '${SAYFA_ADI}'
      AND m.ozel_mesaj_tarihi IS NULL
      AND COALESCE(m.ozel_mesaj_deneme, 0) < ${MAKS_DENEME}
      AND m.mesaj_tarihi >= datetime('now', '-${PENCERE_GUN} days')
      AND NOT EXISTS (
        SELECT 1 FROM sosyal_mesajlar x
        WHERE x.konu_id = m.konu_id AND x.gonderen_ad = m.gonderen_ad
          AND x.ozel_mesaj_tarihi IS NOT NULL
      )
    GROUP BY m.gonderen_ad, m.konu_id
    ORDER BY m.mesaj_tarihi ASC
  `).all(...params)
}


// otomasyonKaydet çekirdeği — db ENJEKTE EDİLEBİLİR (urunler.js/setler.js deseni).
// IPC sarmalayıcısı yetkiyi kontrol edip getDb() geçer; testler kendi bellek veritabanını
// geçer. Yetki mantığı burada DEĞİL: bu fonksiyon veri kurallarından sorumlu.
//
// İki alanın "verilmedi" (undefined) ile "boşaltıldı" ([]) ayrımı KRİTİK:
//   sablon_idler / urunler undefined ise mevcut bağlara DOKUNULMAZ. Koşulsuz silmek,
//   listeyi göndermeyen bir çağrının (yalnız aç/kapat, ya da güncellenmemiş 2. PC)
//   bağları sessizce yok etmesine yol açar. Boş dizi ise gerçekten temizlenir.
function otomasyonKaydet({ konu_id, platform, aktif, acik_yanit_metni, sablon_idler,
  ozel_aciklama, whatsapp, urunler, numaralar }, db) {
  if (ozel_aciklama && ozel_aciklama.length > 1000) {
    throw new Error('Gönderi açıklaması 1000 karakteri aşamaz.')
  }
  if (urunler) {
    for (const u of urunler) {
      if (!u.urun_id && !u.set_id) throw new Error('Geçersiz ürün seçimi.')
      if (u.urun_id && u.set_id) throw new Error('Bir satır ya ürüne ya sete bağlanabilir.')
    }
  }
  // Tek-tür kuralı: bir otomasyona ya birden çok ürün şablonu YA DA tek bir genel şablon.
  const idler = sablon_idler || []
  if (idler.length) {
    const turler = db.prepare(
      `SELECT tur, COUNT(*) n FROM sosyal_sablonlar WHERE id IN (${idler.map(() => '?').join(',')}) GROUP BY tur`
    ).all(...idler)
    const genelSayi = turler.find(x => x.tur === 'genel')?.n || 0
    const urunSayi = turler.find(x => x.tur !== 'genel')?.n || 0
    if (genelSayi && urunSayi) throw new Error('Bir otomasyonda ürün ve genel şablon karıştırılamaz.')
    if (genelSayi > 1) throw new Error('Bir otomasyona yalnız tek genel şablon bağlanabilir.')
  }
  const tx = db.transaction(() => {
    let o = db.prepare('SELECT id, aktif FROM sosyal_otomasyonlar WHERE konu_id = ?').get(konu_id)
    if (!o) {
      const r = db.prepare(`INSERT INTO sosyal_otomasyonlar
        (platform, konu_id, aktif, acik_yanit_metni, baslangic_tarihi, ozel_aciklama, whatsapp)
        VALUES (?,?,?,?,?,?,?)`).run(platform, konu_id, aktif ? 1 : 0, acik_yanit_metni || null,
          aktif ? new Date().toISOString() : null, ozel_aciklama || null, whatsapp || null)
      o = { id: r.lastInsertRowid, aktif: 0 }
    } else {
      // baslangic_tarihi yalnız KAPALI→AÇIK geçişinde tazelenir.
      const acildi = aktif && !o.aktif
      db.prepare(`UPDATE sosyal_otomasyonlar SET aktif=?, acik_yanit_metni=?, ozel_aciklama=?, whatsapp=?
        ${acildi ? ", baslangic_tarihi=datetime('now','localtime')" : ''} WHERE id=?`)
        .run(aktif ? 1 : 0, acik_yanit_metni || null, ozel_aciklama || null, whatsapp || null, o.id)
    }
    // `urunler` ile aynı kural: undefined = DOKUNMA. Koşulsuz silmek, şablon listesini
    // göndermeyen bir çağrının (yalnız aç/kapat) bağları sessizce yok etmesine yol açardı.
    if (sablon_idler) {
      db.prepare('DELETE FROM sosyal_otomasyon_sablonlar WHERE otomasyon_id = ?').run(o.id)
      const ekle = db.prepare(`INSERT INTO sosyal_otomasyon_sablonlar
        (otomasyon_id, sablon_id, sira) VALUES (?,?,?)`)
      sablon_idler.forEach((sid, i) => ekle.run(o.id, sid, i))
    }
    // `urunler` ile AYNI kural: undefined = DOKUNMA, [] = temizle. Yalnız aç/kapat yapan
    // (ya da güncellenmemiş 2. PC'den gelen) bir çağrı hatları sessizce silmemeli.
    if (numaralar) {
      db.prepare('DELETE FROM sosyal_otomasyon_numaralar WHERE otomasyon_id = ?').run(o.id)
      const numEkle = db.prepare(`INSERT INTO sosyal_otomasyon_numaralar
        (otomasyon_id, lokasyon_ad, baslik, numara, sira) VALUES (?,?,?,?,?)`)
      const lokTel = db.prepare('SELECT telefon FROM lokasyonlar WHERE ad = ?')
      numaralar.forEach((n, i) => {
        const lokAd = (n.lokasyon_ad || '').trim() || null
        // Mağaza hattında numara kullanıcıdan DEĞİL mağaza kaydından alınır (anlık görüntü).
        // Elle hatta kullanıcının girdisi yazılır.
        const numara = lokAd
          ? ((lokTel.get(lokAd)?.telefon || '').trim() || null)
          : ((n.numara || '').trim() || null)
        numEkle.run(o.id, lokAd, (n.baslik || '').trim() || null, numara, i)
      })
    }
    if (urunler) {
      db.prepare('DELETE FROM sosyal_otomasyon_urunler WHERE otomasyon_id = ?').run(o.id)
      const urunEkle = db.prepare(`INSERT INTO sosyal_otomasyon_urunler
        (otomasyon_id, urun_id, set_id, sira, ozel_fiyat, ozel_ad) VALUES (?,?,?,?,?,?)`)
      urunler.forEach((u, i) => urunEkle.run(o.id, u.urun_id || null, u.set_id || null, i,
        u.ozel_fiyat === '' || u.ozel_fiyat == null ? null : Number(u.ozel_fiyat),
        (u.ozel_ad || '').trim() || null))
    }
    return o.id
  })
  return { id: tx() }
}

module.exports = {
  _adaylar,
  _sablonlariCoz,
  _gonderiUrunleriCoz,
  _numaralariCoz,
  _otomasyonKaydet: otomasyonKaydet,

  // Şablon kütüphanesi. Bağlı kaynağın (ürün veya set) canlı fiyatını `kaynak_fiyati` olarak
  // döner — arayüz "canlı" rozetinde ve önizlemede kullanır.
  // `aktif_otomasyon_sayisi`: bu şablonu kullanan AÇIK otomasyon sayısı. Arayüz düzenleme/silme
  // uyarısında kullanır — şablon gönderim anında okunduğu için (bkz. _sablonlariCoz) değişiklik
  // sıradaki mesajlara anında yansır; kullanıcı bunu körlemesine yapmasın.
  'sosyal:sablonlar': () => getDb().prepare(`
    SELECT s.*, COALESCE(u.satis_fiyati, st.fiyat) AS kaynak_fiyati,
           COALESCE(u.ad, st.ad) AS kaynak_adi,
           CASE WHEN s.set_id IS NOT NULL THEN 'set'
                WHEN s.urun_id IS NOT NULL THEN 'urun' END AS kaynak_tipi,
           (SELECT COUNT(*) FROM sosyal_otomasyon_sablonlar os
              JOIN sosyal_otomasyonlar o ON o.id = os.otomasyon_id
             WHERE os.sablon_id = s.id AND o.aktif = 1) AS aktif_otomasyon_sayisi
    FROM sosyal_sablonlar s
    LEFT JOIN urunler u ON u.id = s.urun_id
    LEFT JOIN setler st ON st.id = s.set_id
    WHERE s.aktif = 1 ORDER BY s.ad
  `).all(),

  // Tek şablonun mesaj metnini üretir (mesajlaşmada elle kullanmak için).
  // Otomasyonla AYNI üretici (mesajOlustur) + canlı fiyat çözümü → iki yol asla ayrışmaz.
  // Yetki istemez: personel metni yanıt kutusuna ekleyip kendisi gönderir (toplu DM değil).
  'sosyal:sablonMetin': (id) => {
    const s = getDb().prepare(`
      SELECT s.urun_adi, s.aciklama, s.link, s.whatsapp, s.tur, s.serbest_metin,
             COALESCE(s.fiyat, u.satis_fiyati, st.fiyat) AS fiyat
      FROM sosyal_sablonlar s
      LEFT JOIN urunler u ON u.id = s.urun_id
      LEFT JOIN setler st ON st.id = s.set_id
      WHERE s.id = ?`).get(id)
    if (!s) throw new Error('Şablon bulunamadı.')
    const { mesajOlustur } = require('../meta/sablon-mesaj')
    return mesajOlustur({ sablonlar: [s] })
  },

  // Şablonlar YALNIZ otomasyon için var → otomasyon yetkisi ister ('sosyal_medya_yonet' DEĞİL).
  // Sosyal medyayı kullanan personel yorumları elle cevaplar; toplu DM'in içeriğini değiştiremez.
  'sosyal:sablonKaydet': ({ id, ad, tur, serbest_metin, urun_id, set_id, urun_adi, aciklama, fiyat, link, whatsapp }) => {
    yetkiKontrol('sosyal_otomasyon_yonet')
    if (!ad || !ad.trim()) throw new Error('Şablon adı gerekli.')
    const t = tur === 'genel' ? 'genel' : 'urun'
    const db = getDb()
    let p
    if (t === 'genel') {
      const sm = (serbest_metin || '').trim()
      if (!sm) throw new Error('Genel şablonda mesaj metni gerekli.')
      if (sm.length > 1000) throw new Error('Mesaj metni 1000 karakteri aşamaz.')
      // Genel türde ürün alanları anlamsız → boşaltılır. urun_adi NOT NULL olduğu için ''.
      p = [ad.trim(), null, null, '', null, null, null, null, 'genel', sm]
    } else {
      if (!urun_adi || !urun_adi.trim()) throw new Error('Ürün adı gerekli.')
      if (urun_id && set_id) throw new Error('Şablon ya ürüne ya sete bağlanabilir, ikisine birden değil.')
      p = [ad.trim(), urun_id || null, set_id || null, urun_adi.trim(), aciklama || null,
        fiyat === '' || fiyat == null ? null : Number(fiyat), link || null, whatsapp || null, 'urun', null]
    }
    if (id) {
      db.prepare(`UPDATE sosyal_sablonlar SET ad=?, urun_id=?, set_id=?, urun_adi=?, aciklama=?,
        fiyat=?, link=?, whatsapp=?, tur=?, serbest_metin=? WHERE id=?`).run(...p, id)
      return { id }
    }
    const r = db.prepare(`INSERT INTO sosyal_sablonlar
      (ad, urun_id, set_id, urun_adi, aciklama, fiyat, link, whatsapp, tur, serbest_metin)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(...p)
    return { id: r.lastInsertRowid }
  },

  // Soft delete: geçmiş otomasyonların bağlantısı kırılmasın.
  'sosyal:sablonSil': (id) => {
    yetkiKontrol('sosyal_otomasyon_yonet')
    getDb().prepare('UPDATE sosyal_sablonlar SET aktif = 0 WHERE id = ?').run(id)
    return { ok: true }
  },

  'sosyal:otomasyonGetir': ({ konu_id }) => {
    const db = getDb()
    const o = db.prepare('SELECT * FROM sosyal_otomasyonlar WHERE konu_id = ?').get(konu_id)
    if (!o) return null
    o.sablonlar = db.prepare(`
      SELECT s.*, os.sira FROM sosyal_otomasyon_sablonlar os
      JOIN sosyal_sablonlar s ON s.id = os.sablon_id
      WHERE os.otomasyon_id = ? ORDER BY os.sira, s.id
    `).all(o.id)
    // Gönderiye özel ürünler. Arayüz listede canlı fiyatı ve linkin var/yok durumunu gösterir
    // (linksiz ürün uyarılır — mesajda o satır sessizce eksik kalmasın).
    o.urunler = db.prepare(`
      SELECT ou.id AS baglanti_id, ou.urun_id, ou.set_id, ou.sira,
             COALESCE(ou.ozel_ad, u.ad, st.ad) AS ad,
             COALESCE(u.ad, st.ad) AS katalog_adi,
             COALESCE(ou.ozel_fiyat, u.satis_fiyati, st.fiyat) AS fiyat,
             ou.ozel_fiyat, ou.ozel_ad,
             COALESCE(u.web_link, st.web_link) AS web_link, u.sku,
             CASE WHEN ou.set_id IS NOT NULL THEN 'set' ELSE 'urun' END AS tip
      FROM sosyal_otomasyon_urunler ou
      LEFT JOIN urunler u ON u.id = ou.urun_id
      LEFT JOIN setler st ON st.id = ou.set_id
      WHERE ou.otomasyon_id = ? ORDER BY ou.sira, ou.id
    `).all(o.id)
    // WhatsApp sipariş hatları. Panel hem ÇÖZÜLMÜŞ değeri (ne yazılacak) hem kullanıcının
    // kendi girdisini (ozel_baslik/ozel_numara) alır: kutular boş görünüp altında mağazadan
    // gelen canlı değer gösterilebilsin — "boş = mağazaya sor" görünür olsun.
    o.numaralar = _numaralariCoz(db, o.id)
    o.bugun_giden = db.prepare(`SELECT COUNT(*) n FROM sosyal_mesajlar
      WHERE konu_id = ? AND date(ozel_mesaj_tarihi) = date('now','localtime')`).get(konu_id).n
    return o
  },

  'sosyal:otomasyonKaydet': (veri) => {
    yetkiKontrol('sosyal_otomasyon_yonet')
    return otomasyonKaydet(veri, getDb())
  },

  // Panelin canlı önizlemesi. KAYDEDİLMEMİŞ seçim üzerinden çalışır (kaydetmeden görmek için),
  // ama metni gönderimle AYNI üreticiden alır → önizlemede görülen, müşteriye giden metindir.
  // Yetki istemez: yalnız metin döndürür, hiçbir şey göndermez/yazmaz.
  'sosyal:gonderiOnizleme': ({ aciklama, whatsapp, urunler, numaralar }) => {
    const db = getDb()
    const secim = (urunler || []).map(u => {
      const r = u.set_id
        ? db.prepare('SELECT ad, fiyat, web_link FROM setler WHERE id = ?').get(u.set_id)
        : db.prepare('SELECT ad, satis_fiyati AS fiyat, web_link FROM urunler WHERE id = ?').get(u.urun_id)
      if (!r) return null
      // Gönderiye özel fiyat girildiyse önizleme de onu göstermeli — yoksa panelde
      // görülen metin ile gidecek metin ayrışırdı.
      const ozelF = u.ozel_fiyat === '' || u.ozel_fiyat == null ? null : Number(u.ozel_fiyat)
      const ozelA = (u.ozel_ad || '').trim() || null
      return { ...r, fiyat: ozelF ?? r.fiyat, ad: ozelA ?? r.ad }
    }).filter(Boolean)
    // Hatlar KAYDEDİLMEDEN önizlenebilmeli → panelden gelen ham liste burada çözülür
    // (mağaza seçilmişse numara/başlık canlı okunur). Çözüm mantığı _numaralariCoz ile
    // aynı kalmalı; ikisi ayrışırsa önizleme ile giden mesaj ayrışır.
    const hatlar = (numaralar || []).map(n => {
      const lok = (n.lokasyon_ad || '').trim()
        ? db.prepare('SELECT ad, telefon FROM lokasyonlar WHERE ad = ?').get(n.lokasyon_ad.trim())
        : null
      const ozelBaslik = (n.baslik || '').trim()
      const varsayilan = lok ? _basligiSadelestir(`${lok.ad} WhatsApp Sipariş Hattı`) : ''
      return {
        baslik: ozelBaslik || varsayilan,
        // Çözüm sırası _numaralariCoz ile AYNI: mağaza kaydı varsa o, yoksa elle girilen.
        numara: (lok?.telefon || '').trim() || (n.numara || '').trim(),
      }
    })
    const { gonderiMesajiOlustur } = require('../meta/sablon-mesaj')
    return gonderiMesajiOlustur({ aciklama, whatsapp, urunler: secim, numaralar: hatlar })
  },

  // Panelin "+ Mağaza hattı ekle" seçicisi. Telefonu GİRİLMEMİŞ mağaza da listelenir —
  // gizlemek, kullanıcıya numaranın neden çıkmadığını göstermez; panel uyarı basar.
  // Yetki istemez: yalnız mağaza adı/telefonu döner, zaten Ayarlar'da görünen bilgi.
  'sosyal:magazaNumaralari': () => getDb().prepare(
    'SELECT ad, telefon FROM lokasyonlar WHERE aktif = 1 ORDER BY ad'
  ).all(),

  // Açma onayı için: "bu gönderide kaç kişiye mesaj gidecek?"
  // Aday sorgusunun AYNISINI kullanır → gösterilen sayı gerçekte gidecek sayıdır.
  'sosyal:otomasyonAdaySayisi': ({ konu_id }) => ({ sayi: _adaylar(getDb(), konu_id).length }),
}
