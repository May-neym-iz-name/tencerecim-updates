// IG DM telafi imleci (13.09.2026). Gerçek kayıp: 12.09 18:46 → 13.09 21:09 arası
// 26 saat hiç gelen mesaj yoktu çünkü imleç yoktu ve kapalılık sonrası geri tarama yoktu.
import { describe, test, expect } from 'vitest'
const { imlecIlerlet, yeniMesajVarMi, telafiTakipci } = await import('./ig-imlec.js')

// Meta'nın iki gerçek biçimi: IG '+0000' ekli, bizim yazdıklarımız 'Z' ekli.
const M = (t) => ({ id: 'm' + t, created_time: t })
const ESKI = '2026-09-12T15:46:32+0000'
const YENI = '2026-09-13T18:22:12+0000'

describe('imlecIlerlet', () => {
  test('en yeni mesaj tarihini ISO olarak döner', () => {
    expect(imlecIlerlet(null, [M(ESKI), M(YENI)])).toBe(new Date(YENI).toISOString())
  })

  test('mevcut imleç daha yeniyse GERİ gitmez', () => {
    expect(imlecIlerlet(YENI, [M(ESKI)])).toBe(YENI)
  })

  test('boş liste imleci bozmaz', () => {
    expect(imlecIlerlet(YENI, [])).toBe(YENI)
    expect(imlecIlerlet(YENI, undefined)).toBe(YENI)
  })

  test('çözülemeyen tarih imleci bozmaz', () => {
    expect(imlecIlerlet(ESKI, [{ created_time: 'bozuk' }, { }])).toBe(ESKI)
  })

  test('iki biçimi (+0000 ve Z) doğru karşılaştırır', () => {
    // Aynı an, farklı yazım: ilerleme OLMAMALI.
    const z = new Date(YENI).toISOString()
    expect(imlecIlerlet(z, [M(YENI)])).toBe(z)
  })
})

describe('yeniMesajVarMi', () => {
  test('imleçten sonraki mesajı görür', () => {
    expect(yeniMesajVarMi([M(YENI)], ESKI)).toBe(true)
  })

  test('hepsi imleçten eskiyse false', () => {
    expect(yeniMesajVarMi([M(ESKI)], YENI)).toBe(false)
  })

  test('imleç yoksa (ilk kurulum) her konuşma yeni sayılır', () => {
    expect(yeniMesajVarMi([M(ESKI)], null)).toBe(true)
  })

  test('imlece EŞİT tarih yeni sayılmaz (aynı mesajı sonsuz döngüye sokmaz)', () => {
    expect(yeniMesajVarMi([M(YENI)], YENI)).toBe(false)
  })
})

describe('telafiTakipci', () => {
  test('üst üste 3 eski konuşmadan sonra durur', () => {
    const t = telafiTakipci({ imlec: YENI })
    expect(t.kaydet([M(ESKI)])).toBe(false)
    expect(t.kaydet([M(ESKI)])).toBe(false)
    expect(t.kaydet([M(ESKI)])).toBe(true)
  })

  test('araya giren YENİ konuşma sayacı sıfırlar — tarama devam eder', () => {
    const t = telafiTakipci({ imlec: ESKI })
    t.kaydet([M(ESKI)])
    t.kaydet([M(ESKI)])
    expect(t.kaydet([M(YENI)])).toBe(false) // sıfırlandı
    expect(t.kaydet([M(ESKI)])).toBe(false)
    expect(t.kaydet([M(ESKI)])).toBe(false)
    expect(t.kaydet([M(ESKI)])).toBe(true)
  })

  test('hep yeni gelse bile tavanda durur (tur saatlerce sürmesin)', () => {
    const t = telafiTakipci({ imlec: ESKI, maxKonusma: 4 })
    expect(t.kaydet([M(YENI)])).toBe(false)
    expect(t.kaydet([M(YENI)])).toBe(false)
    expect(t.kaydet([M(YENI)])).toBe(false)
    expect(t.kaydet([M(YENI)])).toBe(true)
    expect(t.bakilan).toBe(4)
  })

  test('imleç yokken tavana kadar iner (ilk kurulum)', () => {
    const t = telafiTakipci({ imlec: null, maxKonusma: 2 })
    expect(t.kaydet([M(ESKI)])).toBe(false)
    expect(t.kaydet([M(ESKI)])).toBe(true)
  })
})
