// FK'sı çözülemeyen uzak satırların KALICI kaybını önleyen bekleme kuyruğu.
//
// Gerçek vaka (2026-07): urun_stoklar satırları buluta 6 Tem'de, bağlı oldukları urunler
// kaydı 9 Tem'de yüklendi. Arada pull yapan PC stok satırını "erteliyor" ama pull imleci
// yine de ilerlediği için satır BİR DAHA HİÇ ÇEKİLMİYORDU → sessiz kalıcı kayıp.
// Bu testler kuyruk davranışını sabitler.
import { describe, test, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'

// better-sqlite3 BURADA KULLANILAMAZ: native modül Electron ABI'sine derlenir, vitest
// düz Node'da koşar ("NODE_MODULE_VERSION 110 vs 137"). Node'un yerleşik sqlite'ı
// üstüne, senk-veri.js'in kullandığı yüzeyi (prepare/get/all/run, exec, transaction)
// veren ince bir adaptör konur — üretim kodu değişmeden test edilir.
function bellekDb() {
  const d = new DatabaseSync(':memory:')
  return {
    exec: (sql) => d.exec(sql),
    prepare: (sql) => {
      const s = d.prepare(sql)
      // better-sqlite3 sorguda geçmeyen fazla anahtarları yok sayar, node:sqlite ise
      // "Unknown named parameter" diye patlar. Üretim kodu (dogalCift araması) tüm kolon
      // nesnesini olduğu gibi geçirdiği için, adaptör bu toleransı taklit eder.
      const suz = (a) => {
        if (a.length !== 1 || a[0] === null || typeof a[0] !== 'object') return a
        return [Object.fromEntries(Object.entries(a[0]).filter(([k]) => sql.includes('@' + k)))]
      }
      return {
        get: (...a) => s.get(...suz(a)),
        all: (...a) => s.all(...suz(a)),
        run: (...a) => s.run(...suz(a)),
      }
    },
    // better-sqlite3'te transaction(fn) çağrılabilir bir sarmalayıcı döndürür.
    transaction: (fn) => (...args) => {
      d.exec('BEGIN')
      try {
        const r = fn(...args)
        d.exec('COMMIT')
        return r
      } catch (e) {
        d.exec('ROLLBACK')
        throw e
      }
    },
  }
}

// IPC handler'ları değil, db enjekte edilen _ önekli private'lar test edilir.
const { default: senkVeri } = await import('./senk-veri.js')
let db
const uygula = (arg) => senkVeri._uygula(db, arg)
const bekleyenTablolar = () => senkVeri._bekleyenTablolar(db)

const URUN_SENK = 'aaaa0000aaaa0000aaaa0000aaaa0000'
const STOK_SENK = 'bbbb1111bbbb1111bbbb1111bbbb1111'

// Buluttan gelmiş gibi bir urun_stoklar kaydı (ebeveyni senk_id ile referanslar).
const stokKaydi = (miktar = 7, guncelleme = '2026-07-06T11:19:43.282Z') => ({
  senk_id: STOK_SENK,
  guncelleme,
  veri: { lokasyon_id: 2, miktar, minimum_stok: 0, _fk: { urun_id: URUN_SENK } },
})

beforeEach(() => {
  db = bellekDb()
  db.exec(`
    CREATE TABLE lokasyonlar (id INTEGER PRIMARY KEY, ad TEXT);
    CREATE TABLE urunler (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT, barkod TEXT, sku TEXT, marka_id INTEGER,
      kategori_id INTEGER, tedarikci_id INTEGER, aciklama TEXT, alis_fiyati REAL, satis_fiyati REAL,
      kdv_orani REAL, aktif INTEGER DEFAULT 1, ikas_urun_id TEXT, ikas_varyant_id TEXT,
      senk_id TEXT, senk_guncelleme TEXT
    );
    CREATE TABLE urun_stoklar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      urun_id INTEGER NOT NULL REFERENCES urunler(id),
      lokasyon_id INTEGER NOT NULL,
      miktar INTEGER DEFAULT 0, minimum_stok INTEGER DEFAULT 0,
      senk_id TEXT, senk_guncelleme TEXT,
      UNIQUE(urun_id, lokasyon_id)
    );
    INSERT INTO lokasyonlar (id, ad) VALUES (2, 'Gölcük');
  `)
})

// Ebeveyn ürünü yerele koyar (buluttan gelmiş gibi).
function urunuEkle() {
  db.prepare("INSERT INTO urunler (ad, aktif, senk_id, senk_guncelleme) VALUES (?, 1, ?, ?)")
    .run('FALEZ PEDRA 20 CM SAHAN', URUN_SENK, '2026-07-08T15:04:29.071Z')
}

const stokSatiri = () => db.prepare('SELECT * FROM urun_stoklar WHERE senk_id = ?').get(STOK_SENK)

describe('FK bekleme kuyruğu', () => {
  test('ebeveyni olmayan satır uygulanmaz ama kuyruğa alınır', () => {
    const sonuc = uygula({ tablo: 'urun_stoklar', kayitlar: [stokKaydi()] })

    expect(sonuc.uygulanan).toBe(0)
    expect(sonuc.bekleyen).toBe(1)
    expect(stokSatiri()).toBeUndefined()
    expect(bekleyenTablolar()).toEqual([{ tablo: 'urun_stoklar', adet: 1 }])
  })

  test('ebeveyn sonradan gelince kuyruktaki satır UZAK DELTA OLMADAN uygulanır', () => {
    // 1. tur: stok satırı geldi, ürün henüz yok → kuyruğa.
    uygula({ tablo: 'urun_stoklar', kayitlar: [stokKaydi()] })
    expect(stokSatiri()).toBeUndefined()

    // 2. tur: ürün geldi. Pull imleci ilerlediği için stok satırı ARTIK ÇEKİLMEZ —
    // boş kayıt listesiyle çağrılır. Kuyruk olmasaydı satır sonsuza dek kaybolurdu.
    urunuEkle()
    const sonuc = uygula({ tablo: 'urun_stoklar', kayitlar: [] })

    expect(sonuc.uygulanan).toBe(1)
    expect(sonuc.bekleyen).toBe(0)
    expect(stokSatiri()).toMatchObject({ lokasyon_id: 2, miktar: 7 })
    expect(bekleyenTablolar()).toEqual([])
  })

  test('ebeveyn hiç gelmezse kayıt kuyrukta kalır, tur tur birikmez', () => {
    uygula({ tablo: 'urun_stoklar', kayitlar: [stokKaydi()] })
    uygula({ tablo: 'urun_stoklar', kayitlar: [] })
    const sonuc = uygula({ tablo: 'urun_stoklar', kayitlar: [] })

    // Aynı senk_id → PRIMARY KEY (tablo, senk_id) sayesinde tek satır kalır.
    expect(sonuc.bekleyen).toBe(1)
    expect(db.prepare('SELECT COUNT(*) AS n FROM senk_bekleyen').get().n).toBe(1)
  })

  test('kuyruktaki bayat sürüm, aynı kaydın taze uzak sürümünü ezmez', () => {
    uygula({ tablo: 'urun_stoklar', kayitlar: [stokKaydi(7, '2026-07-06T11:19:43.282Z')] })
    urunuEkle()

    // Aynı satırın buluttaki GÜNCEL hâli (sayım yapılmış, miktar 12) geliyor.
    uygula({ tablo: 'urun_stoklar', kayitlar: [stokKaydi(12, '2026-07-20T09:00:00.000Z')] })

    expect(stokSatiri().miktar).toBe(12)
  })

  test('uygulanan kayıt kuyruktan silinir (tekrar tekrar denenmez)', () => {
    urunuEkle()
    const sonuc = uygula({ tablo: 'urun_stoklar', kayitlar: [stokKaydi()] })

    expect(sonuc.uygulanan).toBe(1)
    expect(db.prepare('SELECT COUNT(*) AS n FROM senk_bekleyen').get().n).toBe(0)
  })

  test('yereldeki sürüm daha yeniyse kayıt kuyruktan düşer (ebeveyn gelmese bile)', () => {
    // Kuyrukta bayat bir satır varken, yerelde aynı senk_id daha yeni damgayla mevcut.
    uygula({ tablo: 'urun_stoklar', kayitlar: [stokKaydi(7, '2026-07-06T11:19:43.282Z')] })
    urunuEkle()
    db.prepare(`INSERT INTO urun_stoklar (urun_id, lokasyon_id, miktar, senk_id, senk_guncelleme)
      VALUES ((SELECT id FROM urunler WHERE senk_id = ?), 2, 99, ?, ?)`)
      .run(URUN_SENK, STOK_SENK, '2026-07-22T00:00:00.000Z')

    const sonuc = uygula({ tablo: 'urun_stoklar', kayitlar: [] })

    expect(stokSatiri().miktar).toBe(99) // bayat 7 yerel 99'u EZMEDİ
    expect(sonuc.bekleyen).toBe(0)
  })
})
