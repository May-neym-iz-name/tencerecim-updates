// Gönderiye özel otomasyon kaydetme davranışı (v1.2.173).
//
// Korunan iki kural, ikisi de gerçek bir veri kaybı senaryosundan doğdu:
//
//   1) sablon_idler / urunler UNDEFINED ise DOKUNULMAZ. İlk yazımda panel her kayıtta
//      koşulsuz `sablon_idler: []` gönderiyordu; henüz yeni modele taşınmamış bir gönderiyi
//      sadece açıp kapatan kullanıcı şablon bağlarını SESSİZCE siliyordu → otomasyon
//      boş mesajla çalışamaz hale geliyordu. (Aynı sınıf hata: istek-kopya.test.js.)
//   2) BOŞ DİZİ ise temizlenir — kullanıcı gerçekten "hepsini çıkar" diyebilmeli.
//
// db enjekte edilerek test edilir: better-sqlite3 Electron ABI'sine derli, vitest düz
// Node'da koşar (senk-bekleyen.test.js ile aynı node:sqlite adaptörü).
import { describe, test, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'

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
// db ENJEKTE edilir, IPC sarmalayıcısı atlanır: bu test veri kurallarını sınar, yetkiyi değil.
// (Yetki kontrolü sarmalayıcıda; urunler.js/setler.js'te de aynı ayrım var.)
const { default: mod } = await import('./sosyal-otomasyon.js')
const kaydet = (veri) => mod._otomasyonKaydet(veri, db)

const sablonBaglari = (otoId) => db.prepare(
  'SELECT sablon_id FROM sosyal_otomasyon_sablonlar WHERE otomasyon_id = ? ORDER BY sira').all(otoId).map(r => r.sablon_id)
const urunBaglari = (otoId) => db.prepare(
  'SELECT urun_id, set_id FROM sosyal_otomasyon_urunler WHERE otomasyon_id = ? ORDER BY sira').all(otoId)

beforeEach(() => {
  db = bellekDb()
  db.exec(`
    CREATE TABLE urunler (id INTEGER PRIMARY KEY, ad TEXT, satis_fiyati REAL, web_link TEXT, sku TEXT);
    CREATE TABLE setler (id INTEGER PRIMARY KEY, ad TEXT, fiyat REAL, web_link TEXT);
    CREATE TABLE sosyal_sablonlar (id INTEGER PRIMARY KEY, ad TEXT, tur TEXT DEFAULT 'urun', aktif INTEGER DEFAULT 1,
      urun_id INTEGER, set_id INTEGER, urun_adi TEXT, aciklama TEXT, fiyat REAL, link TEXT, whatsapp TEXT, serbest_metin TEXT);
    CREATE TABLE sosyal_otomasyonlar (id INTEGER PRIMARY KEY, platform TEXT, konu_id TEXT UNIQUE, aktif INTEGER DEFAULT 0,
      acik_yanit_metni TEXT, baslangic_tarihi TEXT, ozel_aciklama TEXT, whatsapp TEXT);
    CREATE TABLE sosyal_otomasyon_sablonlar (otomasyon_id INTEGER, sablon_id INTEGER, sira INTEGER DEFAULT 0);
    CREATE TABLE sosyal_otomasyon_urunler (id INTEGER PRIMARY KEY AUTOINCREMENT, otomasyon_id INTEGER,
      urun_id INTEGER, set_id INTEGER, sira INTEGER DEFAULT 0, ozel_fiyat REAL, ozel_ad TEXT);
    CREATE TABLE sosyal_mesajlar (id INTEGER PRIMARY KEY, konu_id TEXT, ozel_mesaj_tarihi TEXT);
    CREATE TABLE lokasyonlar (id INTEGER PRIMARY KEY, ad TEXT, telefon TEXT, aktif INTEGER DEFAULT 1);
    CREATE TABLE sosyal_otomasyon_numaralar (id INTEGER PRIMARY KEY AUTOINCREMENT, otomasyon_id INTEGER,
      lokasyon_ad TEXT, baslik TEXT, numara TEXT, sira INTEGER DEFAULT 0);
    INSERT INTO lokasyonlar (id, ad, telefon) VALUES
      (1, 'Tencerecim Pendik', '0545 151 60 77'),
      (2, 'Tencerecim Gölcük', '0537 288 12 41'),
      (3, 'Tencerecim Depo', '');
    INSERT INTO urunler (id, ad, satis_fiyati, web_link) VALUES
      (1, 'Tava 24', 890, 'https://tencerecim.store/tava-24'),
      (2, 'Tava 26', 990, 'https://tencerecim.store/tava-26');
    INSERT INTO setler (id, ad, fiyat, web_link) VALUES (5, 'Kase Seti', 3550, 'https://tencerecim.store/kase-seti');
    INSERT INTO sosyal_sablonlar (id, ad, urun_adi) VALUES (11, 'Eski Şablon', 'Tava 24');
  `)
})

describe('otomasyonKaydet — bağların korunması', () => {
  test('sablon_idler verilmezse mevcut şablon bağları KORUNUR (aç/kapat veri silmez)', () => {
    const { id } = kaydet({ konu_id: 'K1', platform: 'instagram', aktif: 0, sablon_idler: [11] })
    expect(sablonBaglari(id)).toEqual([11])

    // Sadece aç/kapat — şablon listesi hiç gönderilmiyor.
    kaydet({ konu_id: 'K1', platform: 'instagram', aktif: 1 })
    expect(sablonBaglari(id)).toEqual([11])
  })

  test('sablon_idler boş dizi ise bağlar TEMİZLENİR (yeni modele geçiş)', () => {
    const { id } = kaydet({ konu_id: 'K1', platform: 'instagram', aktif: 0, sablon_idler: [11] })
    kaydet({ konu_id: 'K1', platform: 'instagram', aktif: 0, sablon_idler: [], urunler: [{ urun_id: 1 }] })
    expect(sablonBaglari(id)).toEqual([])
    expect(urunBaglari(id)).toEqual([{ urun_id: 1, set_id: null }])
  })

  test('urunler verilmezse mevcut ürün seçimi KORUNUR', () => {
    const { id } = kaydet({ konu_id: 'K1', platform: 'instagram', aktif: 0, urunler: [{ urun_id: 1 }, { set_id: 5 }] })
    expect(urunBaglari(id)).toHaveLength(2)
    kaydet({ konu_id: 'K1', platform: 'instagram', aktif: 1 })
    expect(urunBaglari(id)).toHaveLength(2)
  })

  test('ürün sırası korunur (mesajdaki sıra kullanıcının dizdiği sıradır)', () => {
    const { id } = kaydet({ konu_id: 'K1', platform: 'instagram', aktif: 0, urunler: [{ urun_id: 2 }, { urun_id: 1 }] })
    expect(urunBaglari(id).map(u => u.urun_id)).toEqual([2, 1])
  })

  test('aynı satırda hem ürün hem set reddedilir', () => {
    expect(() => kaydet({ konu_id: 'K1', platform: 'instagram', aktif: 0, urunler: [{ urun_id: 1, set_id: 5 }] }))
      .toThrow(/ya ürüne ya sete/)
  })

  test('boş ürün satırı reddedilir', () => {
    expect(() => kaydet({ konu_id: 'K1', platform: 'instagram', aktif: 0, urunler: [{}] }))
      .toThrow(/Geçersiz ürün/)
  })

  test('1000 karakteri aşan açıklama reddedilir', () => {
    expect(() => kaydet({ konu_id: 'K1', platform: 'instagram', aktif: 0, ozel_aciklama: 'x'.repeat(1001) }))
      .toThrow(/1000 karakteri aşamaz/)
  })

  test('açıklama ve whatsapp kaydedilip geri okunur', () => {
    kaydet({ konu_id: 'K1', platform: 'instagram', aktif: 0, ozel_aciklama: 'Gönderi metni', whatsapp: '0555' })
    const o = db.prepare('SELECT ozel_aciklama, whatsapp FROM sosyal_otomasyonlar WHERE konu_id = ?').get('K1')
    expect(o.ozel_aciklama).toBe('Gönderi metni')
    expect(o.whatsapp).toBe('0555')
  })
})

describe('_gonderiUrunleriCoz — canlı kaynak çözümü', () => {
  test('ürün ve setin adı/fiyatı/linki canlı tablodan gelir', () => {
    const { id } = kaydet({ konu_id: 'K1', platform: 'instagram', aktif: 0, urunler: [{ urun_id: 1 }, { set_id: 5 }] })
    expect(mod._gonderiUrunleriCoz(db, id)).toEqual([
      { ad: 'Tava 24', fiyat: 890, web_link: 'https://tencerecim.store/tava-24' },
      { ad: 'Kase Seti', fiyat: 3550, web_link: 'https://tencerecim.store/kase-seti' },
    ])
  })

  test('fiyat zam sonrası kendiliğinden güncellenir (kopya tutulmaz)', () => {
    const { id } = kaydet({ konu_id: 'K1', platform: 'instagram', aktif: 0, urunler: [{ urun_id: 1 }] })
    db.prepare('UPDATE urunler SET satis_fiyati = 1200 WHERE id = 1').run()
    expect(mod._gonderiUrunleriCoz(db, id)[0].fiyat).toBe(1200)
  })

  // ozel_fiyat / ozel_ad, sosyal_sablonlar.fiyat / .urun_adi'nın karşılığı: kataloğu 0 fiyatlı
  // ürünler ve depo diliyle yazılmış BÜYÜK HARF adlar için gerekli.
  test('ozel_fiyat girilirse canlı fiyatın YERİNE geçer', () => {
    const { id } = kaydet({ konu_id: 'K1', platform: 'instagram', aktif: 0, urunler: [{ urun_id: 1, ozel_fiyat: 2750 }] })
    expect(mod._gonderiUrunleriCoz(db, id)[0].fiyat).toBe(2750)
    db.prepare('UPDATE urunler SET satis_fiyati = 1200 WHERE id = 1').run()
    expect(mod._gonderiUrunleriCoz(db, id)[0].fiyat).toBe(2750) // zam ozel_fiyatı EZMEZ
  })

  test('ozel_fiyat 0/boş ise canlı fiyat kullanılır', () => {
    const { id } = kaydet({ konu_id: 'K1', platform: 'instagram', aktif: 0, urunler: [{ urun_id: 1, ozel_fiyat: '' }] })
    expect(mod._gonderiUrunleriCoz(db, id)[0].fiyat).toBe(890)
  })

  test('ozel_ad girilirse katalog adının YERİNE geçer', () => {
    const { id } = kaydet({ konu_id: 'K1', platform: 'instagram', aktif: 0,
      urunler: [{ urun_id: 1, ozel_ad: 'Steel Fusion 24 cm Tava' }] })
    expect(mod._gonderiUrunleriCoz(db, id)[0].ad).toBe('Steel Fusion 24 cm Tava')
  })

  test('ozel_ad boş ise katalog adı kullanılır', () => {
    const { id } = kaydet({ konu_id: 'K1', platform: 'instagram', aktif: 0, urunler: [{ urun_id: 1, ozel_ad: '  ' }] })
    expect(mod._gonderiUrunleriCoz(db, id)[0].ad).toBe('Tava 24')
  })
})

// v1.2.177 — gönderiye birden çok WhatsApp sipariş hattı.
describe('WhatsApp sipariş hatları (çoklu numara)', () => {
  const coz = (otoId) => mod._numaralariCoz(db, otoId)

  test('mağaza seçilip numara boş bırakılırsa numara MAĞAZA KAYDINDAN gelir', () => {
    const { id } = kaydet({
      konu_id: 'K1', platform: 'instagram', aktif: 0,
      numaralar: [{ lokasyon_ad: 'Tencerecim Gölcük' }],
    })
    expect(coz(id)).toEqual([expect.objectContaining({
      baslik: 'Gölcük WhatsApp Sipariş Hattı', numara: '0537 288 12 41',
    })])
  })

  test('mağaza numarası değişince gönderi kendiliğinden güncellenir (canlı okuma)', () => {
    const { id } = kaydet({
      konu_id: 'K1', platform: 'instagram', aktif: 0,
      numaralar: [{ lokasyon_ad: 'Tencerecim Gölcük' }],
    })
    db.prepare("UPDATE lokasyonlar SET telefon = '0530 000 00 00' WHERE ad = 'Tencerecim Gölcük'").run()
    expect(coz(id)[0].numara).toBe('0530 000 00 00')
  })

  test('başlık elle yazılırsa mağaza adı yerine o kullanılır', () => {
    const { id } = kaydet({
      konu_id: 'K1', platform: 'instagram', aktif: 0,
      numaralar: [{ lokasyon_ad: 'Tencerecim Gölcük', baslik: 'Hızlı Sipariş' }],
    })
    expect(coz(id)[0].baslik).toBe('Hızlı Sipariş')
  })

  test('mağaza hattında MAĞAZA KAYDI kazanır (panelden gelen numara yok sayılır)', () => {
    const { id } = kaydet({
      konu_id: 'K1', platform: 'instagram', aktif: 0,
      numaralar: [{ lokasyon_ad: 'Tencerecim Pendik', numara: '0500 111 22 33' }],
    })
    expect(coz(id)[0].numara).toBe('0545 151 60 77')
  })

  // lokasyonlar tablosu PC'ler arası senkronlanmıyor: otomasyonu YÜRÜTEN makinede mağaza
  // kaydı olmayabilir. Anlık görüntü olmasaydı hat o makinede sessizce mesajdan düşerdi.
  test('mağaza kaydı bulunmayan PC\'de anlık görüntüye düşülür — hat kaybolmaz', () => {
    const { id } = kaydet({
      konu_id: 'K1', platform: 'instagram', aktif: 0,
      numaralar: [{ lokasyon_ad: 'Tencerecim Gölcük' }],
    })
    db.prepare("DELETE FROM lokasyonlar WHERE ad = 'Tencerecim Gölcük'").run()
    expect(coz(id)[0].numara).toBe('0537 288 12 41')
  })

  test('mağazasız (elle) hatta kullanıcının numarası yazılır', () => {
    const { id } = kaydet({
      konu_id: 'K1', platform: 'instagram', aktif: 0,
      numaralar: [{ baslik: 'Toptan Hattı', numara: '0500 111 22 33' }],
    })
    expect(coz(id)[0]).toEqual(expect.objectContaining({ baslik: 'Toptan Hattı', numara: '0500 111 22 33' }))
  })

  test('birden çok hat sırasıyla korunur', () => {
    const { id } = kaydet({
      konu_id: 'K1', platform: 'instagram', aktif: 0,
      numaralar: [{ lokasyon_ad: 'Tencerecim Gölcük' }, { lokasyon_ad: 'Tencerecim Pendik' }],
    })
    expect(coz(id).map(n => n.numara)).toEqual(['0537 288 12 41', '0545 151 60 77'])
  })

  test('numaralar verilmezse mevcut hatlar KORUNUR (aç/kapat hattı silmez)', () => {
    const { id } = kaydet({
      konu_id: 'K1', platform: 'instagram', aktif: 0,
      numaralar: [{ lokasyon_ad: 'Tencerecim Gölcük' }],
    })
    kaydet({ konu_id: 'K1', platform: 'instagram', aktif: 1 })
    expect(coz(id)).toHaveLength(1)
  })

  test('numaralar boş dizi ise hatlar TEMİZLENİR', () => {
    const { id } = kaydet({
      konu_id: 'K1', platform: 'instagram', aktif: 0,
      numaralar: [{ lokasyon_ad: 'Tencerecim Gölcük' }],
    })
    kaydet({ konu_id: 'K1', platform: 'instagram', aktif: 0, numaralar: [] })
    expect(coz(id)).toEqual([])
  })

  test('telefonu boş mağaza seçilirse numara boş döner (mesajda satır yazılmaz)', () => {
    const { id } = kaydet({
      konu_id: 'K1', platform: 'instagram', aktif: 0,
      numaralar: [{ lokasyon_ad: 'Tencerecim Depo' }],
    })
    expect((coz(id)[0].numara || '').trim()).toBe('')
  })

  test('hiç eşleşmeyen mağaza adında çökmez, numara boş döner (mesajda satır yazılmaz)', () => {
    const { id } = kaydet({
      konu_id: 'K1', platform: 'instagram', aktif: 0,
      numaralar: [{ lokasyon_ad: 'Olmayan Mağaza' }],
    })
    expect(coz(id)[0].numara).toBe(null)
  })
})
