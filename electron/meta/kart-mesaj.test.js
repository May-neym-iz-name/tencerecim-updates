import { describe, it, expect } from 'vitest'
import {
  kartMesajiOlustur, altBaslik, waNumara, waButonBasligi, kirp,
  MAKS_KART, MAKS_BUTON, BASLIK_SINIR, ALT_BASLIK_SINIR, BUTON_BASLIK_SINIR,
} from './kart-mesaj.js'

const HATLAR = [
  { baslik: 'Pendik WhatsApp Sipariş Hattı', numara: '0545 151 60 77' },
  { baslik: 'Gölcük WhatsApp Sipariş Hattı', numara: '0537 288 12 41' },
]
const URUN = { ad: 'Lava 20 cm Derin Demir Döküm Tencere - Mavi', fiyat: 2830, web_link: 'https://tencerecim.store/lava-20', gorsel: 'https://cdn/x.webp' }

describe('waNumara', () => {
  it('baştaki 0 yerine 90 koyar', () => expect(waNumara('0545 151 60 77')).toBe('905451516077'))
  it('zaten 90 ile başlıyorsa dokunmaz', () => expect(waNumara('905451516077')).toBe('905451516077'))
  it('10 haneli numaraya 90 ekler', () => expect(waNumara('5451516077')).toBe('905451516077'))
  it('çözülemeyene null döner', () => {
    expect(waNumara('')).toBeNull()
    expect(waNumara('123')).toBeNull()
    expect(waNumara(null)).toBeNull()
  })
})

describe('waButonBasligi', () => {
  it('mağaza adından yeri çıkarır', () => {
    expect(waButonBasligi({ baslik: 'Pendik WhatsApp Sipariş Hattı' })).toBe('WhatsApp Pendik')
    expect(waButonBasligi({ lokasyon_ad: 'Tencerecim Gölcük' })).toBe('WhatsApp Gölcük')
  })
  it('başlık yoksa düz WhatsApp', () => expect(waButonBasligi({})).toBe('WhatsApp'))
  it('20 karakteri aşmaz', () => {
    const b = waButonBasligi({ baslik: 'Çok Uzun Bir Mağaza Adı Buraya Sığmaz' })
    expect(b.length).toBeLessThanOrEqual(BUTON_BASLIK_SINIR)
  })
})

describe('altBaslik', () => {
  it('fiyatı Türkçe biçimde yazar', () => expect(altBaslik(2830, '')).toBe('Fiyat: 2.830 TL'))
  it('kargo notunu fiyata ekler (A seçeneği)', () =>
    expect(altBaslik(2830, 'Ücretsiz kargo')).toBe('Fiyat: 2.830 TL · Ücretsiz kargo'))
  it('fiyat yoksa yalnız notu yazar', () => expect(altBaslik(0, 'Ücretsiz kargo')).toBe('Ücretsiz kargo'))
  it('ikisi de yoksa boş döner', () => expect(altBaslik(null, '')).toBe(''))
  it('80 karakteri aşmaz', () => {
    const a = altBaslik(2830, 'Türkiye’nin her bölgesine ücretsiz kargo ile gönderim yapılmaktadır, ayrıca kapıda ödeme')
    expect(a.length).toBeLessThanOrEqual(ALT_BASLIK_SINIR)
  })
})

describe('kirp', () => {
  it('sınır altındaki metne dokunmaz', () => expect(kirp('kısa', 80)).toBe('kısa'))
  it('sınırı aşanı kısaltır ve … koyar', () => {
    const r = kirp('a'.repeat(100), 80)
    expect(r.length).toBeLessThanOrEqual(80)
    expect(r.endsWith('…')).toBe(true)
  })
})

