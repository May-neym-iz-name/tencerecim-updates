// Bizimhesap kimlik ayarları: maskeleme ve yetki.
//
// Asıl risk: renderer'a maskeli ('********') giden değer geri kaydedilirken
// olduğu gibi yazılırsa firmId/token ÇÖPE gider ve fatura kesme sessizce ölür.
// (ikas client_secret'ta aynı koruma var; burada da olmalı.)
import { describe, test, expect, vi, beforeEach } from 'vitest'

const satirlar = new Map()
const yazilan = []
const sahteYetkiKontrol = vi.fn()

const dbYolu = require.resolve('./database')
require.cache[dbYolu] = {
  id: dbYolu, filename: dbYolu, loaded: true,
  exports: {
    getDb: () => ({
      prepare(sql) {
        return {
          all: () => [...satirlar.entries()].map(([anahtar, deger]) => ({ anahtar, deger })),
          run: (p) => { yazilan.push(p); satirlar.set(p.anahtar, p.deger) },
        }
      },
      transaction: (fn) => (...a) => fn(...a),
    }),
  },
}

const yetkiYolu = require.resolve('../yetki')
require.cache[yetkiYolu] = {
  id: yetkiYolu, filename: yetkiYolu, loaded: true,
  exports: { yetkiKontrol: sahteYetkiKontrol },
}

// Şifreleme katmanı: testte kimliği koruyan sahte (gerçek DPAPI yok).
const gizliYolu = require.resolve('./gizli-alan-canli')
require.cache[gizliYolu] = {
  id: gizliYolu, filename: gizliYolu, loaded: true,
  exports: {
    objeCoz: (_tablo, obj) => obj,
    yazmaDegeri: (_tablo, _anahtar, duz) => 'gzl1:' + duz,
  },
}

const modul = require('./fatura-ayarlar')

beforeEach(() => {
  satirlar.clear()
  yazilan.length = 0
  sahteYetkiKontrol.mockClear()
})

describe('maskeleme', () => {
  test('kayitli degerler renderer tarafina MASKELI doner', async () => {
    satirlar.set('firm_id', 'gzl1:AF5D...FDD')
    satirlar.set('token', 'gzl1:AF5D...FDD')

    const a = await modul['fatura-ayar:getir']()

    expect(a.firm_id).toBe('********')
    expect(a.token).toBe('********')
  })

  test('girilmemiş alan maskelenmez (boş kalır)', async () => {
    satirlar.set('firm_id', '')
    const a = await modul['fatura-ayar:getir']()
    expect(a.firm_id).toBe('')
  })
})

describe('kaydetme', () => {
  test('🔴 maskeli değer geri gelirse KAYITLI ANAHTAR KORUNUR', async () => {
    satirlar.set('firm_id', 'gzl1:gercek-deger')

    await modul['fatura-ayar:kaydet']({ firm_id: '********', token: 'YENI' })

    // firm_id'ye HİÇ yazılmamalı
    expect(yazilan.map(y => y.anahtar)).toEqual(['token'])
    expect(satirlar.get('firm_id')).toBe('gzl1:gercek-deger')
  })

  test('boş değer de mevcut anahtarı silmez', async () => {
    satirlar.set('token', 'gzl1:gercek')
    await modul['fatura-ayar:kaydet']({ token: '' })
    expect(yazilan).toHaveLength(0)
    expect(satirlar.get('token')).toBe('gzl1:gercek')
  })

  test('yeni değer ŞİFRELENEREK yazılır ve kırpılır', async () => {
    await modul['fatura-ayar:kaydet']({ firm_id: '  AF5D866E  ' })
    expect(yazilan[0]).toEqual({ anahtar: 'firm_id', deger: 'gzl1:AF5D866E' })
  })

  test('kaydetme sonucu da maskeli döner (değer geri sızmaz)', async () => {
    const s = await modul['fatura-ayar:kaydet']({ firm_id: 'AF5D866E' })
    expect(s.firm_id).toBe('********')
  })
})

describe('yetki', () => {
  test.each([
    ['fatura-ayar:getir', undefined],
    ['fatura-ayar:kaydet', {}],
  ])('%s fatura_stok_duzenle yetkisi ister', async (kanal, arg) => {
    await modul[kanal](arg)
    expect(sahteYetkiKontrol).toHaveBeenCalledWith('fatura_stok_duzenle')
  })

  test('yetki yoksa kaydetme YAPILMAZ', async () => {
    sahteYetkiKontrol.mockImplementationOnce(() => { throw new Error('Yetkiniz yok') })
    await expect(modul['fatura-ayar:kaydet']({ firm_id: 'X' })).rejects.toThrow(/Yetkiniz yok/)
    expect(yazilan).toHaveLength(0)
  })
})
