import { describe, it, expect } from 'vitest'
import {
  markaBul, skuNumaralari, aileHaritasi,
  kuyrukSirala, planDogrula, slotUret, slotAni,
} from './plan.js'

// Kısa yardımcı: test verisini okunur tutmak için.
function v(reel_kod, kalite, sku, urun) {
  return { reel_kod, kalite, sku, urun }
}

describe('markaBul', () => {
  it('markayı ürün adından okur, SKU önekinden değil', () => {
    // TNC.SET.00019 ürünü "SET" markası DEĞİL, Sofram markalıdır.
    expect(markaBul("Sofram 9'lu Çelik Kase Seti (12-32 cm)")).toBe('Sofram')
  })

  it('iki kelimeli markayı tanır', () => {
    // Türkçe büyük harf çevrimi 'i' -> 'İ' yapar; marka adı bozulmamalı.
    expect(markaBul('Maxx Doria Steel Fusion 10 Parça')).toBe('Maxx Doria')
  })

  it('Türkçe karakterli markayı tanır', () => {
    expect(markaBul('Gülsan 24 cm Vakumlu Derin Tencere')).toBe('Gülsan')
  })

  it('tanımadığı markaya DIGER der, uydurmaz', () => {
    expect(markaBul('Bilinmeyen Marka Tencere')).toBe('Diğer')
  })
})

describe('skuNumaralari', () => {
  it('bölü ile ayrılmış numaraları çıkarır', () => {
    expect([...skuNumaralari('TNC.FGR.00009/10/11')].sort((a, b) => a - b)).toEqual([9, 10, 11])
  })

  it('aralığı genişletir', () => {
    const s = skuNumaralari('TNC.SFR.00015-00033')
    expect(s.size).toBe(19)
    expect(s.has(15)).toBe(true)
    expect(s.has(33)).toBe(true)
    expect(s.has(14)).toBe(false)
  })

  it('tek numarayı okur', () => {
    expect([...skuNumaralari('TNC.MXD.00160')]).toEqual([160])
  })
})

describe('aileHaritasi', () => {
  it('numara kümesi kesişen aynı marka SKU’larını tek aileye toplar', () => {
    // FGR.00009/10/11 ∩ FGR.00011 = {11} → aynı Fagor ailesi.
    const h = aileHaritasi(['TNC.FGR.00009/10/11', 'TNC.FGR.00011'])
    expect(h.get('TNC.FGR.00009/10/11')).toBe(h.get('TNC.FGR.00011'))
  })

  it('aralık ile tek numarayı da birleştirir', () => {
    // SFR.00015-00033 aralığı 33'ü kapsar → SFR.00033 ile aynı aile.
    const h = aileHaritasi(['TNC.SFR.00015-00033', 'TNC.SFR.00033'])
    expect(h.get('TNC.SFR.00015-00033')).toBe(h.get('TNC.SFR.00033'))
  })

  it('kesişmeyen numaraları AYRI aile bırakır', () => {
    const h = aileHaritasi(['TNC.MXD.00160', 'TNC.MXD.00173'])
    expect(h.get('TNC.MXD.00160')).not.toBe(h.get('TNC.MXD.00173'))
  })

  it('numara aynı olsa bile farklı marka kodunu birleştirmez', () => {
    // Bu kontrol olmasaydı TNC.SFR.00011 ile TNC.FGR.00011 aynı aile sayılırdı.
    const h = aileHaritasi(['TNC.SFR.00011', 'TNC.FGR.00011'])
    expect(h.get('TNC.SFR.00011')).not.toBe(h.get('TNC.FGR.00011'))
  })
})

