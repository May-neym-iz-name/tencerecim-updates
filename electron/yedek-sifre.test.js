// Parolalı yedek. Yedek dosyası TÜM müşteri verisini (ad, telefon, adres) ve
// API secret'larını taşır; şifresiz .db olarak masaüstünde/USB'de durması KVKK
// açısından veritabanının kendisi kadar risklidir.
import { describe, it, expect } from 'vitest'
const { sifrele, coz, sifreliMi, DOSYA_UZANTISI } = require('./yedek-sifre.js')

const VERI = Buffer.from('SQLite format 3\0 sahte veritabani icerigi', 'utf8')

describe('yedek sifreleme', () => {
  it('sifreleyip ayni parolayla geri acar', () => {
    const paket = sifrele(VERI, 'guclu-parola-123')
    expect(coz(paket, 'guclu-parola-123').equals(VERI)).toBe(true)
  })

  it('sifreli ciktida duz veri gorunmez', () => {
    const paket = sifrele(VERI, 'p')
    expect(paket.includes(Buffer.from('sahte veritabani'))).toBe(false)
  })

  it('yanlis parola ACAMAZ', () => {
    const paket = sifrele(VERI, 'dogru-parola')
    expect(() => coz(paket, 'yanlis-parola')).toThrow(/parola/i)
  })

  it('bozulmus dosya yakalanir (GCM butunluk etiketi)', () => {
    const paket = sifrele(VERI, 'p')
    // Son baytı boz — şifre metninin içinde.
    paket[paket.length - 1] = paket[paket.length - 1] ^ 0xff
    expect(() => coz(paket, 'p')).toThrow()
  })

  it('her sifrelemede farkli cikti uretir (tuz + IV rastgele)', () => {
    const a = sifrele(VERI, 'p')
    const b = sifrele(VERI, 'p')
    expect(a.equals(b)).toBe(false)
    expect(coz(a, 'p').equals(coz(b, 'p'))).toBe(true)
  })

  it('sifreli dosyayi basligindan tanir', () => {
    expect(sifreliMi(sifrele(VERI, 'p'))).toBe(true)
    // Eski sifresiz .db yedekleri geri yuklenebilir kalmali.
    expect(sifreliMi(VERI)).toBe(false)
    expect(sifreliMi(Buffer.alloc(3))).toBe(false)
  })

  it('bos parola reddedilir', () => {
    expect(() => sifrele(VERI, '')).toThrow(/parola/i)
    expect(() => sifrele(VERI, null)).toThrow(/parola/i)
  })

  it('sifreli olmayan dosyayi cozmeye calisinca anlasilir hata verir', () => {
    expect(() => coz(VERI, 'p')).toThrow(/sifreli/i)
  })

  it('uzantı .db degil ki yanlislikla dogrudan acilmasin', () => {
    expect(DOSYA_UZANTISI).toBe('tncyedek')
  })
})
