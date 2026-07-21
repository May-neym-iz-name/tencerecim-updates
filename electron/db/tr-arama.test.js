// Arama SQL'i GERÇEK SQLite'a karşı. Saf fonksiyon testleri src/utils/arama-paritesi.test.js'te;
// buradaki asıl soru: kelimeKosulu'nun ürettiği SQL gerçekten doğru satırları döndürüyor mu?
//
// node:sqlite kullanılır — better-sqlite3'ün prebuilt ikilisi Electron için derlenmiş
// (npmRebuild:false) ve vitest'in Node'unda NODE_MODULE_VERSION uyuşmazlığı veriyor.
import { describe, test, expect, beforeEach } from 'vitest'
const { DatabaseSync } = require('node:sqlite')
const { kelimeKosulu, trNormal } = require('./tr-arama.js')

const URUN = 'LİNES OSCAR 18 X 10 ÇELİK TENCERE KORDONLU METAL KULP CAM KAPAK'
const ALAN = "u.ad || ' ' || COALESCE(u.barkod,'') || ' ' || COALESCE(u.sku,'') || ' ' || COALESCE(m.ad,'')"

let db
beforeEach(() => {
  db = new DatabaseSync(':memory:')
  // Uygulamadakiyle AYNI custom fonksiyon (database.js tr_ara).
  db.function('tr_ara', { deterministic: true }, (s) => trNormal(s))
  db.exec(`
    CREATE TABLE markalar(id INTEGER PRIMARY KEY, ad TEXT);
    CREATE TABLE urunler(id INTEGER PRIMARY KEY, ad TEXT, barkod TEXT, sku TEXT,
      marka_id INTEGER, aktif INTEGER DEFAULT 1);`)
  db.prepare('INSERT INTO markalar VALUES(1,?)').run('LİNES')
  db.prepare('INSERT INTO markalar VALUES(2,?)').run('LAVA')
  db.prepare('INSERT INTO markalar VALUES(3,?)').run('SAFLON')
  db.prepare('INSERT INTO urunler VALUES(1,?,?,?,1,1)').run(URUN, '8690001112223', 'TNC.LNS.00001')
  db.prepare('INSERT INTO urunler VALUES(2,?,?,?,2,1)').run('LAVA DÖKÜM GÜVEÇ 24 CM', '8690009998887', 'TNC.LAV.00042')
  // Marka adı ürün adında GEÇMİYOR — marka üzerinden aramanın gerçekten çalıştığını kanıtlar.
  db.prepare('INSERT INTO urunler VALUES(3,?,?,?,3,1)').run('GRANİT TAVA 20 CM', null, 'TNC.SFL.00007')
})

const ara = (arama) => {
  const k = kelimeKosulu(ALAN, arama)
  const sql = `SELECT u.id FROM urunler u LEFT JOIN markalar m ON u.marka_id = m.id
               WHERE u.aktif = 1 ${k.sql} ORDER BY u.id`
  return db.prepare(sql).all(...k.params).map((r) => r.id)
}

