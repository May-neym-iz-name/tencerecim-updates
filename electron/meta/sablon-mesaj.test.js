import { describe, test, expect } from 'vitest'
import sablonMesaj from './sablon-mesaj.js'

const { fiyatYaz, mesajOlustur, MAKS_KARAKTER } = sablonMesaj

const kase = {
  urun_adi: "Çelik Kase Seti 6'lı",
  aciklama: '18/10 paslanmaz çelik, iç içe geçen tasarım',
  fiyat: 1450,
  link: 'tencerecim.store/celik-kase-seti',
  whatsapp: '0555 123 45 67',
}
const granit = {
  urun_adi: 'Granit Tencere Seti 7 Parça',
  aciklama: 'Çizilmez granit kaplama',
  fiyat: 2300,
  link: 'tencerecim.store/granit-set',
  whatsapp: '0555 123 45 67',
}

describe('fiyatYaz', () => {
  test('binlik ayıracı ile TL yazar', () => {
    expect(fiyatYaz(1450)).toBe('1.450 TL')
    expect(fiyatYaz(2300.5)).toBe('2.300,5 TL')
  })

  test('fiyat yoksa null döner (fiyat satırı hiç yazılmasın)', () => {
    expect(fiyatYaz(null)).toBe(null)
    expect(fiyatYaz(0)).toBe(null)
    expect(fiyatYaz(undefined)).toBe(null)
  })
})

describe('mesaj biçimi (etiketler)', () => {
  // Eskiden alanlar YALNIZ emoji ile işaretliydi (💰/🛒/📱) — ne olduğu belirsizdi.
  // v1.2.115'te açık yazı etiketlere geçildi. Bu testler biçimi kilitler.
  test('alanlar açık yazı etiketle yazılır, emoji ile değil', () => {
    const { metin } = mesajOlustur({ sablonlar: [kase] })
    expect(metin).toContain('Fiyat: 1.450 TL')
    expect(metin).toContain('Online Sipariş Hattı: tencerecim.store/celik-kase-seti')
    expect(metin).toContain('Whatsapp Sipariş Hattı: 0555 123 45 67')
  })

  test('selamlama "Merhaba," (ünlemsiz, emojisiz)', () => {
    const { metin } = mesajOlustur({ sablonlar: [kase] })
    expect(metin.startsWith('Merhaba,')).toBe(true)
  })

  test('mesajda hiç emoji kalmaz', () => {
    const { metin } = mesajOlustur({ sablonlar: [kase, granit] })
    // Eski biçimdeki emojiler tamamen kalkmalı.
    for (const e of ['🍲', '💰', '🛒', '📱', '👋']) expect(metin).not.toContain(e)
  })

  test('ürün adı etiketsiz, kendi satırında yazılır', () => {
    const { metin } = mesajOlustur({ sablonlar: [kase] })
    expect(metin.split('\n')).toContain("Çelik Kase Seti 6'lı")
  })
})

describe('mesajOlustur', () => {
  test('tek ürünü selamlama + blok + whatsapp olarak yazar', () => {
    const { metin } = mesajOlustur({ sablonlar: [kase] })
    expect(metin).toContain('Merhaba')
    expect(metin).toContain("Çelik Kase Seti 6'lı")
    expect(metin).toContain('18/10 paslanmaz çelik, iç içe geçen tasarım')
    expect(metin).toContain('1.450 TL')
    expect(metin).toContain('tencerecim.store/celik-kase-seti')
    expect(metin).toContain('0555 123 45 67')
  })

  test('fiyat null ise fiyat satırı yazılmaz ama diğerleri yazılır', () => {
    const { metin } = mesajOlustur({ sablonlar: [{ ...kase, fiyat: null }] })
    expect(metin).not.toContain('TL')
    expect(metin).toContain("Çelik Kase Seti 6'lı")
    expect(metin).toContain('tencerecim.store/celik-kase-seti')
  })

  test('whatsapp AYNI ise mesajda YALNIZCA BİR KEZ görünür', () => {
    const { metin } = mesajOlustur({ sablonlar: [kase, granit] })
    const kac = metin.split('0555 123 45 67').length - 1
    expect(kac).toBe(1)
  })

  test('whatsapp FARKLI ise her ürünün altında ayrı görünür', () => {
    const digerHat = { ...granit, whatsapp: '0555 999 88 77' }
    const { metin } = mesajOlustur({ sablonlar: [kase, digerHat] })
    expect(metin).toContain('0555 123 45 67')
    expect(metin).toContain('0555 999 88 77')
  })

  test('ürünleri verilen sırada yazar', () => {
    const { metin } = mesajOlustur({ sablonlar: [kase, granit] })
    expect(metin.indexOf('Çelik Kase')).toBeLessThan(metin.indexOf('Granit Tencere'))
  })

  test('1000 karakteri aşınca asildi=true döner', () => {
    const uzun = { ...kase, aciklama: 'x'.repeat(400) }
    const { asildi, karakter } = mesajOlustur({ sablonlar: [uzun, uzun, uzun] })
    expect(asildi).toBe(true)
    expect(karakter).toBeGreaterThan(MAKS_KARAKTER)
  })

  test('sınır altında asildi=false', () => {
    const { asildi } = mesajOlustur({ sablonlar: [kase] })
    expect(asildi).toBe(false)
  })

  test('şablon yoksa boş metin döner (otomasyon bunu göndermemeli)', () => {
    const { metin, asildi } = mesajOlustur({ sablonlar: [] })
    expect(metin).toBe('')
    expect(asildi).toBe(false)
  })

  test('metin ASLA kesilmez — asildi bayrağı uyarı içindir, gönderim engellenir', () => {
    const uzun = { ...kase, aciklama: 'x'.repeat(400) }
    const { metin } = mesajOlustur({ sablonlar: [uzun, uzun, uzun] })
    expect(metin).toContain('x'.repeat(400))
  })
})

