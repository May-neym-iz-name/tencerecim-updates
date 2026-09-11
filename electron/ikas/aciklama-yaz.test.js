import { describe, it, expect } from 'vitest'
const { yaz, girdi, iskelet } = require('./aciklama-yaz.js')

// --- yardımcılar ---
function urunYap(desc) {
  return {
    id: 'P1', name: 'Test Tencere', type: 'PHYSICAL', description: desc,
    categories: [{ id: 'c1', name: 'Tencere' }], salesChannels: [{ id: 's1', status: 'ACTIVE' }],
    tags: [], productVariantTypes: [],
    variants: [{
      id: 'V1', isActive: true, sku: 'SKU1', barcodeList: ['123'],
      prices: [{ priceListId: null, sellPrice: 100, currency: 'TRY' }],
      images: [{ imageId: 'i1', isMain: true, order: 0 }, { imageId: 'i2', isMain: false, order: 1 }],
      variantValueIds: [],
    }],
  }
}
function sahteDb() {
  const kayitlar = []
  return {
    kayitlar,
    prepare: () => ({ run: (...a) => kayitlar.push(a) }),
  }
}
// gql mock: read → store.once; saveProduct → store.uygula(input); sonraki read → store.sonra
function sahteGql(store) {
  return async (q, v) => {
    if (q.includes('saveProduct')) { store.uygula(v.i); return { saveProduct: { id: 'P1' } } }
    if (q.includes('listProduct')) { return { listProduct: { data: [store.oku()] } } }
    if (q.includes('saveVariantPrices')) { return { saveVariantPrices: true } }
    throw new Error('beklenmeyen sorgu')
  }
}

describe('yaz — mutlu yol', () => {
  it('açıklamayı değiştirir, görsel/fiyat korunur, yedek alınır', async () => {
    let urun = urunYap('ESKİ açıklama')
    const store = {
      oku: () => JSON.parse(JSON.stringify(urun)),
      uygula: (input) => { urun = { ...urun, description: input.description } }, // sadece description
    }
    const db = sahteDb()
    const r = await yaz({ id: 'P1', yeniAciklama: 'YENİ <b>html</b>', gql: sahteGql(store), db })
    expect(r.ok).toBe(true)
    expect(r.sonra.description).toBe('YENİ <b>html</b>')
    // yedek: eski açıklama kaydedildi
    expect(db.kayitlar.length).toBe(1)
    expect(db.kayitlar[0]).toContain('ESKİ açıklama')
  })
})

describe('yaz — güvenlik durdurmaları', () => {
  it('görsel kaybında FIRLATIR', async () => {
    let urun = urunYap('ESKİ')
    const store = {
      oku: () => JSON.parse(JSON.stringify(urun)),
      uygula: (input) => { urun = { ...urun, description: input.description, variants: [{ ...urun.variants[0], images: [] }] } },
    }
    await expect(yaz({ id: 'P1', yeniAciklama: 'YENİ', gql: sahteGql(store), db: sahteDb() }))
      .rejects.toThrow(/GÖRSEL KAYBI/)
  })

  it('açıklama dışı alan değişirse FIRLATIR', async () => {
    let urun = urunYap('ESKİ')
    const store = {
      oku: () => JSON.parse(JSON.stringify(urun)),
      uygula: (input) => { urun = { ...urun, description: input.description, name: 'DEĞİŞTİ' } },
    }
    await expect(yaz({ id: 'P1', yeniAciklama: 'YENİ', gql: sahteGql(store), db: sahteDb() }))
      .rejects.toThrow(/AÇIKLAMA DIŞI ALAN/)
  })
})

describe('girdi/iskelet', () => {
  it('girdi SADECE description değiştirir (sku/görsel/kategori korunur)', () => {
    const u = urunYap('ESKİ')
    const g = girdi(u, 'YENİ')
    expect(g.description).toBe('YENİ')
    expect(g.variants[0].sku).toBe('SKU1')
    expect(g.variants[0].images.length).toBe(2)
    expect(g.categoryIds).toEqual(['c1'])
  })
  it('iskelet description farkını GÖRMEZDEN gelir', () => {
    expect(iskelet(urunYap('a'))).toBe(iskelet(urunYap('b')))
  })
})
