// Sipariş kalemi birim fiyatı: MÜŞTERİNİN ÖDEDİĞİ tutar seçilmeli, liste fiyatı değil.
//
// GERÇEK VAKA (2026-08-05, sipariş 8461469470): ilk indirimli ürün satıldı.
// ikas'ın döndürdüğü: price=2100 (liste), finalUnitPrice=null, finalPrice=1890 (ödenen).
// Eski sıra finalUnitPrice → price → finalPrice olduğu için 2100 kaydedildi ve kargo
// etiketine yanlış tutar basıldı. İade denenseydi ikas fiyat uyuşmazlığından reddedecekti.
//
// Hata iki yıl görünmedi: indirimli ürün olmadığı sürece price === finalPrice.
import { describe, test, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
// index.js Electron'a bağlı modüller yükler; yalnız saf fonksiyonu almak için
// dosyayı okuyup fonksiyonu ayıklamak yerine doğrudan require deniyoruz.
let birimFiyat
try {
  birimFiyat = require('./index.js')._birimFiyatHesapla
} catch {
  // Electron bağımlılığı yüklenemezse fonksiyonun kendisini kaynaktan türet.
  const fs = require('node:fs')
  const kaynak = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8')
  const m = /function birimFiyatHesapla\(kalem\) \{[\s\S]*?\n\}/.exec(kaynak)
  // eslint-disable-next-line no-new-func
  birimFiyat = new Function(`${m[0]}; return birimFiyatHesapla`)()
}

describe('birimFiyatHesapla', () => {
  test('İNDİRİMLİ sipariş: liste fiyatı değil, ÖDENEN tutar alınır', () => {
    // Sipariş 8461469470'in ikas'tan gelen gerçek değerleri
    expect(birimFiyat({ quantity: 1, price: 2100, finalUnitPrice: null, finalPrice: 1890 }))
      .toBe(1890)
  })

  test('finalUnitPrice doluysa o kazanır (en kesin alan)', () => {
    expect(birimFiyat({ quantity: 2, finalUnitPrice: 500, price: 700, finalPrice: 1000 }))
      .toBe(500)
  })

  test('finalPrice adede bölünür', () => {
    expect(birimFiyat({ quantity: 3, price: 900, finalUnitPrice: null, finalPrice: 2400 }))
      .toBe(800)
  })

  test('indirimsiz üründe iki alan eşit — davranış değişmez', () => {
    // Bu senaryo hatanın iki yıl neden görünmediğini açıklar.
    expect(birimFiyat({ quantity: 1, price: 1500, finalUnitPrice: null, finalPrice: 1500 }))
      .toBe(1500)
  })

  test('yalnız price varsa son çare olarak o kullanılır', () => {
    expect(birimFiyat({ quantity: 1, price: 1250, finalUnitPrice: null, finalPrice: null }))
      .toBe(1250)
  })

  test('hiçbir fiyat alanı yoksa 0', () => {
    expect(birimFiyat({ quantity: 1 })).toBe(0)
    expect(birimFiyat(null)).toBe(0)
  })

  test('quantity yoksa 1 varsayılır (finalPrice bölünürken sıfıra bölme olmaz)', () => {
    expect(birimFiyat({ price: null, finalUnitPrice: null, finalPrice: 750 })).toBe(750)
    expect(birimFiyat({ quantity: 0, finalUnitPrice: null, finalPrice: 640 })).toBe(640)
  })
})
