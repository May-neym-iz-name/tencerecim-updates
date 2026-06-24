import { describe, test, expect } from 'vitest'
import raporlar from './raporlar.js'

// NOT: Tam DB entegrasyon testi bu harness'ta çalışmaz — better-sqlite3 Electron'un
// Node ABI'sine göre derlenmiştir, vitest ise sistem Node'unda çalışır. Bu yüzden
// SQL'in en kritik/saf kısımları (filtre koşulları, parametre sırası, limit) test edilir.
const { _kalemlerCte: kalemlerCte, _webDurumKosulu: webDurumKosulu, _limitGuvenli: limitGuvenli } = raporlar

describe('webDurumKosulu', () => {
  test('"odenmis" sadece PAID siparişleri seçer', () => {
    expect(webDurumKosulu('odenmis')).toContain("odeme_durumu = 'PAID'")
  })

  test('"tumu" filtre uygulamaz (1=1)', () => {
    expect(webDurumKosulu('tumu')).toBe('1=1')
  })

  test('varsayılan/"gecerli" iptal ve iade/başarısızları eler', () => {
    const k = webDurumKosulu('gecerli')
    expect(k).toContain("os.durum != 'CANCELLED'")
    expect(k).toContain('REFUNDED')
    expect(webDurumKosulu(undefined)).toBe(k) // varsayılan = gecerli
  })
})

describe('limitGuvenli', () => {
  test('aralık dışını sıkıştırır', () => {
    expect(limitGuvenli(0)).toBe(25) // 0 falsy → varsayılan
    expect(limitGuvenli(-5)).toBe(1) // negatif → alt sınır 1
    expect(limitGuvenli(99999)).toBe(200) // MAKS_LIMIT
  })

  test('geçersiz girişte varsayılana düşer', () => {
    expect(limitGuvenli(undefined)).toBe(25)
    expect(limitGuvenli('abc')).toBe(25)
    expect(limitGuvenli(undefined, 10)).toBe(10)
  })

  test('geçerli değeri korur', () => {
    expect(limitGuvenli(50)).toBe(50)
  })
})

describe('kalemlerCte', () => {
  test('filtresiz: her iki kaynağı UNION ALL ile birleştirir', () => {
    const { cte, params } = kalemlerCte({})
    expect(cte).toContain("'magaza' AS kaynak")
    expect(cte).toContain("'web' AS kaynak")
    expect(cte).toContain('UNION ALL')
    expect(params).toEqual([]) // hiç filtre yok
  })

  test('kaynak="magaza": yalnızca mağaza kolunu üretir', () => {
    const { cte } = kalemlerCte({ kaynak: 'magaza' })
    expect(cte).toContain("'magaza' AS kaynak")
    expect(cte).not.toContain("'web' AS kaynak")
    expect(cte).not.toContain('UNION ALL')
  })

  test('kaynak="web": yalnızca web kolunu üretir', () => {
    const { cte } = kalemlerCte({ kaynak: 'web' })
    expect(cte).toContain("'web' AS kaynak")
    expect(cte).not.toContain("'magaza' AS kaynak")
  })

  test('tarih + lokasyon: parametreler doğru sırada (mağaza sonra web)', () => {
    const { params } = kalemlerCte({ baslangic: '2026-01-01', bitis: '2026-12-31', lokasyon_id: 3 })
    // mağaza: bas, bit, lok  →  web: bas, bit, lok
    expect(params).toEqual(['2026-01-01', '2026-12-31', 3, '2026-01-01', '2026-12-31', 3])
  })

  test('lokasyon_id sayıya çevrilir', () => {
    const { params } = kalemlerCte({ kaynak: 'magaza', lokasyon_id: '7' })
    expect(params).toEqual([7])
  })

  test('web durum koşulu CTE içine gömülür', () => {
    const { cte } = kalemlerCte({ kaynak: 'web', webDurum: 'odenmis' })
    expect(cte).toContain("odeme_durumu = 'PAID'")
  })

  test('geçersiz tarih formatı hata fırlatır', () => {
    expect(() => kalemlerCte({ baslangic: '01/06/2026' })).toThrow(/başlangıç tarihi/)
    expect(() => kalemlerCte({ bitis: 'geçen hafta' })).toThrow(/bitiş tarihi/)
    expect(() => kalemlerCte({ baslangic: '2026-06-01', bitis: '2026-06-30' })).not.toThrow()
  })
})
