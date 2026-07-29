// UPS iptalinde "zaten iptal edilmiş" yanıtı BAŞARI sayılmalı (idempotent iptal).
// Gerçek olay (2026-07-29): 1Z2BH3226800003202 UPS'te iptal edilmişti; uygulama
// tekrar iptal deneyince kod 4 aldı, fırlattı ve YEREL kaydı hiç güncellemedi →
// gönderi "İptal" sekmesine asla düşmedi, kullanıcı kilitlendi.
import { describe, test, expect } from 'vitest'
import soap from './soap.js'

const { _zatenIptalMi: zatenIptalMi } = soap

describe('zatenIptalMi', () => {
  test("UPS'in kendi yazımıyla (shiptment yazım hatası dahil) yakalar", () => {
    expect(zatenIptalMi('4', 'The shiptment has already been canceled')).toBe(true)
  })

  test('doğru yazılmış hali de yakalanır', () => {
    expect(zatenIptalMi('4', 'The shipment has already been cancelled')).toBe(true)
  })

  test('Türkçe karşılığı da yakalanır', () => {
    expect(zatenIptalMi('4', 'Gönderi zaten iptal edilmiş')).toBe(true)
  })

  test('büyük/küçük harf ve boşluk farkı önemsiz', () => {
    expect(zatenIptalMi('4', '  THE SHIPMENT HAS ALREADY BEEN CANCELED  ')).toBe(true)
  })

  test('başarı (kod 0) bu yolu hiç kullanmaz', () => {
    expect(zatenIptalMi('0', '')).toBe(false)
  })

  test('BAŞKA hatalar başarı sayılMAZ — sessizce yutulmamalı', () => {
    expect(zatenIptalMi('7', 'Token cannot be null')).toBe(false)
    expect(zatenIptalMi('12', 'Waybill number not found')).toBe(false)
    expect(zatenIptalMi('4', 'Customer code is invalid')).toBe(false)
  })

  test('açıklama boş/null gelirse yalnız koda bakıp başarı sayMAZ', () => {
    // Kod 4 tek başına kanıt değil: UPS kod tablosu belgelenmemiş (ups-api-reference.md).
    expect(zatenIptalMi('4', '')).toBe(false)
    expect(zatenIptalMi('4', null)).toBe(false)
  })
})
