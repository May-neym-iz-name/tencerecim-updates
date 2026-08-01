const Database = require('better-sqlite3')
const path = require('path')
const { app } = require('electron')

let db

function getDbPath() {
  return path.join(app.getPath('userData'), 'tencerecim.db')
}

function init() {
  db = new Database(getDbPath())
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  // Türkçe duyarlı küçük harf — SQLite lower()/LIKE yalnız ASCII'de büyük/küçük
  // duyarsızdır (Ö/ö, İ/i, Ş/ş eşleşmez). Aramalarda tr_kucuk(alan) LIKE tr_kucuk(?) kullanılır.
  db.function('tr_kucuk', { deterministic: true }, (s) => (s == null ? null : String(s).toLocaleLowerCase('tr')))
  // tr_ara: aramaya özel, DAHA güçlü normalize — Türkçe harfleri KATLAR (i/ı/İ/I → i,
  // ş→s, ğ→g, ü→u, ö→o, ç→c). tr_kucuk yetmiyordu: "LINES" onunla "lınes" olup
  // "LİNES" ürününü bulamıyordu. Ürün aramalarında bu kullanılır.
  db.function('tr_ara', { deterministic: true }, (s) => require('./tr-arama').trNormal(s))
  createTables()
  migrate()
  try { require('./senk-sema').kur(db) } catch (e) { console.error('senk-sema kur:', e.message) }
  seedLokasyonlar()
  seedUpsSehirIlce()
  backfillStok()
  return db
}

// Her aktif ürün × lokasyon için eksik stok satırlarını 0 ile tamamlar.
// Böylece stok satırı olmayan (ör. yeni eklenmiş) ürünler Stok ve Stok Sayım
// ekranlarında 0 olarak görünür ve stok girilebilir.
//
// senk_id + BAZ damga ('2000-01-01') ELLE yazılır, tetikleyiciye bırakılmaz. Neden:
// bu satırlar ölçülmüş bir stok değil, "0 varsay" DOLGUSUDUR. Tetikleyici (senk-sema.js,
// AFTER INSERT ... WHEN new.senk_id IS NULL) onlara NOW damgalayıp push kuyruğuna sokuyordu;
// karşı PC'de dogalCift (urun_id, lokasyon_id) eşleşmesi + son-yazan-kazanır ile bu 0'lar
// DİĞER PC'NİN GERÇEK STOĞUNU EZEBİLİYORDU. Baz damga ile: push imlecinin gerisinde kalır
// (hiç gönderilmez) ve buluttan gelen her gerçek satır bunu yener. Personel gerçekten
// sayım/stok girdiğinde AFTER UPDATE tetikleyicisi NOW damgalar ve normal şekilde push edilir.
function backfillStok() {
  db.exec(`
    INSERT OR IGNORE INTO urun_stoklar (urun_id, lokasyon_id, miktar, minimum_stok, senk_id, senk_guncelleme)
    SELECT u.id, l.id, 0, 0, lower(hex(randomblob(16))), '2000-01-01T00:00:00.000Z'
    FROM urunler u CROSS JOIN lokasyonlar l
    WHERE u.aktif = 1
      AND NOT EXISTS (
        SELECT 1 FROM urun_stoklar s WHERE s.urun_id = u.id AND s.lokasyon_id = l.id
      )
  `)
}

