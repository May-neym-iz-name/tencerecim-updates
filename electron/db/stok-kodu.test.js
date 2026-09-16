// Otomatik stok kodu (TNC.<MARKA_KISALTMA>.00001) + marka SKU kısaltması testleri.
//
// Neden bu testler var: SKU bu uygulamanın ANA KAYNAĞIDIR ([[sku-tek-kaynak-kurali]])
// ve dışarıya (Trendyol stockCode, ikas SKU, fatura) aynen taşınır. Mükerrer bir kod
// üretmek iki farklı ürünü dış sistemlerde TEK ürüne indirger — sessiz ve geri dönüşü
// pahalı bir hata. Bu yüzden "mükerrer üretmez" iddiası ölçülür, varsayılmaz.
//
// better-sqlite3 BURADA KULLANILAMAZ (Electron ABI'sine derli, vitest düz Node'da
// koşar) → node:sqlite üstüne ince adaptör (setler.test.js kalıbı).
import { describe, test, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { _sonrakiStokKodu: sonrakiStokKodu } = require('./urunler.js')
const { _kisaltmaNormalize: normalize, _kisaltmaDogrula: dogrula } = require('./markalar.js')

function bellekDb() {
  const d = new DatabaseSync(':memory:')
  d.exec(`
    CREATE TABLE markalar (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT NOT NULL UNIQUE,
      aktif INTEGER DEFAULT 1, sku_kisaltma TEXT);
    CREATE TABLE urunler (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT, sku TEXT UNIQUE,
      marka_id INTEGER, aktif INTEGER DEFAULT 1);
    CREATE TABLE setler (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT, sku TEXT UNIQUE,
      aktif INTEGER DEFAULT 1);
  `)
  return {
    _raw: d,
    prepare: (sql) => {
      const s = d.prepare(sql)
      return { get: (...a) => s.get(...a), all: (...a) => s.all(...a), run: (...a) => s.run(...a) }
    },
  }
}

let db, markaId
beforeEach(() => {
  db = bellekDb()
  db.prepare("INSERT INTO markalar (ad, sku_kisaltma) VALUES ('LAVA', 'LAV')").run()
  markaId = db.prepare("SELECT id FROM markalar WHERE ad='LAVA'").get().id
})

const urunEkle = (sku, mid = markaId) =>
  db.prepare('INSERT INTO urunler (ad, sku, marka_id) VALUES (?, ?, ?)').run('ürün ' + sku, sku, mid)

describe('sonrakiStokKodu', () => {
  test('hiç ürünü olmayan yeni marka için ilk kodu üretir', () => {
    // Eski davranış burada null dönüyordu (şablonu ürünlerden öğrendiği için) ve
    // kullanıcı her yeni markada ilk SKU'yu elle yazmak zorunda kalıyordu.
    expect(sonrakiStokKodu(db, markaId)).toBe('TNC.LAV.00001')
  })

  test('mevcut en yüksek numaranın bir fazlasını verir', () => {
    urunEkle('TNC.LAV.00001')
    urunEkle('TNC.LAV.00042')
    expect(sonrakiStokKodu(db, markaId)).toBe('TNC.LAV.00043')
  })

  test('🔴 üretilen kod ASLA mevcut bir ürünün SKU\'su olamaz', () => {
    for (let n = 1; n <= 50; n++) urunEkle(`TNC.LAV.${String(n).padStart(5, '0')}`)
    const kod = sonrakiStokKodu(db, markaId)
    expect(db.prepare('SELECT COUNT(*) c FROM urunler WHERE sku = ?').get(kod).c).toBe(0)
  })

  test('🔴 art arda üretilip kaydedilen 25 kod tamamen tekildir', () => {
    // Gerçek kullanım: kullanıcı peş peşe ürün ekliyor. Her tur yeni kodu KAYDEDER,
    // bir sonraki turun onu görmesi gerekir.
    const uretilen = []
    for (let i = 0; i < 25; i++) {
      const kod = sonrakiStokKodu(db, markaId)
      expect(uretilen).not.toContain(kod)
      urunEkle(kod)
      uretilen.push(kod)
    }
    expect(new Set(uretilen).size).toBe(25)
  })

  test('🔴 SKU havuzu setlerle ORTAK: sette duran kod yeniden verilmez', () => {
    // setler.js: "SKU da ürünlerle ORTAK havuz: bir ürüne ait TNC.* kodu sete verilemez."
    db.prepare("INSERT INTO setler (ad, sku) VALUES ('set', 'TNC.LAV.00007')").run()
    urunEkle('TNC.LAV.00006')
    const kod = sonrakiStokKodu(db, markaId)
    expect(kod).not.toBe('TNC.LAV.00007')
    expect(kod).toBe('TNC.LAV.00008')
  })

  test('🔴 PASİF üründe duran kod yeniden verilmez (SKU kolonu UNIQUE)', () => {
    db.prepare("INSERT INTO urunler (ad, sku, marka_id, aktif) VALUES ('eski', 'TNC.LAV.00009', ?, 0)").run(markaId)
    expect(sonrakiStokKodu(db, markaId)).toBe('TNC.LAV.00010')
  })

  test('aralık taşıyan eski kodlar (TNC.LAV.00009/10/11) çakışma üretmez', () => {
    // youtube/plan.js: havuzda tek satırda aralık taşıyan kodlar var. Bunlar sayıya
    // çevrilince yanıltıcı max verebilir; üretilen kodun boşta olması AYRICA doğrulanır.
    urunEkle('TNC.LAV.00009/10/11')
    urunEkle('TNC.LAV.00010')
    const kod = sonrakiStokKodu(db, markaId)
    expect(['TNC.LAV.00010', 'TNC.LAV.00009/10/11']).not.toContain(kod)
    expect(db.prepare('SELECT COUNT(*) c FROM urunler WHERE sku = ?').get(kod).c).toBe(0)
  })

  test('başka markanın kodları numarayı etkilemez', () => {
    db.prepare("INSERT INTO markalar (ad, sku_kisaltma) VALUES ('SAFLON', 'SFL')").run()
    const sfl = db.prepare("SELECT id FROM markalar WHERE ad='SAFLON'").get().id
    for (let n = 1; n <= 300; n++) urunEkle(`TNC.SFL.${String(n).padStart(5, '0')}`, sfl)
    expect(sonrakiStokKodu(db, markaId)).toBe('TNC.LAV.00001')
  })

  test('kısaltması olmayan marka null döner (çağıran elle SKU ister)', () => {
    db.prepare("INSERT INTO markalar (ad, sku_kisaltma) VALUES ('YENİ', NULL)").run()
    const id = db.prepare("SELECT id FROM markalar WHERE ad='YENİ'").get().id
    expect(sonrakiStokKodu(db, id)).toBeNull()
  })

  test('marka seçilmemişse null döner', () => {
    expect(sonrakiStokKodu(db, null)).toBeNull()
  })

  test('5 haneyi aşan havuzda hane genişliği korunur', () => {
    urunEkle('TNC.LAV.123456')
    expect(sonrakiStokKodu(db, markaId)).toBe('TNC.LAV.123457')
  })
})

describe('kısaltma normalize', () => {
  test('küçük harf büyütülür', () => {
    expect(normalize('lav')).toBe('LAV')
  })

  test('🔴 Türkçe harfler ASCII\'ye katlanır — kod dış sistemlerde taşınır', () => {
    // 'TNC.İMZ.00001' Trendyol stockCode / ikas SKU / fatura yolunda bozulabilir.
    expect(normalize('imza')).toBe('IMZA')
    expect(normalize('şğüöç')).toBe('SGUOC')
  })

  test('harf ve rakam dışındaki her şey atılır', () => {
    expect(normalize(' m-c 1. ')).toBe('MC1')
  })

  test('boş girdiler boş döner', () => {
    expect(normalize(null)).toBe('')
    expect(normalize('...')).toBe('')
  })
})

describe('kısaltma doğrulama', () => {
  test('boş kısaltma reddedilir (zorunlu alan)', () => {
    expect(() => dogrula(db, '')).toThrow(/zorunlu/i)
  })

  test('tek karakter ve 6 karakterden uzun reddedilir', () => {
    expect(() => dogrula(db, 'L')).toThrow(/2-6/)
    expect(() => dogrula(db, 'ABCDEFG')).toThrow(/2-6/)
  })

  test('🔴 başka markanın kısaltması alınamaz — iki marka aynı sayı dizisini yarışamaz', () => {
    expect(() => dogrula(db, 'lav')).toThrow(/LAVA/)
  })

  test('markanın kendi kısaltması kendisi için serbest', () => {
    expect(dogrula(db, 'LAV', markaId)).toBe('LAV')
  })

  test('temiz kısaltma normalize edilmiş hâliyle döner', () => {
    expect(dogrula(db, ' sfl ')).toBe('SFL')
  })
})
