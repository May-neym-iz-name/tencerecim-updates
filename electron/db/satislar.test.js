// Ön sipariş = stok düşürmeyen satış. Bu testler stok kolunun ATLANDIĞINI sabitler.
// better-sqlite3 BURADA KULLANILAMAZ (Electron ABI'sine derli, vitest düz Node'da koşar).
// Node'un yerleşik sqlite'ı üstüne satislar.js'in kullandığı yüzey (prepare/get/all/run,
// exec, transaction) konur — üretim SQL'i değişmeden gerçek veriyle test edilir.
import { describe, test, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const satislar = require('./satislar.js')

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
let pushEdilen   // ikasPush çağrıldıysa gelen urun_id dizisi

const ikasPushSahte = (idler) => { pushEdilen.push(idler) }

beforeEach(() => {
  db = bellekDb()
  pushEdilen = []
  db.exec(`
    CREATE TABLE lokasyonlar (id INTEGER PRIMARY KEY, ad TEXT);
    CREATE TABLE musteriler (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT, soyad TEXT,
      telefon TEXT, email TEXT, adres TEXT, il TEXT, ilce TEXT);
    CREATE TABLE urunler (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT, satis_fiyati REAL,
      kdv_orani REAL DEFAULT 20, aktif INTEGER DEFAULT 1);
    CREATE TABLE urun_stoklar (
      id INTEGER PRIMARY KEY AUTOINCREMENT, urun_id INTEGER, lokasyon_id INTEGER,
      miktar INTEGER DEFAULT 0, minimum_stok INTEGER DEFAULT 0, UNIQUE(urun_id, lokasyon_id));
    CREATE TABLE satislar (
      id INTEGER PRIMARY KEY AUTOINCREMENT, fis_no TEXT UNIQUE, lokasyon_id INTEGER,
      musteri_id INTEGER, odeme_tipi TEXT, durum TEXT DEFAULT 'tamamlandi',
      tip TEXT DEFAULT 'satis', iade_kaynak_id INTEGER,
      ara_toplam REAL, iskonto_toplam REAL, kdv_toplam REAL, genel_toplam REAL,
      notlar TEXT, tarih TEXT DEFAULT CURRENT_TIMESTAMP,
      on_siparis INTEGER DEFAULT 0, on_siparis_durum TEXT, on_siparis_not TEXT);
    CREATE TABLE satis_kalemleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT, satis_id INTEGER, urun_id INTEGER, miktar INTEGER,
      birim_fiyat REAL, iskonto_orani REAL, kdv_orani REAL, toplam REAL,
      iade_miktar INTEGER DEFAULT 0, set_adi TEXT);
    CREATE TABLE satis_odemeler (
      id INTEGER PRIMARY KEY AUTOINCREMENT, satis_id INTEGER, odeme_tipi TEXT, tutar REAL);
    CREATE TABLE kargolar (id INTEGER PRIMARY KEY AUTOINCREMENT, satis_id INTEGER, takip_no TEXT, durum TEXT, son_durum TEXT);
    INSERT INTO lokasyonlar (id, ad) VALUES (1, 'Pendik');
    INSERT INTO urunler (id, ad, satis_fiyati, kdv_orani) VALUES (1, 'Tencere', 100, 20);
    INSERT INTO urun_stoklar (urun_id, lokasyon_id, miktar) VALUES (1, 1, 5);
  `)
})

const stok = () => db.prepare('SELECT miktar FROM urun_stoklar WHERE urun_id=1 AND lokasyon_id=1').get().miktar

const veri = (ek = {}) => ({
  lokasyon_id: 1, odeme_tipi: 'nakit',
  kalemler: [{ urun_id: 1, miktar: 2 }],
  ...ek,
})

describe('normal satış (regresyon)', () => {
  test('stoğu düşürür ve ikas push eder', () => {
    satislar._olustur(veri(), db, ikasPushSahte)
    expect(stok()).toBe(3)
    expect(pushEdilen).toEqual([[1]])
  })

  test('yetersiz stokta hata verir', () => {
    expect(() => satislar._olustur(veri({ kalemler: [{ urun_id: 1, miktar: 99 }] }), db, ikasPushSahte))
      .toThrow(/Yetersiz stok/)
  })
})

describe('ön sipariş', () => {
  test('stoğa DOKUNMAZ', () => {
    satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    expect(stok()).toBe(5)
  })

  test('ikas push ETMEZ', () => {
    satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    expect(pushEdilen).toEqual([])
  })

  test('stok yetersizken bile hata vermez', () => {
    db.prepare('UPDATE urun_stoklar SET miktar=0 WHERE urun_id=1').run()
    const s = satislar._olustur(veri({ on_siparis: true, kalemler: [{ urun_id: 1, miktar: 3 }] }), db, ikasPushSahte)
    expect(s.on_siparis).toBe(1)
    expect(stok()).toBe(0)
  })

  test('durumu bekliyor olarak açılır ve not saklanır', () => {
    const s = satislar._olustur(veri({ on_siparis: true, on_siparis_not: '10 gün sonra' }), db, ikasPushSahte)
    expect(s.on_siparis_durum).toBe('bekliyor')
    expect(s.on_siparis_not).toBe('10 gün sonra')
  })

  test('ciroya normal satış gibi girer (tutar ve ödeme kaydı yazılır)', () => {
    const s = satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    expect(s.genel_toplam).toBe(200)
    expect(s.durum).toBe('tamamlandi')
    expect(s.tip).toBe('satis')
    const od = db.prepare('SELECT odeme_tipi, tutar FROM satis_odemeler WHERE satis_id=?').all(s.id)
    expect(od).toEqual([{ odeme_tipi: 'nakit', tutar: 200 }])
  })

  test('kalemleri normal satıştaki gibi yazılır', () => {
    const s = satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    const k = db.prepare('SELECT urun_id, miktar FROM satis_kalemleri WHERE satis_id=?').all(s.id)
    expect(k).toEqual([{ urun_id: 1, miktar: 2 }])
  })

  test('bayrak verilmezse normal satıştır', () => {
    const s = satislar._olustur(veri(), db, ikasPushSahte)
    expect(s.on_siparis).toBe(0)
    expect(s.on_siparis_durum).toBe(null)
  })
})

describe('iptal', () => {
  test('normal satış iptali stoğu geri ekler (regresyon)', () => {
    const s = satislar._olustur(veri(), db, ikasPushSahte)
    expect(stok()).toBe(3)
    pushEdilen = []
    satislar._iptal(s.id, db, ikasPushSahte)
    expect(stok()).toBe(5)
    expect(pushEdilen).toEqual([[1]])
    expect(db.prepare('SELECT durum FROM satislar WHERE id=?').get(s.id).durum).toBe('iptal')
  })

  test('ÖN SİPARİŞ iptali stoğu ARTIRMAZ', () => {
    const s = satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    expect(stok()).toBe(5)
    pushEdilen = []
    satislar._iptal(s.id, db, ikasPushSahte)
    expect(stok()).toBe(5)          // olmayan stok şişmedi
    expect(pushEdilen).toEqual([])  // ikas'a yanlış stok gitmedi
  })

  test('ön sipariş iptalinde durum alanları güncellenir', () => {
    const s = satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    satislar._iptal(s.id, db, ikasPushSahte)
    const son = db.prepare('SELECT durum, on_siparis_durum FROM satislar WHERE id=?').get(s.id)
    expect(son).toEqual({ durum: 'iptal', on_siparis_durum: 'iptal' })
  })

  test('zaten iptal edilmiş satış tekrar iptal edilemez', () => {
    const s = satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    satislar._iptal(s.id, db, ikasPushSahte)
    expect(() => satislar._iptal(s.id, db, ikasPushSahte)).toThrow(/bulunamadı veya zaten iptal/)
  })
})

describe('ön sipariş listeleme', () => {
  test('yalnızca ön siparişleri döner', () => {
    satislar._olustur(veri(), db, ikasPushSahte)                      // normal satış
    const o = satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    const liste = satislar._onSiparisler({}, db)
    expect(liste.map(s => s.id)).toEqual([o.id])
  })

  test('kalemleri ürün adıyla birlikte getirir', () => {
    satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    const [s] = satislar._onSiparisler({}, db)
    expect(s.kalemler).toEqual([{ urun_id: 1, urun_adi: 'Tencere', miktar: 2 }])
  })

  test('durum filtresi uygular', () => {
    const o = satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    expect(satislar._onSiparisler({ durum: 'bekliyor' }, db).map(s => s.id)).toEqual([o.id])
    expect(satislar._onSiparisler({ durum: 'teslim' }, db)).toEqual([])
  })

  test('iptal edilen ön sipariş listede durum iptal ile görünür', () => {
    const o = satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    satislar._iptal(o.id, db, ikasPushSahte)
    expect(satislar._onSiparisler({ durum: 'iptal' }, db).map(s => s.id)).toEqual([o.id])
  })
})

describe('ön sipariş durum güncelleme', () => {
  test('kargolandi olarak işaretlenir', () => {
    const o = satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    satislar._onSiparisDurum(o.id, 'kargolandi', db)
    expect(db.prepare('SELECT on_siparis_durum FROM satislar WHERE id=?').get(o.id).on_siparis_durum).toBe('kargolandi')
  })

  test('geçersiz durum reddedilir', () => {
    const o = satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    expect(() => satislar._onSiparisDurum(o.id, 'her neyse', db)).toThrow(/Geçersiz ön sipariş durumu/)
  })

  test('ön sipariş olmayan satışın durumu güncellenemez', () => {
    const s = satislar._olustur(veri(), db, ikasPushSahte)
    expect(() => satislar._onSiparisDurum(s.id, 'teslim', db)).toThrow(/Ön sipariş bulunamadı/)
  })

  test('iptal edilmiş ön siparişin durumu güncellenemez', () => {
    const o = satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    satislar._iptal(o.id, db, ikasPushSahte)
    expect(() => satislar._onSiparisDurum(o.id, 'teslim', db)).toThrow(/Ön sipariş bulunamadı/)
  })
})

describe('iade', () => {
  test('ön sipariş satışı iade edilemez: stok değişmez ve push edilmez', () => {
    const s = satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    pushEdilen = []
    const kalem = db.prepare('SELECT id FROM satis_kalemleri WHERE satis_id=?').get(s.id)
    expect(() => satislar._iade({ satis_id: s.id, kalemler: [{ satis_kalemi_id: kalem.id, miktar: 1 }] }, db, ikasPushSahte))
      .toThrow(/İade için uygun satış bulunamadı/)
    expect(stok()).toBe(5)
    expect(pushEdilen).toEqual([])
  })

  test('normal satış iade edilebilir (regresyon): stok artar ve push edilir', () => {
    const s = satislar._olustur(veri(), db, ikasPushSahte)
    pushEdilen = []
    const kalem = db.prepare('SELECT id FROM satis_kalemleri WHERE satis_id=?').get(s.id)
    const iade = satislar._iade({ satis_id: s.id, kalemler: [{ satis_kalemi_id: kalem.id, miktar: 1 }] }, db, ikasPushSahte)
    expect(stok()).toBe(4)
    expect(pushEdilen).toEqual([[1]])
    expect(iade.tip).toBe('iade')
    expect(iade.iade_kaynak_id).toBe(s.id)
  })
})
