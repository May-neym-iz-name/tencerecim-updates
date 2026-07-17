// UPS StatusCode → uygulama durumu eşlemesi.
// Kodlar docs/ups-api-reference.md §1'den; 2 = tek gerçek teslim kodu.
// Canlı doğrulandı (2026-07-17): teslim edilmiş 8 gönderinin 8'i de StatusCode=2 döndü.
import { describe, test, expect } from 'vitest'
import takip from './takip.js'

const { _durumCevir: durumCevir } = takip

describe('durumCevir', () => {
  test('kod 2 = TESLİM (tek gerçek teslim kodu)', () => {
    expect(durumCevir(2)).toEqual({ durum: 'teslim', gonderildi: true })
  })

  test('kod 1 (GİRİŞ SCAN EDİLDİ) = gönderildi — kullanıcının beklediği an', () => {
    expect(durumCevir(1)).toEqual({ durum: 'gonderildi', gonderildi: true })
  })

  test('kod 13 (TRACKING NUMBER NOT FOUND) = ağda değil, gönderilmedi', () => {
    // Etiket kesilmiş ama koli UPS ağına girmemiş. Hata DEĞİL, anlamlı sinyal.
    expect(durumCevir(13)).toEqual({ durum: 'yok', gonderildi: false })
  })

  test('kod 3 (ÖZEL DURUM) = ağda, gönderilmiş sayılır ama ayrı işaretlenir', () => {
    expect(durumCevir(3)).toEqual({ durum: 'ozel', gonderildi: true })
  })

  test.each([4, 6, 7, 12, 16, 31, 32, 33, 36, 37, 38])(
    'ağ-içi ara kod %i = gönderildi', (kod) => {
      expect(durumCevir(kod).gonderildi).toBe(true)
      expect(durumCevir(kod).durum).toBe('gonderildi')
    })

  test('bilinmeyen YENİ bir ara kod da gönderildi sayılır (ileriye dönük güvenli)', () => {
    // Kural "bulunduysa ağdadır" olduğu için UPS yeni kod eklerse doğru tarafta kalır.
    expect(durumCevir(99).gonderildi).toBe(true)
  })

  test('null / boş / sayı olmayan = ağda değil (çökmez)', () => {
    expect(durumCevir(null).gonderildi).toBe(false)
    expect(durumCevir('').gonderildi).toBe(false)
    expect(durumCevir(undefined).gonderildi).toBe(false)
    expect(durumCevir('abc').gonderildi).toBe(false)
  })

  test('string gelen kodlar da çalışır (SOAP metin döner)', () => {
    // trackLast StatusCode'u XML'den metin olarak okur — '2' ile 2 aynı olmalı.
    expect(durumCevir('2')).toEqual({ durum: 'teslim', gonderildi: true })
    expect(durumCevir('13')).toEqual({ durum: 'yok', gonderildi: false })
  })
})