function getDb() { return db }

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lokasyonlar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ad TEXT NOT NULL,
      adres TEXT,
      telefon TEXT,
      aktif INTEGER DEFAULT 1,
      ikas_lokasyon_id TEXT
    );

    CREATE TABLE IF NOT EXISTS markalar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ad TEXT NOT NULL UNIQUE,
      aktif INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS tedarikciler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ad TEXT NOT NULL UNIQUE,
      telefon TEXT,
      email TEXT,
      aktif INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS kategoriler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ad TEXT NOT NULL,
      ust_kategori_id INTEGER REFERENCES kategoriler(id),
      tam_yol TEXT,
      aktif INTEGER DEFAULT 1,
      UNIQUE(ad, ust_kategori_id)
    );

    CREATE TABLE IF NOT EXISTS urunler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ad TEXT NOT NULL,
      barkod TEXT UNIQUE,
      sku TEXT UNIQUE,
      marka_id INTEGER REFERENCES markalar(id),
      marka TEXT,
      kategori_id INTEGER REFERENCES kategoriler(id),
      kategori TEXT,
      tedarikci_id INTEGER REFERENCES tedarikciler(id),
      aciklama TEXT,
      alis_fiyati REAL DEFAULT 0,
      satis_fiyati REAL NOT NULL,
      kdv_orani INTEGER DEFAULT 20,
      aktif INTEGER DEFAULT 1,
      ikas_urun_id TEXT,
      ikas_varyant_id TEXT,
      olusturma_tarihi TEXT DEFAULT (datetime('now','localtime')),
      guncelleme_tarihi TEXT
    );

    CREATE TABLE IF NOT EXISTS urun_stoklar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      urun_id INTEGER NOT NULL REFERENCES urunler(id),
      lokasyon_id INTEGER NOT NULL REFERENCES lokasyonlar(id),
      miktar INTEGER DEFAULT 0,
      minimum_stok INTEGER DEFAULT 0,
      UNIQUE(urun_id, lokasyon_id)
    );

    CREATE TABLE IF NOT EXISTS musteriler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ad TEXT NOT NULL,
      soyad TEXT NOT NULL,
      telefon TEXT,
      email TEXT,
      tc_kimlik TEXT,
      vergi_no TEXT,
      vergi_dairesi TEXT,
      unvan TEXT,
      adres TEXT,
      il TEXT,
      ilce TEXT,
      iskonto_orani REAL DEFAULT 0,
      aktif INTEGER DEFAULT 1,
      olusturma_tarihi TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS satislar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fis_no TEXT UNIQUE NOT NULL,
      lokasyon_id INTEGER NOT NULL REFERENCES lokasyonlar(id),
      musteri_id INTEGER REFERENCES musteriler(id),
      odeme_tipi TEXT DEFAULT 'nakit',
      durum TEXT DEFAULT 'tamamlandi',
      ara_toplam REAL DEFAULT 0,
      iskonto_toplam REAL DEFAULT 0,
      kdv_toplam REAL DEFAULT 0,
      genel_toplam REAL DEFAULT 0,
      notlar TEXT,
      tarih TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS satis_kalemleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      satis_id INTEGER NOT NULL REFERENCES satislar(id),
      urun_id INTEGER NOT NULL REFERENCES urunler(id),
      miktar INTEGER NOT NULL,
      birim_fiyat REAL NOT NULL,
      iskonto_orani REAL DEFAULT 0,
      kdv_orani INTEGER DEFAULT 20,
      toplam REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stok_sayimlar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lokasyon_id INTEGER NOT NULL REFERENCES lokasyonlar(id),
      durum TEXT DEFAULT 'devam_ediyor',
      notlar TEXT,
      baslangic_tarihi TEXT DEFAULT (datetime('now','localtime')),
      bitis_tarihi TEXT
    );

    CREATE TABLE IF NOT EXISTS stok_sayim_kalemleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sayim_id INTEGER NOT NULL REFERENCES stok_sayimlar(id),
      urun_id INTEGER NOT NULL REFERENCES urunler(id),
      beklenen_miktar INTEGER DEFAULT 0,
      sayilan_miktar INTEGER,
      fark INTEGER
    );

    -- UPS kargo ayarları (anahtar-değer). Kimlik bilgileri ve gönderici adresi burada saklanır.
    -- YEREL DB *.db gitignore'da olduğu için public repoya sızmaz.
    CREATE TABLE IF NOT EXISTS ups_ayarlar (
      anahtar TEXT PRIMARY KEY,
      deger TEXT
    );

    -- BU PC'YE ÖZEL anahtar-değer. ups_ayarlar/uygulama_ayarlar'dan farkı: PC'ler arası
    -- SENKRONLANMAZ (db/ayar-senk.js bu tabloya bakmaz) ve bakmamalı.
    -- İlk kullanıcısı kargo bulut köprüsünün okuma imleci: her PC Worker'daki durum
    -- değişikliklerini KENDİ yerel DB'sine uygulamak zorunda, dolayısıyla her PC'nin
    -- "nereye kadar okudum" damgası ayrı olmak zorunda. Senkronlansaydı hızlı davranan
    -- PC imleci ileri atar, diğeri aradaki değişiklikleri hiç görmezdi.
    CREATE TABLE IF NOT EXISTS yerel_ayarlar (
      anahtar TEXT PRIMARY KEY,
      deger TEXT
    );

    -- UPS il/ilçe (semt) kod tablosu. Districts.xlsx'ten seed edilir.
    CREATE TABLE IF NOT EXISTS ups_sehir_ilce (
      il_kodu INTEGER NOT NULL,
      il TEXT NOT NULL,
      ilce_kodu INTEGER NOT NULL,
      ilce TEXT NOT NULL
    );

    -- ikas e-ticaret entegrasyonu ayarları (anahtar-değer): store_name, client_id,
    -- client_secret, online_lokasyon_id (siparişlerin düşeceği yerel lokasyon),
    -- otomatik_senk ('1'/'0'), son_siparis_senk (epoch ms; bu andan sonraki siparişler çekilir).
    -- YEREL DB *.db gitignore'da olduğu için kimlik bilgileri public repoya sızmaz.
    CREATE TABLE IF NOT EXISTS ikas_ayarlar (
      anahtar TEXT PRIMARY KEY,
      deger TEXT
    );

    -- ikas'tan çekilip stoğu yerel olarak düşülmüş siparişler (çift düşmeyi önler).
    CREATE TABLE IF NOT EXISTS ikas_islenen_siparisler (
      ikas_siparis_id TEXT PRIMARY KEY,
      siparis_no TEXT,
      islenme_tarihi TEXT DEFAULT (datetime('now','localtime'))
    );

    -- ikas web sitesinden gelen siparişler (görüntüleme + müşteri saklama).
    -- ikas_siparis_id UNIQUE: aynı sipariş iki kez kaydedilmez (idempotent çekim).
    CREATE TABLE IF NOT EXISTS online_siparisler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ikas_siparis_id TEXT UNIQUE NOT NULL,
      siparis_no TEXT,
      siparis_tarihi TEXT,
      durum TEXT,
      odeme_durumu TEXT,
      kargo_durumu TEXT,
      toplam REAL DEFAULT 0,
      para_birimi TEXT DEFAULT 'TRY',
      odeme_yontemi TEXT,
      musteri_id INTEGER REFERENCES musteriler(id),
      musteri_ad TEXT,
      musteri_email TEXT,
      musteri_telefon TEXT,
      teslimat_il TEXT,
      teslimat_ilce TEXT,
      teslimat_adres TEXT,
      fatura_unvan TEXT,
      fatura_vergi_no TEXT,
      fatura_vergi_dairesi TEXT,
      fatura_tc TEXT,
      stok_dusuldu INTEGER DEFAULT 0,
      olusturma_tarihi TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS online_siparis_kalemleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      siparis_id INTEGER NOT NULL REFERENCES online_siparisler(id),
      urun_id INTEGER REFERENCES urunler(id),
      ikas_kalem_id TEXT,
      ikas_varyant_id TEXT,
      urun_adi TEXT,
      miktar INTEGER DEFAULT 1,
      birim_fiyat REAL DEFAULT 0,
      lokasyon_id INTEGER REFERENCES lokasyonlar(id),
      ikas_lokasyon_id TEXT
    );

    -- Bildirim merkezi: iptal/iade talepleri ve ileride diğer olaylar.
    -- Her PC ikas çekiminde kendi yerelinde üretir (bulut senkronu yok).
    -- dedup_anahtar UNIQUE: aynı olay her çekimde tekrar bildirilmez.
    CREATE TABLE IF NOT EXISTS bildirimler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tip TEXT NOT NULL,
      baslik TEXT NOT NULL,
      mesaj TEXT,
      onem TEXT DEFAULT 'normal',
      ikas_siparis_id TEXT,
      dedup_anahtar TEXT UNIQUE,
      okundu INTEGER DEFAULT 0,
      olusturma_tarihi TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_bildirim_okundu ON bildirimler(okundu);

    -- İkas'a YAZILAMAYAN talep bilgisi. API'de ne "reddet" mutation'ı var ne de
    -- REFUND_REQUEST_ACCEPTED'ı set etme imkânı (2026-07-24 canlı introspection:
    -- 69 mutation tarandı). Bu yüzden "onaylandı, ürün bekleniyor" ve "kapatıldı"
    -- yerelde tutulur. Anahtar ikas_siparis_id: yerel id her PC'de farklıdır.
    -- not_metni (not DEĞİL): "not" SQLite'ta ayrılmış sözcüktür.
    CREATE TABLE IF NOT EXISTS talep_durumlari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ikas_siparis_id TEXT NOT NULL UNIQUE,
      asama TEXT NOT NULL,
      not_metni TEXT,
      kullanici TEXT,
      tarih TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_talep_durum_siparis ON talep_durumlari(ikas_siparis_id);

    -- İstek listeleri (tedarikçiden tedarik istek listesi): şube + tedarikçi başına.
    -- Bulut senkron: jenerik senk_kayitlar (senk-sema.js). PDF yerel üretilir.
    CREATE TABLE IF NOT EXISTS istek_listeleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lokasyon_id INTEGER,
      tedarikci_id INTEGER REFERENCES tedarikciler(id),
      baslik TEXT,
      tarih TEXT,
      olusturma_tarihi TEXT DEFAULT (datetime('now','localtime'))
    );
    -- urun_adi: anlık kopya (FK yarışına dayanıklı PDF; satis_kalemleri.set_adi emsali).
    CREATE TABLE IF NOT EXISTS istek_listesi_kalemleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      istek_id INTEGER NOT NULL REFERENCES istek_listeleri(id),
      urun_id INTEGER REFERENCES urunler(id),
      urun_adi TEXT,
      miktar INTEGER DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_istek_kalem_istek ON istek_listesi_kalemleri(istek_id);

    -- Her mağaza için ayrı UPS gönderici (çıkış) adresi. UPS hesap bilgileri
    -- (müşteri/kullanıcı kodu, şifre) ups_ayarlar'da ortak kalır; burada sadece
    -- gönderici adres/iletişim bilgisi mağaza bazında tutulur.
    CREATE TABLE IF NOT EXISTS lokasyon_gonderici (
      lokasyon_id INTEGER PRIMARY KEY REFERENCES lokasyonlar(id),
      ad TEXT, yetkili TEXT, adres TEXT,
      il TEXT, il_kodu INTEGER, ilce TEXT, ilce_kodu INTEGER,
      posta_kodu TEXT, telefon TEXT, cep TEXT, email TEXT
    );

    -- Oluşturulan kargo gönderileri.
    CREATE TABLE IF NOT EXISTS kargolar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      takip_no TEXT,
      durum TEXT DEFAULT 'olusturuldu',
      musteri_id INTEGER REFERENCES musteriler(id),
      satis_id INTEGER REFERENCES satislar(id),
      alici_ad TEXT,
      alici_telefon TEXT,
      alici_adres TEXT,
      il TEXT,
      ilce TEXT,
      il_kodu INTEGER,
      ilce_kodu INTEGER,
      koli_adedi INTEGER DEFAULT 1,
      agirlik REAL DEFAULT 1,
      servis_seviyesi INTEGER DEFAULT 3,
      odeme_tipi INTEGER DEFAULT 2,
      aciklama TEXT,
      barkod_png TEXT,
      son_durum TEXT,
      son_durum_tarihi TEXT,
      olusturma_tarihi TEXT DEFAULT (datetime('now','localtime'))
    );

    -- Kasa oturumları (vardiya): gün açılış-kapanış + nakit mutabakatı.
    CREATE TABLE IF NOT EXISTS kasa_oturumlar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lokasyon_id INTEGER NOT NULL REFERENCES lokasyonlar(id),
      acan TEXT,
      acilis_tarihi TEXT DEFAULT (datetime('now','localtime')),
      acilis_nakit REAL DEFAULT 0,
      kapatan TEXT,
      kapanis_tarihi TEXT,
      sayilan_nakit REAL,
      beklenen_nakit REAL,
      fark REAL,
      durum TEXT DEFAULT 'acik',
      notlar TEXT
    );

    -- Giderler (kira, fatura, personel, vb.).
    CREATE TABLE IF NOT EXISTS giderler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lokasyon_id INTEGER REFERENCES lokasyonlar(id),
      tarih TEXT DEFAULT (date('now','localtime')),
      kategori TEXT,
      aciklama TEXT,
      tutar REAL NOT NULL,
      odeme_tipi TEXT DEFAULT 'nakit',
      kullanici TEXT,
      olusturma_tarihi TEXT DEFAULT (datetime('now','localtime'))
    );

    -- Mal kabul (tedarikçiden gelen ürün girişi).
    CREATE TABLE IF NOT EXISTS mal_kabuller (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lokasyon_id INTEGER NOT NULL REFERENCES lokasyonlar(id),
      tedarikci_id INTEGER REFERENCES tedarikciler(id),
      fatura_no TEXT,
      tarih TEXT DEFAULT (datetime('now','localtime')),
      toplam_maliyet REAL DEFAULT 0,
      kullanici TEXT,
      notlar TEXT
    );

    CREATE TABLE IF NOT EXISTS mal_kabul_kalemleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mal_kabul_id INTEGER NOT NULL REFERENCES mal_kabuller(id),
      urun_id INTEGER NOT NULL REFERENCES urunler(id),
      miktar INTEGER NOT NULL,
      birim_maliyet REAL DEFAULT 0
    );

    -- Satış ödeme kalemleri (parçalı/karma ödeme: bir kısmı nakit, bir kısmı kart...).
    -- Her satış için bir veya birden çok satır. satislar.odeme_tipi karma ise 'karma'.
    CREATE TABLE IF NOT EXISTS satis_odemeler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      satis_id INTEGER NOT NULL REFERENCES satislar(id),
      odeme_tipi TEXT NOT NULL,
      tutar REAL NOT NULL
    );

    -- Sabit (tekrarlayan) gider şablonları: kira, maaş vb. Tek tıkla gidere işlenir.
    CREATE TABLE IF NOT EXISTS sabit_giderler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lokasyon_id INTEGER REFERENCES lokasyonlar(id),
      kategori TEXT,
      aciklama TEXT,
      tutar REAL NOT NULL,
      odeme_tipi TEXT DEFAULT 'nakit',
      aktif INTEGER DEFAULT 1,
      olusturma_tarihi TEXT DEFAULT (datetime('now','localtime'))
    );

    -- Meta (Facebook/Instagram) entegrasyon ayarları (anahtar-değer). ikas ile aynı model.
    -- app_id, app_secret (hassas), sayfa_id, ig_id, sayfa_token (hassas, uzun ömürlü),
    -- token_gecerlilik (epoch ms), otomatik_senk ('1'/'0'). Yerel *.db gitignore'da.
    CREATE TABLE IF NOT EXISTS meta_ayarlar (
      anahtar TEXT PRIMARY KEY,
      deger TEXT
    );

    -- Sosyal medya gelen kutusu ÖNBELLEĞİ (kaynak Meta; burada saklamak Supabase'i şişirmez).
    -- harici_id: Meta comment/message id (UNIQUE → aynı öğe iki kez düşmez, idempotent çekim).
    -- tur: 'yorum' | 'dm'. platform: 'facebook' | 'instagram'. yon: 'gelen' | 'giden'.
    -- konu_id: gönderi id (yorum) veya konuşma id (DM) — cevap için grup anahtarı.
    -- durum: 'yeni' | 'okundu' | 'cevaplandi'. atanan_kullanici/cevaplayan_kullanici:
    -- "kim neye baktı/cevapladı" personel takibi (yerel; Supabase'e gitmez).
    CREATE TABLE IF NOT EXISTS sosyal_mesajlar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      tur TEXT NOT NULL,
      harici_id TEXT UNIQUE,
      konu_id TEXT,
      ust_id TEXT,
      gonderen_id TEXT,
      gonderen_ad TEXT,
      metin TEXT,
      yon TEXT DEFAULT 'gelen',
      durum TEXT DEFAULT 'yeni',
      atanan_kullanici TEXT,
      cevaplayan_kullanici TEXT,
      ic_not TEXT,
      mesaj_tarihi TEXT,
      cekilme_tarihi TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_sosyal_konu ON sosyal_mesajlar(konu_id);
    CREATE INDEX IF NOT EXISTS idx_sosyal_durum ON sosyal_mesajlar(durum);
  `)
}

function migrate() {
  // iskonto_orani kolonu musteriler tablosuna yoksa ekle
  try { db.exec("ALTER TABLE musteriler ADD COLUMN iskonto_orani REAL DEFAULT 0") } catch {}
  try { db.exec("ALTER TABLE satislar ADD COLUMN iskonto_toplam REAL DEFAULT 0") } catch {}
  try { db.exec("ALTER TABLE satis_kalemleri ADD COLUMN iskonto_orani REAL DEFAULT 0") } catch {}
  try { db.exec("ALTER TABLE urunler ADD COLUMN marka_id INTEGER REFERENCES markalar(id)") } catch {}
  try { db.exec("ALTER TABLE urunler ADD COLUMN kategori_id INTEGER REFERENCES kategoriler(id)") } catch {}
  try { db.exec("ALTER TABLE urunler ADD COLUMN tedarikci_id INTEGER REFERENCES tedarikciler(id)") } catch {}
  try { db.exec("ALTER TABLE urunler ADD COLUMN ikas_varyant_id TEXT") } catch {}
  // online_siparisler — ödeme yöntemi + fatura alanları (sonradan eklendi).
  try { db.exec("ALTER TABLE online_siparisler ADD COLUMN odeme_yontemi TEXT") } catch {}
  try { db.exec("ALTER TABLE online_siparisler ADD COLUMN fatura_unvan TEXT") } catch {}
  try { db.exec("ALTER TABLE online_siparisler ADD COLUMN fatura_vergi_no TEXT") } catch {}
  try { db.exec("ALTER TABLE online_siparisler ADD COLUMN fatura_vergi_dairesi TEXT") } catch {}
  try { db.exec("ALTER TABLE online_siparisler ADD COLUMN fatura_tc TEXT") } catch {}
  // online_siparisler — ikas kargo/paket durumu (orderPackageStatus: kargoya hazır, teslim edildi vb.).
  try { db.exec("ALTER TABLE online_siparisler ADD COLUMN kargo_durumu TEXT") } catch {}
  // kargolar — online sipariş bağlantısı (hangi siparişin kargosu).
  try { db.exec("ALTER TABLE kargolar ADD COLUMN online_siparis_id INTEGER REFERENCES online_siparisler(id)") } catch {}
  // Çok-PC senkron + lokasyon kapsama için: gönderici mağaza (lokasyon_id) ve
  // PC'ler arası sipariş eşleme için stabil ikas_siparis_id.
  try { db.exec("ALTER TABLE kargolar ADD COLUMN lokasyon_id INTEGER REFERENCES lokasyonlar(id)") } catch {}
  try { db.exec("ALTER TABLE kargolar ADD COLUMN ikas_siparis_id TEXT") } catch {}
  // UPS etiket yazdırma linki (LinkForLabelPrinting) — ağır barkod_png'yi senkrona
  // sokmadan her PC'den etiket basılabilsin diye saklanır ve senkronlanır (minik URL).
  try { db.exec("ALTER TABLE kargolar ADD COLUMN etiket_link TEXT") } catch {}
  // UPS takip yoklayıcısı: son görülen StatusCode (sayı) + son sorgu zamanı.
  // son_durum SERBEST METİN'dir ve karar için KULLANILMAZ (docs/ups-api-reference.md §1:
  // "HD" metninde 'teslim' geçer ama teslim değildir). Kararlar son_durum_kodu ile verilir.
  try { db.exec("ALTER TABLE kargolar ADD COLUMN son_durum_kodu INTEGER") } catch {}
  try { db.exec("ALTER TABLE kargolar ADD COLUMN takip_sorgu_tarihi TEXT") } catch {}
  // online_siparis_kalemleri — ikas sipariş kalemi id'si (iptal/iade için).
  try { db.exec("ALTER TABLE online_siparis_kalemleri ADD COLUMN ikas_kalem_id TEXT") } catch {}
  // online_siparisler — kolinin UPS ağına GERÇEKTEN girdiği an (yerel işaret; yalnız
  // ups/takip.js yoklayıcısı basar). ikas orderPackageStatus'ta ayrı bir "gönderildi"
  // durumu yok (Kargoya Hazır → Teslim Edildi); bu alan set edilince arayüz teslim
  // edilene kadar "Gönderildi" gösterir, senkron bunu ezmez.
  try { db.exec("ALTER TABLE online_siparisler ADD COLUMN gonderildi_tarihi TEXT") } catch {}
  // online_siparisler — ikas'tan okunan kargo takip bilgisi (orderPackages.trackingInfo).
  try { db.exec("ALTER TABLE online_siparisler ADD COLUMN kargo_takip_no TEXT") } catch {}
  try { db.exec("ALTER TABLE online_siparisler ADD COLUMN kargo_firma TEXT") } catch {}
  try { db.exec("ALTER TABLE online_siparisler ADD COLUMN kargo_takip_link TEXT") } catch {}
  // satislar — mağaza içi iade desteği (negatif "iade satışı" kaydı).
  try { db.exec("ALTER TABLE satislar ADD COLUMN tip TEXT DEFAULT 'satis'") } catch {}
  try { db.exec("ALTER TABLE satislar ADD COLUMN iade_kaynak_id INTEGER REFERENCES satislar(id)") } catch {}
  try { db.exec("ALTER TABLE satis_kalemleri ADD COLUMN iade_miktar INTEGER DEFAULT 0") } catch {}
  // satislar — ön sipariş: stokta olmayan ürün için peşin ödemeli sipariş.
  // Stok DÜŞÜLMEZ ve ikas'a push edilmez; ciro/kasa normal satış gibi işler (ödeme anında).
  // on_siparis_durum: 'bekliyor' -> 'kargolandi' -> 'teslim' | 'iptal'
  try { db.exec("ALTER TABLE satislar ADD COLUMN on_siparis INTEGER DEFAULT 0") } catch {}
  try { db.exec("ALTER TABLE satislar ADD COLUMN on_siparis_durum TEXT") } catch {}
  try { db.exec("ALTER TABLE satislar ADD COLUMN on_siparis_not TEXT") } catch {}
  // Ürün takma ad barkodları: bir ürün birden fazla barkodla okutulabilsin
  // (tedarikçi barkodu + kendi 29'lu dahili barkodumuz + eski barkod).
  // urunler.barkod BİRİNCİL kalır (etikete basılan, senkronun doğal anahtarı).
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS urun_barkodlar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      urun_id INTEGER NOT NULL REFERENCES urunler(id) ON DELETE CASCADE,
      barkod TEXT NOT NULL UNIQUE,
      aciklama TEXT,
      olusturma_tarihi TEXT DEFAULT (datetime('now','localtime'))
    )`)
  } catch {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_urun_barkodlar_urun ON urun_barkodlar(urun_id)') } catch {}
  // Ek barkodlar SİLİNMEZ, pasifleştirilir: senkron motoru silmeyi PC'ler arasına
  // taşımıyor (bkz. Gülsan importu dersi), pasifleme ise bir "değişiklik" olduğu için
  // taşınıyor. Aksi halde bir PC'de silinen barkod diğerinde okutmaya devam ederdi.
  try { db.exec("ALTER TABLE urun_barkodlar ADD COLUMN aktif INTEGER DEFAULT 1") } catch {}
  // musteriler — ikas müşteri istatistikleri (listCustomer: orderCount/totalOrderPrice...).
  try { db.exec("ALTER TABLE musteriler ADD COLUMN ikas_musteri_id TEXT") } catch {}
  try { db.exec("ALTER TABLE musteriler ADD COLUMN ikas_siparis_sayisi INTEGER") } catch {}
  try { db.exec("ALTER TABLE musteriler ADD COLUMN ikas_toplam_harcama REAL") } catch {}
  try { db.exec("ALTER TABLE musteriler ADD COLUMN ikas_ilk_siparis TEXT") } catch {}
  try { db.exec("ALTER TABLE musteriler ADD COLUMN ikas_son_siparis TEXT") } catch {}
  // kargolar — etiket PNG'sinin Supabase Storage yolu (PC'ler arası basım; DB'yi şişirmez).
  try { db.exec("ALTER TABLE kargolar ADD COLUMN etiket_storage_yol TEXT") } catch {}
  // kargolar — gönderi tipi: 'gonderi' (mağaza→müşteri) | 'iade' (müşteri→mağaza, UPS'te swap).
  try { db.exec("ALTER TABLE kargolar ADD COLUMN tip TEXT DEFAULT 'gonderi'") } catch {}
  // kargolar — kapıda ödeme (UPS ValueOfGoods): tahsil edilecek tutar + tahsilat şekli
  // (1=Nakit, 2=Çek, 3=Kredi Kartı — UPS örnek kodundaki resmi değerler).
  try { db.exec("ALTER TABLE kargolar ADD COLUMN kapida_odeme_tutar REAL") } catch {}
  try { db.exec("ALTER TABLE kargolar ADD COLUMN kapida_odeme_tipi INTEGER") } catch {}
  // online_siparisler — ikas'a EN SON BİLDİRDİĞİMİZ paket durumu (ikas/kargo-durum.js).
  // kargo_durumu'ndan AYRI tutulur: kargo_durumu ikas'tan OKUNAN durumdur ve her çekimde
  // ezilir; bu alan ise "biz ne gönderdik"i tutar ve mükerrer müşteri bildirimini engeller.
  // Aynı alana ikinci kez aynı durum yazılmaz → 30 dakikada bir tekrar bildirim gitmez.
  try { db.exec("ALTER TABLE online_siparisler ADD COLUMN ikas_kargo_durumu TEXT") } catch {}
  try { db.exec("ALTER TABLE online_siparisler ADD COLUMN ikas_kargo_bildirim_tarihi TEXT") } catch {}
  // Son bildirim denemesinin hatası (NULL = sorun yok). Sessiz hata bırakmamak için:
  // yoklayıcı hatayı yutar ama buraya yazar, ekranda gösterilir, sonraki turda yeniden denenir.
  try { db.exec("ALTER TABLE online_siparisler ADD COLUMN ikas_kargo_hata TEXT") } catch {}

  // ONARIM — kargolar.ikas_siparis_id eksik olan ESKİ kayıtlar (2026-07-21).
  //
  // Sorun: online_siparis_id YEREL bir autoincrement'tir. Kargo kaydı senkronla başka
  // PC'ye gittiğinde oradaki aynı numaralı sipariş BAŞKA bir siparişdir. Çapraz-PC
  // anahtarı ikas_siparis_id'dir; kargo oluşturma kodu artık onu yazıyor (ups/kargo.js)
  // ama daha eski kayıtlarda boş kaldı. Sonuç: diğer PC'de kargo hiçbir siparişe
  // bağlanamıyor ve sipariş "kargo etiketi oluşturulmamış" gibi görünüyor.
  //
  // NEDEN ÇİFT DOĞRULAMA ŞART: bu göç HER PC'de çalışır. Koşulsuz yazsaydık, BAŞKA
  // PC'den senkronla gelmiş bir satırda yereldeki 399 numaralı (bambaşka) siparişin
  // kimliği yazılır ve kargo YANLIŞ müşteriye bağlanırdı. Hem AD hem TELEFON eşleşmesi,
  // bağın gerçekten bu PC'ye ait olduğunun kanıtıdır. Ad tek başına yetmez: aynı müşteri
  // birden çok siparişte geçiyor (canlı veride "Burak GÜL" iki ayrı siparişte).
  // Telefon son 10 haneden karşılaştırılır (+90/0 önek farkları canlı veride mevcut).
  // Canlı kuru çalıştırma: 11 kaydın 11'i ad+telefon doğrulamasından geçti, 0 yanlış eşleşme.
  //
  // Onarım senkronla YAYILIR: senk-sema'nın AFTER UPDATE tetikleyicisi senk_guncelleme'yi
  // tazeler, düzeltilmiş satır diğer PC'lere gider. Orada bu göç kendi başına onaramazdı
  // (yerel sipariş farklı) — düzeltmenin tek yerde yapılıp yayılması bu yüzden doğru.
  try {
    db.function('tel10', { deterministic: true }, (s) => {
      const d = String(s == null ? '' : s).replace(/\D/g, '')
      return d.slice(-10) || null
    })
    db.exec(`
      UPDATE kargolar SET ikas_siparis_id = (
        SELECT s.ikas_siparis_id FROM online_siparisler s WHERE s.id = kargolar.online_siparis_id
      )
      WHERE ikas_siparis_id IS NULL AND online_siparis_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM online_siparisler s
          WHERE s.id = kargolar.online_siparis_id
            AND s.ikas_siparis_id IS NOT NULL
            AND tr_ara(s.musteri_ad) = tr_ara(kargolar.alici_ad)
            AND tel10(s.musteri_telefon) IS NOT NULL
            AND tel10(s.musteri_telefon) = tel10(kargolar.alici_telefon)
        )`)
  } catch (e) { console.error('kargo ikas_siparis_id onarimi:', e.message) }

  // ONARIM (TEK SEFER) — erken basılmış "Gönderildi" damgaları (2026-07-21).
  //
  // Sorun: 'ikas:siparis-kargola' etiket oluşturulur oluşturulmaz gonderildi_tarihi
  // damgalıyordu; koli UPS'e hiç verilmese bile sipariş "Gönderildi" görünüyordu
  // (ölçüm: 20 gönderinin 15'i UPS'e verilmeden ikas'tan sevk edilmişti). Damga artık
  // yalnız UPS takip yoklayıcısından basılıyor; buradaki temizlik ESKİ yanlış damgaları
  // siler. UPS ağına gerçekten girmiş olanlar (son_durum_kodu var ve 13 değil) korunur,
  // teslim edilmişlere dokunulmaz. Silinenlerden gerçekten yolda olanları yoklayıcı
  // 30 dk içinde yeniden damgalar.
  //
  // NEDEN TEK SEFERLİK (yerel_onarimlar tablosu): her açılışta çalışsaydı, ikas'ın kendi
  // UPS entegrasyonuyla çıkan siparişlerde (kargolar'da satırı YOKTUR, kanıt bulunamaz)
  // yoklayıcının bastığı MEŞRU damga her açılışta silinip 30 dk sonra geri gelirdi.
  // uygulama_ayarlar KULLANILMAZ: o tablo PC'ler arası senkronlanır; işaret senkronla
  // yayılsa diğer PC kendi yerel verisini hiç onaramazdı.
  try {
    db.exec("CREATE TABLE IF NOT EXISTS yerel_onarimlar (ad TEXT PRIMARY KEY, tarih TEXT)")
    const yapildi = db.prepare("SELECT 1 FROM yerel_onarimlar WHERE ad = ?").get('gonderildi_erken_damga_2026_07')
    if (!yapildi) {
      db.exec(`
        UPDATE online_siparisler SET gonderildi_tarihi = NULL
        WHERE gonderildi_tarihi IS NOT NULL
          AND COALESCE(kargo_durumu,'') NOT IN ('DELIVERED','PARTIALLY_DELIVERED')
          AND NOT EXISTS (
            SELECT 1 FROM kargolar k
            WHERE (k.online_siparis_id = online_siparisler.id
                   OR (k.ikas_siparis_id IS NOT NULL AND k.ikas_siparis_id = online_siparisler.ikas_siparis_id))
              AND k.son_durum_kodu IS NOT NULL AND k.son_durum_kodu != 13
          )`)
      db.prepare("INSERT INTO yerel_onarimlar (ad, tarih) VALUES (?, datetime('now','localtime'))")
        .run('gonderildi_erken_damga_2026_07')
    }
  } catch (e) { console.error('gonderildi damga onarimi:', e.message) }
  // Kendi setlerimiz: set = ad + tek SET fiyatı; bileşenler set_urunler'de.
  // Satışta set, bileşen ürünlere açılır (stok bileşenlerden düşer); fişte yalnız set fiyatı görünür.
  db.exec(`CREATE TABLE IF NOT EXISTS setler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL UNIQUE,
    fiyat REAL NOT NULL DEFAULT 0,
    aktif INTEGER DEFAULT 1,
    olusturma_tarihi TEXT DEFAULT (datetime('now','localtime'))
  )`)
  db.exec(`CREATE TABLE IF NOT EXISTS set_urunler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER NOT NULL REFERENCES setler(id),
    urun_id INTEGER NOT NULL REFERENCES urunler(id),
    miktar INTEGER NOT NULL DEFAULT 1,
    UNIQUE(set_id, urun_id)
  )`)
  // satis_kalemleri — kalem bir sete aitse set adı (fişte gruplama + fiyat gizleme için).
  try { db.exec("ALTER TABLE satis_kalemleri ADD COLUMN set_adi TEXT") } catch {}
  // sosyal_mesajlar — yorumun geldiği gönderi bağlamı (Meta Business Suite tarzı görünüm).
  try { db.exec("ALTER TABLE sosyal_mesajlar ADD COLUMN konu_baslik TEXT") } catch {}
  try { db.exec("ALTER TABLE sosyal_mesajlar ADD COLUMN konu_gorsel TEXT") } catch {}
  try { db.exec("ALTER TABLE sosyal_mesajlar ADD COLUMN konu_link TEXT") } catch {}
  // Yoruma özel mesaj (private reply) gönderildi damgası. Meta yorum başına TEK mesaj hakkı
  // verir → arayüz bunu gösterip ikinci denemeyi engeller. NULL = gönderilmedi.
  // SADECE BAŞARIDA yazılır — başarısızlık ozel_mesaj_hata/deneme'ye gider (aşağı bak).
  try { db.exec("ALTER TABLE sosyal_mesajlar ADD COLUMN ozel_mesaj_tarihi TEXT") } catch {}
  // DM eki: hikaye yanıtı/bahsi, paylaşılan gönderi, görsel/video. Metin boş gelebilir —
  // içerik bu alanlardadır. ek_tur: 'hikaye_yanit'|'hikaye_bahsi'|'paylasim'|'gorsel'|'video'|'dosya'.
  // Çift görünen giden DM onarımı (2026-07-28): yerel eko (giden_…) + Meta'dan çekilen aynı
  // mesaj iki satır oluşturuyordu. Meta kopyası silinir, gerçek kimlik ekoya taşınır
  // ("kim yanıtladı" ekoda). İdempotent: eko gerçek kimliği alınca desen artık eşleşmez.
  try {
    const ciftler = db.prepare(`
      SELECT e.id eko_id, MIN(g.id) meta_id
      FROM sosyal_mesajlar e JOIN sosyal_mesajlar g
        ON g.konu_id = e.konu_id AND g.yon = 'giden' AND g.tur = 'dm'
       AND g.metin = e.metin AND g.id != e.id AND g.harici_id NOT LIKE 'giden\\_%' ESCAPE '\\'
      WHERE e.tur = 'dm' AND e.yon = 'giden' AND e.harici_id LIKE 'giden\\_%' ESCAPE '\\'
      GROUP BY e.id`).all()
    const kullanilan = new Set()
    for (const c of ciftler) {
      if (kullanilan.has(c.meta_id)) continue
      kullanilan.add(c.meta_id)
      const meta = db.prepare('SELECT harici_id, mesaj_tarihi FROM sosyal_mesajlar WHERE id = ?').get(c.meta_id)
      if (!meta) continue
      db.prepare('DELETE FROM sosyal_mesajlar WHERE id = ?').run(c.meta_id)
      db.prepare('UPDATE sosyal_mesajlar SET harici_id = ?, mesaj_tarihi = COALESCE(?, mesaj_tarihi) WHERE id = ?')
        .run(meta.harici_id, meta.mesaj_tarihi, c.eko_id)
    }
  } catch {}
  try { db.exec("ALTER TABLE sosyal_mesajlar ADD COLUMN ek_tur TEXT") } catch {}
  try { db.exec("ALTER TABLE sosyal_mesajlar ADD COLUMN ek_baslik TEXT") } catch {}
  try { db.exec("ALTER TABLE sosyal_mesajlar ADD COLUMN ek_gorsel TEXT") } catch {}
  try { db.exec("ALTER TABLE sosyal_mesajlar ADD COLUMN ek_link TEXT") } catch {}
  // Gönderi Meta'da silinmişse işaretlenir (listeden gizlenir) — bkz. _silinenGonderileriIsaretle.
  try { db.exec("ALTER TABLE sosyal_mesajlar ADD COLUMN silindi INTEGER DEFAULT 0") } catch {}
  // ust_id indeksi ŞART: aşağıdaki yorum süpürücüsü ve çekim turu süpürücüsü ust_id ile
  // arama yapar. İndekssiz 66k okunmamış × 90k satır = saatlerce süren tam tarama →
  // v1.2.140 açılışta ASILI KALIYORDU (2026-07-28). Onarımlardan ÖNCE oluşturulmalı.
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_sosyal_ust ON sosyal_mesajlar(ust_id)") } catch {}
  // KENDİ yorumlarımız 'gelen' yazılmıştı → okunmamış sayılıp rozeti şişiriyordu (5000+ satır).
  // Geriye dönük onarım: sayfa adı/kimliğiyle eşleşenler 'giden' yapılır. İdempotent.
  try {
    const ayar = {}
    for (const r of db.prepare('SELECT anahtar, deger FROM meta_ayarlar').all()) ayar[r.anahtar] = r.deger
    const adlar = [...new Set([ayar.sayfa_ad, 'tenceremtava'].filter(Boolean).map(a => a.toLowerCase()))]
    db.prepare(`
      UPDATE sosyal_mesajlar SET yon = 'giden', durum = 'cevaplandi'
      WHERE tur = 'yorum' AND yon = 'gelen'
        AND (lower(COALESCE(gonderen_ad,'')) IN (${adlar.map(() => '?').join(',')})
             OR (gonderen_id IS NOT NULL AND gonderen_id = ?))`).run(...adlar, ayar.sayfa_id || '')
    // Uygulama dışından yanıtlanmışları da kapat (sosyal-mesajlar._yanitlananlariKapat ile
    // aynı SQL — oradan require etmek döngüsel bağımlılık olurdu).
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
  } catch {}
  // Başarısız gönderim takibi. Eskiden hata durumunda da ozel_mesaj_tarihi damgalanıyordu
  // ("her turda aynı hatayı tekrarlama" için) → damga başarıyı da başarısızlığı da aynı
  // gösteriyordu, başarısızlar SESSİZCE kayboluyordu. Artık ayrı: hata metni + deneme sayacı.
  // Sayaç sonsuz denemeyi engeller (kalıcı hatalar: yorum başına tek hak dolmuş, 7 gün geçmiş).
  try { db.exec("ALTER TABLE sosyal_mesajlar ADD COLUMN ozel_mesaj_hata TEXT") } catch {}
  try { db.exec("ALTER TABLE sosyal_mesajlar ADD COLUMN ozel_mesaj_deneme INTEGER DEFAULT 0") } catch {}

  // --- Gönderi bazlı otomatik yorum cevabı ---
  // Şablon kütüphanesi otomasyondan AYRI: şablonun ömrü gönderiden uzun (yeni çelik kase
  // gönderisinde aynı şablon tekrar seçilir).
  db.exec(`CREATE TABLE IF NOT EXISTS sosyal_sablonlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL,
    urun_id INTEGER REFERENCES urunler(id),
    urun_adi TEXT NOT NULL,
    aciklama TEXT,
    fiyat REAL,
    link TEXT,
    whatsapp TEXT,
    tur TEXT NOT NULL DEFAULT 'urun',
    serbest_metin TEXT,
    aktif INTEGER DEFAULT 1,
    olusturma_tarihi TEXT DEFAULT (datetime('now','localtime'))
  );`)
  // fiyat NULL = "ürüne sor" (canlı fiyat), dolu = "bunu yaz" (kampanya/set fiyatı).
  // Ayrı bir fiyat_tipi bayrağı YOK — NULL'ın kendisi anlam taşır, iki alanı senkron tutma derdi olmaz.

  db.exec(`CREATE TABLE IF NOT EXISTS sosyal_otomasyonlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    konu_id TEXT NOT NULL UNIQUE,
    aktif INTEGER DEFAULT 0,
    acik_yanit_metni TEXT,
    baslangic_tarihi TEXT,
    olusturma_tarihi TEXT DEFAULT (datetime('now','localtime'))
  );`)

  db.exec(`CREATE TABLE IF NOT EXISTS sosyal_otomasyon_sablonlar (
    otomasyon_id INTEGER NOT NULL REFERENCES sosyal_otomasyonlar(id) ON DELETE CASCADE,
    sablon_id INTEGER NOT NULL REFERENCES sosyal_sablonlar(id),
    sira INTEGER DEFAULT 0,
    PRIMARY KEY (otomasyon_id, sablon_id)
  );`)
  db.exec("CREATE INDEX IF NOT EXISTS idx_sosyal_oto_konu ON sosyal_otomasyonlar(konu_id)")
  // Şablon bir SET'e de bağlanabilir (setler ayrı tabloda; satışta bileşenlere açıldıkları
  // için urunler'e yazılmazlar). Fiyat çözümü: sablon.fiyat → urun.satis_fiyati → set.fiyat.
  try { db.exec("ALTER TABLE sosyal_sablonlar ADD COLUMN set_id INTEGER REFERENCES setler(id)") } catch {}
  // Şablon türü: 'urun' (fiyat odaklı, mevcut) | 'genel' (serbest metin aynen gider).
  // Mevcut satırlar 'urun' varsayılır — geriye dönük uyumlu.
  try { db.exec("ALTER TABLE sosyal_sablonlar ADD COLUMN tur TEXT NOT NULL DEFAULT 'urun'") } catch {}
  try { db.exec("ALTER TABLE sosyal_sablonlar ADD COLUMN serbest_metin TEXT") } catch {}

  // PERFORMANS index'leri:
  // online-siparisler:listele her satır için kargolar'dan son takip no'yu alt sorguyla çekiyor;
  // index olmadan bu N satırda N tam tablo taraması demek.
  db.exec("CREATE INDEX IF NOT EXISTS idx_kargolar_online_siparis ON kargolar(online_siparis_id)")
  db.exec("CREATE INDEX IF NOT EXISTS idx_kargolar_ikas_siparis ON kargolar(ikas_siparis_id, durum)")
  // sonrakiStokKodu marka bazlı en yüksek SKU'yu arıyor.
  db.exec("CREATE INDEX IF NOT EXISTS idx_urunler_marka_sku ON urunler(marka_id, sku)")
  // Ürün listesi/arama en sık marka+kategori+aktif üzerinden filtreleniyor.
  db.exec("CREATE INDEX IF NOT EXISTS idx_urunler_aktif_marka ON urunler(aktif, marka_id)")
  // Sipariş listesi tarihe göre sıralanıyor.
  db.exec("CREATE INDEX IF NOT EXISTS idx_online_siparis_tarih ON online_siparisler(siparis_tarihi)")
}

