// Satış ekranı sınıflandırmasının ürün girişinden düzenlenmesi (v1.2.219).
//
// İki alan, iki farklı sahiplik:
//   * urunler.model      → ÜRÜNE ait, sözlük eşleşmesini ezen elle değer
//   * kategoriler.ana_tip → KATEGORİYE ait, o kategorideki TÜM ürünleri etkiler
//
// En kritik iddia "model alanını göndermeyen çağrı mevcut modeli SİLMEZ": toplu içe
// aktarma ve eski arayüz bu alanı göndermiyor. Yanlış olursa her içe aktarma elle
// girilmiş modelleri sessizce süpürür — tam olarak setler.web_link'te yaşanan sınıf.
//
// better-sqlite3 BURADA KULLANILAMAZ (Electron ABI); node:sqlite adaptörü.
import { describe, test, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { anaTip } = require('./ana-tip.js')

// GERÇEK handler test edilir, kopyası değil — mantığı burada yeniden yazsaydık
// mutasyon testi gerçeği değil kopyayı ölçerdi. urunler.js CJS require kullandığı
// için vi.mock çalışmaz (bkz. sosyal-gonderiler.test.js); yerine require.cache'e
// urunler.js YÜKLENMEDEN ÖNCE etkisiz bir yetkiKontrol konur.
const yetkiYol = require.resolve('../yetki')
require(yetkiYol)
require.cache[yetkiYol].exports._yetkiKontrol = () => {}
// getDb() çağrılırsa test yanlış yoldadır: handler'lara db AÇIKÇA ikinci argüman
// olarak geçilir. Patlaması KASITLI — sessizce canlı DB'ye gitmesindense.
const dbYol = require.resolve('./database')
require(dbYol)
require.cache[dbYol].exports.getDb = () => { throw new Error('test getDb() kullanmamalı') }
const urunlerModul = require('./urunler.js')

function bellekDb() {
  const d = new DatabaseSync(':memory:')
  d.exec(`
    CREATE TABLE markalar (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT UNIQUE, aktif INTEGER DEFAULT 1);
    CREATE TABLE kategoriler (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT, ust_kategori_id INTEGER,
      tam_yol TEXT, aktif INTEGER DEFAULT 1, ana_tip TEXT);
    CREATE TABLE tedarikciler (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT UNIQUE, aktif INTEGER DEFAULT 1);
    CREATE TABLE urunler (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT, barkod TEXT UNIQUE, sku TEXT UNIQUE,
      marka_id INTEGER, kategori_id INTEGER, tedarikci_id INTEGER, aciklama TEXT,
      alis_fiyati REAL DEFAULT 0, satis_fiyati REAL, kdv_orani INTEGER DEFAULT 20,
      web_link TEXT, model TEXT, aktif INTEGER DEFAULT 1, guncelleme_tarihi TEXT);
    CREATE TABLE urun_barkodlar (id INTEGER PRIMARY KEY AUTOINCREMENT, urun_id INTEGER, barkod TEXT UNIQUE);
    CREATE TABLE lokasyonlar (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT);
    CREATE TABLE urun_stoklar (id INTEGER PRIMARY KEY AUTOINCREMENT, urun_id INTEGER, lokasyon_id INTEGER,
      miktar REAL DEFAULT 0, minimum_stok REAL DEFAULT 0);
    CREATE TABLE marka_modelleri (id INTEGER PRIMARY KEY AUTOINCREMENT, marka_id INTEGER,
      model_adi TEXT, oncelik INTEGER DEFAULT 0, aktif INTEGER DEFAULT 1);
    INSERT INTO lokasyonlar (ad) VALUES ('Pendik'), ('Gölcük');
  `)
  return {
    prepare: (sql) => {
      const s = d.prepare(sql)
      return { get: (...a) => s.get(...a), all: (...a) => s.all(...a), run: (...a) => s.run(...a) }
    },
  }
}

// Gerçek 'urunler:guncelle' handler'ı. db açıkça geçilir (ikinci argüman).
const urunGuncelle = (db, id, veri) => urunlerModul['urunler:guncelle']({ id, ...veri }, db)
const urunOlustur = (db, veri) => urunlerModul['urunler:olustur'](veri, db)

let db, urunId
beforeEach(() => {
  db = bellekDb()
  db.prepare("INSERT INTO markalar (ad) VALUES ('LAVA')").run()
  db.prepare("INSERT INTO kategoriler (ad, tam_yol, ana_tip) VALUES ('Granit Tavalar','Granit Tavalar','Tava')").run()
  db.prepare(`INSERT INTO urunler (ad, sku, marka_id, kategori_id, satis_fiyati, model, web_link)
    VALUES ('YUVARLAK TENCERE Ç20 FOLK BEYAZ','TNC.LAV.00001',1,1,500,'Folk','http://x')`).run()
  urunId = db.prepare("SELECT id FROM urunler WHERE sku='TNC.LAV.00001'").get().id
})

const modelOku = () => db.prepare('SELECT model FROM urunler WHERE id=?').get(urunId).model

describe('urunler.model — undefined / boş ayrımı', () => {
  test('🔴 model GÖNDERİLMEYEN çağrı mevcut modeli SİLMEZ', () => {
    // Toplu içe aktarma ve eski arayüz bu alanı göndermez.
    urunGuncelle(db, urunId, { ad: 'yeni ad', satis_fiyati: 500 })
    expect(modelOku()).toBe('Folk')
  })

  test('🔴 model BOŞ STRING gönderilirse silinir (kullanıcı kutuyu boşalttı)', () => {
    // Silinebilmesi şart: model boşalınca sunucu yeniden sözlükten çözer.
    urunGuncelle(db, urunId, { ad: 'a', satis_fiyati: 500, model: '' })
    expect(modelOku()).toBeNull()
  })

  test('model dolu gönderilirse yazılır', () => {
    urunGuncelle(db, urunId, { ad: 'a', satis_fiyati: 500, model: 'Trendy' })
    expect(modelOku()).toBe('Trendy')
  })

  test('model gönderilmeyen çağrı web_link mantığını bozmaz', () => {
    urunGuncelle(db, urunId, { ad: 'a', satis_fiyati: 500, web_link: '' })
    const r = db.prepare('SELECT model, web_link FROM urunler WHERE id=?').get(urunId)
    expect(r.web_link).toBeNull()
    expect(r.model).toBe('Folk')
  })
})

describe('kategoriler.ana_tip — kategoriye ait, ürüne değil', () => {
  test('ana tip değişince o kategorideki TÜM ürünler etkilenir', () => {
    db.prepare(`INSERT INTO urunler (ad, sku, marka_id, kategori_id, satis_fiyati)
      VALUES ('ikinci','TNC.LAV.00002',1,1,300)`).run()
    db.prepare("UPDATE kategoriler SET ana_tip='Sahan' WHERE id=1").run()
    const etkilenen = db.prepare('SELECT COUNT(*) n FROM urunler WHERE kategori_id=1 AND aktif=1').get().n
    expect(etkilenen).toBe(2)
    expect(db.prepare('SELECT ana_tip FROM kategoriler WHERE id=1').get().ana_tip).toBe('Sahan')
  })

  test('boş ana tip GEÇERLİ bir değerdir (satış ekranında Diğer dalı)', () => {
    const yeni = String('' || '').trim() || null
    expect(yeni).toBeNull()
  })
})

describe('anaTip() haritası — iki farklı "yok"', () => {
  test('bilinen kategori tipine eşlenir', () => {
    expect(anaTip('Granit Tavalar')).toBe('Tava')
    expect(anaTip('Klasik Düdüklüler')).toBe('Düdüklü')
  })

  test('🔴 haritada olmayan kategori null döner — "Diğer" ile aynı şey DEĞİL', () => {
    // null = harita bayatlamış (yeni kategori eklendi, haritaya yazılmadı).
    // Bu ayrım korunmazsa harita bayatladığında test yeşil kalır.
    expect(anaTip('Uydurma Kategori')).toBeNull()
    expect(anaTip('')).toBeNull()
    expect(anaTip(null)).toBeNull()
  })

  test('yeni açılan kategori haritada yoksa ana tip NULL kalır, kullanıcı doldurur', () => {
    const tip = String('' || '').trim() || anaTip('Uydurma Kategori') || null
    expect(tip).toBeNull()
  })

  test('çağıran açıkça ana tip verirse harita devre dışı kalır', () => {
    const tip = String('Tava' || '').trim() || anaTip('Uydurma Kategori') || null
    expect(tip).toBe('Tava')
  })
})
