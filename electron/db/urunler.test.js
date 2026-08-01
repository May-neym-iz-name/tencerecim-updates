// Takma ad barkodlar: bir ürüne ek barkod tanımlanabilir, hangisi okutulursa okutulsun
// aynı ürün gelir. urunler.barkod BİRİNCİL kalır (senkron doğal anahtarı + ikas eşleşmesi).
// better-sqlite3 BURADA KULLANILAMAZ (Electron ABI'sine derli, vitest düz Node'da koşar);
// node:sqlite üstüne urunler.js'in kullandığı yüzeyi veren ince adaptör konur.
import { describe, test, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const urunler = require('./urunler.js')

function bellekDb() {
  const d = new DatabaseSync(':memory:')
  return {
    exec: (sql) => d.exec(sql),
    prepare: (sql) => {
      const s = d.prepare(sql)
      return { get: (...a) => s.get(...a), all: (...a) => s.all(...a), run: (...a) => s.run(...a) }
    },
    transaction: (fn) => (...args) => {
      d.exec('BEGIN')
      try { const r = fn(...args); d.exec('COMMIT'); return r }
      catch (e) { d.exec('ROLLBACK'); throw e }
    },
  }
}

let db

beforeEach(() => {
  db = bellekDb()
  db.exec(`
    CREATE TABLE markalar (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT, aktif INTEGER DEFAULT 1);
    CREATE TABLE kategoriler (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT, tam_yol TEXT);
    CREATE TABLE tedarikciler (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT);
    CREATE TABLE urunler (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT, barkod TEXT UNIQUE, sku TEXT UNIQUE,
      marka_id INTEGER, kategori_id INTEGER, tedarikci_id INTEGER, aciklama TEXT,
      alis_fiyati REAL, satis_fiyati REAL, kdv_orani REAL DEFAULT 20, aktif INTEGER DEFAULT 1);
    CREATE TABLE urun_barkodlar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      urun_id INTEGER NOT NULL REFERENCES urunler(id) ON DELETE CASCADE,
      barkod TEXT NOT NULL UNIQUE, aciklama TEXT,
      olusturma_tarihi TEXT DEFAULT (datetime('now','localtime')));
    CREATE TABLE urun_stoklar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      urun_id INTEGER NOT NULL REFERENCES urunler(id) ON DELETE CASCADE,
      miktar REAL DEFAULT 0);
    INSERT INTO urunler (id, ad, barkod, sku, satis_fiyati) VALUES (1, 'Tencere 24', '8690000000001', 'TNC.LAV.00001', 100);
    INSERT INTO urunler (id, ad, barkod, sku, satis_fiyati) VALUES (2, 'Tava 20', '8690000000002', 'TNC.LAV.00002', 80);
  `)
})

describe('takma ad barkod ekleme kuralları', () => {
  test('geçerli takma ad eklenir', () => {
    const b = urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017', aciklama: 'tedarikçi' }, db)
    expect(b.barkod).toBe('2900000000017')
    expect(urunler._barkodListe(1, db).map(x => x.barkod)).toEqual(['2900000000017'])
  })

  test('boş barkod reddedilir', () => {
    expect(() => urunler._barkodEkle({ urun_id: 1, barkod: '   ' }, db)).toThrow(/Barkod boş olamaz/)
  })

  test('başka ürünün takma adı tekrar eklenemez', () => {
    urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017' }, db)
    expect(() => urunler._barkodEkle({ urun_id: 2, barkod: '2900000000017' }, db))
      .toThrow(/başka bir ürüne tanımlı/)
  })

  test('başka ürünün BİRİNCİL barkodu takma ad olamaz', () => {
    expect(() => urunler._barkodEkle({ urun_id: 1, barkod: '8690000000002' }, db))
      .toThrow(/başka bir ürüne tanımlı/)
  })

  test('ürünün kendi birincil barkodu takma ad olamaz', () => {
    expect(() => urunler._barkodEkle({ urun_id: 1, barkod: '8690000000001' }, db))
      .toThrow(/zaten bu ürünün barkodu/)
  })

  test('barkod kırpılarak saklanır', () => {
    const b = urunler._barkodEkle({ urun_id: 1, barkod: '  2900000000017  ' }, db)
    expect(b.barkod).toBe('2900000000017')
  })

  test('dönüşteki aciklama kırpılır ve DB değeriyle aynıdır', () => {
    const b = urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017', aciklama: '  tedarikçi  ' }, db)
    expect(b.aciklama).toBe('tedarikçi')
    const dbKayit = db.prepare('SELECT aciklama FROM urun_barkodlar WHERE id=?').get(b.id)
    expect(dbKayit.aciklama).toBe('tedarikçi')
  })
})

describe('takma ad silme', () => {
  test('silinince listeden düşer', () => {
    const b = urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017' }, db)
    urunler._barkodSil(b.id, db)
    expect(urunler._barkodListe(1, db)).toEqual([])
  })

  test('olmayan kayıt silinmek istenirse hata verir', () => {
    expect(() => urunler._barkodSil(999, db)).toThrow(/Barkod bulunamadı/)
  })
})

describe('takma ad ile ürün bulma', () => {
  test('takma ad barkod okutulunca doğru ürün gelir', () => {
    urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017' }, db)
    expect(urunler._barkodla('2900000000017', db).id).toBe(1)
  })

  test('birincil barkod hâlâ bulunur (regresyon)', () => {
    expect(urunler._barkodla('8690000000001', db).id).toBe(1)
  })

  test('SKU ile bulma hâlâ çalışır (regresyon)', () => {
    expect(urunler._barkodla('TNC.LAV.00001', db).id).toBe(1)
  })

  test('baştaki/sondaki boşluk yok sayılır', () => {
    urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017' }, db)
    expect(urunler._barkodla('  2900000000017 ', db).id).toBe(1)
  })

  test('takma ad silinince o barkod artık ürünü bulmaz', () => {
    const b = urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017' }, db)
    urunler._barkodSil(b.id, db)
    expect(urunler._barkodla('2900000000017', db)).toBeUndefined()
  })

  test('pasif ürünün takma adı ürün getirmez', () => {
    urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017' }, db)
    db.prepare('UPDATE urunler SET aktif=0 WHERE id=1').run()
    expect(urunler._barkodla('2900000000017', db)).toBeUndefined()
  })

  test('bilinmeyen kod undefined döner', () => {
    expect(urunler._barkodla('yokboyle', db)).toBeUndefined()
  })
})

describe('ürün araması takma adı kapsar', () => {
  test('takma ad barkodla arama sonuç döndürür', () => {
    urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017' }, db)
    const sql = "SELECT u.id FROM urunler u WHERE u.aktif=1 AND (u.ad || ' ' || COALESCE(u.barkod,'') || ' ' || COALESCE(u.sku,'') || ' ' || COALESCE((SELECT GROUP_CONCAT(ub.barkod, ' ') FROM urun_barkodlar ub WHERE ub.urun_id = u.id),'')) LIKE ?"
    expect(db.prepare(sql).all('%2900000000017%').map(r => r.id)).toEqual([1])
  })
})
