// Etiket boyut çözümü — hazır kodlar + Ayarlar'dan gelen özel "GENxYUK" ölçüleri.
import { describe, test, expect } from 'vitest'
import { boyutBul, ETIKET_BOYUTLARI, VARSAYILAN_BOYUT } from './barkod'

describe('boyutBul', () => {
  test('hazır kodlar aynen bulunur', () => {
    expect(boyutBul('40x20').genislik).toBe(40)
    expect(boyutBul(VARSAYILAN_BOYUT)).toBe(ETIKET_BOYUTLARI[0])
  })

  test('özel ölçü ("58x40") ayrıştırılır', () => {
    const b = boyutBul('58x40')
    expect(b.genislik).toBe(58)
    expect(b.yukseklik).toBe(40)
    expect(b.ad).toContain('özel')
  })

  test('bozuk/aşırı değer varsayılana döner', () => {
    expect(boyutBul('0x9999')).toBe(ETIKET_BOYUTLARI[0])
    expect(boyutBul('saçma')).toBe(ETIKET_BOYUTLARI[0])
    expect(boyutBul('')).toBe(ETIKET_BOYUTLARI[0])
    expect(boyutBul(null)).toBe(ETIKET_BOYUTLARI[0])
  })

  test('ondalıklı özel ölçü kabul edilir', () => {
    expect(boyutBul('57.5x32').genislik).toBe(57.5)
  })
})
