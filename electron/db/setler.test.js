// Kendi setlerimiz — arama desteği testleri.
// better-sqlite3 BURADA KULLANILAMAZ (Electron ABI'sine derli, vitest düz Node'da koşar);
// node:sqlite üstüne setler.js'in kullandığı yüzeyi veren ince adaptör konur (urunler.test.js kalıbı).
import { describe, test, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const setler = require('./setler.js')

function bellekDb() {
  const d = new DatabaseSync(':memory:')
  // tr-arama.js'in kelimeKosulu ürettiği SQL, tr_ara() SQL fonksiyonuna dayanır
  // (bkz. electron/db/database.js — better-sqlite3'te db.function ile tanımlanır).
  // node:sqlite'da eşdeğeri d.function.
  const { trNormal } = require('./tr-arama.js')
  d.function('tr_ara', { deterministic: true }, (s) => trNormal(s))
  return {
    exec: (sql) => d.exec(sql),
    prepare: (sql) => {
      const s = d.prepare(sql)
      return { get: (...a) => s.get(...a), all: (...a) => s.all(...a), run: (...a) => s.run(...a) }
    },
  }
}

let db

beforeEach(() => {
  db = bellekDb()
  db.exec(`
    CREATE TABLE setler (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT UNIQUE, fiyat REAL, aktif INTEGER DEFAULT 1,
      sku TEXT, barkod TEXT, kdv_orani REAL, aciklama TEXT, marka_id INTEGER, kategori_id INTEGER, web_link TEXT);
    CREATE TABLE urunler (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT, kdv_orani REAL DEFAULT 20, satis_fiyati REAL,
      aktif INTEGER DEFAULT 1, sku TEXT, barkod TEXT);
    CREATE TABLE set_urunler (id INTEGER PRIMARY KEY AUTOINCREMENT, set_id INTEGER, urun_id INTEGER, miktar REAL DEFAULT 1);
    CREATE TABLE urun_barkodlar (id INTEGER PRIMARY KEY AUTOINCREMENT, urun_id INTEGER, barkod TEXT);
    CREATE TABLE markalar (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT);
    CREATE TABLE kategoriler (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT, tam_yol TEXT);
    INSERT INTO markalar (id, ad) VALUES (1, 'Sofram');
    INSERT INTO kategoriler (id, ad, tam_yol) VALUES (1, 'Setler', 'Mutfak > Setler');

    INSERT INTO urunler (id, ad, satis_fiyati) VALUES (1, 'Tencere 24', 100);
    INSERT INTO urunler (id, ad, satis_fiyati) VALUES (2, 'Tava 20', 80);

    INSERT INTO setler (id, ad, fiyat, aktif) VALUES (1, 'Çeyiz Seti', 500, 1);
    INSERT INTO setler (id, ad, fiyat, aktif) VALUES (2, 'Kahvaltı Seti', 300, 1);
    INSERT INTO setler (id, ad, fiyat, aktif) VALUES (3, 'Eski Set', 200, 0);

    INSERT INTO set_urunler (set_id, urun_id, miktar) VALUES (1, 1, 1);
    INSERT INTO set_urunler (set_id, urun_id, miktar) VALUES (1, 2, 1);
    INSERT INTO set_urunler (set_id, urun_id, miktar) VALUES (2, 1, 1);
  `)
})

describe('setler _listele', () => {
  test('arama verilmezse tüm aktif setler döner (mevcut davranış regresyonu)', () => {
    const r = setler._listele({}, db)
    expect(r.map(s => s.ad).sort()).toEqual(['Kahvaltı Seti', 'Çeyiz Seti'].sort())
  })

  test('set adının bir parçasıyla arama sonuç döndürür', () => {
    const r = setler._listele({ arama: 'çeyiz' }, db)
    expect(r).toHaveLength(1)
    expect(r[0].ad).toBe('Çeyiz Seti')
    expect(r[0].bilesenler).toHaveLength(2)
  })

  test('Türkçe büyük/küçük harf duyarsız: ÇEYİZ araması çeyiz setini bulur', () => {
    const r = setler._listele({ arama: 'ÇEYİZ' }, db)
    expect(r).toHaveLength(1)
    expect(r[0].ad).toBe('Çeyiz Seti')
  })

  test('kelime bazlı: ters sırada da bulur', () => {
    const r = setler._listele({ arama: 'seti çeyiz' }, db)
    expect(r).toHaveLength(1)
    expect(r[0].ad).toBe('Çeyiz Seti')
  })

  // 2026-08-11 isteği: set içindeki ürünün adı yazılınca da set bulunmalı.
  test('bileşen ürün adıyla arama seti bulur', () => {
    const r = setler._listele({ arama: 'tava' }, db)
    expect(r.map(s => s.ad)).toEqual(['Çeyiz Seti'])
  })

  test('set adı + bileşen adı karışık kelimelerle bulunur', () => {
    const r = setler._listele({ arama: 'çeyiz tencere' }, db)
    expect(r.map(s => s.ad)).toEqual(['Çeyiz Seti'])
  })

  test('içerik metni sonuçta sızdırılmaz', () => {
    const r = setler._listele({}, db)
    expect(r[0]).not.toHaveProperty('icerik_metni')
  })

  test('eşleşmeyen arama boş dizi döner', () => {
    const r = setler._listele({ arama: 'olmayan-set-xyz' }, db)
    expect(r).toEqual([])
  })

  test('pasif set aramada da çıkmaz', () => {
    const r = setler._listele({ arama: 'eski' }, db)
    expect(r).toEqual([])
  })
})

// v1.2.180 — set "normal ürün gibi": SKU/barkod/KDV/marka/kategori alanları.
describe('setler ürün alanları', () => {
  test('SKU ile arama seti bulur', () => {
    db.prepare("UPDATE setler SET sku = 'TNC.SET.00003' WHERE id = 1").run()
    expect(setler._listele({ arama: 'TNC.SET.00003' }, db).map(s => s.ad)).toEqual(['Çeyiz Seti'])
  })

  test('barkod ile arama seti bulur', () => {
    db.prepare("UPDATE setler SET barkod = '2900000089655' WHERE id = 2").run()
    expect(setler._listele({ arama: '2900000089655' }, db).map(s => s.ad)).toEqual(['Kahvaltı Seti'])
  })

  test('marka ve kategori adı listede gelir', () => {
    db.prepare('UPDATE setler SET marka_id = 1, kategori_id = 1 WHERE id = 1').run()
    const s = setler._listele({ arama: 'çeyiz' }, db)[0]
    expect(s.marka_adi).toBe('Sofram')
    expect(s.kategori_yol).toBe('Mutfak > Setler')
  })
})

describe('setler _barkodla (kasada set okutma)', () => {
  beforeEach(() => {
    db.prepare("UPDATE setler SET barkod = '2900000089655' WHERE id = 1").run()
  })

  test('set barkodu okutulunca bileşenleriyle birlikte döner', () => {
    const s = setler._barkodla('2900000089655', db)
    expect(s.ad).toBe('Çeyiz Seti')
    // Satış'taki setSepeteEkle() bilesenler bekliyor — boş gelirse sepete eklenmez.
    expect(s.bilesenler).toHaveLength(2)
  })

  test('baştaki/sondaki boşluk okuyucudan gelse de eşleşir', () => {
    expect(setler._barkodla('  2900000089655 ', db)?.ad).toBe('Çeyiz Seti')
  })

  test('bilinmeyen barkod null döner', () => {
    expect(setler._barkodla('9999999999999', db)).toBe(null)
  })

  test('boş barkod null döner (boş kutuyla sorgu atılmasın)', () => {
    expect(setler._barkodla('', db)).toBe(null)
  })

  test('pasif setin barkodu okutulamaz', () => {
    db.prepare("UPDATE setler SET barkod = '2900000000001' WHERE id = 3").run()
    expect(setler._barkodla('2900000000001', db)).toBe(null)
  })
})

// Barkod/SKU TEK havuz: ürün, ürün takma adı ve set aynı okuyucudan geçer.
describe('setler çakışma kontrolü', () => {
  test('ürünün barkodu sete verilemez', () => {
    db.prepare("UPDATE urunler SET barkod = '8699349910112' WHERE id = 1").run()
    expect(() => setler._alanlariHazirla(db, { barkod: '8699349910112' }))
      .toThrow(/Tencere 24/)
  })

  test('ürünün TAKMA AD barkodu da sete verilemez', () => {
    db.prepare("INSERT INTO urun_barkodlar (urun_id, barkod) VALUES (1, '8699349910113')").run()
    expect(() => setler._alanlariHazirla(db, { barkod: '8699349910113' }))
      .toThrow(/takma ad/)
  })

  test('başka bir setin barkodu verilemez', () => {
    db.prepare("UPDATE setler SET barkod = '2900000089655' WHERE id = 1").run()
    expect(() => setler._alanlariHazirla(db, { barkod: '2900000089655' }, 2))
      .toThrow(/Çeyiz Seti/)
  })

  test('setin KENDİ barkodu düzenlemede çakışma sayılmaz', () => {
    db.prepare("UPDATE setler SET barkod = '2900000089655' WHERE id = 1").run()
    expect(setler._alanlariHazirla(db, { barkod: '2900000089655' }, 1).barkod).toBe('2900000089655')
  })

  test('ürünün stok kodu sete verilemez', () => {
    db.prepare("UPDATE urunler SET sku = 'TNC.LNS.00302' WHERE id = 2").run()
    expect(() => setler._alanlariHazirla(db, { sku: 'TNC.LNS.00302' })).toThrow(/Tava 20/)
  })

  test('PASİF ürünün barkodu sete verilebilir (silinmiş ürün engel olmasın)', () => {
    db.prepare("UPDATE urunler SET barkod = '8699349910114', aktif = 0 WHERE id = 1").run()
    expect(setler._alanlariHazirla(db, { barkod: '8699349910114' }).barkod).toBe('8699349910114')
  })
})

describe('setler alan normalizasyonu', () => {
  test('boş SKU/barkod NULL olur (kısmi UNIQUE indeks ikinci boş kaydı reddetmesin)', () => {
    const a = setler._alanlariHazirla(db, { sku: '', barkod: '   ' })
    expect(a.sku).toBe(null)
    expect(a.barkod).toBe(null)
  })

  test('KDV boş bırakılınca NULL — satışta bileşenlerden hesaplanır', () => {
    expect(setler._alanlariHazirla(db, { kdv_orani: '' }).kdv_orani).toBe(null)
  })

  test('KDV 0 geçerli bir orandır, NULL sayılmaz', () => {
    expect(setler._alanlariHazirla(db, { kdv_orani: 0 }).kdv_orani).toBe(0)
  })

  test('aralık dışı KDV reddedilir', () => {
    expect(() => setler._alanlariHazirla(db, { kdv_orani: 120 })).toThrow(/0-100/)
  })

  test('marka/kategori seçilmezse NULL olur', () => {
    const a = setler._alanlariHazirla(db, { marka_id: '', kategori_id: undefined })
    expect(a.marka_id).toBe(null)
    expect(a.kategori_id).toBe(null)
  })
})
