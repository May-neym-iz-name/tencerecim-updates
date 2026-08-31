// Sizinti tarayicisinin davranis testleri. Bu tarayici public repoya sirket
// verisi/anahtar gitmesini engelleyen son bariyer; yanlis alarm da en az
// kacirmak kadar zararli (kullanici --no-verify aliskanligi edinir).
import { describe, it, expect } from 'vitest'
const { yolIhlali, icerikIhlalleri, tara } = require('./sizinti-tara.js')

describe('yolIhlali', () => {
  it('uygulama kaynak dosyasini temiz gecer', () => {
    expect(yolIhlali('electron/db/urunler.js')).toBeNull()
    expect(yolIhlali('src/pages/Satis.jsx')).toBeNull()
    expect(yolIhlali('docs/ikas-api-reference.md')).toBeNull()
  })

  it('sirket verisi klasorlerini yakalar', () => {
    expect(yolIhlali('FATURALAR/agustos/fatura.pdf')).toMatch(/sirket verisi/i)
    expect(yolIhlali('TRENDYOL/urunler.json')).toMatch(/sirket verisi/i)
    expect(yolIhlali('URUN-ESLESTIRME/liste.js')).toMatch(/sirket verisi/i)
    expect(yolIhlali('REKLAM-KAMPANYALARI/butce.md')).toMatch(/sirket verisi/i)
  })

  it('klasor adi Windows ters bolu ile gelse de yakalar', () => {
    const tersBolu = ['FATURALAR', 'agustos', 'fatura.pdf'].join(String.fromCharCode(92))
    expect(yolIhlali(tersBolu)).toMatch(/sirket verisi/i)
  })

  it('veri uzantilarini yakalar', () => {
    expect(yolIhlali('bir/yer/liste.xlsx')).toMatch(/veri dosyasi/i)
    expect(yolIhlali('tencerecim.db')).toMatch(/veri dosyasi/i)
    expect(yolIhlali('.env')).toMatch(/ortam/i)
    expect(yolIhlali('cloudflare/.env.local')).toMatch(/ortam/i)
  })

  it('kok dizindeki taranmis belge gorsellerini yakalar ama uygulama gorselini gecer', () => {
    expect(yolIhlali('1a9bb994-7e2f.jpeg')).toMatch(/belge/i)
    expect(yolIhlali('electron/assets/istek-logo.png')).toBeNull()
    expect(yolIhlali('build/icon.ico')).toBeNull()
  })
})

describe('icerikIhlalleri', () => {
  it('temiz kaynak kodda hicbir sey bulmaz', () => {
    const kod = "const sifre = ayarlar.sifre\nfetch(url, { headers: { Authorization: `Bearer ${token}` } })"
    expect(icerikIhlalleri('a.js', kod)).toEqual([])
  })

  it('JWT benzeri token yakalar', () => {
    const kod = 'const t = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdef"'  // sizinti-tara: yok-say
    expect(icerikIhlalleri('a.js', kod)[0].sebep).toMatch(/JWT/i)
  })

  it('service_role KELIMESINI degil, gercek gizli anahtari yakalar', () => {
    // supabase/KURULUM.md'de bu cumle var; yanlis alarm vermemeli.
    const belge = 'service_role anahtarini ASLA paylasma; o sadece sunucu icindir.'
    expect(icerikIhlalleri('supabase/KURULUM.md', belge)).toEqual([])
    const gercek = 'const k = "sb_secret_9aZq1mLp7XcVt0Ne3RbYuG"'  // sizinti-tara: yok-say
    expect(icerikIhlalleri('a.js', gercek)[0].sebep).toMatch(/supabase/i)
  })

  it('yayinlanabilir (publishable) supabase anahtarini yakalamaz', () => {
    const kod = "const SUPABASE_KEY = 'sb_publishable_hplEuxLZ7ZwSWx9pWhLS1A_Fwov7M0a'"
    expect(icerikIhlalleri('src/lib/supabase.js', kod)).toEqual([])
  })

  it('GitHub ve odeme saglayici anahtarlarini yakalar', () => {
    expect(icerikIhlalleri('a.js', 'GH_TOKEN=ghp_AbCdEf0123456789AbCdEf0123456789AbCd')[0].sebep).toMatch(/github/i)  // sizinti-tara: yok-say
    expect(icerikIhlalleri('a.js', 'key = "sk_live_0123456789abcdefghij"')[0].sebep).toMatch(/odeme|sk_live/i)  // sizinti-tara: yok-say
  })

  it('duz metin parola/secret atamasini yakalar, degisken referansini yakalamaz', () => {
    expect(icerikIhlalleri('a.js', 'client_secret: "8f3ba91c77de4a02b1c9e5"')[0].sebep).toMatch(/gizli anahtar/i)  // sizinti-tara: yok-say
    expect(icerikIhlalleri('a.js', 'client_secret: ayarlar.clientSecret')).toEqual([])
  })

  it('gecerli TC kimlik numarasini yakalar, rastgele 11 haneyi yakalamaz', () => {
    // 10000000146 gecerli checksum'a sahip test numarasidir.  // sizinti-tara: yok-say
    expect(icerikIhlalleri('a.json', '"tc":"10000000146"')[0].sebep).toMatch(/TC kimlik/i)  // sizinti-tara: yok-say
    expect(icerikIhlalleri('a.js', 'const x = 12345678901')).toEqual([])
    // 13 haneli barkod TC olarak okunmamali
    expect(icerikIhlalleri('a.js', 'barkod: "8691234567890"')).toEqual([])
  })

  it('IBAN yakalar', () => {
    expect(icerikIhlalleri('a.md', 'TR330006100519786457841326')[0].sebep).toMatch(/IBAN/i)  // sizinti-tara: yok-say
  })

  it('yok-say yorumu olan satiri atlar', () => {
    const kod = 'const ornek = "sk_live_0123456789abcdefghij" // sizinti-tara: yok-say'
    expect(icerikIhlalleri('a.js', kod)).toEqual([])
  })

  it('ikili (binary) dosyalarin icerigini taramaz', () => {
    expect(icerikIhlalleri('a.png', 'eyJhbGciOiJI.eyJzdWIiOiIx.abcdef')).toEqual([])
  })
})

describe('tara', () => {
  const oku = (yol) => ({
    'electron/db/urunler.js': 'const x = 1',
    'gizli.js': 'const t = "ghp_AbCdEf0123456789AbCdEf0123456789AbCd"',  // sizinti-tara: yok-say
  })[yol]

  it('temiz dosya listesi icin bos dizi doner', () => {
    expect(tara(['electron/db/urunler.js'], oku)).toEqual([])
  })

  it('yol ve icerik ihlallerini birlikte toplar', () => {
    const sonuc = tara(['FATURALAR/x.pdf', 'gizli.js'], oku)
    expect(sonuc).toHaveLength(2)
    expect(sonuc.map((s) => s.dosya)).toEqual(['FATURALAR/x.pdf', 'gizli.js'])
  })

  it('okunamayan dosyayi sessizce atlar (silinmis dosya commit edilebilir)', () => {
    expect(tara(['yok.js'], oku)).toEqual([])
  })
})
