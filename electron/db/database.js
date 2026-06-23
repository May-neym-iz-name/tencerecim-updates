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
  createTables()
  migrate()
  seedLokasyonlar()
  seedUpsSehirIlce()
  backfillStok()
  return db
}

// Her aktif ürün × lokasyon için eksik stok satırlarını 0 ile tamamlar.
// Böylece stok satırı olmayan (ör. yeni eklenmiş) ürünler Stok ve Stok Sayım
// ekranlarında 0 olarak görünür ve stok girilebilir.
function backfillStok() {
  db.exec(`
    INSERT OR IGNORE INTO urun_stoklar (urun_id, lokasyon_id, miktar, minimum_stok)
    SELECT u.id, l.id, 0, 0
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
  // kargolar — online sipariş bağlantısı (hangi siparişin kargosu).
  try { db.exec("ALTER TABLE kargolar ADD COLUMN online_siparis_id INTEGER REFERENCES online_siparisler(id)") } catch {}
  // online_siparis_kalemleri — ikas sipariş kalemi id'si (iptal/iade için).
  try { db.exec("ALTER TABLE online_siparis_kalemleri ADD COLUMN ikas_kalem_id TEXT") } catch {}
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
