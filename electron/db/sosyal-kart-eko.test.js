// Ürün kartı ekosu + konuşma adı (09.09.2026).
//
// ÖLÇÜLDÜ 09.09.2026: Meta, bizim gönderdiğimiz kart mesajını çekimde `message:""` ve
// attachments/shares/story alanlarının HİÇBİRİ olmadan döndürüyor (yalnız id/from/created_time).
// Eski benimseme kuralı yalnız ek_tur='sablon' tanıyordu → kopya AYRI satır oldu:
// sohbette boş balon, listede "Otomasyon (kart)" adlı 2.130 konuşma.
//
// Bu testler üç şeyi sabitler:
//   1. Boş kopya ±2 dk içindeki yerel kart ekosunu BENİMSER (yeni satır açılmaz).
//   2. Eski çiftler _kartEkolariniBirlestir ile onarılır (idempotent).
//   3. konusmalar().kisi hiçbir zaman yerel sentetik ad ("… (kart)") döndürmez.
import { describe, test, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'

function bellekDb() {
  const d = new DatabaseSync(':memory:')
  d.function('tr_ara', (s) => require('./tr-arama.js').trNormal(s))
  return {
    exec: (sql) => d.exec(sql),
    prepare: (sql) => {
      const s = d.prepare(sql)
      const suz = (a) => {
        if (a.length !== 1 || a[0] === null || typeof a[0] !== 'object') return a
        return [Object.fromEntries(Object.entries(a[0]).filter(([k]) => sql.includes('@' + k)))]
      }
      return { get: (...a) => s.get(...suz(a)), all: (...a) => s.all(...suz(a)), run: (...a) => s.run(...suz(a)) }
    },
  }
}

let db
const { default: sosyal } = await import('./sosyal-mesajlar.js')
const { _upsertMesaj, _dbAyarla, _kartEkolariniBirlestir } = sosyal
const konusmalar = sosyal['sosyal:konusmalar']

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
    ek_tur TEXT, ek_baslik TEXT, ek_gorsel TEXT, ek_link TEXT, silindi INTEGER DEFAULT 0,
    niyet TEXT, ham_ek TEXT, ozel_mesaj_alici TEXT
  );
  CREATE TABLE sosyal_gonderiler (
    konu_id TEXT PRIMARY KEY, platform TEXT, baslik TEXT, gorsel TEXT, link TEXT, guncelleme TEXT
  );