describe('genel (serbest metin) şablonlar', () => {
  const genel = { tur: 'genel', serbest_metin: "Bu tarifin malzemeleri için DM'den 'TARİF' yazın 👇" }

  test('tek genel şablon metni AYNEN gider (selamlama/fiyat yok)', () => {
    const { metin } = mesajOlustur({ sablonlar: [genel] })
    expect(metin).toBe("Bu tarifin malzemeleri için DM'den 'TARİF' yazın 👇")
    expect(metin.startsWith('Merhaba')).toBe(false)
    expect(metin).not.toContain('Fiyat:')
  })

  test('birden çok genel boş satırla alt alta birleşir', () => {
    const g2 = { tur: 'genel', serbest_metin: 'İkinci metin' }
    const { metin } = mesajOlustur({ sablonlar: [genel, g2] })
    expect(metin).toBe(genel.serbest_metin + '\n\n' + 'İkinci metin')
  })

  test('genel metin 1000 karakteri aşınca asildi=true, metin kesilmez', () => {
    const uzun = { tur: 'genel', serbest_metin: 'y'.repeat(1200) }
    const { metin, asildi, karakter } = mesajOlustur({ sablonlar: [uzun] })
    expect(asildi).toBe(true)
    expect(karakter).toBeGreaterThan(MAKS_KARAKTER)
    expect(metin).toContain('y'.repeat(1200))
  })

  test('genel şablonlarda ürün biçim etiketleri hiç yazılmaz', () => {
    const { metin } = mesajOlustur({ sablonlar: [genel] })
    expect(metin).not.toContain('Whatsapp Sipariş Hattı:')
    expect(metin).not.toContain('Online Sipariş Hattı:')
  })
})

