import { describe, test, expect } from 'vitest'
import { listeFiltreleri, CEVAPSIZ_SAYAC, OKUNMAMIS_SAYAC } from './sosyal-filtre.js'

const uygula = (secim) => {
  const having = []
  const p = {}
  listeFiltreleri(secim, having, p)
  return { having, p }
}

describe('listeFiltreleri', () => {
  test('süzgeç seçilmemişse hiç koşul eklemez', () => {
    expect(uygula({}).having).toEqual([])
    expect(uygula({ cevapDurumu: 'hepsi', okunma: 'hepsi', atama: 'hepsi' }).having).toEqual([])
  })

  test('cevapsız ve cevaplanmış birbirinin tersidir', () => {
    expect(uygula({ cevapDurumu: 'cevapsiz' }).having).toEqual(['cevapsiz > 0'])
    expect(uygula({ cevapDurumu: 'cevaplandi' }).having).toEqual(['cevapsiz = 0'])
  })

  test('okunma süzgeci cevap süzgecinden AYRI sayaca bakar', () => {
    // Aynı sayacı kullansalardı iki süzgeç tek işe yarardı — kasıtlı olarak farklılar.
    expect(uygula({ okunma: 'okunmamis' }).having).toEqual(['okunmamis > 0'])
    expect(CEVAPSIZ_SAYAC).not.toBe(OKUNMAMIS_SAYAC)
    expect(CEVAPSIZ_SAYAC).toContain("'okundu'")   // okundu ama cevapsız → cevapsız sayılır
    expect(OKUNMAMIS_SAYAC).not.toContain("'okundu'")
  })

  test('bana atanan süzgeci kullanıcıyı parametre olarak bağlar (SQL enjeksiyonu yok)', () => {
    const { having, p } = uygula({ atama: 'bana', kullanici: "O'Brien" })
    expect(having).toEqual(['MAX(atanan_kullanici) = @kullanici'])
    expect(p.kullanici).toBe("O'Brien")
  })

  test('kullanıcı adı boşsa bile bana-atanan koşulu parametreli kalır', () => {
    const { p } = uygula({ atama: 'bana' })
    expect(p.kullanici).toBe('')
  })

  test('atanmamış süzgeci parametre gerektirmez', () => {
    const { having, p } = uygula({ atama: 'atanmamis' })
    expect(having).toEqual(['MAX(atanan_kullanici) IS NULL'])
    expect(p).toEqual({})
  })

  test('süzgeçler birleştirilebilir', () => {
    const { having } = uygula({ cevapDurumu: 'cevapsiz', okunma: 'okunmamis', atama: 'atanmamis' })
    expect(having).toEqual(['cevapsiz > 0', 'okunmamis > 0', 'MAX(atanan_kullanici) IS NULL'])
  })
})
