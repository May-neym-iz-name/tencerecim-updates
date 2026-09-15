import { describe, it, expect } from 'vitest'
import {
  bandSec, kareEnerjisi, enerjileriBirlestir, suzgecKur,
  SERIT_YUK, ARAMA_UST, ARAMA_ALT, SHORTS_TABAN,
} from './yazi-goml.js'

/** Belirtilen satirlari "dolu" yapan sahte enerji dizisi uretir. */
function enerji(doluAraliklar, deger = 0.5) {
  const e = new Float64Array(1280)
  for (const [a, b] of doluAraliklar) for (let y = a; y <= b; y++) e[y] = deger
  return e
}

describe('bandSec — serit icin en sakin bandi bulur', () => {
  it('altyazi bandindan KACAR', () => {
    // Instagram altyazisi 880-960 arasinda; serit oraya basilmamali.
    const { y } = bandSec(enerji([[880, 960]]))
    expect(y + SERIT_YUK <= 880 || y >= 961).toBe(true)
  })

  it('her sey esit sakinken EN ALTTAKI bandi secer', () => {
    // Kullanici yaziyi "altta" istedi: beraberlikte alt kazanir.
    const { y } = bandSec(new Float64Array(1280))
    expect(y).toBe(ARAMA_ALT)
  })

  it('secilen bant ARAMA penceresinin disina TASMAZ', () => {
    // Shorts arayuzu alti kapatir; seridin ALT kenari SHORTS_TABAN'i gecmemeli.
    const { y } = bandSec(enerji([[ARAMA_UST, ARAMA_ALT + SERIT_YUK]]))
    expect(y).toBeGreaterThanOrEqual(ARAMA_UST)
    expect(y).toBeLessThanOrEqual(ARAMA_ALT)
    expect(y + SERIT_YUK).toBeLessThanOrEqual(SHORTS_TABAN)
  })

  it('iki bos bant varsa daha SAKIN olani secer', () => {
    // 870-930 hafif dolu, 980-1040 tamamen bos -> alttaki secilmeli.
    const e = enerji([[860, 950]], 0.4)
    const { y } = bandSec(e)
    expect(y).toBeGreaterThan(950 - SERIT_YUK)
  })

  it('ters pencere verilirse HATA verir (sessizce yanlis bant secmez)', () => {
    expect(() => bandSec(new Float64Array(1280), { ust: 1000, alt: 900 })).toThrow()
  })
})

describe('kareEnerjisi — yatay kenar orani', () => {
  it('duz zeminde SIFIR verir', () => {
    const ham = new Uint8Array(720 * 1280).fill(128)
    const e = kareEnerjisi(ham, { baslangic: 900, bitis: 910 })
    expect(e[905]).toBe(0)
  })

  it('keskin kenarlari sayar', () => {
    const ham = new Uint8Array(720 * 1280).fill(0)
    // 905. satirda her ikinci piksel beyaz -> her pikselde kenar
    for (let x = 0; x < 720; x += 2) ham[905 * 720 + x] = 255
    const e = kareEnerjisi(ham, { baslangic: 900, bitis: 910 })
    expect(e[905]).toBeGreaterThan(0.9)
    expect(e[904]).toBe(0)
  })
})

describe('enerjileriBirlestir — bir an bile doluysa DOLU', () => {
  it('karelerin en YUKSEGINI alir', () => {
    // Altyazi videonun yalnizca bir aninda cikabilir; ortalama alsaydik kacardi.
    const a = new Float64Array(1280); a[900] = 0.8
    const b = new Float64Array(1280); b[900] = 0.0
    expect(enerjileriBirlestir([a, b])[900]).toBe(0.8)
  })
})

describe('suzgecKur — ffmpeg tuzaklari', () => {
  const s = suzgecKur(1000, 'C:/gecici/yazi.txt')

  it("Windows yolundaki ':' karakterini kacirir", () => {
    // ffmpeg suzgec dizgisinde kacirilmamis ':' alan ayiricisidir.
    expect(s).toContain('C\\:/Windows/Fonts/ariblk.ttf')
    expect(s).toContain('C\\:/gecici/yazi.txt')
  })

  it('expansion=none kullanir', () => {
    // Yoksa drawtext '%' gordugunde yaziyi HIC basmaz ("Stray %").
    expect(s).toContain('expansion=none')
  })

  it('fontfile kullanir, font= KULLANMAZ', () => {
    // Bu makinede fontconfig yok; font= SEGFAULT verir.
    expect(s).toContain('fontfile=')
    expect(s).not.toMatch(/[,:]font=/)
  })

  it('yaziyi metin dosyasindan alir (kacis derdi yok)', () => {
    expect(s).toContain('textfile=')
  })
})
