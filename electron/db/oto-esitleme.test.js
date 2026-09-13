// Otomatik stok eşitlemesi. Kullanıcı kararı (13.09.2026): sıradan eşitlenme sessiz,
// onay YALNIZ ürün satıştan kalkacaksa.
import { describe, test, expect } from 'vitest'
const { riskliMi, satisEtkisi, gonderimiAyir, stokHaritasi } = await import('./oto-esitleme.js')

const harita = (o) => new Map(Object.entries(o))

describe('riskliMi', () => {
  test('sıfıra inmek risklidir (ürün satıştan kalkar)', () => {
    expect(riskliMi({ eski: 3, yeni: 0 })).toBe(true)
  })
  test('sıradan azalma riskli DEĞİLDİR', () => {
    expect(riskliMi({ eski: 5, yeni: 3 })).toBe(false)
  })
  test('artış riskli değildir', () => {
    expect(riskliMi({ eski: 0, yeni: 4 })).toBe(false)
  })
  test('zaten sıfırdan sıfıra riskli sayılmaz', () => {
    expect(riskliMi({ eski: 0, yeni: 0 })).toBe(false)
  })
})

describe('satisEtkisi', () => {
  test('Trendyol satışı ana kanaldan düşer', () => {
    const r = satisEtkisi({
      satislar: [{ paket_id: 'p1', sku: 'TNC.A.1', miktar: 2 }],
      anaStok: harita({ 'TNC.A.1': 5 }),
    })
    expect(r.uygulanacak).toEqual([{ sku: 'TNC.A.1', eski: 5, yeni: 3, dusum: 2, paketler: ['p1'] }])
    expect(r.bekleyen).toEqual([])
  })

  test('stoğu sıfırlayacak düşüm ONAY BEKLER, sessizce yazılmaz', () => {
    const r = satisEtkisi({
      satislar: [{ paket_id: 'p1', sku: 'A', miktar: 3 }],
      anaStok: harita({ A: 3 }),
    })
    expect(r.uygulanacak).toEqual([])
    expect(r.bekleyen[0]).toMatchObject({ sku: 'A', eski: 3, yeni: 0 })
  })

  test('aynı ürün birden çok pakette satıldıysa TEK yazıma indirilir', () => {
    const r = satisEtkisi({
      satislar: [
        { paket_id: 'p1', sku: 'A', miktar: 2 },
        { paket_id: 'p2', sku: 'A', miktar: 1 },
      ],
      anaStok: harita({ A: 10 }),
    })
    expect(r.uygulanacak).toHaveLength(1)
    expect(r.uygulanacak[0]).toMatchObject({ eski: 10, yeni: 7, dusum: 3 })
    expect(r.uygulanacak[0].paketler.sort()).toEqual(['p1', 'p2'])
  })

  test('EKSİYE DÜŞMEZ — ana kanalda yetersiz stok varsa 0da durur', () => {
    const r = satisEtkisi({
      satislar: [{ paket_id: 'p1', sku: 'A', miktar: 9 }],
      anaStok: harita({ A: 2 }),
    })
    // 2 → 0 sıfırlama olduğu için onay bekler, ama negatif ÜRETMEZ
    expect(r.bekleyen[0]).toMatchObject({ eski: 2, yeni: 0 })
  })

  test('ana kanalda zaten 0 ise yazacak bir şey yok', () => {
    const r = satisEtkisi({ satislar: [{ sku: 'A', miktar: 2 }], anaStok: harita({ A: 0 }) })
    expect(r.uygulanacak).toEqual([])
    expect(r.bekleyen).toEqual([])
  })

  test('ana kanalda olmayan ürün SESSİZCE yutulmaz, raporlanır', () => {
    const r = satisEtkisi({ satislar: [{ sku: 'YOK', miktar: 1 }], anaStok: harita({}) })
    expect(r.eslesmeyen).toEqual([{ sku: 'YOK', dusum: 1 }])
  })

  test('stok kodsuz veya sıfır miktarlı satır etkiye girmez', () => {
    const r = satisEtkisi({
      satislar: [{ sku: '', miktar: 3 }, { sku: 'A', miktar: 0 }],
      anaStok: harita({ A: 5 }),
    })
    expect(r.uygulanacak).toEqual([])
    expect(r.eslesmeyen).toEqual([])
  })

  test('büyük/küçük harf farkı aynı ürün sayılır', () => {
    const r = satisEtkisi({ satislar: [{ sku: 'tnc.a.1', miktar: 1 }], anaStok: harita({ 'TNC.A.1': 4 }) })
    expect(r.uygulanacak[0]).toMatchObject({ sku: 'TNC.A.1', yeni: 3 })
  })

  test('boş girdi patlamaz', () => {
    const r = satisEtkisi()
    expect(r).toEqual({ uygulanacak: [], bekleyen: [], eslesmeyen: [] })
  })
})

describe('gonderimiAyir', () => {
  test('sıfırlayacak kalemler onaya, diğerleri otomatiğe ayrılır', () => {
    const { otomatik, onayli } = gonderimiAyir([
      { sku: 'A', eski_miktar: 5, yeni_miktar: 3 },
      { sku: 'B', eski_miktar: 2, yeni_miktar: 0 },
      { sku: 'C', eski_miktar: 0, yeni_miktar: 7 },
    ])
    expect(otomatik.map(k => k.sku)).toEqual(['A', 'C'])
    expect(onayli.map(k => k.sku)).toEqual(['B'])
  })
  test('boş liste iki boş liste verir', () => {
    expect(gonderimiAyir()).toEqual({ otomatik: [], onayli: [] })
  })
})

describe('stokHaritasi', () => {
  test('kanal satırlarını SKU haritasına çevirir, harf farkını katlar', () => {
    const m = stokHaritasi([{ sku: 'tnc.a.1', miktar: 3 }, { sku: 'B', miktar: 0 }])
    expect(m.get('TNC.A.1')).toBe(3)
    expect(m.get('B')).toBe(0)
  })
  test('stok kodsuz satır haritaya girmez', () => {
    expect(stokHaritasi([{ sku: null, miktar: 3 }]).size).toBe(0)
  })
})
