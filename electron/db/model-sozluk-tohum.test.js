import { describe, it, expect } from 'vitest'
const { adaylar, adayMi, DURAK } = require('./model-sozluk-tohum')

// Eşik varsayılanı 3: bir kelimenin model sayılması için markada en az 3 üründe geçmeli.
const kez = (ad, n) => Array.from({ length: n }, (_, i) => `${ad} ${i}`)

describe('model adayı olma kuralları', () => {
  it('3 harften kısa token aday değil', () => {
    expect(adayMi('s')).toBe(false)
    expect(adayMi('xl')).toBe(false)
    expect(adayMi('folk')).toBe(true)
  })

  it('rakam İÇEREN token aday değil — Lava adlarındaki "c28" kodu ÇAP bilgisidir, model değil', () => {
    expect(adayMi('c28')).toBe(false)
    expect(adayMi('28')).toBe(false)
    expect(adayMi('x20')).toBe(false)
  })

  it('tip/biçim/renk/ölçü/malzeme kelimeleri aday değil', () => {
    for (const k of ['tencere', 'yuvarlak', 'siyah', 'parca', 'granit'])
      expect(adayMi(k)).toBe(false)
  })

  it('BASIK = PİLAV = YAYVAN — üçü de biçimdir, model sayılmaz', () => {
    for (const k of ['basik', 'pilav', 'yayvan']) expect(DURAK.has(k)).toBe(true)
  })

  it('"matik" bir düdüklü TİPİdir (Matik Düdüklüler kategorisi), model değil', () => {
    expect(adayMi('matik')).toBe(false)
  })
})

describe('marka adının dışlanması', () => {
  // Spec'in ölçüm dürüstlüğü notu: ilk ölçüm %97,8 vermişti ve YANLIŞTI — sözlüğe
  // markanın kendi adı girmiş, eşleşme modeli değil MARKAYI yakalıyordu.
  it('markanın kendi adı ASLA model adayı olmaz', () => {
    const adlar = kez('SOFRAM VENÜS TENCERE', 5)
    const a = adaylar(adlar, 'SOFRAM').map(x => x.model_adi)
    expect(a).toContain('venus')
    expect(a).not.toContain('sofram')
  })

  it('çok kelimeli marka adının HER kelimesi dışlanır', () => {
    const adlar = kez('MAXX DORIA RIGEL TAVA', 5)
    const a = adaylar(adlar, 'MAXX DORIA').map(x => x.model_adi)
    expect(a).toEqual(['rigel'])
  })

  it('marka adı Türkçe harfli olsa da dışlanır (LİNES/LINES tuzağı)', () => {
    const a = adaylar(kez('LINES OSCAR TENCERE', 5), 'LİNES').map(x => x.model_adi)
    expect(a).not.toContain('lines')
    expect(a).toContain('oscar')
  })
})

describe('eşik', () => {
  it('eşiğin altında kalan kelime aday değil', () => {
    const adlar = [...kez('LAVA FOLK TENCERE', 2), ...kez('LAVA GLAZE TENCERE', 5)]
    expect(adaylar(adlar, 'LAVA').map(x => x.model_adi)).toEqual(['glaze'])
  })

  it('geçiş sayısı ÜRÜN sayısıdır — aynı adda iki kez geçen kelime BİR sayılır', () => {
    // Eşik anlamını yitirmesin: tek bir üründe 3 kez geçen kelime model olmamalı.
    expect(adaylar(['LAVA FOLK FOLK FOLK TENCERE'], 'LAVA')).toEqual([])
  })

  it('geçiş sayısı doğru raporlanır', () => {
    const a = adaylar(kez('LAVA FOLK TENCERE', 4), 'LAVA')
    expect(a).toEqual([{ model_adi: 'folk', gecis: 4 }])
  })
})

describe('sıralama ve kararlılık', () => {
  it('geçişe göre azalan, eşitlikte ad sırası', () => {
    const adlar = [...kez('LAVA FOLK TENCERE', 5), ...kez('LAVA SABLE TENCERE', 3), ...kez('LAVA GLAZE TENCERE', 3)]
    expect(adaylar(adlar, 'LAVA').map(x => x.model_adi)).toEqual(['folk', 'glaze', 'sable'])
  })

  it('ürün sırası sonucu değiştirmez', () => {
    const adlar = [...kez('LAVA FOLK TENCERE', 4), ...kez('LAVA GLAZE TENCERE', 4)]
    expect(adaylar(adlar, 'LAVA')).toEqual(adaylar([...adlar].reverse(), 'LAVA'))
  })

  it('boş girdi çökmez', () => {
    expect(adaylar([], 'LAVA')).toEqual([])
    expect(adaylar(['TENCERE'], '')).toEqual([])
  })
})