function seedLokasyonlar() {
  const count = db.prepare('SELECT COUNT(*) as n FROM lokasyonlar').get()
  if (count.n === 0) {
    db.prepare("INSERT INTO lokasyonlar (ad, adres) VALUES (?, ?)").run('Tencerecim Pendik', 'Pendik')
    db.prepare("INSERT INTO lokasyonlar (ad, adres) VALUES (?, ?)").run('Tencerecim Gölcük', 'Gölcük')
  } else {
    // Mevcut lokasyonların adlarını güncelle
    const lok1 = db.prepare('SELECT id FROM lokasyonlar WHERE id = 1').get()
    if (lok1) db.prepare("UPDATE lokasyonlar SET ad = 'Tencerecim Pendik' WHERE id = 1 AND ad LIKE 'Ma%aza 1%'").run()
    const lok2 = db.prepare('SELECT id FROM lokasyonlar WHERE id = 2').get()
    if (lok2) db.prepare("UPDATE lokasyonlar SET ad = 'Tencerecim Gölcük' WHERE id = 2 AND ad LIKE 'Ma%aza 2%'").run()
  }
}

// UPS il/ilçe kod tablosunu bir kez seed eder (≈5600 satır). Tablo doluysa atlar.
function seedUpsSehirIlce() {
  const count = db.prepare('SELECT COUNT(*) as n FROM ups_sehir_ilce').get()
  if (count.n > 0) return
  const path = require('path')
  const fs = require('fs')
  const jsonYol = path.join(__dirname, '..', 'ups', 'sehir-ilce.json')
  let kayitlar
  try {
    kayitlar = JSON.parse(fs.readFileSync(jsonYol, 'utf-8'))
  } catch (err) {
    console.error('UPS sehir-ilce.json okunamadı:', err.message)
    return
  }
  const ekle = db.prepare('INSERT INTO ups_sehir_ilce (il_kodu, il, ilce_kodu, ilce) VALUES (@ilKodu, @il, @ilceKodu, @ilce)')
  const toplu = db.transaction((satirlar) => { for (const s of satirlar) ekle.run(s) })
  toplu(kayitlar)
}

module.exports = { init, getDb }
