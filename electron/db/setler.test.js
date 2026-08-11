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
    CREATE TABLE setler (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT UNIQUE, fiyat REAL, aktif INTEGER DEFAULT 1);
    CREATE TABLE urunler (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT, kdv_orani REAL DEFAULT 20, satis_fiyati REAL, aktif INTEGER DEFAULT 1);
    CREATE TABLE set_urunler (id INTEGER PRIMARY KEY AUTOINCREMENT, set_id INTEGER, urun_id INTEGER, miktar REAL DEFAULT 1);

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