describe('kartMesajiOlustur', () => {
  it('ürün yoksa yuk null döner (çağıran düz metne düşer)', () => {
    expect(kartMesajiOlustur({ urunler: [] }).yuk).toBeNull()
    expect(kartMesajiOlustur({ urunler: null }).yuk).toBeNull()
  })

  it('generic template iskeletini kurar', () => {
    const { yuk, kartSayisi } = kartMesajiOlustur({ urunler: [URUN], numaralar: HATLAR, kargoNotu: 'Ücretsiz kargo' })
    expect(yuk.attachment.type).toBe('template')
    expect(yuk.attachment.payload.template_type).toBe('generic')
    expect(kartSayisi).toBe(1)
    const e = yuk.attachment.payload.elements[0]
    expect(e.title).toBe(URUN.ad)
    expect(e.subtitle).toBe('Fiyat: 2.830 TL · Ücretsiz kargo')
    expect(e.image_url).toBe(URUN.gorsel)
    expect(e.default_action).toEqual({ type: 'web_url', url: URUN.web_link })
  })

  it('butonlar: Online Sipariş + Pendik + Gölcük (kullanıcı kararı 08.09)', () => {
    const { yuk } = kartMesajiOlustur({ urunler: [URUN], numaralar: HATLAR })
    const b = yuk.attachment.payload.elements[0].buttons
    expect(b).toHaveLength(3)
    expect(b[0].title).toBe('🛒 Online Sipariş')
    expect(b[1]).toEqual({ type: 'web_url', url: 'https://wa.me/905451516077', title: 'WhatsApp Pendik' })
    expect(b[2]).toEqual({ type: 'web_url', url: 'https://wa.me/905372881241', title: 'WhatsApp Gölcük' })
  })

  it('3 buton sınırını aşmaz — fazla hat KIRPILIR', () => {
    const cokHat = [...HATLAR, { baslik: 'Üçüncü', numara: '0500 000 00 00' }]
    const { yuk } = kartMesajiOlustur({ urunler: [URUN], numaralar: cokHat })
    expect(yuk.attachment.payload.elements[0].buttons.length).toBe(MAKS_BUTON)
  })

  it('aynı numara iki kayıtta ise tek buton (v1.2.173 tekrar hatası)', () => {
    const ayni = [{ baslik: 'Pendik', numara: '0545 151 60 77' }, { baslik: 'Merkez', numara: '05451516077' }]
    const { yuk } = kartMesajiOlustur({ urunler: [URUN], numaralar: ayni })
    const wa = yuk.attachment.payload.elements[0].buttons.filter(b => b.url.includes('wa.me'))
    expect(wa).toHaveLength(1)
  })

  it('linksiz ürün de kart olur; Online Sipariş butonu ve default_action YAZILMAZ', () => {
    const { yuk } = kartMesajiOlustur({ urunler: [{ ad: 'Linksiz', fiyat: 100 }], numaralar: HATLAR })
    const e = yuk.attachment.payload.elements[0]
    expect(e.default_action).toBeUndefined()
    expect(e.buttons.every(b => b.url.includes('wa.me'))).toBe(true)
  })

  it('görsel yoksa image_url hiç yazılmaz (boş string Meta’yı kırar)', () => {
    const { yuk } = kartMesajiOlustur({ urunler: [{ ad: 'Görselsiz', fiyat: 1, web_link: 'https://x' }] })
    expect('image_url' in yuk.attachment.payload.elements[0]).toBe(false)
  })

  it('10 kart sınırı: fazlası atlanır ve sayısı bildirilir', () => {
    const cok = Array.from({ length: 14 }, (_, i) => ({ ad: 'Ürün ' + i, fiyat: 100 + i, web_link: 'https://x/' + i }))
    const { yuk, kartSayisi, atlanan } = kartMesajiOlustur({ urunler: cok })
    expect(kartSayisi).toBe(MAKS_KART)
    expect(atlanan).toBe(4)
    expect(yuk.attachment.payload.elements).toHaveLength(MAKS_KART)
  })

  it('sıra korunur — çağıranın verdiği sıralama (sosyal_otomasyon_urunler.sira)', () => {
    const u = [{ ad: 'Bir' }, { ad: 'İki' }, { ad: 'Üç' }]
    const { yuk } = kartMesajiOlustur({ urunler: u })
    expect(yuk.attachment.payload.elements.map(e => e.title)).toEqual(['Bir', 'İki', 'Üç'])
  })

  it('adsız satırlar elenir', () => {
    const { kartSayisi } = kartMesajiOlustur({ urunler: [URUN, { ad: '  ' }, null] })
    expect(kartSayisi).toBe(1)
  })

  it('uzun ürün adı 80 karaktere kırpılır', () => {
    const { yuk } = kartMesajiOlustur({ urunler: [{ ad: 'Ü'.repeat(200), fiyat: 1 }] })
    expect(yuk.attachment.payload.elements[0].title.length).toBeLessThanOrEqual(BASLIK_SINIR)
  })

  it('kart yükünde TEXT alanı YOKTUR — text+attachment birlikte gitmiyor (08.09 ölçüldü)', () => {
    const { yuk } = kartMesajiOlustur({ urunler: [URUN], kargoNotu: 'Ücretsiz kargo' })
    expect('text' in yuk).toBe(false)
  })
})

// Elle gönderim (meta:kartGonder, 08.09.2026) TEK kurucu kuralı: kart yükü yalnız
// kartMesajiOlustur ile üretilir, otomasyonla birebir aynı şekil. Bu test kuralı belgeler.
describe('elle gönderim yükü', () => {
  it('temsilcinin gönderdiği kart otomasyonun kartıyla aynı kurucu üzerinden geçer', () => {
    const u = [{ ad: 'A', fiyat: 10, web_link: 'https://tencerecim.store/a', gorsel: 'g' }]
    const oto = kartMesajiOlustur({ urunler: u, numaralar: [], kargoNotu: '' }).yuk
    const elle = kartMesajiOlustur({ urunler: u, numaralar: [], kargoNotu: '' }).yuk
    expect(elle).toEqual(oto)
    expect(oto.attachment.payload.elements[0].default_action.url).toBe('https://tencerecim.store/a')
  })
})
