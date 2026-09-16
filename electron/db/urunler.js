const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')
const { kelimeKosulu } = require('./tr-arama')

// Ürün her lokasyonda 0 stokla görünsün ki Stok ekranında bulunabilsin.
function stokSatirlariOlustur(db, urunId) {
  const lokasyonlar = db.prepare('SELECT id FROM lokasyonlar').all()
  const ekle = db.prepare('INSERT OR IGNORE INTO urun_stoklar (urun_id, lokasyon_id, miktar, minimum_stok) VALUES (?, ?, 0, 0)')
  for (const l of lokasyonlar) ekle.run(urunId, l.id)
}

// EAN-13 kontrol hanesi: ilk 12 haneden hesaplanır (soldan; tek konum x1, çift konum x3).
function ean13KontrolHanesi(ilk12) {
  let toplam = 0
  for (let i = 0; i < 12; i++) {
    toplam += Number(ilk12[i]) * (i % 2 === 0 ? 1 : 3)
  }
  return String((10 - (toplam % 10)) % 10)
}

// Mağaza içi (kısıtlı dolaşım) barkodu üretir. EAN-13 önekleri 20-29 dahili kullanım için
// ayrılmıştır → gerçek üretici barkodlarıyla asla çakışmaz. Çekirdek olarak ürün id'si gömülür
// (benzersiz); çakışma olursa (olmamalı) rastgele çekirdekle yeniden dener.
function magazaBarkoduUret(cekirdek) {
  const govde = ('29' + String(cekirdek).padStart(10, '0')).slice(0, 12)
  return govde + ean13KontrolHanesi(govde)
}

// Marka-bazlı otomatik stok kodu: TNC.<MARKA_KISALTMA>.<00001> şablonu.
//
// v1.2.219'da KAYNAK DEĞİŞTİ: kısaltma artık markanın ürünlerinden ÖĞRENİLMİYOR,
// markalar.sku_kisaltma alanından okunuyor. Eski yol markanın mevcut TNC kodlarına
// bakıyordu, bu yüzden HİÇ ÜRÜNÜ OLMAYAN yeni markada null dönüyor ve kullanıcı ilk
// kodu elle yazmak zorunda kalıyordu. Artık marka eklenirken kısaltma zorunlu alan
// (markalar:olustur), böylece ilk üründen itibaren kod otomatik üretilir.
//
// MÜKERRERLİK — iddia ve dayanağı ayrı ayrı:
//   * Tekilliği fiilen sağlayan şey "en büyük + 1" aritmetiği ile urunler.sku /
//     setler.sku UNIQUE kısıtıdır. Kısaltma markalar arası TEKİL olduğundan
//     (markalar.js: kisaltmaDogrula) iki marka aynı numara dizisini paylaşamaz.
//   * SKU havuzu urunler + setler ORTAK'tır (setler.js: bir ürüne ait TNC.* kodu sete
//     verilemez) → max iki tablodan birlikte alınır. Tarama aktif/pasif AYIRMAZ: pasif
//     bir üründe duran kod da UNIQUE yüzünden yeniden kullanılamaz.
//   * Aşağıdaki "boşta mı" döngüsü SAVUNMA DERİNLİĞİDİR, kanıt değil. Ölçüldü
//     (16.09.2026): mevcut 6717 TNC kodunun tamamı TNC.XXX.NNNNN biçiminde ve
//     max+1 hiçbirinde çakışmıyor; döngü bugünkü veride hiç tetiklenmiyor. Kod
//     biçimi ileride bozulursa sessiz UNIQUE çökmesi yerine bir sonraki boş kodu verir.
//
// GLOB ile YALNIZ saf sayısal kuyruklu kodlar sayılır: rakam-dışı karakter taşıyan bir
// kod (elle giriş / içe aktarım) hem max'ı hem hane genişliğini yanıltırdı.
function sonrakiStokKodu(db, marka_id) {
  if (!marka_id) return null
  const marka = db.prepare('SELECT sku_kisaltma FROM markalar WHERE id = ?').get(marka_id)
  const kisaltma = String(marka?.sku_kisaltma || '').trim().toUpperCase()
  if (!kisaltma) return null           // kısaltmasız marka → çağıran elle SKU ister
  const onek = `TNC.${kisaltma}.`

  // Havuzdaki en yüksek numara (urunler + setler birlikte).
  const satir = db.prepare(`
    SELECT MAX(num) AS enYuksek, MAX(hane) AS enGenis FROM (
      SELECT CAST(substr(sku, ?) AS INTEGER) AS num, length(substr(sku, ?)) AS hane
        FROM urunler WHERE sku GLOB ? AND substr(sku, ?) NOT GLOB '*[^0-9]*'
      UNION ALL
      SELECT CAST(substr(sku, ?) AS INTEGER), length(substr(sku, ?))
        FROM setler WHERE sku GLOB ? AND substr(sku, ?) NOT GLOB '*[^0-9]*'
    )
  `).get(onek.length + 1, onek.length + 1, onek + '[0-9]*', onek.length + 1,
         onek.length + 1, onek.length + 1, onek + '[0-9]*', onek.length + 1)

  const hane = Math.max(satir?.enGenis || 0, 5)
  const kullanilmis = db.prepare(
    'SELECT 1 FROM urunler WHERE sku = ? UNION ALL SELECT 1 FROM setler WHERE sku = ?')

  // Çakışma olursa ilerle. Üst sınır yalnız sonsuz döngüye karşı emniyet supabı.
  for (let n = (satir?.enYuksek || 0) + 1; n < (satir?.enYuksek || 0) + 10000; n++) {
    const aday = onek + String(n).padStart(hane, '0')
    if (!kullanilmis.get(aday, aday)) return aday
  }
  return null
}

