// urunEsle'nin SET bağlama yolu (Faz 2 / Task 5A).
//
// Neden ayrı bir test: karar mantığı set-varyant.test.js'te tam kapsanıyor, ama
// asıl risk BAĞLAMADA — haritaya yanlış alan (v.sku yerine v.id, ya da ürün id'si)
// konursa ya da UPDATE hiç çalışmazsa tüm birim testler yeşil kalır ve hata ancak
// canlıda "sete fatura kesilemiyor" olarak görünür.
//
// CommonJS taklidi: require.cache ön-kurulumu (emsal: electron/fatura/okuma.test.js).
import { describe, test, expect, vi, beforeEach } from 'vitest'

const sahteGraphql = vi.fn()
const calisanSql = []          // çalıştırılan (sql, parametreler) izi

// --- ./client taklidi
const clientYolu = require.resolve('./client')
require.cache[clientYolu] = {
  id: clientYolu, filename: clientYolu, loaded: true,
  exports: { graphql: sahteGraphql },
}

// --- ../db/database taklidi: yalnız bu testin ihtiyacı olan sorgular
let setKayitlari = []
function sahteDb() {
  return {
    prepare(sql) {
      return {
        get: () => (/COUNT/.test(sql) ? { n: 0 } : undefined),
        all: () => (/FROM setler/.test(sql) ? setKayitlari : []),
        run: (...p) => { calisanSql.push([sql, p]) },
      }
    },
    transaction: (fn) => (...a) => fn(...a),
  }
}
const dbYolu = require.resolve('../db/database')
require.cache[dbYolu] = {
  id: dbYolu, filename: dbYolu, loaded: true,
  exports: { getDb: sahteDb },
}

const ekstra = require('./ekstra')

function ikasSayfasi(urunler, hasNext = false) {
  return { listProduct: { count: urunler.length, hasNext, page: 1, limit: 100, data: urunler } }
}

beforeEach(() => {
  sahteGraphql.mockReset()
  calisanSql.length = 0
  setKayitlari = []
})

describe('urunEsle — set bağlama', () => {
  test('setin SKU\'su ikas varyantıyla eşleşince VARYANT kimliği yazılır (ürün kimliği değil)', async () => {
    sahteGraphql.mockResolvedValueOnce(ikasSayfasi([
      { id: 'URUN-1', name: 'Kahvaltı Seti', variants: [{ id: 'VARYANT-1', sku: 'TNC.SET.00001', barcodeList: [] }] },
    ]))
    setKayitlari = [{ id: 7, ad: 'Kahvaltı Seti', sku: 'TNC.SET.00001', ikas_varyant_id: null }]

    const r = await ekstra._urunEsle({ adIleEsle: false })

    expect(r.setYazilan).toBe(1)
    const setGuncellemeleri = calisanSql.filter(([sql]) => /UPDATE setler/.test(sql))
    expect(setGuncellemeleri).toHaveLength(1)
    // 🔴 Ürün kimliği (URUN-1) yazılırsa sipariş kalemi eşleşmesi sessizce hiç tutmaz.
    expect(setGuncellemeleri[0][1]).toEqual(['VARYANT-1', 7])
  })

  test('SKU tutmayan set yazılmaz ve raporlanır', async () => {
    sahteGraphql.mockResolvedValueOnce(ikasSayfasi([
      { id: 'U1', name: 'Başka Ürün', variants: [{ id: 'V1', sku: 'TNC.URN.00001', barcodeList: [] }] },
    ]))
    setKayitlari = [{ id: 8, ad: 'Çay Seti', sku: 'TNC.SET.00099', ikas_varyant_id: null }]

    const r = await ekstra._urunEsle({ adIleEsle: false })

    expect(r.setYazilan).toBe(0)
    expect(r.setIkastaYok).toEqual(['TNC.SET.00099 — Çay Seti'])
    expect(calisanSql.filter(([sql]) => /UPDATE setler/.test(sql))).toHaveLength(0)
  })

  test('SKU\'su boş set ayrı raporlanır (ada göre eşleştirilmez)', async () => {
    sahteGraphql.mockResolvedValueOnce(ikasSayfasi([
      { id: 'U1', name: 'Çay Seti', variants: [{ id: 'V1', sku: 'TNC.URN.00001', barcodeList: [] }] },
    ]))
    setKayitlari = [{ id: 9, ad: 'Çay Seti', sku: '', ikas_varyant_id: null }]

    const r = await ekstra._urunEsle({ adIleEsle: false })

    // ikas'ta AYNI ADLA bir ürün var; yine de eşleştirilmemeli.
    expect(r.setYazilan).toBe(0)
    expect(r.setSkusuz).toEqual(['Çay Seti'])
  })

  test('birden çok sayfada toplanan SKU haritası setlere uygulanır', async () => {
    sahteGraphql
      .mockResolvedValueOnce(ikasSayfasi([
        { id: 'U1', name: 'A', variants: [{ id: 'V1', sku: 'TNC.URN.1', barcodeList: [] }] },
      ], true))
      .mockResolvedValueOnce(ikasSayfasi([
        { id: 'U2', name: 'Set', variants: [{ id: 'V2', sku: 'TNC.SET.2', barcodeList: [] }] },
      ], false))
    setKayitlari = [{ id: 10, ad: 'Set', sku: 'TNC.SET.2', ikas_varyant_id: null }]

    const r = await ekstra._urunEsle({ adIleEsle: false })

    // İkinci sayfadaki varyant da haritaya girmeli — harita döngü DIŞINDA tutuluyor.
    expect(r.setYazilan).toBe(1)
    expect(calisanSql.filter(([sql]) => /UPDATE setler/.test(sql))[0][1]).toEqual(['V2', 10])
  })

  test('değeri zaten doğru olan set yeniden yazılmaz', async () => {
    sahteGraphql.mockResolvedValueOnce(ikasSayfasi([
      { id: 'U1', name: 'Set', variants: [{ id: 'V1', sku: 'TNC.SET.1', barcodeList: [] }] },
    ]))
    setKayitlari = [{ id: 11, ad: 'Set', sku: 'TNC.SET.1', ikas_varyant_id: 'V1' }]

    const r = await ekstra._urunEsle({ adIleEsle: false })

    expect(r.setYazilan).toBe(0)
    expect(calisanSql.filter(([sql]) => /UPDATE setler/.test(sql))).toHaveLength(0)
  })
})
