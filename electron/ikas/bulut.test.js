// İmleç ilerletme KARARI. Ağdan ayrı tutuldu ki mock'suz test edilebilsin
// (emsal: ikas/kargo-durum.test.js).
//
// Neden bu kadar önemli: imleç yanlış ilerlerse ya olay kaybedilir (sipariş
// uygulamaya hiç düşmez) ya da aynı olaylar sonsuza dek yeniden işlenir.
import { describe, test, expect } from 'vitest'
import bulut from './bulut.js'

const { _yeniImlec: imlec } = bulut

describe('imleç ilerletme', () => {
  test('kayıt yoksa imleç OLDUĞU YERDE kalır', () => {
    // Boş turda imleci "şimdi"ye çekmek, tam o anda yazılmakta olan bir olayı
    // sonsuza dek atlamak demekti.
    expect(imlec([], '2026-07-30T10:00:00.000Z')).toBe('2026-07-30T10:00:00.000Z')
  })

  test('son kaydın damgasına ilerler', () => {
    const kayitlar = [
      { id: 1, alinma_zaman: '2026-07-30T10:00:01.000Z' },
      { id: 2, alinma_zaman: '2026-07-30T10:00:02.000Z' },
    ]
    expect(imlec(kayitlar, '2026-07-30T10:00:00.000Z')).toBe('2026-07-30T10:00:02.000Z')
  })

  test('geriye GİTMEZ', () => {
    // Worker sıralı döndürüyor ama bir gün bozulursa imleci geri almak
    // aynı olayları sonsuz döngüde yeniden işlemek olurdu.
    const kayitlar = [{ id: 1, alinma_zaman: '2026-07-30T09:00:00.000Z' }]
    expect(imlec(kayitlar, '2026-07-30T10:00:00.000Z')).toBe('2026-07-30T10:00:00.000Z')
  })

  test('undefined/null kayıt listesi imleci bozmaz', () => {
    // Worker beklenmedik bir cevap dönerse (ağ hatası, biçim değişikliği)
    // imlecin sıfırlanması tüm geçmiş olayların yeniden işlenmesi olurdu.
    expect(imlec(null, '2026-07-30T10:00:00.000Z')).toBe('2026-07-30T10:00:00.000Z')
    expect(imlec(undefined, '2026-07-30T10:00:00.000Z')).toBe('2026-07-30T10:00:00.000Z')
  })
})