const URUN_SELECT = `
  SELECT u.*, m.ad as marka_adi, k.tam_yol as kategori_yol, k.ana_tip as ana_tip, t.ad as tedarikci_adi,
    (SELECT COALESCE(SUM(us.miktar), 0) FROM urun_stoklar us WHERE us.urun_id = u.id) AS toplam_stok
  FROM urunler u
  LEFT JOIN markalar m ON u.marka_id = m.id
  LEFT JOIN kategoriler k ON u.kategori_id = k.id
  LEFT JOIN tedarikciler t ON u.tedarikci_id = t.id
`

// --- Satış ekranı hiyerarşisi: ana tip + model (2026-09-14) ---
// Model çözümlemesi SUNUCUDA yapılır. Arayüze sözlüğü göndermek ve orada
// çözmek, aynı mantığın ikinci bir kopyasını doğururdu — tam da tr-arama.js /
// src/utils/arama.js ikizliğinin parite testiyle zor tutulan durumu.
const { modelCoz, sozlukHazirla, DIGER } = require('./model-coz')

// Sözlük MARKA BAŞINA bir kez hazırlanır, ürün başına DEĞİL. LAVA'da 726 ürün ×
// 28 model = 20 bin karşılaştırma; sözlüğü ürün başına yeniden sıralamak bunu
// gereksizce katlardı.
function modelleriCozumle(db, urunler) {
  if (!urunler.length) return urunler
  const sozlukler = new Map()
  const sorgu = db.prepare('SELECT model_adi, oncelik, aktif FROM marka_modelleri WHERE marka_id = ? AND aktif = 1')
  for (const u of urunler) {
    if (u.marka_id != null && !sozlukler.has(u.marka_id)) {
      sozlukler.set(u.marka_id, sozlukHazirla(sorgu.all(u.marka_id)))
    }
  }
  for (const u of urunler) {
    // ana_tip NULL = kategori yok VEYA kategori haritada eksik. İkisi de "Diğer"
    // dalına düşer; ürün KAYBOLMAZ (spec §3: kategorisiz 172 ürün).
    u.ana_tip = u.ana_tip || DIGER
    u.cozulen_model = u.marka_id == null ? DIGER
      : modelCoz(u.ad, u.model, sozlukler.get(u.marka_id))
  }
  return urunler
}

