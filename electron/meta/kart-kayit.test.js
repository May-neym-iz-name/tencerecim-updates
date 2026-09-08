// Gönderilen ürün kartının yerel gelen kutusu kaydı (08.09.2026). Eskiden kart DM'i yalnız
// metin olarak (ya da hiç) kaydediliyordu → sohbette BOŞ BALON.
import { describe, test, expect } from 'vitest'
const { kartKaydi } = await import('./kart-kayit.js')

const yuk = { attachment: { type: 'template', payload: { template_type: 'generic', elements: [
  { title: 'Sofram Soft 12 Parça', subtitle: 'Fiyat: 3.490 TL · Ücretsiz kargo', image_url: 'https://cdn/a.webp', default_action: { url: 'https://tencerecim.store/a' } },
  { title: 'Thor Tava 28', subtitle: 'Fiyat: 1.290 TL', image_url: 'https://cdn/b.webp', buttons: [{ url: 'https://tencerecim.store/b' }] },
] } } }

describe('kartKaydi', () => {
  test('ilk kartı ek_* alanlarına, tamamını ham_ek JSON\'una yazar', () => {
    const k = kartKaydi(yuk, { kim: 'otomasyon' })
    expect(k.ek_tur).toBe('urun_karti')
    expect(k.ek_baslik).toBe('Sofram Soft 12 Parça ve 1 ürün daha')
    expect(k.ek_gorsel).toBe('https://cdn/a.webp')
    expect(k.ek_link).toBe('https://tencerecim.store/a')
    expect(k.metin).toBe('Fiyat: 3.490 TL · Ücretsiz kargo')
    const h = JSON.parse(k.ham_ek)
    expect(h.elements).toHaveLength(2)
    expect(h.kim).toBe('otomasyon')
    expect(h.elements[1].url).toBe('https://tencerecim.store/b')
  })
  test('tek kartta "ve N ürün daha" eki yok; link default_action yoksa ilk butondan', () => {
    const tek = { attachment: { payload: { elements: [yuk.attachment.payload.elements[1]] } } }
    const k = kartKaydi(tek, { kim: 'Ufuk' })
    expect(k.ek_baslik).toBe('Thor Tava 28')
    expect(k.ek_link).toBe('https://tencerecim.store/b')
  })
  test('boş/bozuk yük null döner', () => {
    expect(kartKaydi(null, {})).toBeNull()
    expect(kartKaydi({ attachment: { payload: { elements: [] } } }, {})).toBeNull()
    expect(kartKaydi({ text: 'düz metin' }, {})).toBeNull()
  })
})