// ── Gönderiye özel mesaj (v1.2.173) ────────────────────────────────────────────
// Şablon yolundan farkı: açıklama GÖNDERİYE ait (ürünlere değil), ürünlerin kendi
// aciklama alanı hiç yazılmaz, WhatsApp gönderi başına tek.
describe('gonderiMesajiOlustur — gönderiye özel açıklama + ürün listesi', () => {
  const { gonderiMesajiOlustur } = sablonMesaj
  const urunler = [
    { ad: 'Maxx Doria Steel Fusion 24 cm Tava', fiyat: 890, web_link: 'https://tencerecim.store/steel-fusion-24' },
    { ad: 'Maxx Doria Steel Fusion 26 cm Tava', fiyat: 990, web_link: 'https://tencerecim.store/steel-fusion-26' },
  ]

  test('açıklama bir kez yazılır, ürün başına tekrarlanmaz', () => {
    const { metin } = gonderiMesajiOlustur({
      aciklama: 'Steel Fusion serisi çelik tavalarımız 3 boy mevcuttur.',
      urunler,
    })
    expect(metin.match(/Steel Fusion serisi/g)).toHaveLength(1)
  })

  test('ürünlerin kendi aciklama alanı ASLA yazılmaz (yenen gol)', () => {
    const { metin } = gonderiMesajiOlustur({
      aciklama: 'Gönderi metni',
      urunler: urunler.map(u => ({ ...u, aciklama: 'ÜRÜN AÇIKLAMASI SIZMASIN' })),
    })
    expect(metin).not.toContain('ÜRÜN AÇIKLAMASI SIZMASIN')
  })

  test('her ürün için ad + fiyat + link yazılır', () => {
    const { metin } = gonderiMesajiOlustur({ aciklama: 'x', urunler })
    expect(metin).toContain('Maxx Doria Steel Fusion 24 cm Tava')
    expect(metin).toContain('Fiyat: 890 TL')
    expect(metin).toContain('Online Sipariş Hattı: https://tencerecim.store/steel-fusion-24')
    expect(metin).toContain('Maxx Doria Steel Fusion 26 cm Tava')
    expect(metin).toContain('Fiyat: 990 TL')
  })

  test('selamlama en başta, açıklama selamlamadan sonra gelir', () => {
    const { metin } = gonderiMesajiOlustur({ aciklama: 'Gönderi metni', urunler })
    expect(metin.startsWith('Merhaba,')).toBe(true)
    expect(metin.indexOf('Gönderi metni')).toBeLessThan(metin.indexOf('Maxx Doria'))
  })

  test('WhatsApp gönderi başına TEK, en sonda yazılır', () => {
    const { metin } = gonderiMesajiOlustur({ aciklama: 'x', urunler, whatsapp: '0555 123 45 67' })
    expect(metin.match(/Whatsapp Sipariş Hattı:/g)).toHaveLength(1)
    expect(metin.trim().endsWith('Whatsapp Sipariş Hattı: 0555 123 45 67')).toBe(true)
  })

  test('whatsapp verilmezse satır hiç yazılmaz', () => {
    const { metin } = gonderiMesajiOlustur({ aciklama: 'x', urunler })
    expect(metin).not.toContain('Whatsapp Sipariş Hattı:')
  })

  test('linki olmayan ürün için link satırı atlanır, ürün yine de yazılır', () => {
    const { metin } = gonderiMesajiOlustur({
      aciklama: 'x',
      urunler: [{ ad: 'Linksiz Ürün', fiyat: 100 }],
    })
    expect(metin).toContain('Linksiz Ürün')
    expect(metin).toContain('Fiyat: 100 TL')
    expect(metin).not.toContain('Online Sipariş Hattı:')
  })

  test('fiyatı 0/boş ürün için fiyat satırı atlanır', () => {
    const { metin } = gonderiMesajiOlustur({ aciklama: 'x', urunler: [{ ad: 'Fiyatsız', fiyat: 0 }] })
    expect(metin).toContain('Fiyatsız')
    expect(metin).not.toContain('Fiyat:')
  })

  // Ürünsüz gönderi = duyuru/tanıtım (mağaza açılışı, konum bilgisi). Eski 'genel' şablon
  // yolunda metin AYNEN gidiyordu; selamlama eklemek kullanıcının kendi "Merhaba! 👋" ile
  // başlayan metnini çift selamlamalı hale getirirdi.
  test('ürünsüz gönderide açıklama AYNEN gider, selamlama EKLENMEZ', () => {
    const { metin } = gonderiMesajiOlustur({ aciklama: 'Merhaba! 👋 Gölcük mağazamız açıldı!', urunler: [] })
    expect(metin).toBe('Merhaba! 👋 Gölcük mağazamız açıldı!')
    expect(metin.startsWith('Merhaba,')).toBe(false)
    expect(metin).not.toContain('Fiyat:')
  })

  test('ürünsüz gönderide whatsapp yine sonda yazılabilir', () => {
    const { metin } = gonderiMesajiOlustur({ aciklama: 'Duyuru', urunler: [], whatsapp: '0555' })
    expect(metin).toBe('Duyuru\n\nWhatsapp Sipariş Hattı: 0555')
  })

  test('ÜRÜN VARSA selamlama eklenir (duyuru kuralı sipariş mesajını bozmaz)', () => {
    const { metin } = gonderiMesajiOlustur({ aciklama: 'Metin', urunler })
    expect(metin.startsWith('Merhaba,')).toBe(true)
  })

  test('açıklamasız — yalnız ürün listesi gönderilebilir', () => {
    const { metin } = gonderiMesajiOlustur({ urunler })
    expect(metin.startsWith('Merhaba,')).toBe(true)
    expect(metin).toContain('Maxx Doria Steel Fusion 24 cm Tava')
  })

  test('ne açıklama ne ürün varsa metin boş döner', () => {
    const { metin, karakter } = gonderiMesajiOlustur({ urunler: [] })
    expect(metin).toBe('')
    expect(karakter).toBe(0)
  })

  test('1000 karakteri aşınca asildi=true, metin KESİLMEZ', () => {
    const { metin, asildi } = gonderiMesajiOlustur({ aciklama: 'u'.repeat(1200), urunler: [] })
    expect(asildi).toBe(true)
    expect(metin).toContain('u'.repeat(1200))
  })

  test('araya üç veya daha fazla boş satır girmez', () => {
    const { metin } = gonderiMesajiOlustur({ aciklama: 'x', urunler, whatsapp: '0555' })
    expect(metin).not.toMatch(/\n{3,}/)
  })

  test('şablon yolunun çıktısını değiştirmez (mesajOlustur bozulmadı)', () => {
    const { metin } = mesajOlustur({ sablonlar: [kase] })
    expect(metin).toContain('18/10 paslanmaz çelik')
  })
})

