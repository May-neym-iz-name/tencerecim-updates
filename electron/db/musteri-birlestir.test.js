// Mükerrer müşteri birleştirme testleri (v1.2.221).
//
// Bu iş GERİ ALINAMAZ sonuçlar üretir: satış, kargo ve online sipariş kayıtları
// başka bir müşteriye taşınır. Yanlış birleştirme iki farklı kişinin geçmişini
// karıştırır. Bu yüzden "neyin birleşMEyeceği" en az "neyin birleşeceği" kadar
// ölçülüyor.
import { describe, test, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const mb = require('./musteri-birlestir.js')
const { telSon10 } = require('./telefon.js')

function bellekDb() {
  const d = new DatabaseSync(':memory:')
  d.exec(`
    CREATE TABLE musteriler (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT, soyad TEXT,
      telefon TEXT, email TEXT, adres TEXT, il TEXT, ilce TEXT, unvan TEXT,
      vergi_no TEXT, vergi_dairesi TEXT, tc_kimlik TEXT, aktif INTEGER DEFAULT 1,
      ikas_musteri_id TEXT, ikas_toplam_harcama REAL DEFAULT 0);
    CREATE TABLE satislar (id INTEGER PRIMARY KEY AUTOINCREMENT, musteri_id INTEGER);
    CREATE TABLE kargolar (id INTEGER PRIMARY KEY AUTOINCREMENT, musteri_id INTEGER);
    CREATE TABLE online_siparisler (id INTEGER PRIMARY KEY AUTOINCREMENT, musteri_id INTEGER);
  `)
  return {
    prepare: (sql) => {
      const s = d.prepare(sql)
      return { get: (...a) => s.get(...a), all: (...a) => s.all(...a), run: (...a) => s.run(...a) }
    },
  }
}

let db
beforeEach(() => { db = bellekDb() })

const ekle = (o) => {
  const k = Object.keys(o)
  db.prepare(`INSERT INTO musteriler (${k.join(',')}) VALUES (${k.map(x => '@' + x).join(',')})`).run(o)
  return db.prepare('SELECT * FROM musteriler ORDER BY id DESC LIMIT 1').get()
}
const hepsi = () => db.prepare('SELECT * FROM musteriler').all()

describe('telSon10 — eşleştirme anahtarı', () => {
  test('🔴 +90 ve 0 önekleri aynı anahtara düşer (mükerrerin KÖK NEDENİ)', () => {
    // ikas "+905538638657", yerel "5538638657" yazıyordu; TAM eşleşme bunları
    // ayrı sanıp her senkronda yeni kayıt açıyordu.
    expect(telSon10('+905538638657')).toBe(telSon10('5538638657'))
    expect(telSon10('05538638657')).toBe('5538638657')
    expect(telSon10('0553 863 86 57')).toBe('5538638657')
  })

  test('farklı numaralar farklı kalır', () => {
    // Ölçülen gerçek vaka: tek hane farkı (7952 / 7982) — yazım hatası olabilir ama
    // tahminle birleştirmek iki müşteriyi karıştırmaktan daha tehlikelidir.
    expect(telSon10('5417952635')).not.toBe(telSon10('5417982635'))
  })

  test('boş/kısa numara null veya ham rakam döner', () => {
    expect(telSon10('')).toBeNull()
    expect(telSon10(null)).toBeNull()
    expect(telSon10('123')).toBe('123')
  })
})

describe('telefonGruplari', () => {
  test('aynı numaranın farklı yazımları TEK grupta toplanır', () => {
    ekle({ ad: 'A', telefon: '5538638657' })
    ekle({ ad: 'A', telefon: '+905538638657' })
    const g = mb.telefonGruplari(hepsi())
    expect(g).toHaveLength(1)
    expect(g[0][1]).toHaveLength(2)
  })

  test('🔴 telefonsuz kayıt hiçbir gruba girmez', () => {
    // Telefon ANA BELİRLEYİCİ; telefonu olmayanın birleştirme ölçütü yok.
    ekle({ ad: 'A', telefon: null })
    ekle({ ad: 'A', telefon: '' })
    expect(mb.telefonGruplari(hepsi())).toHaveLength(0)
  })

  test('tek kayıtlı numara grup sayılmaz', () => {
    ekle({ ad: 'A', telefon: '5538638657' })
    expect(mb.telefonGruplari(hepsi())).toHaveLength(0)
  })
})

describe('birlestirilebilir — neyin birleşMEyeceği', () => {
  test('aynı telefon + aynı isim → tamamı birleşir', () => {
    ekle({ ad: 'ARİF', soyad: 'ÇELİKKANAT', telefon: '5551111815' })
    ekle({ ad: 'arif', soyad: 'çelikkanat', telefon: '+905551111815' })
    const [[anahtar, grup]] = mb.telefonGruplari(hepsi())
    expect(mb.birlestirilebilir(anahtar, grup)).toHaveLength(2)
  })

  test('🔴 aynı telefon + FARKLI isim → BİRLEŞMEZ', () => {
    // Ölçülen vaka: TUTKU TURKAN / EMİNE BİRÇEK aynı hatta, İKİSİNİN DE kargosu var.
    ekle({ ad: 'TUTKU', soyad: 'TURKAN', telefon: '5551231046' })
    ekle({ ad: 'EMİNE', soyad: 'BİRÇEK', telefon: '+905551231046' })
    const [[anahtar, grup]] = mb.telefonGruplari(hepsi())
    expect(mb.birlestirilebilir(anahtar, grup)).toHaveLength(0)
  })

  test('farklı isim ELLE ONAYLIYSA birleşir', () => {
    ekle({ ad: 'BURKAY MESUT', soyad: 'YILMAZ', telefon: '5357350352' })
    ekle({ ad: 'DSNPFN', soyad: 'JODSFJOPD', telefon: '+905357350352' })
    const [[anahtar, grup]] = mb.telefonGruplari(hepsi())
    const onay = new Set(['5357350352|DSNPFN JODSFJOPD'])
    expect(mb.birlestirilebilir(anahtar, grup, onay)).toHaveLength(2)
  })

  test('onay listesi BAŞKA bir adı serbest bırakmaz', () => {
    ekle({ ad: 'TUTKU', soyad: 'TURKAN', telefon: '5551231046' })
    ekle({ ad: 'EMİNE', soyad: 'BİRÇEK', telefon: '+905551231046' })
    const [[anahtar, grup]] = mb.telefonGruplari(hepsi())
    const onay = new Set(['5357350352|DSNPFN JODSFJOPD'])
    expect(mb.birlestirilebilir(anahtar, grup, onay)).toHaveLength(0)
  })
})

describe('asilSec — hayatta kalan kayıt', () => {
  test('🔴 ikas harcaması EN YÜKSEK olan asıldır', () => {
    const a = ekle({ ad: 'B', telefon: '1', ikas_musteri_id: '427046ac', ikas_toplam_harcama: 3000 })
    const b = ekle({ ad: 'B', telefon: '1', ikas_musteri_id: '72e0acdf', ikas_toplam_harcama: 17155 })
    expect(mb.asilSec([a, b]).id).toBe(b.id)
  })

  test('🔴 PASİF kayıt da asıl olabilir — aktiflik ölçüt değil', () => {
    // Ölçüldü: BURAK GÜL id 1 pasifti ama 8 kargo + ikas geçmişi taşıyordu.
    const pasif = ekle({ ad: 'B', telefon: '1', aktif: 0, ikas_musteri_id: 'x', ikas_toplam_harcama: 9000 })
    const aktif = ekle({ ad: 'B', telefon: '1', aktif: 1 })
    expect(mb.asilSec([pasif, aktif]).id).toBe(pasif.id)
  })

  test('ikas kimliği yoksa en eski (en küçük id) kazanır', () => {
    const a = ekle({ ad: 'B', telefon: '1' })
    const b = ekle({ ad: 'B', telefon: '1' })
    expect(mb.asilSec([b, a]).id).toBe(a.id)
  })
})

describe('uygula — bağlı kayıtların taşınması', () => {
  test('🔴 satış, kargo ve online sipariş asıla taşınır (hiçbiri kaybolmaz)', () => {
    const asil = ekle({ ad: 'B', telefon: '1' })
    const diger = ekle({ ad: 'B', telefon: '1' })
    db.prepare('INSERT INTO satislar (musteri_id) VALUES (?)').run(diger.id)
    db.prepare('INSERT INTO kargolar (musteri_id) VALUES (?)').run(diger.id)
    db.prepare('INSERT INTO kargolar (musteri_id) VALUES (?)').run(diger.id)
    db.prepare('INSERT INTO online_siparisler (musteri_id) VALUES (?)').run(diger.id)

    const r = mb.uygula(db, asil, [diger])
    expect(r.tasinan).toEqual({ satislar: 1, kargolar: 2, online_siparisler: 1 })
    expect(db.prepare('SELECT COUNT(*) c FROM kargolar WHERE musteri_id=?').get(asil.id).c).toBe(2)
    expect(db.prepare('SELECT COUNT(*) c FROM kargolar WHERE musteri_id=?').get(diger.id).c).toBe(0)
  })

  test('birleşen kayıt SİLİNMEZ, pasifleşir', () => {
    // Silme senkronla YAYILMAZ (karşı PC'de kalır, geri gelir); pasifleştirme yayılır.
    const asil = ekle({ ad: 'B', telefon: '1' })
    const diger = ekle({ ad: 'B', telefon: '1' })
    mb.uygula(db, asil, [diger])
    expect(db.prepare('SELECT aktif FROM musteriler WHERE id=?').get(diger.id).aktif).toBe(0)
    expect(db.prepare('SELECT COUNT(*) c FROM musteriler WHERE id=?').get(diger.id).c).toBe(1)
  })

  test('asıl kayıt pasifse aktifleşir', () => {
    const asil = ekle({ ad: 'B', telefon: '1', aktif: 0 })
    const diger = ekle({ ad: 'B', telefon: '1' })
    mb.uygula(db, asil, [diger])
    expect(db.prepare('SELECT aktif FROM musteriler WHERE id=?').get(asil.id).aktif).toBe(1)
  })
})

describe('eksikleriTopla — veri katar, veri değiştirmez', () => {
  test('🔴 asıldaki DOLU alan ASLA ezilmez', () => {
    const asil = { email: 'asil@x.com', adres: 'ASIL ADRES' }
    const r = mb.eksikleriTopla(asil, [{ email: 'diger@x.com', adres: 'DİĞER ADRES' }])
    expect(r.email).toBeUndefined()
    expect(r.adres).toBeUndefined()
  })

  test('asıldaki BOŞ alan diğerinden doldurulur', () => {
    const r = mb.eksikleriTopla({ email: '', adres: null },
      [{ email: 'd@x.com', adres: 'ADRES' }])
    expect(r.email).toBe('d@x.com')
    expect(r.adres).toBe('ADRES')
  })

  test('ilk dolu değer kazanır', () => {
    const r = mb.eksikleriTopla({ email: null }, [{ email: null }, { email: 'a@x' }, { email: 'b@x' }])
    expect(r.email).toBe('a@x')
  })
})