`

// Yerel kart kaydı — _kartEkoYaz'ın yazdığı şekil (meta/index.js).
const yerelKart = (f = {}) => ({
  platform: 'instagram', tur: 'dm', harici_id: 'giden_kart_1_abcd', konu_id: 'K1',
  gonderen_id: 'M1', gonderen_ad: 'Otomasyon (kart)', yon: 'giden',
  mesaj_tarihi: '2026-09-09T07:28:21.619Z', ek_tur: 'urun_karti', ek_baslik: 'Sofram Soft 12 Parça',
  metin: 'Fiyat: 8.155 TL', ham_ek: '{"elements":[{"title":"Sofram Soft 12 Parça"}]}', ...f,
})
// Meta'dan çekilen kopya — cekMesajlar'ın bizden→musteri.name kuralıyla yazdığı şekil.
const metaKopya = (f = {}) => ({
  platform: 'instagram', tur: 'dm', harici_id: 'aWdfZ_gercek_1', konu_id: 'K1',
  gonderen_id: 'M1', gonderen_ad: 'bahattinyaseminozturk', yon: 'giden',
  metin: '', mesaj_tarihi: '2026-09-09T07:28:18+0000', ...f,
})

beforeEach(() => { db = bellekDb(); db.exec(SEMA); _dbAyarla(db) })

describe('boş kart kopyası yerel ekoyu benimser', () => {
  test('metinsiz + eksiz giden kopya ±2 dk içindeki kart ekosuna YAPIŞIR (yeni satır yok)', () => {
    const kartId = _upsertMesaj(yerelKart())
    const id = _upsertMesaj(metaKopya())
    expect(id).toBe(kartId)
    const satirlar = db.prepare("SELECT harici_id, ek_tur, gonderen_ad FROM sosyal_mesajlar").all()
    expect(satirlar).toHaveLength(1)
    expect(satirlar[0].harici_id).toBe('aWdfZ_gercek_1') // gerçek kimliği aldı
    expect(satirlar[0].ek_tur).toBe('urun_karti')        // kart balonu korunur
  })

  test('2 dakikadan uzak boş kopya benimsenmez (başka bir mesajdır)', () => {
    _upsertMesaj(yerelKart())
    _upsertMesaj(metaKopya({ mesaj_tarihi: '2026-09-09T07:40:00+0000' }))
    expect(db.prepare('SELECT COUNT(*) n FROM sosyal_mesajlar').get().n).toBe(2)
  })

  test('METİNLİ giden mesaj kart ekosunu benimsemez (yalnız aynı metinli ekoyu)', () => {
    _upsertMesaj(yerelKart())
    _upsertMesaj(metaKopya({ metin: 'Merhaba, nasıl yardımcı olabiliriz?' }))
    expect(db.prepare('SELECT COUNT(*) n FROM sosyal_mesajlar').get().n).toBe(2)
  })

  test('ek_tur=sablon tanınmış kopya da benimsenir (eski yol bozulmadı)', () => {
    const kartId = _upsertMesaj(yerelKart())
    expect(_upsertMesaj(metaKopya({ ek_tur: 'sablon', ek_baslik: 'Ürün kartı' }))).toBe(kartId)
  })
})

describe('_kartEkolariniBirlestir — eski çiftlerin onarımı', () => {
  test('ayrı yazılmış çifti tek satıra indirir, kimliği taşır, ikinci çağrı 0 döner', () => {
    // Kopyayı doğrudan tabloya yaz (benimseme kuralı olmadan önceki durum).
    db.prepare(`INSERT INTO sosyal_mesajlar (platform,tur,harici_id,konu_id,gonderen_ad,metin,yon,mesaj_tarihi)
      VALUES ('instagram','dm','aWdfZ_gercek_1','K1','bahattinyaseminozturk','','giden','2026-09-09T07:28:18+0000')`).run()
    _upsertMesaj(yerelKart())
    expect(db.prepare('SELECT COUNT(*) n FROM sosyal_mesajlar').get().n).toBe(2)
    expect(_kartEkolariniBirlestir()).toBe(1)
    const kalan = db.prepare('SELECT harici_id, ek_tur FROM sosyal_mesajlar').all()
    expect(kalan).toEqual([{ harici_id: 'aWdfZ_gercek_1', ek_tur: 'urun_karti' }])
    expect(_kartEkolariniBirlestir()).toBe(0)
  })

  test('metinli giden mesaja DOKUNMAZ', () => {
    db.prepare(`INSERT INTO sosyal_mesajlar (platform,tur,harici_id,konu_id,gonderen_ad,metin,yon,mesaj_tarihi)
      VALUES ('instagram','dm','aWdfZ_x','K1','musteri','4630 tl','giden','2026-09-09T07:28:18+0000')`).run()
    _upsertMesaj(yerelKart())
    expect(_kartEkolariniBirlestir()).toBe(0)
    expect(db.prepare('SELECT COUNT(*) n FROM sosyal_mesajlar').get().n).toBe(2)
  })
})

describe('konusmalar() — liste ve müşteri adı', () => {
  const gelen = (f = {}) => ({ platform: 'instagram', tur: 'dm', harici_id: 'g1', konu_id: 'K1', gonderen_ad: 'Havva', metin: 'fiyat?', yon: 'gelen', mesaj_tarihi: '2026-09-09T06:00:00+0000', ...f })

  test('müşterinin HİÇ yazmadığı (yalnız kart gönderilmiş) konuşma listelenmez', () => {
    db.prepare(`INSERT INTO sosyal_mesajlar (platform,tur,harici_id,konu_id,gonderen_ad,metin,yon,mesaj_tarihi)
      VALUES ('instagram','dm','aWdfZ_gercek_1','K1','bahattinyaseminozturk','','giden','2026-09-09T07:28:18+0000')`).run()
    _upsertMesaj(yerelKart())
    expect(konusmalar({ platform: 'instagram' })).toHaveLength(0)
  })

  test('son mesaj bizim kart kaydımız olsa da ad son GELEN mesajın göndereni, "Otomasyon (kart)" DEĞİL', () => {
    _upsertMesaj(gelen())
    _upsertMesaj(yerelKart())
    const [k] = konusmalar({ platform: 'instagram' })
    expect(k.kisi).toBe('Havva')
    expect(k.son_metin).toBe('Fiyat: 8.155 TL')
  })

  test('gelen mesaj metinsiz ve eksizse liste satırında boş yerine açıklama görünür', () => {
    _upsertMesaj(gelen({ metin: '' }))
    expect(konusmalar({ platform: 'instagram' })[0].son_metin).toBe('(metinsiz içerik)')
  })
})
