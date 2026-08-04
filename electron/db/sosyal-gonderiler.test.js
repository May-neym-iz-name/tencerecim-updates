// Gönderi meta verisinin ayrı tabloya taşınması (2026-08-04).
//
// Ölçülen sorun: konu_baslik/konu_gorsel/konu_link her mesaj satırına kopyalanıyordu.
// 97.973 mesaj / 1.983 gönderi → her gönderi ortalama 49 kez tekrar, 100.3 MB.
// Tekrarsız saklandığında 1.5 MB.
//
// Bu testler iki şeyi birden sabitler:
//   1. YENİ mesajlar artık konu_* kolonlarını TAŞIMAZ (tekrar geri gelmesin),
//   2. ESKİ mesajlar kendi kolonlarından okunmaya DEVAM eder (hiçbir kayıt boş görünmez).
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { DatabaseSync } from 'node:sqlite'

// better-sqlite3 BURADA KULLANILAMAZ (Electron ABI'sine derli, vitest düz Node'da koşar).
// node:sqlite üstüne üretim kodunun kullandığı yüzeyi veren ince adaptör konur.
function bellekDb() {
  const d = new DatabaseSync(':memory:')
  return {
    exec: (sql) => d.exec(sql),
    prepare: (sql) => {
      const s = d.prepare(sql)
      // better-sqlite3 sorguda geçmeyen fazla anahtarları yok sayar; node:sqlite patlar.
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
  }
}

// vi.mock BURADA ÇALIŞMAZ: sosyal-mesajlar.js CommonJS require kullanıyor ve vitest
// onu yakalamıyor. Bu yüzden modülün kendi test dikişi (_dbAyarla) kullanılır.
let db
const { default: sosyal } = await import('./sosyal-mesajlar.js')
const { _upsertMesaj, _dbAyarla } = sosyal

const SEMA = `
  CREATE TABLE sosyal_mesajlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL, tur TEXT NOT NULL, harici_id TEXT UNIQUE,
    konu_id TEXT, ust_id TEXT, gonderen_id TEXT, gonderen_ad TEXT, metin TEXT,
    yon TEXT DEFAULT 'gelen', durum TEXT DEFAULT 'yeni',
    atanan_kullanici TEXT, cevaplayan_kullanici TEXT, ic_not TEXT,
    mesaj_tarihi TEXT, cekilme_tarihi TEXT,
    konu_baslik TEXT, konu_gorsel TEXT, konu_link TEXT,
    ozel_mesaj_tarihi TEXT, ozel_mesaj_hata TEXT, ozel_mesaj_deneme INTEGER,
    ek_tur TEXT, ek_baslik TEXT, ek_gorsel TEXT, ek_link TEXT, silindi INTEGER DEFAULT 0
  );
  CREATE TABLE sosyal_gonderiler (
    konu_id TEXT PRIMARY KEY, platform TEXT, baslik TEXT, gorsel TEXT, link TEXT,
    guncelleme TEXT
  );
`

const mesaj = (f = {}) => ({
  platform: 'instagram', tur: 'yorum', harici_id: 'h1', konu_id: 'k1',
  gonderen_ad: 'Ayşe', metin: 'fiyat?', yon: 'gelen', mesaj_tarihi: '2026-08-01T10:00:00+0000',
  konu_baslik: 'Granit Tencere Seti', konu_gorsel: 'https://cdn.meta/yeni.jpg',
  konu_link: 'https://instagram.com/p/abc', ...f,
})

beforeEach(() => {
  db = bellekDb()
  db.exec(SEMA)
  _dbAyarla(db)
})

describe('yazım — tekrar durdu mu', () => {
  test('yeni mesaj satırı konu_baslik/konu_gorsel/konu_link TAŞIMAZ', () => {
    _upsertMesaj(mesaj())
    const satir = db.prepare('SELECT konu_baslik, konu_gorsel, konu_link FROM sosyal_mesajlar').get()
    expect(satir.konu_baslik).toBeNull()
    expect(satir.konu_gorsel).toBeNull()
    expect(satir.konu_link).toBeNull()
  })

  test('gönderi bilgisi sosyal_gonderiler tablosuna TEK satır olarak yazılır', () => {
    _upsertMesaj(mesaj({ harici_id: 'h1' }))
    _upsertMesaj(mesaj({ harici_id: 'h2', metin: 'stok var mı' }))
    _upsertMesaj(mesaj({ harici_id: 'h3', metin: 'kargo' }))
    const g = db.prepare('SELECT * FROM sosyal_gonderiler').all()
    expect(g).toHaveLength(1) // 3 mesaj, 1 gönderi — tekrar YOK
    expect(g[0].baslik).toBe('Granit Tencere Seti')
    expect(g[0].konu_id).toBe('k1')
  })

  test('görsel adresinde YENİ değer kazanır (Meta adresleri süreli)', () => {
    _upsertMesaj(mesaj({ harici_id: 'h1', konu_gorsel: 'https://cdn.meta/eski.jpg' }))
    _upsertMesaj(mesaj({ harici_id: 'h2', konu_gorsel: 'https://cdn.meta/taze.jpg' }))
    expect(db.prepare('SELECT gorsel FROM sosyal_gonderiler').get().gorsel)
      .toBe('https://cdn.meta/taze.jpg')
  })

  test('başlık İLK öğrenilen değerde kalır (sonraki çekimde boş gelebilir)', () => {
    _upsertMesaj(mesaj({ harici_id: 'h1' }))
    _upsertMesaj(mesaj({ harici_id: 'h2', konu_baslik: null }))
    expect(db.prepare('SELECT baslik FROM sosyal_gonderiler').get().baslik)
      .toBe('Granit Tencere Seti')
  })

  test('konu_id yoksa gönderi satırı açılmaz', () => {
    _upsertMesaj(mesaj({ konu_id: null }))
    expect(db.prepare('SELECT COUNT(*) n FROM sosyal_gonderiler').get().n).toBe(0)
  })
})

describe('okuma — iki kaynak birleşiyor mu', () => {
  test('liste: YENİ mesajın başlığı sosyal_gonderiler’den gelir', () => {
    // Bu test aynı zamanda "s.* içindeki konu_baslik'i sonraki aynı adlı sütun
    // geçersiz kılar" davranışını DOĞRULAR — varsayıma bırakılmadı.
    _upsertMesaj(mesaj())
    const { satirlar } = sosyal['sosyal:liste']({})
    expect(satirlar).toHaveLength(1)
    expect(satirlar[0].konu_baslik).toBe('Granit Tencere Seti')
    expect(satirlar[0].konu_gorsel).toBe('https://cdn.meta/yeni.jpg')
  })

  test('liste: ESKİ satır kendi kolonundan okunur (geriye dönük uyum)', () => {
    // Göç öncesi yazılmış satır: bilgi mesajın üstünde, sosyal_gonderiler BOŞ.
    db.prepare(`INSERT INTO sosyal_mesajlar
      (platform, tur, harici_id, konu_id, metin, yon, durum, mesaj_tarihi, konu_baslik, konu_gorsel)
      VALUES ('facebook','yorum','eski1','kEski','eski yorum','gelen','yeni','2026-01-01T00:00:00+0000',
              'Eski Gönderi Başlığı','https://cdn.meta/eski.jpg')`).run()
    const { satirlar } = sosyal['sosyal:liste']({})
    expect(satirlar[0].konu_baslik).toBe('Eski Gönderi Başlığı')
    expect(satirlar[0].konu_gorsel).toBe('https://cdn.meta/eski.jpg')
  })

  test('liste: platform süzgeci JOIN sonrası da çalışır', () => {
    _upsertMesaj(mesaj({ harici_id: 'h1', platform: 'instagram' }))
    _upsertMesaj(mesaj({ harici_id: 'h2', platform: 'facebook', konu_id: 'k2' }))
    expect(sosyal['sosyal:liste']({ platform: 'instagram' }).satirlar).toHaveLength(1)
    expect(sosyal['sosyal:liste']({ platform: 'instagram' }).toplam).toBe(1)
  })

  test('konu: sohbet görünümü de gönderi bilgisini alır', () => {
    _upsertMesaj(mesaj())
    const satirlar = sosyal['sosyal:konu']('k1')
    expect(satirlar[0].konu_baslik).toBe('Granit Tencere Seti')
  })
})

// Meta'nın 24 saatlik yanıt penceresi MÜŞTERİNİN son mesajından başlar. Arayüzdeki
// geri sayım bu alana dayanır; yanlış alan seçilirse personel süreyi geç fark eder
// (2026-08-04 ölçümü: 125 konuşma yanıtsız kalmıştı, bir kısmı 30 dakikayla kaçmıştı).
describe('konusmalar() — yanıt penceresi zamanı', () => {
  const dm = (f = {}) => mesaj({ tur: 'dm', konu_baslik: null, konu_gorsel: null, konu_link: null, ...f })

  test('son_gelen yalnız GELEN mesajlara bakar, kendi yanıtımız pencereyi UZATMAZ', () => {
    _upsertMesaj(dm({ harici_id: 'd1', yon: 'gelen', gonderen_id: 'u1', mesaj_tarihi: '2026-08-01T08:00:00+0000' }))
    // Bizim yanıtımız SONRA geliyor — son_zaman'ı ilerletir ama pencereyi ilerletmemeli.
    _upsertMesaj(dm({ harici_id: 'd2', yon: 'giden', gonderen_id: 'u1', mesaj_tarihi: '2026-08-01T20:00:00+0000' }))
    const [k] = sosyal['sosyal:konusmalar']({})
    expect(k.son_gelen).toBe('2026-08-01T08:00:00+0000') // müşterininki
    expect(k.son_zaman).toBe('2026-08-01T20:00:00+0000') // hepsi dahil — farklı olmalı
  })

  test('birden çok gelen mesajda EN YENİSİ esas alınır', () => {
    _upsertMesaj(dm({ harici_id: 'd1', yon: 'gelen', gonderen_id: 'u1', mesaj_tarihi: '2026-08-01T08:00:00+0000' }))
    _upsertMesaj(dm({ harici_id: 'd2', yon: 'gelen', gonderen_id: 'u1', mesaj_tarihi: '2026-08-02T09:30:00+0000' }))
    expect(sosyal['sosyal:konusmalar']({})[0].son_gelen).toBe('2026-08-02T09:30:00+0000')
  })

  test('yalnız giden mesaj varsa son_gelen boş kalır (geri sayım gösterilmez)', () => {
    _upsertMesaj(dm({ harici_id: 'd1', yon: 'giden', gonderen_id: 'u1', mesaj_tarihi: '2026-08-01T08:00:00+0000' }))
    expect(sosyal['sosyal:konusmalar']({})[0].son_gelen).toBeNull()
  })
})

describe('gonderiler() — JOIN sonrası belirsiz sütun kalmadı', () => {
  test('sorgu hatasız çalışır ve gönderi bilgisini döndürür', () => {
    // 'ambiguous column name' hatası olsaydı sorgu tümden patlardı.
    _upsertMesaj(mesaj({ tur: 'gonderi', harici_id: 'g1', metin: '' }))
    _upsertMesaj(mesaj({ harici_id: 'h1' }))
    const r = sosyal['sosyal:gonderiler']({})
    expect(r).toHaveLength(1)
    expect(r[0].konu_baslik).toBe('Granit Tencere Seti')
    expect(r[0].yorum_sayisi).toBe(1)
    expect(r[0].konu_id).toBe('k1')
  })

  test('başlık araması yeni tabloya da bakar', () => {
    _upsertMesaj(mesaj({ tur: 'gonderi', harici_id: 'g1', metin: '' }))
    expect(sosyal['sosyal:gonderiler']({ arama: 'Granit' })).toHaveLength(1)
    expect(sosyal['sosyal:gonderiler']({ arama: 'BulunmayanKelime' })).toHaveLength(0)
  })

  test('JOIN sayıları çoğaltmaz (konu_id birincil anahtar → 1:1)', () => {
    _upsertMesaj(mesaj({ tur: 'gonderi', harici_id: 'g1', metin: '' }))
    _upsertMesaj(mesaj({ harici_id: 'h1' }))
    _upsertMesaj(mesaj({ harici_id: 'h2' }))
    _upsertMesaj(mesaj({ harici_id: 'h3' }))
    expect(sosyal['sosyal:gonderiler']({})[0].yorum_sayisi).toBe(3)
  })
})