// v1.2.177: gönderiye birden çok WhatsApp hattı eklenebiliyor (Gölcük + Pendik).
// Tek numaralı eski davranış bozulmadı — `whatsapp` string alanı hâlâ çalışıyor.
describe('gonderiMesajiOlustur — çoklu WhatsApp hattı', () => {
  const { gonderiMesajiOlustur } = sablonMesaj
  const urunler = [{ ad: 'Tava', fiyat: 1000 }]
  const iki = [
    { baslik: 'Gölcük WhatsApp Sipariş Hattı', numara: '0537 288 12 41' },
    { baslik: 'Pendik WhatsApp Sipariş Hattı', numara: '0545 151 60 77' },
  ]

  test('her hat kendi başlığıyla ayrı satırda yazılır, sıra korunur', () => {
    const { metin } = gonderiMesajiOlustur({ aciklama: 'x', urunler, numaralar: iki })
    expect(metin).toContain('Gölcük WhatsApp Sipariş Hattı: 0537 288 12 41')
    expect(metin).toContain('Pendik WhatsApp Sipariş Hattı: 0545 151 60 77')
    expect(metin.indexOf('Gölcük')).toBeLessThan(metin.indexOf('Pendik'))
  })

  test('numarası boş satır atlanır (mağaza kaydında telefon girilmemiş)', () => {
    const { metin } = gonderiMesajiOlustur({
      aciklama: 'x', urunler,
      numaralar: [{ baslik: 'Gölcük', numara: '' }, { baslik: 'Pendik', numara: '0545' }],
    })
    expect(metin).not.toContain('Gölcük')
    expect(metin).toContain('Pendik: 0545')
  })

  test('başlık boşsa varsayılan etiket kullanılır', () => {
    const { metin } = gonderiMesajiOlustur({ urunler, numaralar: [{ numara: '0545' }] })
    expect(metin).toContain('Whatsapp Sipariş Hattı: 0545')
  })

  test('aynı numara iki kez eklenirse bir kez yazılır', () => {
    const { metin } = gonderiMesajiOlustur({
      urunler,
      numaralar: [{ baslik: 'Pendik', numara: '0545 151 60 77' }, { baslik: 'Merkez', numara: '0545 151 60 77' }],
    })
    expect(metin.match(/0545 151 60 77/g).length).toBe(1)
  })

  test('numaralar verilmezse eski whatsapp alanı çalışmaya devam eder', () => {
    const { metin } = gonderiMesajiOlustur({ urunler, whatsapp: '0545 151 60 77' })
    expect(metin).toContain('Whatsapp Sipariş Hattı: 0545 151 60 77')
  })

  test('numaralar doluysa eski whatsapp alanı yok sayılır (çift satır olmaz)', () => {
    const { metin } = gonderiMesajiOlustur({
      urunler, whatsapp: '0545 151 60 77',
      numaralar: [{ baslik: 'Gölcük', numara: '0537 288 12 41' }],
    })
    expect(metin).toContain('0537 288 12 41')
    expect(metin).not.toContain('0545 151 60 77')
  })

  test('ürünsüz duyuruya da hatlar eklenir', () => {
    const { metin } = gonderiMesajiOlustur({ aciklama: 'Yeni mağazamız açıldı!', numaralar: iki })
    expect(metin.startsWith('Yeni mağazamız açıldı!')).toBe(true)
    expect(metin).toContain('Gölcük WhatsApp Sipariş Hattı: 0537 288 12 41')
  })
})
