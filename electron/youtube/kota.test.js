import { describe, test, expect, beforeEach } from 'vitest'

// CJS destructure eden bagimliliklar vi.mock ile taklit edilemez; require.cache
// degistirilir (bkz. electron/db/fatura-stok-kaydet.test.js, ayni gerekce).
const depo = { satirlar: {} } // gun -> birim

const dbPath = require.resolve('../db/database')
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: {
    getDb: () => ({
      prepare: (sql) => ({
        get: (gun) => (depo.satirlar[gun] === undefined ? undefined : { birim: depo.satirlar[gun] }),
        run: (gun, birim) => {
          if (!sql.includes('INSERT')) throw new Error('beklenmeyen sorgu: ' + sql)
          depo.satirlar[gun] = (depo.satirlar[gun] || 0) + birim
        },
      }),
    }),
  },
}

const kota = require('./kota')

beforeEach(() => { depo.satirlar = {} })

describe('pasifikGun — kotanin sifirlandigi gun', () => {
  // Kota Pasifik gece yarisi sifirlanir. YEREL tarihe gore saymak, Turkiye
  // aksami yapilan yuklemeleri YANLIS gune yazar (TR, Pasifik'ten 10 saat ileride).
  test('YYYY-MM-DD bicimi dondurur', () => {
    expect(kota.pasifikGun(new Date('2026-09-05T12:00:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('TR aksami hala ONCEKI Pasifik gunudur', () => {
    // 5 Eylul 23:00 TR = 5 Eylul 13:00 Pasifik → hala 05'i.
    expect(kota.pasifikGun(new Date('2026-09-05T20:00:00Z'))).toBe('2026-09-05')
  })

  test('UTC gun donumu Pasifik gununu HENUZ dondurmez', () => {
    // 6 Eylul 02:00 UTC = 5 Eylul 19:00 Pasifik → kota hala 5 Eylul'un.
    expect(kota.pasifikGun(new Date('2026-09-06T02:00:00Z'))).toBe('2026-09-05')
  })
})

describe('6 video aritmetigi — isin can damari', () => {
  const gun = () => kota.pasifikGun()

  test('bos sayacta 6 video sigar, 7. sigmaz', () => {
    expect(kota.yeterMi('videos.insert', 6).yeter).toBe(true)
    expect(kota.yeterMi('videos.insert', 7).yeter).toBe(false)
  })

  test('6 video yuklendikten sonra 7. RED edilir', () => {
    depo.satirlar[gun()] = 6 * 1600 // 9600
    expect(kota.yeterMi('videos.insert').yeter).toBe(false)
    expect(() => kota.kotaKontrol('videos.insert')).toThrow(/kotası yetmiyor/)
  })

  test('5 video sonrasi 6. hala kabul edilir (sinirda kesilmez)', () => {
    depo.satirlar[gun()] = 5 * 1600 // 8000, kalan 2000 >= 1600
    expect(kota.yeterMi('videos.insert').yeter).toBe(true)
  })

  test('kota dolunca hata kod "kota" tasir ve KAC video kaldigini soyler', () => {
    depo.satirlar[gun()] = 9600
    let e
    try { kota.kotaKontrol('videos.insert') } catch (err) { e = err }
    expect(e.kod).toBe('kota')
    expect(e.message).toContain('0 video')
  })

  test('6 video dolduktan sonra bile videos.update (50 birim) gecer', () => {
    // Kritik: yukleme kotasi bitse de metin duzeltmesi yapilabilmeli.
    depo.satirlar[gun()] = 9600
    expect(kota.yeterMi('videos.update').yeter).toBe(true)
    expect(() => kota.kotaKontrol('videos.update')).not.toThrow()
  })
})

describe('harca — sayac birikimi', () => {
  test('harcama gune yazilir ve birikir', () => {
    kota.harca('videos.insert')
    expect(kota.harcanan()).toBe(1600)
    kota.harca('videos.insert')
    expect(kota.harcanan()).toBe(3200)
  })

  test('farkli operasyonlar dogru bedelle yazilir', () => {
    kota.harca('channels.list')   // 1
    kota.harca('videos.update')   // 50
    expect(kota.harcanan()).toBe(51)
  })

  test('bilinmeyen operasyon sayaci kirletmez', () => {
    kota.harca('olmayan.operasyon')
    expect(kota.harcanan()).toBe(0)
  })
})

describe('durum — arayuz ozeti', () => {
  test('bos sayacta 6 video hakki bildirir', () => {
    expect(kota.durum()).toMatchObject({ harcanan: 0, kalan: 10000, kalan_video: 6 })
  })

  test('3 video sonrasi 3 hak kalir', () => {
    depo.satirlar[kota.pasifikGun()] = 3 * 1600
    expect(kota.durum()).toMatchObject({ harcanan: 4800, kalan_video: 3 })
  })

  test('kalan asla negatif gorunmez', () => {
    depo.satirlar[kota.pasifikGun()] = 99999
    const d = kota.durum()
    expect(d.kalan).toBe(0)
    expect(d.kalan_video).toBe(0)
  })
})
