// Takma ad barkodlar: bir ürüne ek barkod tanımlanabilir, hangisi okutulursa okutulsun
// aynı ürün gelir. urunler.barkod BİRİNCİL kalır (senkron doğal anahtarı + ikas eşleşmesi).
// better-sqlite3 BURADA KULLANILAMAZ (Electron ABI'sine derli, vitest düz Node'da koşar);
// node:sqlite üstüne urunler.js'in kullandığı yüzeyi veren ince adaptör konur.
import { describe, test, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const urunler = require('./urunler.js')
const yetki = require('../yetki.js')

// urunler:olustur/guncelle yetkiKontrol('urun_duzenle') çağırır; testte gerçek giriş
// akışı yok, bu yüzden super_admin profili elle set edilir (yetki.js modül-singleton).
// auth:profil-ayarla artık profil kabul etmez, Supabase'den doğrular
// (electron/oturum-dogrula.js). Testin amacı yetki değil ürün mantığı olduğu
// için doğrulamayı atlayan test-only yazıcı kullanılıyor.
yetki._profilYazTestIcin({ aktif: 1, rol: 'super_admin' })

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
      barkod TEXT NOT NULL UNIQUE, aciklama TEXT, aktif INTEGER DEFAULT 1,
      olusturma_tarihi TEXT DEFAULT (datetime('now','localtime')));
    CREATE TABLE urun_stoklar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      urun_id INTEGER NOT NULL REFERENCES urunler(id) ON DELETE CASCADE,
      lokasyon_id INTEGER, miktar REAL DEFAULT 0, minimum_stok REAL DEFAULT 0);
    CREATE TABLE lokasyonlar (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT);
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

describe('takma ad silme (yumuşak silme — senkron için)', () => {
  test('silinince listeden düşer', () => {
    const b = urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017' }, db)
    urunler._barkodSil(b.id, db)
    expect(urunler._barkodListe(1, db)).toEqual([])
  })

  test('olmayan kayıt silinmek istenirse hata verir', () => {
    expect(() => urunler._barkodSil(999, db)).toThrow(/Barkod bulunamadı/)
  })

  test('silinen barkod artık ürünü bulmaz', () => {
    const b = urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017' }, db)
    urunler._barkodSil(b.id, db)
    expect(urunler._barkodla('2900000000017', db)).toBeUndefined()
  })

  test('silme satırı gerçekten SİLMEZ, aktif=0 yapar (senkronun taşıyacağı iz)', () => {
    const b = urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017' }, db)
    urunler._barkodSil(b.id, db)
    const satir = db.prepare('SELECT COUNT(*) as n FROM urun_barkodlar WHERE barkod=?').get('2900000000017')
    expect(satir.n).toBe(1)
    const kayit = db.prepare('SELECT aktif FROM urun_barkodlar WHERE barkod=?').get('2900000000017')
    expect(Number(kayit.aktif)).toBe(0)
  })

  test('silinen barkod aynı ürüne yeniden eklenebilir, yeni satır açılmaz', () => {
    const b = urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017' }, db)
    urunler._barkodSil(b.id, db)
    const yeniden = urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017' }, db)
    expect(yeniden.id).toBe(b.id)
    const satir = db.prepare('SELECT COUNT(*) as n FROM urun_barkodlar WHERE barkod=?').get('2900000000017')
    expect(satir.n).toBe(1)
    const kayit = db.prepare('SELECT aktif FROM urun_barkodlar WHERE barkod=?').get('2900000000017')
    expect(Number(kayit.aktif)).toBe(1)
  })

  test('silinen barkod başka ürüne verilebilir, satır sayısı yine 1', () => {
    const b = urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017' }, db)
    urunler._barkodSil(b.id, db)
    const yeniden = urunler._barkodEkle({ urun_id: 2, barkod: '2900000000017' }, db)
    expect(yeniden.id).toBe(b.id)
    const satir = db.prepare('SELECT COUNT(*) as n, urun_id, aktif FROM urun_barkodlar WHERE barkod=?').get('2900000000017')
    expect(satir.n).toBe(1)
    expect(satir.urun_id).toBe(2)
    expect(Number(satir.aktif)).toBe(1)
    expect(urunler._barkodla('2900000000017', db).id).toBe(2)
  })

  test('aktif bir takma ad aynı ürüne tekrar eklenemez', () => {
    urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017' }, db)
    expect(() => urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017' }, db))
      .toThrow(/zaten bu ürüne tanımlı/)
  })

  test('pasif takma adın değeri başka ürünün birincil barkodu olabilir', () => {
    const b = urunler._barkodEkle({ urun_id: 1, barkod: '2900000000099' }, db)
    urunler._barkodSil(b.id, db)
    const urun = urunler['urunler:olustur']({
      ad: 'Yeni Ürün', barkod: '2900000000099', sku: 'TNC.LAV.00099', satis_fiyati: 50
    }, db)
    expect(urun.barkod).toBe('2900000000099')
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

describe('barkod tekilliği çift yönlü (TERS YÖN kontrolü)', () => {
  test('bir ürünün birincil barkodu, başka ürünün takma adıyla aynı değere güncellenemez', () => {
    // ürün 2'ye takma ad ekle
    urunler._barkodEkle({ urun_id: 2, barkod: '2900000000017' }, db)
    // ürün 1'in birincil barkodunu o takma ada eşitlemeye çalış
    expect(() => urunler['urunler:guncelle']({
      id: 1, ad: 'Tencere 24', barkod: '2900000000017', sku: 'TNC.LAV.00001', satis_fiyati: 100
    }, db)).toThrow(/başka bir ürüne takma ad/)
  })

  test('yeni ürün oluştururken barkod olarak başka ürünün takma adı verilemez', () => {
    urunler._barkodEkle({ urun_id: 1, barkod: '2900000000099' }, db)
    expect(() => urunler['urunler:olustur']({
      ad: 'Yeni Ürün', barkod: '2900000000099', sku: 'TNC.LAV.00099', satis_fiyati: 50
    }, db)).toThrow(/başka bir ürüne takma ad/)
  })

  test('barkodIleBul çakışma durumunda BİRİNCİL eşleşmeyi döndürür (deterministik)', () => {
    // Doğrulama kapılarını atlayarak (doğrudan INSERT) geçmişte oluşmuş bir çakışmayı simüle et:
    // ürün 2'nin birincil barkodu, ürün 1'e ait bir takma adla aynı değer olsun.
    db.prepare('INSERT INTO urun_barkodlar (urun_id, barkod) VALUES (1, ?)').run('8690000000002')
    const sonuc = urunler._barkodla('8690000000002', db)
    expect(sonuc.id).toBe(2)
  })
})