describe('kelimeKosulu — gerçek SQL sonuçları', () => {
  test('KULLANICININ ÖRNEĞİ: karışık sıra + karışık harf → ürünü bulur', () => {
    expect(ara('lines ÇELİK TENCERE METAL KULP oscar cam kapak')).toEqual([1])
  })

  test('hiç Türkçe karakter yazmadan da bulur', () => {
    expect(ara('celik tencere')).toEqual([1])
    expect(ara('dokum guvec')).toEqual([2])
    expect(ara('granit tava')).toEqual([3])
  })

  test('ASCII I ile yazınca da bulur (Türkçe "I sorunu")', () => {
    // toLocaleLowerCase('tr') kullanılsaydı "LINES" → "lınes" olur ve BULAMAZDI.
    expect(ara('LINES')).toEqual([1])
    expect(ara('lines')).toEqual([1])
    expect(ara('lınes')).toEqual([1])
  })

  test('kelime sırası hiç önemli değil', () => {
    expect(ara('kapak lines')).toEqual([1])
    expect(ara('lines kapak')).toEqual([1])
    expect(ara('guvec lava dokum')).toEqual([2])
  })

  test('MARKA adından da bulunur (ürün adında marka geçmese bile)', () => {
    // Ürün 3'ün adı "GRANİT TAVA 20 CM" — içinde "saflon" YOK, marka alanından gelir.
    expect(ara('saflon tava')).toEqual([3])
    expect(ara('granit')).toEqual([3])
    expect(ara('lava guvec')).toEqual([2])
    expect(ara('lava tava')).toEqual([])       // TAVA, LAVA markasında değil
  })

  test('barkod ve SKU ile bulunur', () => {
    expect(ara('8690001112223')).toEqual([1])
    expect(ara('TNC.LAV.00042')).toEqual([2])
    expect(ara('tnc.sfl.00007')).toEqual([3])  // küçük harfle de
  })

  test('kelimelerden biri yoksa eşleşmez (AND)', () => {
    expect(ara('lines plastik')).toEqual([])
  })

  test('barkodu NULL olan ürün çökmez / elenmez (COALESCE)', () => {
    expect(ara('granit')).toEqual([3])
  })

  test('boş arama koşul üretmez (tüm liste döner)', () => {
    expect(kelimeKosulu(ALAN, '').sql).toBe('')
    expect(ara('')).toEqual([1, 2, 3])
  })

  test('% ve _ JOKER DEĞİL, düz metin olarak aranır', () => {
    // Kaçış olmasaydı "%" tüm listeyi döndürürdü.
    expect(ara('%')).toEqual([])
    expect(ara('_')).toEqual([])
  })

  test('kelime sayısı kadar parametre üretir', () => {
    const k = kelimeKosulu(ALAN, 'bir iki üç')
    expect(k.params).toHaveLength(3)
    expect(k.params).toEqual(['%bir%', '%iki%', '%uc%'])
  })
})

// Müşteri araması (musteriler.js). Eskiden tr_kucuk kullaniyordu; o da toLocaleLowerCase('tr')
// oldugu icin ASCII "I" yazan "ISMAIL" ile "ISMAIL"i eslestiremiyordu, harf katlama da yoktu.
describe('musteri aramasi — gercek SQL', () => {
  const M_ALAN = "ad || ' ' || COALESCE(soyad,'') || ' ' || COALESCE(telefon,'') || ' ' || COALESCE(vergi_no,'')"
  let mdb
  beforeEach(() => {
    mdb = new DatabaseSync(':memory:')
    mdb.function('tr_ara', { deterministic: true }, (s) => trNormal(s))
    mdb.exec('CREATE TABLE musteriler(id INTEGER PRIMARY KEY, ad TEXT, soyad TEXT, telefon TEXT, vergi_no TEXT, aktif INTEGER DEFAULT 1)')
    const ek = mdb.prepare('INSERT INTO musteriler VALUES(?,?,?,?,?,1)')
    ek.run(1, 'ÖMER', 'KESKİN', '05551112233', null)
    ek.run(2, 'İsmail', 'Şahin', '05324445566', null)
    ek.run(3, 'Ayşe', 'Güngör', '05337778899', '1234567890')
  })
  const mAra = (a) => {
    const k = kelimeKosulu(M_ALAN, a)
    return mdb.prepare(`SELECT id FROM musteriler WHERE aktif = 1 ${k.sql} ORDER BY id`).all(...k.params).map(r => r.id)
  }

  test('Turkce karakter yazmadan bulunur', () => {
    expect(mAra('omer keskin')).toEqual([1])
    expect(mAra('ismail sahin')).toEqual([2])
    expect(mAra('ayse gungor')).toEqual([3])
  })

  test('ASCII I sorunu: "ISMAIL" de bulur', () => {
    // tr_kucuk ile "ISMAIL" -> "ısmaıl" oluyordu ve ESLESMIYORDU.
    expect(mAra('ISMAIL')).toEqual([2])
    expect(mAra('İSMAİL')).toEqual([2])
  })

  test('ad-soyad sirasi onemsiz', () => {
    expect(mAra('keskin omer')).toEqual([1])
    expect(mAra('KESKIN ÖMER')).toEqual([1])
  })

  test('telefon ve vergi no ile bulunur', () => {
    expect(mAra('05551112233')).toEqual([1])
    expect(mAra('1234567890')).toEqual([3])
  })

  test('eslesmeyen kelime varsa bulunmaz', () => {
    expect(mAra('omer sahin')).toEqual([])
  })
})
