// Kupon havuzu: ikas'tan gelen kupon listesi + yerel dağıtım kaydı → verilecek kod.
// better-sqlite3 burada KULLANILAMAZ (Electron ABI); node:sqlite adaptörü (setler.test.js kalıbı).
import { describe, test, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const h = require('./kupon-havuz.js')

const K = (code, usageCount = 0) => ({ id: 'id_' + code, campaignId: 'c1', code, usageCount, usageLimit: 1, usageLimitPerCustomer: 1 })

describe('havuzdanSec (saf)', () => {
  test('kullanılmamış ve verilmemiş ilk kod seçilir', () => {
    expect(h.havuzdanSec([K('a', 1), K('b'), K('c')], ['b']).code).toBe('c')
  })
  test('hepsi kullanılmış/verilmişse null', () => {
    expect(h.havuzdanSec([K('a', 1), K('b')], ['b'])).toBeNull()
    expect(h.havuzdanSec([], [])).toBeNull()
  })
  test('havuzDurumu sayar', () => {
    expect(h.havuzDurumu([K('a', 1), K('b'), K('c'), K('d')], ['b', 'c']))
      .toEqual({ toplam: 4, kullanilmis: 1, verilmis: 2, bos: 1 })
  })
  test('MUTASYON KAPANI: verilmiş kod asla seçilmez', () => {
    for (let i = 0; i < 20; i++) expect(h.havuzdanSec([K('x')], ['x'])).toBeNull()
  })
})

function bellekDb() {
  const d = new DatabaseSync(':memory:')
  d.exec(h._SEMA)
  return { exec: (s) => d.exec(s), prepare: (s) => { const p = d.prepare(s); return { get: (...a) => p.get(...a), all: (...a) => p.all(...a), run: (...a) => p.run(...a) } } }
}

describe('dağıtım kaydı (DB)', () => {
  let db
  beforeEach(() => { db = bellekDb() })
  test('yaz → verilmisKodlar görür → sil → görmez', () => {
    const id = h.dagitimYaz(db, { kupon_id: 'k1', kupon_kodu: 'ABC', kampanya_id: 'c1', platform: 'instagram', konu_id: 'konu1', alici_id: 'u1', gonderen_kullanici: 'burak' })
    expect(h.verilmisKodlar(db, 'c1')).toEqual(['ABC'])
    expect(h.verilmisKodlar(db, 'c2')).toEqual([])
    expect(h.dagitimlar(db, 'c1')[0]).toMatchObject({ kupon_kodu: 'ABC', gonderen_kullanici: 'burak' })
    h.dagitimSil(db, id)
    expect(h.verilmisKodlar(db, 'c1')).toEqual([])
  })
  test('aynı kod ikinci kez yazılamaz (UNIQUE) — iki PC yarışının yerel kapısı', () => {
    h.dagitimYaz(db, { kupon_id: 'k1', kupon_kodu: 'ABC', kampanya_id: 'c1', platform: 'instagram', konu_id: 'a', alici_id: 'u', gonderen_kullanici: 'x' })
    expect(() => h.dagitimYaz(db, { kupon_id: 'k1', kupon_kodu: 'ABC', kampanya_id: 'c1', platform: 'instagram', konu_id: 'b', alici_id: 'v', gonderen_kullanici: 'y' }))
      .toThrow()
  })
})