describe('kuyrukSirala', () => {
  it('çakışma yokken saf puan sırasını korur', () => {
    const plan = kuyrukSirala([
      v('a', 50, 'TNC.MXD.00160', 'Maxx Doria Tencere'),
      v('b', 90, 'TNC.SFR.00010', 'Sofram Tencere'),
      v('c', 70, 'TNC.GLS.00091', 'Gülsan Tencere'),
    ])
    expect(plan.map(p => p.reel_kod)).toEqual(['b', 'c', 'a'])
  })

  it('aynı aileden videoları en az 3 slot arayla dizer', () => {
    // 3 aynı-aile videosu (3-1)*(3+1)+1 = 9 slot ister; 6 doldurucu verilir.
    const plan = kuyrukSirala([
      v('s1', 100, 'TNC.SFR.00010', 'Sofram Kase'),
      v('s2', 99, 'TNC.SFR.00010', 'Sofram Kase'),
      v('s3', 98, 'TNC.SFR.00010', 'Sofram Kase'),
      v('m1', 97, 'TNC.MXD.00160', 'Maxx Doria Tencere'),
      v('g1', 96, 'TNC.GLS.00091', 'Gülsan Tencere'),
      v('c1', 95, 'TNC.CEM.00008', 'CEM Tencere'),
      v('f1', 94, 'TNC.FGR.00011', 'Fagor Düdüklü'),
      v('l1', 93, 'TNC.FLZ.00330', 'Falez Tencere'),
      v('t1', 92, 'TNC.TSH.00001', 'Taşhan Tencere'),
    ])
    // ÖLÇÜT BAĞIMSIZ: aralık planDogrula'ya SORULMAZ, konumlar elle sayılır.
    // Sebebi mutasyon testinde görüldü — planDogrula da AILE_ARALIK sabitini
    // kullanıyor; sabit bozulunca sıralayıcı ve denetleyici aynı anda körleşip
    // test yanlışlıkla yeşil kalıyordu.
    const konumlar = new Map()
    plan.forEach((v, i) => {
      const oncekiler = konumlar.get(v.aile) || []
      for (const onceki of oncekiler) {
        expect(i - onceki).toBeGreaterThanOrEqual(3)
      }
      konumlar.set(v.aile, [...oncekiler, i])
    })
    // Testin kendisi anlamlı olsun: aynı aileden gerçekten 3 video var mı?
    expect([...konumlar.values()].some(k => k.length === 3)).toBe(true)
  })

  it('kapasite yetmediğinde ihlali SAKLAMAZ, sayar', () => {
    // 3 aynı-aile + 3 doldurucu = 6 slot; kural 9 ister → ihlal kaçınılmaz.
    const plan = kuyrukSirala([
      v('s1', 100, 'TNC.SFR.00010', 'Sofram Kase'),
      v('s2', 99, 'TNC.SFR.00010', 'Sofram Kase'),
      v('s3', 98, 'TNC.SFR.00010', 'Sofram Kase'),
      v('m1', 97, 'TNC.MXD.00160', 'Maxx Doria Tencere'),
      v('g1', 96, 'TNC.GLS.00091', 'Gülsan Tencere'),
      v('c1', 95, 'TNC.CEM.00008', 'CEM Tencere'),
    ])
    expect(plan).toHaveLength(6)
    expect(planDogrula(plan).aileIhlal).toBeGreaterThan(0)
  })

  it('aynı markayı peş peşe koymaz', () => {
    const plan = kuyrukSirala([
      v('s1', 100, 'TNC.SFR.00010', 'Sofram Tencere'),
      v('s2', 99, 'TNC.SET.00019', 'Sofram Kase Seti'),
      v('m1', 50, 'TNC.MXD.00160', 'Maxx Doria Tencere'),
    ])
    // s1 ve s2 farklı AİLE ama aynı MARKA (ikisi de Sofram) → araya m1 girmeli.
    expect(plan.map(p => p.marka)).toEqual(['Sofram', 'Maxx Doria', 'Sofram'])
  })

  it('kural sağlanamazsa çöker değil, en az zararlıyı seçer', () => {
    // Tek aile, tek marka, 3 video → kural fiziken sağlanamaz.
    const plan = kuyrukSirala([
      v('a', 100, 'TNC.SFR.00010', 'Sofram Tencere'),
      v('b', 90, 'TNC.SFR.00010', 'Sofram Tencere'),
      v('c', 80, 'TNC.SFR.00010', 'Sofram Tencere'),
    ])
    expect(plan).toHaveLength(3)
    expect(plan.map(p => p.reel_kod)).toEqual(['a', 'b', 'c'])
  })

  it('eşit puanda KARARLI sıralar (aynı girdi hep aynı plan)', () => {
    const girdi = [
      v('zzz', 80, 'TNC.MXD.00160', 'Maxx Doria Tencere'),
      v('aaa', 80, 'TNC.GLS.00091', 'Gülsan Tencere'),
    ]
    expect(kuyrukSirala(girdi).map(p => p.reel_kod))
      .toEqual(kuyrukSirala([...girdi].reverse()).map(p => p.reel_kod))
  })

  it('hiçbir videoyu düşürmez ve çoğaltmaz', () => {
    const girdi = Array.from({ length: 25 }, (_, i) =>
      v('r' + i, 100 - i, 'TNC.SFR.' + (i % 3), 'Sofram Tencere ' + i))
    const plan = kuyrukSirala(girdi)
    expect(plan).toHaveLength(25)
    expect(new Set(plan.map(p => p.reel_kod)).size).toBe(25)
  })
})

describe('slotAni', () => {
  it("İstanbul 09:00'ı doğru UTC anına çevirir", () => {
    // Türkiye kalıcı UTC+3 → 09:00 TSİ = 06:00Z.
    expect(slotAni(2026, 9, 8, 9).toISOString()).toBe('2026-09-08T06:00:00.000Z')
  })

  it("İstanbul 15:00'ı doğru UTC anına çevirir", () => {
    expect(slotAni(2026, 9, 8, 15).toISOString()).toBe('2026-09-08T12:00:00.000Z')
  })
})

describe('slotUret', () => {
  it('geçmiş slotu ÜRETMEZ', () => {
    // 07.09 13:38 TSİ = 10:38Z. Bugünün 09:00 slotu geçmiştir.
    const simdi = new Date('2026-09-07T10:38:00.000Z')
    const s = slotUret(simdi, 3)
    expect(s.every(x => x.getTime() > simdi.getTime())).toBe(true)
    // İlk üretilen slot bugünün 15:00'i olmalı, dünün/bugünün 09:00'ı değil.
    expect(s[0].toISOString()).toBe('2026-09-07T12:00:00.000Z')
  })

  it('günde iki slot üretir ve artan sırada verir', () => {
    const simdi = new Date('2026-09-07T10:38:00.000Z')
    const s = slotUret(simdi, 5)
    expect(s.map(x => x.toISOString())).toEqual([
      '2026-09-07T12:00:00.000Z', // 07.09 15:00
      '2026-09-08T06:00:00.000Z', // 08.09 09:00
      '2026-09-08T12:00:00.000Z', // 08.09 15:00
      '2026-09-09T06:00:00.000Z', // 09.09 09:00
      '2026-09-09T12:00:00.000Z', // 09.09 15:00
    ])
  })

  it('gün başında her iki slotu da verir', () => {
    const simdi = new Date('2026-09-07T01:00:00.000Z') // 04:00 TSİ
    const s = slotUret(simdi, 2)
    expect(s[0].toISOString()).toBe('2026-09-07T06:00:00.000Z')
    expect(s[1].toISOString()).toBe('2026-09-07T12:00:00.000Z')
  })
})
