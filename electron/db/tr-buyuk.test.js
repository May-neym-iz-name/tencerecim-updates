// Türkçe büyük harf normalizasyonu (v1.2.220).
//
// En kritik iddia: 'i' harfi 'İ' olur, 'ı' harfi 'I' olur. Düz toUpperCase()
// bunu YAPMAZ ve "İstanbul" → "ISTANBUL", "Işıl" → "ISIL" gibi yanlış çıktılar
// verir. Müşteri adları ve kategori adları bundan doğrudan etkilenir.
import { describe, test, expect } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { trBuyuk, buyukAlanlar, MUSTERI_ALANLAR, KARGO_ALANLAR } = require('./tr-buyuk.js')

describe('trBuyuk — Türkçe harf çiftleri', () => {
  test('🔴 i → İ (düz toUpperCase "I" verirdi)', () => {
    expect(trBuyuk('istanbul')).toBe('İSTANBUL')
    expect(trBuyuk('İzmir')).toBe('İZMİR')
    // Kanıt: yerleşik toUpperCase bu testi geçemez.
    expect('istanbul'.toUpperCase()).not.toBe('İSTANBUL')
  })

  test('🔴 ı → I', () => {
    expect(trBuyuk('ışıl')).toBe('IŞIL')
    expect(trBuyuk('Altın')).toBe('ALTIN')
  })

  test('diğer Türkçe harfler', () => {
    expect(trBuyuk('çğöşü')).toBe('ÇĞÖŞÜ')
    expect(trBuyuk('Gülşah Öztürk')).toBe('GÜLŞAH ÖZTÜRK')
  })

  test('gerçek müşteri adı örneği (ölçülen mükerrer kayıt)', () => {
    // 16.09 ölçümü: "Burak GÜL" ve "BURAK GÜL" AYRI iki satırdı.
    expect(trBuyuk('Burak GÜL')).toBe(trBuyuk('BURAK GÜL'))
  })
})

describe('trBuyuk — sınır değerler', () => {
  test('null ve undefined AYNEN döner (alan dokunulmamış sayılır)', () => {
    // Bu korunmazsa "model alanını göndermeyen çağrı dokunmaz" kuralı kırılır:
    // undefined bir değere dönüşseydi UPDATE dalı açılırdı.
    expect(trBuyuk(undefined)).toBeUndefined()
    expect(trBuyuk(null)).toBeNull()
  })

  test('boş ve yalnız boşluk olan metin aynen döner', () => {
    expect(trBuyuk('')).toBe('')
    expect(trBuyuk('   ')).toBe('   ')
  })

  test('rakam ve noktalama korunur', () => {
    expect(trBuyuk('20 cm / 2.5 lt')).toBe('20 CM / 2.5 LT')
  })
})

describe('buyukAlanlar — seçici normalizasyon', () => {
  test('yalnız listelenen alanlara dokunur', () => {
    const r = buyukAlanlar({ ad: 'ayşe', email: 'Ayse@Mail.com' }, ['ad'])
    expect(r.ad).toBe('AYŞE')
    expect(r.email).toBe('Ayse@Mail.com')
  })

  test('🔴 email müşteri kapsamında DEĞİL', () => {
    // 1474 e-postanın 0'ı büyüktü; büyütmek gönderim/eşleşme yolunu bozabilir.
    expect(MUSTERI_ALANLAR).not.toContain('email')
    expect(MUSTERI_ALANLAR).not.toContain('telefon')
    expect(KARGO_ALANLAR).not.toContain('aciklama')
  })

  test('🔴 girdi nesnesi DEĞİŞTİRİLMEZ (yeni nesne döner)', () => {
    const girdi = { ad: 'ayşe' }
    const r = buyukAlanlar(girdi, ['ad'])
    expect(girdi.ad).toBe('ayşe')
    expect(r.ad).toBe('AYŞE')
  })

  test('nesnede olmayan alan eklenmez (undefined kalır)', () => {
    const r = buyukAlanlar({ ad: 'ali' }, ['ad', 'soyad'])
    expect('soyad' in r).toBe(false)
  })

  test('null alan null kalır', () => {
    const r = buyukAlanlar({ ad: 'ali', adres: null }, ['ad', 'adres'])
    expect(r.adres).toBeNull()
  })

  test('müşteri alan listesi beklenen alanları kapsar', () => {
    for (const a of ['ad', 'soyad', 'unvan', 'adres', 'il', 'ilce', 'vergi_dairesi']) {
      expect(MUSTERI_ALANLAR).toContain(a)
    }
  })
})
