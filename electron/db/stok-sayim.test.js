// Stok sayımı çekirdeği — özellikle HAREKET-FARKINDALIKLI tamamlama.
// better-sqlite3 BURADA KULLANILAMAZ (Electron ABI'sine derli); node:sqlite adaptörü
// (urunler.test.js kalıbı).
import { describe, test, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const sayim = require('./stok-sayim.js')

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
    CREATE TABLE lokasyonlar (id INTEGER PRIMARY KEY, ad TEXT);
    CREATE TABLE urunler (id INTEGER PRIMARY KEY, ad TEXT, barkod TEXT, sku TEXT,
      marka_id INTEGER, kategori_id INTEGER, aktif INTEGER DEFAULT 1);
    CREATE TABLE urun_stoklar (id INTEGER PRIMARY KEY AUTOINCREMENT,
      urun_id INTEGER, lokasyon_id INTEGER, miktar INTEGER DEFAULT 0,
      UNIQUE(urun_id, lokasyon_id));
    CREATE TABLE stok_sayimlar (id INTEGER PRIMARY KEY AUTOINCREMENT,
      lokasyon_id INTEGER NOT NULL, durum TEXT DEFAULT 'devam_ediyor',
      tip TEXT DEFAULT 'tam', kapsam TEXT, notlar TEXT,
      baslangic_tarihi TEXT DEFAULT (datetime('now')), bitis_tarihi TEXT);
    CREATE TABLE stok_sayim_kalemleri (id INTEGER PRIMARY KEY AUTOINCREMENT,
      sayim_id INTEGER NOT NULL, urun_id INTEGER NOT NULL,
      beklenen_miktar INTEGER DEFAULT 0, sayilan_miktar INTEGER, fark INTEGER);

    INSERT INTO lokasyonlar VALUES (1, 'Pendik');
    INSERT INTO urunler (id, ad, barkod, marka_id, kategori_id) VALUES
      (1, 'Tencere', '111', 10, 100),
      (2, 'Tava',    '222', 10, 200),
      (3, 'Cezve',   '333', 20, 100);
    INSERT INTO urun_stoklar (urun_id, lokasyon_id, miktar) VALUES
      (1, 1, 5), (2, 1, 3), (3, 1, 0);
  `)
})

const stok = (uid) => db.prepare('SELECT miktar FROM urun_stoklar WHERE urun_id = ? AND lokasyon_id = 1').get(uid).miktar

describe('baslat', () => {
  test('tam sayım tüm aktif ürünleri yükler', () => {
    const r = sayim.baslat(db, { lokasyon_id: 1, tip: 'tam' })
    expect(r.kalem_sayisi).toBe(3)
  })

  test('kapsamlı: marka filtresi yalnız o markayı yükler', () => {
    const r = sayim.baslat(db, { lokasyon_id: 1, tip: 'kapsamli', marka_id: 10 })
    expect(r.kalem_sayisi).toBe(2)
  })

  test('kapsamlı: marka + kategori birlikte daraltır', () => {
    const r = sayim.baslat(db, { lokasyon_id: 1, tip: 'kapsamli', marka_id: 10, kategori_id: 100 })
    expect(r.kalem_sayisi).toBe(1)
  })

  test('kapsamlı ama filtre yok → hata', () => {
    expect(() => sayim.baslat(db, { lokasyon_id: 1, tip: 'kapsamli' })).toThrow(/marka veya kategori/)
  })

  test('hızlı sayım boş başlar', () => {
    const r = sayim.baslat(db, { lokasyon_id: 1, tip: 'hizli' })
    expect(r.kalem_sayisi).toBe(0)
  })
})

describe('kalemEkle (hızlı mod)', () => {
  test('beklenen = eklendiği anki stok; ürün bilgileri döner', () => {
    const { sayim_id } = sayim.baslat(db, { lokasyon_id: 1, tip: 'hizli' })
    const k = sayim.kalemEkle(db, { sayim_id, urun_id: 1 })
    expect(k.beklenen_miktar).toBe(5)
    expect(k.urun_adi).toBe('Tencere')
  })

  test('stok kaydı olmayan ürün beklenen=0 ile eklenir', () => {
    db.exec('DELETE FROM urun_stoklar WHERE urun_id = 3')
    const { sayim_id } = sayim.baslat(db, { lokasyon_id: 1, tip: 'hizli' })
    expect(sayim.kalemEkle(db, { sayim_id, urun_id: 3 }).beklenen_miktar).toBe(0)
  })

  test('ikinci ekleme çift kayıt üretmez, mevcut kalemi döndürür', () => {
    const { sayim_id } = sayim.baslat(db, { lokasyon_id: 1, tip: 'hizli' })
    sayim.kalemEkle(db, { sayim_id, urun_id: 1 })
    sayim.kalemGir(db, { sayim_id, urun_id: 1, sayilan_miktar: 4 })
    const k = sayim.kalemEkle(db, { sayim_id, urun_id: 1 })
    expect(k.sayilan_miktar).toBe(4)
    expect(db.prepare('SELECT COUNT(*) c FROM stok_sayim_kalemleri').get().c).toBe(1)
  })

  test('kapatılmış sayıma kalem eklenemez', () => {
    const { sayim_id } = sayim.baslat(db, { lokasyon_id: 1, tip: 'hizli' })
    sayim.iptal(db, sayim_id)
    expect(() => sayim.kalemEkle(db, { sayim_id, urun_id: 1 })).toThrow(/Aktif sayım/)
  })
})

describe('tamamla — hareket-farkındalıklı (DELTA)', () => {
  test('EN KRİTİK: sayım sürerken satış düşerse satış KAYBOLMAZ', () => {
    // Sayım başladı: Tencere beklenen=5. Kişi 5 saydı (raf doğru).
    const { sayim_id } = sayim.baslat(db, { lokasyon_id: 1, tip: 'tam' })
    sayim.kalemGir(db, { sayim_id, urun_id: 1, sayilan_miktar: 5 })
    // Bu sırada 2 adet SATILDI → stok 3'e düştü.
    db.exec('UPDATE urun_stoklar SET miktar = 3 WHERE urun_id = 1')
    sayim.tamamla(db, { sayim_id })
    // ESKİ (mutlak) davranış 5 yazardı → satılan 2 adet stoğa geri gelirdi.
    // Delta: 3 + (5-5) = 3.
    expect(stok(1)).toBe(3)
  })

  test('gerçek fark bulunduysa delta stoğa uygulanır', () => {
    const { sayim_id } = sayim.baslat(db, { lokasyon_id: 1, tip: 'tam' })
    sayim.kalemGir(db, { sayim_id, urun_id: 2, sayilan_miktar: 1 }) // beklenen 3, 2 eksik
    sayim.tamamla(db, { sayim_id })
    expect(stok(2)).toBe(1)
  })

  test('fark + eşzamanlı satış birlikte doğru sonuç verir', () => {
    const { sayim_id } = sayim.baslat(db, { lokasyon_id: 1, tip: 'tam' })
    sayim.kalemGir(db, { sayim_id, urun_id: 1, sayilan_miktar: 6 }) // rafta 1 fazla
    db.exec('UPDATE urun_stoklar SET miktar = 4 WHERE urun_id = 1')  // 1 satış
    sayim.tamamla(db, { sayim_id })
    expect(stok(1)).toBe(5) // 4 + (6-5)
  })

  test('negatife düşen 0a kırpılır ve raporlanır', () => {
    const { sayim_id } = sayim.baslat(db, { lokasyon_id: 1, tip: 'tam' })
    sayim.kalemGir(db, { sayim_id, urun_id: 2, sayilan_miktar: 0 }) // beklenen 3 → delta -3
    db.exec('UPDATE urun_stoklar SET miktar = 1 WHERE urun_id = 2') // 2 satış oldu
    const r = sayim.tamamla(db, { sayim_id })
    expect(stok(2)).toBe(0)
    expect(r.kirpilan).toBe(1)
  })

  test('SAYILMAYAN kalemlere dokunulmaz', () => {
    const { sayim_id } = sayim.baslat(db, { lokasyon_id: 1, tip: 'tam' })
    sayim.kalemGir(db, { sayim_id, urun_id: 1, sayilan_miktar: 5 })
    const r = sayim.tamamla(db, { sayim_id })
    expect(r.islenen).toBe(1)
    expect(stok(2)).toBe(3) // hiç sayılmadı → aynı
  })

  test('tamamlanan sayım ikinci kez tamamlanamaz (çift delta koruması)', () => {
    const { sayim_id } = sayim.baslat(db, { lokasyon_id: 1, tip: 'tam' })
    sayim.kalemGir(db, { sayim_id, urun_id: 2, sayilan_miktar: 1 })
    sayim.tamamla(db, { sayim_id })
    expect(() => sayim.tamamla(db, { sayim_id })).toThrow(/zaten kapatılmış/)
    expect(stok(2)).toBe(1)
  })
})

describe('kalemSifirla + iptal + listele', () => {
  test('kalemSifirla sayımı siler, kalem listede kalır', () => {
    const { sayim_id } = sayim.baslat(db, { lokasyon_id: 1, tip: 'tam' })
    sayim.kalemGir(db, { sayim_id, urun_id: 1, sayilan_miktar: 9 })
    sayim.kalemSifirla(db, { sayim_id, urun_id: 1 })
    const k = sayim.getir(db, sayim_id).kalemler.find(x => x.urun_id === 1)
    expect(k.sayilan_miktar).toBeNull()
    expect(k.beklenen_miktar).toBe(5)
  })

  test('iptal DB durumunu işaretler (öksüz devam_ediyor kalmaz), stok değişmez', () => {
    const { sayim_id } = sayim.baslat(db, { lokasyon_id: 1, tip: 'tam' })
    sayim.kalemGir(db, { sayim_id, urun_id: 1, sayilan_miktar: 99 })
    sayim.iptal(db, sayim_id)
    expect(db.prepare('SELECT durum FROM stok_sayimlar WHERE id = ?').get(sayim_id).durum).toBe('iptal')
    expect(stok(1)).toBe(5)
  })

  test('listele özet sayaçları döndürür', () => {
    const { sayim_id } = sayim.baslat(db, { lokasyon_id: 1, tip: 'tam' })
    sayim.kalemGir(db, { sayim_id, urun_id: 1, sayilan_miktar: 5 }) // fark 0
    sayim.kalemGir(db, { sayim_id, urun_id: 2, sayilan_miktar: 1 }) // fark -2
    const [l] = sayim.listele(db, {})
    expect(l.kalem_sayisi).toBe(3)
    expect(l.sayilan_sayisi).toBe(2)
    expect(l.farkli_sayisi).toBe(1)
    expect(l.lokasyon_adi).toBe('Pendik')
  })
})
