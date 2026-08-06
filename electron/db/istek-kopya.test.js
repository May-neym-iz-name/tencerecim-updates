// İstek listesi kalemlerinin ÇOĞALMA hatası.
//
// Gerçek vaka (2026-08-06): 27.07 tarihli Sofram istek listesi bu PC'de 182 satır
// görünüyordu; gerçek liste 40 kalem / 430 adetti. PDF ve liste ekranı ham satırları
// bastığı için kullanıcı 2030 adetlik hayalî bir sipariş gördü.
//
// İki kusur birlikte üretiyordu:
//   1) istek:kaydet, güncellemede TÜM kalemleri DELETE edip yeniden INSERT ediyordu.
//      Yeni satırlar tetikleyiciden YENİ senk_id alıyor → bulut için "yepyeni kayıt".
//   2) istek_listesi_kalemleri'nin doğal anahtarı yoktu (dogal: []), yani pull yalnız
//      senk_id'ye bakıyordu. Silme senkronda YAYILMADIĞI için karşı PC eski satırları
//      tutup yenilerini de ekliyordu → her düzenlemede liste şişiyordu.
import { describe, test, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'

// senk-bekleyen.test.js ile aynı adaptör: better-sqlite3 Electron ABI'sine derli,
// vitest düz Node'da koşar → node:sqlite üstüne ince bir uyumluluk katmanı.
function bellekDb() {
  const d = new DatabaseSync(':memory:')
  return {
    exec: (sql) => d.exec(sql),
    prepare: (sql) => {
      const s = d.prepare(sql)
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

const { default: senkVeri } = await import('./senk-veri.js')
const { _kalemleriYaz: kalemleriYaz } = await import('./istek-listesi.js')

const LISTE_SENK = 'aaaa0000aaaa0000aaaa0000aaaa0000'
const URUN_SENK = 'bbbb1111bbbb1111bbbb1111bbbb1111'

let db
const uygula = (kayitlar) => senkVeri._uygula(db, { tablo: 'istek_listesi_kalemleri', kayitlar })
const kalemler = () => db.prepare('SELECT * FROM istek_listesi_kalemleri ORDER BY id').all()

// Buluttan gelmiş gibi bir kalem kaydı. senk_id her çağrıda farklı olabilir —
// asıl senaryo bu: aynı ürün, yeni kimlikle geri geliyor.
const kalemKaydi = (senk_id, miktar, guncelleme) => ({
  senk_id,
  guncelleme,
  veri: { urun_adi: 'Sofram Soft 14 cm Sütlük / 1,50 Lt.', miktar, _fk: { istek_id: LISTE_SENK, urun_id: URUN_SENK } },
})

beforeEach(() => {
  db = bellekDb()
  db.exec(`
    CREATE TABLE urunler (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT, barkod TEXT, sku TEXT, marka TEXT, kategori TEXT,
      marka_id INTEGER, kategori_id INTEGER, tedarikci_id INTEGER, aciklama TEXT, alis_fiyati REAL,
      satis_fiyati REAL, kdv_orani REAL, aktif INTEGER DEFAULT 1, ikas_urun_id TEXT, ikas_varyant_id TEXT,
      senk_id TEXT, senk_guncelleme TEXT
    );
    CREATE TABLE istek_listeleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT, lokasyon_id INTEGER, tedarikci_id INTEGER,
      baslik TEXT, tarih TEXT, olusturma_tarihi TEXT, senk_id TEXT, senk_guncelleme TEXT
    );
    CREATE TABLE istek_listesi_kalemleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT, istek_id INTEGER NOT NULL, urun_id INTEGER,
      urun_adi TEXT, miktar INTEGER DEFAULT 1, senk_id TEXT, senk_guncelleme TEXT
    );
    INSERT INTO urunler (ad, aktif, senk_id, senk_guncelleme) VALUES ('Sofram Soft 14 cm Sütlük / 1,50 Lt.', 1, '${URUN_SENK}', '2026-07-01T00:00:00.000Z');
    INSERT INTO istek_listeleri (lokasyon_id, tedarikci_id, tarih, senk_id, senk_guncelleme) VALUES (1, 1, '2026-07-27', '${LISTE_SENK}', '2026-07-27T14:00:00.000Z');
  `)
})

describe('senkron: aynı ürün ikinci kez gelirse kopya üretmez', () => {
  test('farklı senk_id ile gelen AYNI (liste, ürün) çifti yeni satır açmaz', () => {
    uygula([kalemKaydi('1111', 12, '2026-07-27T17:20:25.000Z')])
    expect(kalemler()).toHaveLength(1)

    // Karşı PC listeyi düzenledi → kalemler silinip yeniden yazıldı, yeni senk_id ile geldi.
    uygula([kalemKaydi('2222', 12, '2026-07-30T14:28:18.499Z')])

    expect(kalemler()).toHaveLength(1)
    expect(kalemler()[0].miktar).toBe(12)
  })

  test('taze sürüm miktarı günceller, bayat sürüm mevcut satırı ezmez', () => {
    uygula([kalemKaydi('1111', 12, '2026-07-30T14:28:18.499Z')])

    uygula([kalemKaydi('2222', 24, '2026-08-01T09:00:00.000Z')])
    expect(kalemler()).toHaveLength(1)
    expect(kalemler()[0].miktar).toBe(24)

    // Buluttaki eski bir kopya geç geldi → 24'ü 16'ya düşürmemeli.
    uygula([kalemKaydi('3333', 16, '2026-07-29T08:00:00.000Z')])
    expect(kalemler()).toHaveLength(1)
    expect(kalemler()[0].miktar).toBe(24)
  })

  test('dört tur üst üste pull listeyi şişirmez', () => {
    for (const [sid, ts] of [['1111', '2026-07-30T14:27:11.333Z'], ['2222', '2026-07-30T14:28:18.499Z'],
                             ['3333', '2026-08-06T08:30:55.848Z'], ['4444', '2026-08-06T08:30:55.851Z']]) {
      uygula([kalemKaydi(sid, 12, ts)])
    }
    expect(kalemler()).toHaveLength(1)
  })
})

describe('istek:kaydet — güncelleme kalem kimliklerini korur', () => {
  // Kalemleri sil-yeniden-yaz eden her kayıt, senkron için 40 "yeni" satır üretir.
  // Kimlik korunursa bulut aynı satırı günceller, kopya doğmaz.
  const yaz = (istekId, hazir) => kalemleriYaz(db, istekId, hazir)

  test('miktar değişince satır senk_id korunur, yeni satır açılmaz', () => {
    yaz(1, [{ urun_id: 1, urun_adi: 'Sütlük', miktar: 12 }])
    db.prepare("UPDATE istek_listesi_kalemleri SET senk_id = 'kalici-1', senk_guncelleme = '2026-07-27T17:20:25.000Z' WHERE id = 1").run()

    yaz(1, [{ urun_id: 1, urun_adi: 'Sütlük', miktar: 24 }])

    const k = kalemler()
    expect(k).toHaveLength(1)
    expect(k[0].senk_id).toBe('kalici-1')
    expect(k[0].miktar).toBe(24)
  })

  test('listeden çıkarılan ürünün satırı silinir', () => {
    db.prepare("INSERT INTO urunler (ad, aktif, senk_id) VALUES ('Tava', 1, 'urun-2')").run()
    yaz(1, [{ urun_id: 1, urun_adi: 'Sütlük', miktar: 12 }, { urun_id: 2, urun_adi: 'Tava', miktar: 6 }])
    expect(kalemler()).toHaveLength(2)

    yaz(1, [{ urun_id: 2, urun_adi: 'Tava', miktar: 6 }])

    const k = kalemler()
    expect(k).toHaveLength(1)
    expect(k[0].urun_id).toBe(2)
  })

  test('aynı ürün iki kez eklenirse tek satırda toplanır', () => {
    // Aksi hâlde (liste, ürün) çifti tekil olmaz ve senkron dedup'ı anlamsızlaşır.
    yaz(1, [{ urun_id: 1, urun_adi: 'Sütlük', miktar: 12 }, { urun_id: 1, urun_adi: 'Sütlük', miktar: 6 }])

    const k = kalemler()
    expect(k).toHaveLength(1)
    expect(k[0].miktar).toBe(18)
  })

  test('tek seferlik temizlik: ürün başına en eski satır kalır, serbest metinler korunur', () => {
    // senk-sema.js kur() içindeki onarımın sorgusu — regresyona karşı burada sabitlenir.
    // urun_id IS NULL filtresi olmazsa SQLite tüm NULL'ları tek grup sayar ve bir listedeki
    // serbest metin kalemlerinin hepsi birden silinir.
    const ekle = db.prepare('INSERT INTO istek_listesi_kalemleri (istek_id, urun_id, urun_adi, miktar) VALUES (?, ?, ?, ?)')
    ekle.run(1, 1, 'Sütlük', 12)
    ekle.run(1, 1, 'Sütlük', 16)   // kopya
    ekle.run(1, 1, 'Sütlük', 24)   // kopya
    ekle.run(1, null, 'Not A', 1)
    ekle.run(1, null, 'Not B', 2)

    db.prepare(`DELETE FROM istek_listesi_kalemleri
      WHERE urun_id IS NOT NULL AND id NOT IN (
        SELECT MIN(id) FROM istek_listesi_kalemleri WHERE urun_id IS NOT NULL
        GROUP BY istek_id, urun_id)`).run()

    const k = kalemler()
    expect(k).toHaveLength(3)
    expect(k.filter(r => r.urun_id === 1)).toEqual([expect.objectContaining({ miktar: 12 })])
    expect(k.filter(r => r.urun_id === null).map(r => r.urun_adi)).toEqual(['Not A', 'Not B'])
  })

  test('ürünsüz (serbest metin) kalemler korunur ve birleştirilmez', () => {
    yaz(1, [{ urun_id: null, urun_adi: 'Elle yazılmış ürün', miktar: 3 },
            { urun_id: null, urun_adi: 'Başka bir not', miktar: 1 }])

    expect(kalemler()).toHaveLength(2)
  })
})
