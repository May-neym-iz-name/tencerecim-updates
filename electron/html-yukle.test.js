// Geçici HTML dosyasının ADI, "Microsoft Print to PDF" kaydetme kutusuna önerilen
// dosya adına dönüşür — bu yüzden ad üretimi test edilir.
import { describe, test, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { _dosyaAdi } = require('./html-yukle.js')

describe('_dosyaAdi', () => {
  test('anlamlı kök verilince onu kullanır (adsız zaman damgası değil)', () => {
    expect(_dosyaAdi('Kargo-Etiketi-SIP-123')).toBe('Kargo-Etiketi-SIP-123.html')
  })

  test('Windows yasak karakterleri atılır, boşluk tireye döner', () => {
    expect(_dosyaAdi('Kargo/Etiket: "SIP 9?"')).toBe('KargoEtiket-SIP-9.html')
  })

  test('Türkçe harfler korunur', () => {
    expect(_dosyaAdi('Kargo Etiketi ŞİĞÜÖÇ')).toBe('Kargo-Etiketi-ŞİĞÜÖÇ.html')
  })

  test('kök boşsa benzersiz yedek ada düşer (çakışma olmasın)', () => {
    const a = _dosyaAdi('')
    expect(a.startsWith('tnc-yazdir-')).toBe(true)
    expect(a).not.toBe(_dosyaAdi(null))
  })
})
