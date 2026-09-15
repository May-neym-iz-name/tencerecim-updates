// IG profil fotoğrafı hız-sınırı koruması (15.09.2026).
// Gerçek olay: uygulama seviyesi sayacı %90'a çıkmıştı; tek kaynak avatar çekimiydi
// (gr:get:IGBusinessScopedID, 902 çağrı/24sa). Ölçüm: 7.306 gönderenin 3.660'ı
// (%50,1) hiç alınamıyor ve eski kod bunları 30 dakikada bir, bellekten, tekrar
// tekrar soruyordu.
import { describe, test, expect } from 'vitest'
const { sonrakiBekleme, denenebilirMi, butce, GUN_MS, BEKLEME_KADEMELERI } =
  await import('./profil-butce.js')

const SIMDI = Date.parse('2026-09-15T12:00:00.000Z')
const oncesi = (ms) => new Date(SIMDI - ms).toISOString()

describe('sonrakiBekleme', () => {
  test('artan kademe: 1 gün → 7 gün → 30 gün', () => {
    expect(sonrakiBekleme(1)).toBe(1 * GUN_MS)
    expect(sonrakiBekleme(2)).toBe(7 * GUN_MS)
    expect(sonrakiBekleme(3)).toBe(30 * GUN_MS)
  })

  test('kademe listesi bitince son kademede kalır, büyümeye devam etmez', () => {
    expect(sonrakiBekleme(9)).toBe(BEKLEME_KADEMELERI[BEKLEME_KADEMELERI.length - 1])
  })

  test('bozuk/sıfır deneme ilk kademeye düşer', () => {
    expect(sonrakiBekleme(0)).toBe(1 * GUN_MS)
    expect(sonrakiBekleme(undefined)).toBe(1 * GUN_MS)
  })
})

describe('denenebilirMi', () => {
  test('hiç denenmemiş kişi DENENİR', () => {
    expect(denenebilirMi(null, SIMDI)).toBe(true)
  })

  test('1 kez başarısız, 2 saat önce → BEKLETİLİR (eski hatanın ta kendisi)', () => {
    // Eski kod 30 dk sonra yeniden deniyordu; 902 çağrının kaynağı buydu.
    expect(denenebilirMi({ deneme: 1, son_deneme: oncesi(2 * 3600e3) }, SIMDI)).toBe(false)
  })

  test('1 kez başarısız, 25 saat önce → yeniden DENENİR', () => {
    expect(denenebilirMi({ deneme: 1, son_deneme: oncesi(25 * 3600e3) }, SIMDI)).toBe(true)
  })

  test('3 kez başarısız, 8 gün önce → hâlâ BEKLETİLİR (30 günlük kademe)', () => {
    expect(denenebilirMi({ deneme: 3, son_deneme: oncesi(8 * GUN_MS) }, SIMDI)).toBe(false)
  })

  test('3 kez başarısız, 31 gün önce → DENENİR — kalıcı engel YOK', () => {
    expect(denenebilirMi({ deneme: 3, son_deneme: oncesi(31 * GUN_MS) }, SIMDI)).toBe(true)
  })

  test('bozuk tarih kalıcı engele dönüşmez', () => {
    expect(denenebilirMi({ deneme: 2, son_deneme: 'abc' }, SIMDI)).toBe(true)
  })
})

describe('butce', () => {
  test('tavana kadar izin verir, sonra keser', () => {
    const b = butce({ tavan: 3 })
    for (let i = 0; i < 3; i++) {
      expect(b.izinVar(SIMDI)).toBe(true)
      b.dusur(SIMDI)
    }
    expect(b.izinVar(SIMDI)).toBe(false)
  })

  test('pencere kaydıkça yeniden izin verir (kayan 1 saat)', () => {
    const b = butce({ tavan: 2, pencereMs: 3600e3 })
    b.dusur(SIMDI)
    b.dusur(SIMDI)
    expect(b.izinVar(SIMDI)).toBe(false)
    // 61 dakika sonra eski damgalar pencereden düşer
    expect(b.izinVar(SIMDI + 61 * 60e3)).toBe(true)
  })

  test('başarısız çağrı da bütçeden düşer — sınırı tüketen çağrının kendisidir', () => {
    const b = butce({ tavan: 1 })
    b.dusur(SIMDI) // sonuç ne olursa olsun
    expect(b.izinVar(SIMDI)).toBe(false)
  })
})