// --- Takma ad barkodlar ---
// urunler.barkod BİRİNCİL kalır; buradakiler ek "bu barkod da bu ürüne gider" kayıtlarıdır.
// db enjekte edilebilir (test için); üretimde IPC sarmalayıcısı getDb() geçer.

function barkodListe(urun_id, db) {
  return db.prepare(
    'SELECT id, barkod, aciklama FROM urun_barkodlar WHERE urun_id=? AND COALESCE(aktif,1)=1 ORDER BY id'
  ).all(urun_id)
}

function barkodEkle({ urun_id, barkod, aciklama }, db) {
  const deger = String(barkod || '').trim()
  if (!deger) throw new Error('Barkod boş olamaz')
  const urun = db.prepare('SELECT id, barkod FROM urunler WHERE id=?').get(urun_id)
  if (!urun) throw new Error('Ürün bulunamadı')
  if (String(urun.barkod || '').trim() === deger) {
    throw new Error('Bu kod zaten bu ürünün barkodu')
  }
  // Başka bir ürünün birincil barkodu olamaz — okutulunca hangi ürünün geleceği belirsiz kalırdı.
  const baskaBirincil = db.prepare('SELECT id FROM urunler WHERE TRIM(barkod)=? AND id!=?').get(deger, urun_id)
  if (baskaBirincil) throw new Error('Bu barkod başka bir ürüne tanımlı')
  const aciklamaDeger = (aciklama && String(aciklama).trim()) || null
  const mevcutTakma = db.prepare('SELECT id, urun_id, aktif FROM urun_barkodlar WHERE barkod=?').get(deger)
  if (mevcutTakma && Number(mevcutTakma.aktif ?? 1) === 1) {
    if (mevcutTakma.urun_id === urun_id) throw new Error('Bu barkod zaten bu ürüne tanımlı')
    throw new Error('Bu barkod başka bir ürüne tanımlı')
  }
  if (mevcutTakma) {
    // Pasif (silinmiş) satır: yeni satır AÇMA — barkod UNIQUE ve senkronun doğal anahtarı,
    // aynı satırın canlandırılması diğer PC'ye "bu barkod artık şu ürüne ait ve aktif" bilgisini taşır.
    db.prepare('UPDATE urun_barkodlar SET urun_id=?, aciklama=?, aktif=1 WHERE id=?')
      .run(urun_id, aciklamaDeger, mevcutTakma.id)
    return { id: mevcutTakma.id, barkod: deger, aciklama: aciklamaDeger }
  }
  const r = db.prepare('INSERT INTO urun_barkodlar (urun_id, barkod, aciklama) VALUES (?,?,?)')
    .run(urun_id, deger, aciklamaDeger)
  return { id: Number(r.lastInsertRowid), barkod: deger, aciklama: aciklamaDeger }
}

// TERS YÖN kontrolü: bir ürünün BİRİNCİL barkodu, başka bir ürüne ait TAKMA AD ile
// çakışabiliyordu (barkodEkle yalnız takma ad tarafını kontrol ediyordu). haric_id
// kendi ürününü (güncellemede) hariç tutar; oluşturmada 0/undefined geçilir. Pasif
// (silinmiş) takma ad birincil barkod olarak kullanılmayı engellemez.
function baskaUrununTakmaAdiMi(db, deger, haric_id) {
  if (!deger) return false
  const takma = db.prepare('SELECT urun_id FROM urun_barkodlar WHERE barkod=? AND COALESCE(aktif,1)=1').get(deger)
  return !!(takma && takma.urun_id !== (haric_id || 0))
}

function barkodSil(id, db) {
  // Silmiyoruz, pasifleştiriyoruz — bkz. dosya başındaki senkron notu.
  const r = db.prepare('UPDATE urun_barkodlar SET aktif=0 WHERE id=? AND COALESCE(aktif,1)=1').run(id)
  if (!r.changes) throw new Error('Barkod bulunamadı')
  return { mesaj: 'Barkod silindi' }
}

