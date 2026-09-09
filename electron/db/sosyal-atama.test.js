// Temsilcinin yorumdan başlattığı konuşma DM'de bulunur + atama konuşmaya yayılır (09.09.2026).
//
// Kullanıcı: "mesaj gönderiyorum ama sonra gönderdiğim mesajı DM'de bulamıyorum" ve "yoruma
// atama yapılınca DM'de de o kullanıcıya atansın". Sabitlenenler:
//   1. Yalnız otomasyon kartı olan konuşma listelenmez; temsilcinin elle gönderdiği mesaj
//      (cevaplayan_kullanici dolu) olan konuşma müşteri hiç yazmasa da listelenir.
//   2. ata({id}) yorumun ozel_mesaj_alici'siyle eşleşen DM konuşmasını da atar; boş kullanıcı
//      atamayı iki yerden de kaldırır; başkasına atanmış konuşmanın üstüne yazmaz.
import { describe, test, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

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
// sosyal:ata IPC kanalı sosyal_medya_yonet ister (09.09 güvenlik katmanı) → test profili.
// AYNI modül örneği için CJS require (ESM import ayrı kopya verir, profil oraya yazılırdı).
const yetki = require('../yetki.js')
const { _upsertMesaj, _dbAyarla } = sosyal
const konusmalar = sosyal['sosyal:konusmalar']
const ata = sosyal['sosyal:ata']

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
const giden = (f = {}) => ({ platform: 'instagram', tur: 'dm', harici_id: 'g_' + Math.random(), konu_id: 'K1',
  gonderen_id: 'M1', gonderen_ad: 'havva', metin: 'Merhaba, sorunuz için teşekkürler', yon: 'giden',
  mesaj_tarihi: '2026-09-09T07:00:00.000Z', ...f })

beforeEach(() => { db = bellekDb(); db.exec(SEMA); _dbAyarla(db); yetki._profilYazTestIcin({ rol: 'super_admin', aktif: true }) })

describe('konuşma görünürlüğü', () => {
  test('yalnız otomasyon kartı (cevaplayan yok) → listelenmez', () => {
    _upsertMesaj(giden({ ek_tur: 'urun_karti', metin: 'Fiyat: 100 TL', gonderen_ad: 'Otomasyon (kart)' }))
    expect(konusmalar({ platform: 'instagram' })).toHaveLength(0)
  })
  test('temsilcinin yorumdan gönderdiği özel mesaj → müşteri yazmasa da listelenir', () => {
    _upsertMesaj(giden({ cevaplayan_kullanici: 'Ufuk' }))
    const l = konusmalar({ platform: 'instagram' })
    expect(l).toHaveLength(1)
    expect(l[0].kisi).toBe('havva')
    expect(l[0].son_metin).toBe('Merhaba, sorunuz için teşekkürler')
  })
  test('temsilcinin elle gönderdiği kart (cevaplayan dolu) → listelenir', () => {
    _upsertMesaj(giden({ ek_tur: 'urun_karti', metin: 'Fiyat: 100 TL', gonderen_ad: 'Ufuk (kart)', cevaplayan_kullanici: 'Ufuk' }))
    expect(konusmalar({ platform: 'instagram' })).toHaveLength(1)
  })
})

describe('ata() → DM konuşmasına yayılır', () => {
  function kur() {
    // Yorum (özel mesaj gitmiş, alıcı kimliği M1) + o müşteriyle DM konuşması
    db.prepare(`INSERT INTO sosyal_mesajlar (id, platform, tur, harici_id, konu_id, gonderen_ad, metin, yon, niyet, ozel_mesaj_alici)
      VALUES (1, 'instagram', 'yorum', 'y1', 'G1', 'havva', 'kargo var mı', 'gelen', 'soru', 'M1')`).run()
    _upsertMesaj(giden({ cevaplayan_kullanici: 'Ufuk' }))
    _upsertMesaj({ platform: 'instagram', tur: 'dm', harici_id: 'gelen1', konu_id: 'K1', gonderen_id: 'M1', gonderen_ad: 'havva', metin: 'var mı', yon: 'gelen', mesaj_tarihi: '2026-09-09T08:00:00.000Z' })
  }
  test('yorumu üstlenen temsilciye DM konuşması da atanır; bırakınca ikisi de boşalır', () => {
    kur()
    ata({ id: 1, kullanici: 'Ufuk' })
    expect(konusmalar({ platform: 'instagram' })[0].atanan).toBe('Ufuk')
    expect(konusmalar({ platform: 'instagram', atama: 'bana', kullanici: 'Ufuk' })).toHaveLength(1)
    ata({ id: 1, kullanici: '' })
    expect(konusmalar({ platform: 'instagram' })[0].atanan).toBeNull()
  })
  test('konuşma başkasına atanmışsa üstüne yazılmaz', () => {
    kur()
    db.prepare("UPDATE sosyal_mesajlar SET atanan_kullanici = 'Ayşe' WHERE tur = 'dm'").run()
    ata({ id: 1, kullanici: 'Ufuk' })
    expect(konusmalar({ platform: 'instagram' })[0].atanan).toBe('Ayşe')
    expect(db.prepare('SELECT atanan_kullanici a FROM sosyal_mesajlar WHERE id = 1').get().a).toBe('Ufuk')
  })
  test('özel mesaj hiç gitmemiş yorumda (alıcı kimliği yok) yalnız yorum atanır', () => {
    kur()
    db.prepare('UPDATE sosyal_mesajlar SET ozel_mesaj_alici = NULL WHERE id = 1').run()
    ata({ id: 1, kullanici: 'Ufuk' })
    expect(konusmalar({ platform: 'instagram' })[0].atanan).toBeNull()
  })
})
