// Kaynakta artık görünmeyen yorumların işaretlenmesi (2026-09-07).
//
// Ölçülen sorun: kullanıcı YouTube'da bir yorumu SİLDİ, uygulamada görünmeye
// devam etti ve gelen kutusunda cevap bekleyen soru gibi sayıldı.
//
// En büyük risk DÜZELTMENİN KENDİSİ: "listede yok = silinmiş" kuralı, sayfa
// sınırına takılıp yarıda kalan bir çekimde binlerce yorumu birden siler.
// Bu yüzden süpürücü yalnız TAM taramada çalışır ve testlerin ilk işi bunu sabitlemek.
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
const { _upsertMesaj, _dbAyarla, _gorunmeyenleriIsaretle } = sosyal

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
    konu_id TEXT PRIMARY KEY, platform TEXT, baslik TEXT, gorsel TEXT, link TEXT, guncelleme TEXT
  );
`

const yorum = (f = {}) => ({
  platform: 'youtube', tur: 'yorum', harici_id: 'y1', konu_id: 'video1',
  gonderen_ad: 'Ayşe', metin: 'fiyat?', yon: 'gelen', mesaj_tarihi: '2026-09-06T10:00:00Z', ...f,
})
const silindiMi = (id) => db.prepare('SELECT silindi FROM sosyal_mesajlar WHERE harici_id = ?').get(id).silindi

beforeEach(() => { db = bellekDb(); db.exec(SEMA); _dbAyarla(db) })

describe('_gorunmeyenleriIsaretle', () => {
  test('YARIM taramada HICBIR SEYI silmez', () => {
    // En kritik güvence: tam=false iken hiçbir işaret konmaz. Aksi halde sayfa
    // sınırına takılan her çekim tüm arşivi silerdi.
    _upsertMesaj(yorum({ harici_id: 'y1' }))
    _upsertMesaj(yorum({ harici_id: 'y2' }))
    const r = _gorunmeyenleriIsaretle('youtube', new Set(['y1']), false)
    expect(r).toEqual({ isaretlenen: 0, geriGelen: 0 })
    expect(silindiMi('y2')).toBe(0)
  })

  test('TAM taramada gorunmeyeni isaretler, goruneni birakir', () => {
    _upsertMesaj(yorum({ harici_id: 'y1' }))
    _upsertMesaj(yorum({ harici_id: 'y2' }))
    const r = _gorunmeyenleriIsaretle('youtube', new Set(['y1']), true)
    expect(r.isaretlenen).toBe(1)
    expect(silindiMi('y1')).toBe(0)
    expect(silindiMi('y2')).toBe(1)
  })

  test('satiri SILMEZ — geri gelirse isaret kalkar (yanlis pozitif kendini onarir)', () => {
    _upsertMesaj(yorum({ harici_id: 'y1' }))
    _gorunmeyenleriIsaretle('youtube', new Set(), true)
    expect(silindiMi('y1')).toBe(1)
    const r = _gorunmeyenleriIsaretle('youtube', new Set(['y1']), true)
    expect(r.geriGelen).toBe(1)
    expect(silindiMi('y1')).toBe(0)
  })

  test('BASKA PLATFORMUN yorumlarina dokunmaz', () => {
    // YouTube taramasi Instagram arsivini silmemeli.
    _upsertMesaj(yorum({ harici_id: 'ig1', platform: 'instagram' }))
    _gorunmeyenleriIsaretle('youtube', new Set(), true)
    expect(silindiMi('ig1')).toBe(0)
  })

  test('DM satirlarina dokunmaz — supurucu yalniz yorumlar icin', () => {
    _upsertMesaj(yorum({ harici_id: 'd1', tur: 'dm' }))
    _gorunmeyenleriIsaretle('youtube', new Set(), true)
    expect(silindiMi('d1')).toBe(0)
  })
})

describe('silinen yorum ARAYUZE sizmaz', () => {
  test('konu() silinmis yorumu dondurmez', () => {
    _upsertMesaj(yorum({ harici_id: 'y1', metin: 'duruyor' }))
    _upsertMesaj(yorum({ harici_id: 'y2', metin: 'silindi' }))
    _gorunmeyenleriIsaretle('youtube', new Set(['y1']), true)
    const satirlar = sosyal['sosyal:konu']('video1')
    expect(satirlar.map(s => s.metin)).toEqual(['duruyor'])
  })

  test('sekme sayaci silinmis yorumu SAYMAZ', () => {
    _upsertMesaj(yorum({ harici_id: 'y1' }))
    _upsertMesaj(yorum({ harici_id: 'y2' }))
    expect(sosyal['sosyal:sayaclar']().yt_yorum).toBe(2)
    _gorunmeyenleriIsaretle('youtube', new Set(['y1']), true)
    expect(sosyal['sosyal:sayaclar']().yt_yorum).toBe(1)
    expect(sosyal['sosyal:sayac']()).toBe(1)
  })

  test('gonderi listesindeki yorum sayisi da duser', () => {
    // Aksi halde listede "2 yorum" yazar, acilinca 1 yorum gorunurdu.
    _upsertMesaj(yorum({ harici_id: 'y1' }))
    _upsertMesaj(yorum({ harici_id: 'y2' }))
    _gorunmeyenleriIsaretle('youtube', new Set(['y1']), true)
    const g = sosyal['sosyal:gonderiler']({ platform: 'youtube' })
    expect(g).toHaveLength(1)
    expect(g[0].yorum_sayisi).toBe(1)
  })
})
