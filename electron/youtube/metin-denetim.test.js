import { describe, it, expect } from 'vitest'
import { katla, yasakBul, denetle, ozet } from './metin-denetim.js'

describe('katla — Turkce harf katlamasi', () => {
  it('buyuk I ve İ harflerini dogru katlar', () => {
    // Duz toLowerCase() 'I' -> 'i' yapar; o zaman "ÇİZİLMEZ" kalibi kacar.
    expect(katla('ÇİZİLMEZ')).toBe('çizilmez')
    expect(katla('IRMAK')).toBe('ırmak')
  })
})

describe('yasakBul — GERCEK vakalar (2026-09-07 uretimi)', () => {
  it('"Çizilmez ve Yapışmaz Hibrit Teknoloji" basligini yakalar', () => {
    const b = yasakBul('Maxx Doria Steel Fusion 28 cm Krep Tava - Çizilmez ve Yapışmaz Hibrit Teknoloji')
    expect(b.map(x => x.ifade)).toContain('çizilmez')
    expect(b).toHaveLength(1) // YAPISMAZ yakalanmamali
  })

  it('"Patlama Riski Olmayan Tasarım" guvenlik iddiasini yakalar', () => {
    const b = yasakBul('Gülsan 24 cm Vakumlu Derin Tencere - Patlama Riski Olmayan Tasarım')
    expect(b.some(x => x.sinif === 'guvenlik')).toBe(true)
  })

  it('"Çizilme ve Yapışma Yapmaz" DOLAYLI kalibini yakalar', () => {
    // Ilk listeyi asti: kalip fiile degil sifata bakiyordu. Iddia ayni.
    expect(yasakBul('Maxx Doria ... - Çizilme ve Yapışma Yapmaz').length).toBeGreaterThan(0)
    expect(yasakBul('Çizilme yapmayan yüzey').length).toBeGreaterThan(0)
  })

  it('"yapışma yapmaz" TEK BASINA serbest — yapismazlik mesru terim', () => {
    expect(yasakBul('Yüzeyi yapışma yapmaz, az yağla pişirir')).toEqual([])
  })

  it('"Kararmaz, leke tutmaz ve koku yapmaz" ucunu birden yakalar', () => {
    // Bu cumle ILK yasak listesini asti (07.09) — liste, model her yeni
    // ifade uydurdugunda buyumek zorunda.
    const b = yasakBul('Kararmaz, leke tutmaz ve koku yapmaz çelik yapısıyla')
    expect(b).toHaveLength(3)
  })

  it('"asla" kesinlik zarfini yakalar', () => {
    expect(yasakBul('Bu kase asla paslanmaz').some(x => x.sinif === 'kesinlik')).toBe(true)
  })
})

describe('yasakBul — MESRU terimler yakalanmamali', () => {
  // En buyuk risk yanlis alarm: bu iki terim mutfak urununde ZORUNLU kelimeler.
  // Yasak listesi '-maz' EKINE gore yazilsaydi ikisi de yanardi.
  it('"paslanmaz çelik" MALZEME ADIDIR, iddia degil', () => {
    expect(yasakBul('18/10 paslanmaz çelik karıştırma kabı')).toEqual([])
  })

  it('"yapışmaz yüzey" sektorun STANDART terimidir', () => {
    expect(yasakBul('Granit yapışmaz yüzey, az yağla pişirme')).toEqual([])
  })

  it('"paslanmaz" icindeki "asla" YANLIS ALARM vermez', () => {
    // pa-SLA-nmaz: sozcuk siniri olmayan bir kalip burada yanar. 07.09'da
    // elle yapilan hizli tarama tam bu yuzden yanlis rapor uretti.
    expect(yasakBul('18/10 paslanmaz çelik')).toEqual([])
  })

  it('"yer kaplamaz" mekansal bir OLGUDUR, iddia degil', () => {
    expect(yasakBul('İç içe geçen tasarımı sayesinde yer kaplamaz')).toEqual([])
  })

  it('olculu ifadeler serbest', () => {
    expect(yasakBul('Çizilmeye dayanıklı, yüksek ısıya dayanıklı, uzun ömürlü')).toEqual([])
    expect(yasakBul('2 yıl garantili, 24 cm çap, 6,75 litre')).toEqual([])
  })
})

describe('denetle', () => {
  it('temiz metni temiz sayar', () => {
    const r = denetle({
      baslik: 'Sofram Soft 30 cm Yayvan Tencere',
      aciklama: '6,75 litre hacim, paslanmaz çelik gövde.',
      etiketler: ['tencere', 'sofram'],
    })
    expect(r.temiz).toBe(true)
    expect(r.bulgular).toEqual([])
  })

  it('hangi ALANDA ihlal oldugunu soyler', () => {
    const r = denetle({ baslik: 'Çizilmez tava', aciklama: 'Normal metin', etiketler: [] })
    expect(r.temiz).toBe(false)
    expect(r.bulgular[0].alan).toBe('baslik')
  })

  it('ETIKETLERI de denetler — etiket de yayinlanan metindir', () => {
    const r = denetle({ baslik: 'Tava', aciklama: 'Metin', etiketler: ['mükemmel', 'tava'] })
    expect(r.temiz).toBe(false)
    expect(r.bulgular[0].alan).toBe('etiketler')
  })

  it('birden fazla ihlali TOPLUCA raporlar', () => {
    const r = denetle({
      baslik: 'Çizilmez ve kırılmaz tava',
      aciklama: 'Türkiye\'nin en iyi ürünü, %100 zararsız.',
      etiketler: [],
    })
    expect(r.bulgular.length).toBeGreaterThanOrEqual(4)
    expect(ozet(r.bulgular)).toContain('→')
  })
})