// Barkod/SKU/takma ad ile ürün bul. Takma ad eşleşmesi urun_barkodlar üzerinden;
// birincil barkod ve SKU davranışı DEĞİŞMEDEN korunur.
function barkodIleBul(barkod, db) {
  const deger = String(barkod || '').trim()
  if (!deger) return undefined
  // Savunma katmanı: geçmişte oluşmuş bir çakışma bile deterministik davransın diye
  // BİRİNCİL barkod/SKU eşleşmesi takma ad eşleşmesinden önce gelsin (ORDER BY oncelik).
  return db.prepare(
    `${URUN_SELECT} WHERE (
        TRIM(u.barkod) = ?
        OR TRIM(u.sku) = ?
        OR u.id IN (SELECT ub.urun_id FROM urun_barkodlar ub WHERE TRIM(ub.barkod) = ? AND COALESCE(ub.aktif,1)=1)
      ) AND u.aktif = 1
      ORDER BY (CASE WHEN TRIM(u.barkod) = ? OR TRIM(u.sku) = ? THEN 0 ELSE 1 END)
      LIMIT 1`
  ).get(deger, deger, deger, deger, deger)
}

module.exports = {
  // durum: 'aktif' (varsayılan) | 'pasif'. Pasifler YALNIZCA Ürünler sekmesindeki
  // Pasif alanından istenir; satış/stok/set gibi tüm diğer çağrılar varsayılanla
  // (aktif) çalışmaya devam eder — pasif ürün hiçbir yerde görünmez.
  // siteVar: yalnız ikas'a (web sitesine) bağlı ürünler — Hızlı ürünler paneli (09.09.2026).
  'urunler:listele': ({ arama, kategori_id, marka_id, sayfa = 1, boyut = 100, durum = 'aktif', siteVar = false } = {}) => {
    const db = getDb()
    let where = durum === 'pasif' ? 'WHERE u.aktif = 0' : 'WHERE u.aktif = 1'
    const params = []
    // ALAKA SIRASI: aramanın tüm kelimeleri ÜRÜN ADINDA geçenler öne. Sayı içeren
    // aramalarda ("24 cm") sayı barkod/SKU rakamlarıyla da eşleşir (tüm Sofram
    // barkodları "...24..." içerir); alfabetik sırada 12-22 cm ürünler 8'lik sayfayı
    // doldurup asıl ürünü dışarı itiyordu.
    let sira = 'u.ad'
    const siraParams = []
    if (arama) {
      // KELİME BAZLI + Türkçe duyarsız. Eskiden tek parça LIKE'tı: "çelik tencere kulp"
      // ancak bu sıra ve boşluklarla BİREBİR geçiyorsa eşleşiyordu, ayrıca "ÇELİK"
      // büyük yazılınca hiç bulunmuyordu (LIKE yalnız ASCII'de duyarsız).
      // Marka adı da aranır: ürün adında marka geçmese bile "lava tencere" çalışsın.
      // Takma ad barkodlar da aranabilir olmalı: mal kabul/set ekranları ürünü
      // urunler:listele ile arıyor, okutulan ek barkod orada da bulunmalı.
      const k = kelimeKosulu(
        "u.ad || ' ' || COALESCE(u.barkod,'') || ' ' || COALESCE(u.sku,'') || ' ' || COALESCE(m.ad,'')" +
        " || ' ' || COALESCE((SELECT GROUP_CONCAT(ub.barkod, ' ') FROM urun_barkodlar ub WHERE ub.urun_id = u.id AND COALESCE(ub.aktif,1)=1),'')",
        arama)
      where += k.sql
      params.push(...k.params)
      const kAd = kelimeKosulu('u.ad', arama)
      if (kAd.sql) {
        sira = `(CASE WHEN 1=1${kAd.sql} THEN 0 ELSE 1 END), u.ad`
        siraParams.push(...kAd.params)
      }
    }
    if (kategori_id) {
      // Seçilen kategori + tüm alt kategorilerindeki ürünleri kapsa (tam_yol prefix eşleşmesi).
      const kat = db.prepare('SELECT tam_yol FROM kategoriler WHERE id = ?').get(kategori_id)
      if (kat && kat.tam_yol) {
        where += ' AND u.kategori_id IN (SELECT id FROM kategoriler WHERE tam_yol = ? OR tam_yol LIKE ?)'
        params.push(kat.tam_yol, kat.tam_yol + '>%')
      } else {
        where += ' AND u.kategori_id = ?'
        params.push(kategori_id)
      }
    }
    if (marka_id) { where += ' AND u.marka_id = ?'; params.push(marka_id) }
    if (siteVar) where += " AND COALESCE(u.ikas_urun_id, '') != ''"
    // markalar JOIN'i ŞART: WHERE artık m.ad'ı da arıyor (URUN_SELECT'te zaten var,
    // burada eksikti → "no such column: m.ad" verirdi).
    const toplam = db.prepare(
      `SELECT COUNT(*) as n FROM urunler u LEFT JOIN markalar m ON u.marka_id = m.id ${where}`
    ).get(...params).n
    // boyut <= 0 => sınırsız (tüm ürünler). Aksi halde sayfalama uygulanır.
    if (!boyut || boyut <= 0) {
      const sorgu = `${URUN_SELECT} ${where} ORDER BY ${sira}`
      return { toplam, urunler: modelleriCozumle(db, db.prepare(sorgu).all(...params, ...siraParams)) }
    }
    const sorgu = `${URUN_SELECT} ${where} ORDER BY ${sira} LIMIT ? OFFSET ?`
    return { toplam, urunler: modelleriCozumle(db, db.prepare(sorgu).all(...params, ...siraParams, boyut, (sayfa - 1) * boyut)) }
  },

  'urunler:getir': (id) => {
    return getDb().prepare(`${URUN_SELECT} WHERE u.id = ? AND u.aktif = 1`).get(id)
  },

  _barkodla: barkodIleBul,

  'urunler:barkodla': (barkod) => barkodIleBul(barkod, getDb()),

  // Marka seçilince formda gösterilecek otomatik stok kodu önerisi.
  'urunler:sonraki-stok-kodu': (marka_id) => sonrakiStokKodu(getDb(), marka_id),

  'urunler:olustur': (veri, db = getDb()) => {
    yetkiKontrol('urun_duzenle')
    let { ad, barkod, sku, marka_id, kategori_id, tedarikci_id, aciklama, alis_fiyati, satis_fiyati, kdv_orani, model } = veri
    // SKU boş bırakıldıysa marka şablonundan otomatik türet (TNC.XXX.00001+).
    if ((!sku || !String(sku).trim()) && marka_id) {
      sku = sonrakiStokKodu(db, marka_id)
    }

    // TERS YÖN kontrolü: yeni ürünün birincil barkodu, başka bir ürünün takma adıyla
    // çakışmasın (bkz. baskaUrununTakmaAdiMi tanımı).
    if (barkod && baskaUrununTakmaAdiMi(db, String(barkod).trim(), 0)) {
      throw new Error('Bu barkod başka bir ürüne takma ad olarak tanımlı')
    }

    // Yumuşak silme (aktif=0) nedeniyle aynı barkod/SKU pasif bir üründe kalmış olabilir.
    // UNIQUE kısıtını ihlal etmemek için: pasif eşleşme varsa onu güncelleyip yeniden aktive et.
    const cakisan = (barkod && db.prepare('SELECT * FROM urunler WHERE barkod = ?').get(barkod))
                 || (sku && db.prepare('SELECT * FROM urunler WHERE sku = ?').get(sku))
    if (cakisan) {
      if (cakisan.aktif) {
        throw new Error(`Bu ${barkod && cakisan.barkod === barkod ? 'barkod' : 'SKU'} zaten aktif bir üründe kullanılıyor`)
      }
      db.prepare(`
        UPDATE urunler SET ad=?, barkod=?, sku=?, marka_id=?, kategori_id=?, tedarikci_id=?,
        aciklama=?, alis_fiyati=?, satis_fiyati=?, kdv_orani=?, model=?, aktif=1, guncelleme_tarihi=datetime('now','localtime')
        WHERE id=?
      `).run(ad, barkod||null, sku||null, marka_id||null, kategori_id||null, tedarikci_id||null,
         aciklama||null, alis_fiyati||0, satis_fiyati, kdv_orani||20, model || null, cakisan.id)
      stokSatirlariOlustur(db, cakisan.id)
      return db.prepare(`${URUN_SELECT} WHERE u.id = ?`).get(cakisan.id)
    }

    const r = db.prepare(`
      INSERT INTO urunler (ad, barkod, sku, marka_id, kategori_id, tedarikci_id, aciklama, alis_fiyati, satis_fiyati, kdv_orani, model)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(ad, barkod||null, sku||null, marka_id||null, kategori_id||null, tedarikci_id||null, aciklama||null, alis_fiyati||0, satis_fiyati, kdv_orani||20, model || null)
    stokSatirlariOlustur(db, r.lastInsertRowid)
    return db.prepare(`${URUN_SELECT} WHERE u.id = ?`).get(r.lastInsertRowid)
  },

  'urunler:guncelle': ({ id, ...veri }, db = getDb()) => {
    yetkiKontrol('urun_duzenle')
    const { ad, barkod, sku, marka_id, kategori_id, tedarikci_id, aciklama, alis_fiyati, satis_fiyati, kdv_orani, web_link, model } = veri
    // Satış fiyatı değişiyorsa ayrıca fiyat_degistir yetkisi gerekir.
    const mevcut = db.prepare('SELECT satis_fiyati, alis_fiyati FROM urunler WHERE id = ?').get(id)
    if (mevcut && Number(mevcut.satis_fiyati) !== Number(satis_fiyati)) {
      yetkiKontrol('fiyat_degistir')
    }
    // Fiyat (satış/alış) değişti mi → ikas'a arka planda gönder.
    const fiyatDegisti = mevcut &&
      (Number(mevcut.satis_fiyati) !== Number(satis_fiyati) || Number(mevcut.alis_fiyati) !== Number(alis_fiyati))
    // TERS YÖN kontrolü: bu ürünün birincil barkodu başka bir ürünün takma adıyla
    // çakışmasın (bkz. baskaUrununTakmaAdiMi tanımı).
    if (barkod && baskaUrununTakmaAdiMi(db, String(barkod).trim(), id)) {
      throw new Error('Bu barkod başka bir ürüne takma ad olarak tanımlı')
    }
    try {
      // web_link undefined = alanı hiç göndermeyen çağrı (eski arayüz, toplu içe aktarma) →
      // mevcut link KORUNUR. '' = kullanıcı kutuyu boşalttı → silinir. Bu ayrım olmadan
      // ikas'tan toplu çekilen linkler her ürün düzenlemesinde sessizce kaybolurdu.
      const linkYaz = web_link !== undefined
      // model AYNI kurala tabi (v1.2.219): undefined = alanı hiç göndermeyen çağrı
      // (toplu içe aktarma, eski arayüz) → elle girilmiş model KORUNUR. '' = kullanıcı
      // kutuyu boşalttı → silinir ve model yeniden sözlükten çözümlenir.
      const modelYaz = model !== undefined
      db.prepare(`
        UPDATE urunler SET ad=?, barkod=?, sku=?, marka_id=?, kategori_id=?, tedarikci_id=?,
        aciklama=?, alis_fiyati=?, satis_fiyati=?, kdv_orani=?${linkYaz ? ', web_link=?' : ''}${modelYaz ? ', model=?' : ''},
        guncelleme_tarihi=datetime('now','localtime')
        WHERE id=?
      `).run(ad, barkod||null, sku||null, marka_id||null, kategori_id||null, tedarikci_id||null,
         aciklama||null, alis_fiyati||0, satis_fiyati, kdv_orani||20,
         ...(linkYaz ? [web_link || null] : []), ...(modelYaz ? [model || null] : []), id)
    } catch (e) {
      if (String(e.message).includes('UNIQUE') && e.message.includes('barkod')) throw new Error('Bu barkod başka bir üründe kullanılıyor')
      if (String(e.message).includes('UNIQUE') && e.message.includes('sku')) throw new Error('Bu SKU başka bir üründe kullanılıyor')
      throw e
    }
    if (fiyatDegisti) {
      try { require('../ikas/ekstra')._pushFiyatArkaPlan([id]) } catch {}
    }
    return db.prepare(`${URUN_SELECT} WHERE u.id = ?`).get(id)
  },

  // Barkodsuz bir ürün için otomatik, benzersiz mağaza içi barkod (EAN-13) üretir.
  'urunler:barkodUret': (id) => {
    yetkiKontrol('urun_duzenle')
    const db = getDb()
    const urun = db.prepare('SELECT id, barkod FROM urunler WHERE id = ? AND aktif = 1').get(id)
    if (!urun) throw new Error('Ürün bulunamadı')
    if (urun.barkod && String(urun.barkod).trim()) throw new Error('Bu ürünün zaten bir barkodu var')

    const barkodVar = db.prepare('SELECT 1 FROM urunler WHERE barkod = ?')
    const takmaAdVar = db.prepare('SELECT 1 FROM urun_barkodlar WHERE barkod = ?')
    let barkod = magazaBarkoduUret(urun.id)
    // Çakışma teorik olarak imkânsız (29 öneki + benzersiz id); yine de savunmacı kontrol.
    // urun_barkodlar da kontrol edilir — üretilen değer bir takma adla çakışabilir.
    let deneme = 0
    while (barkodVar.get(barkod) || takmaAdVar.get(barkod)) {
      barkod = magazaBarkoduUret(Math.floor(Math.random() * 1e10))
      if (++deneme > 20) throw new Error('Benzersiz barkod üretilemedi, tekrar deneyin')
    }
    db.prepare(`UPDATE urunler SET barkod = ?, guncelleme_tarihi = datetime('now','localtime') WHERE id = ?`).run(barkod, id)
    return db.prepare(`${URUN_SELECT} WHERE u.id = ?`).get(id)
  },

  _barkodListe: barkodListe,
  _modelleriCozumle: modelleriCozumle,
  _URUN_SELECT: URUN_SELECT,
  _sonrakiStokKodu: sonrakiStokKodu,
  _barkodEkle: barkodEkle,
  _barkodSil: barkodSil,

  'urunler:barkod-liste': (urun_id) => {
    yetkiKontrol('urun_goruntule')
    return barkodListe(urun_id, getDb())
  },

  'urunler:barkod-ekle': (veri) => {
    yetkiKontrol('urun_duzenle')
    return barkodEkle(veri, getDb())
  },

  'urunler:barkod-sil': (id) => {
    yetkiKontrol('urun_duzenle')
    return barkodSil(id, getDb())
  },

  'urunler:sil': (id) => {
    yetkiKontrol('urun_sil')
    getDb().prepare('UPDATE urunler SET aktif = 0 WHERE id = ?').run(id)
    return { mesaj: 'Ürün silindi' }
  },

  // Aktif/pasif geçişi (Ürünler > Pasif Ürünler alanı). Pasife alma = yumuşak
  // gizleme; aktifleştirme barkod/SKU çakışması yaratmaz (UNIQUE zaten korur).
  'urunler:aktiflik': ({ id, aktif }) => {
    yetkiKontrol('urun_duzenle')
    getDb().prepare("UPDATE urunler SET aktif = ?, guncelleme_tarihi = datetime('now','localtime') WHERE id = ?")
      .run(aktif ? 1 : 0, id)
    return { mesaj: aktif ? 'Ürün aktifleştirildi' : 'Ürün pasife alındı' }
  },

  'urunler:stok': (urun_id) => {
    return getDb().prepare(`
      SELECT us.*, l.ad as lokasyon_adi
      FROM urun_stoklar us JOIN lokasyonlar l ON us.lokasyon_id = l.id
      WHERE us.urun_id = ?
    `).all(urun_id)
  },
}
