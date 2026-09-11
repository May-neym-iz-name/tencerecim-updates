import { describe, test, expect } from 'vitest'
import denetim from './denetim.js'

const KAYNAK = '<p>Altınbaşak Mega Granit 34 cm Karnıyarık Tenceresi. Granit kaplama, '
  + 'yapışmaz yüzey, ergonomik kulplar. Karnıyarık ve güveç için uygundur.</p>'
const AD = 'Altınbaşak Mega Granit 34 cm Karnıyarık Tenceresi (7 Lt)'

describe('doğruluk denetimi — sayılar', () => {
  test('kaynaktaki ve addaki sayılar geçerli', () => {
    const r = denetim.denetle('34 cm genişliğinde, 7 litre hacimli granit tencere.', KAYNAK, AD)
    expect(r.temiz).toBe(true)
  })

  test('UYDURMA ölçü yakalanır', () => {
    const r = denetim.denetle('40 cm genişliğinde granit tencere.', KAYNAK, AD)
    expect(r.temiz).toBe(false)
    expect(r.bulgular.join(' ')).toMatch(/UYDURMA SAYI.*40/)
  })

  test('uydurma çelik kalitesi yakalanır', () => {
    const r = denetim.denetle('304 kalite malzemeden üretilmiştir.', KAYNAK, AD)
    expect(r.temiz).toBe(false)
    expect(r.bulgular.join(' ')).toMatch(/304/)
  })

  test('küçük sayılar ("1 adet") gürültü üretmez', () => {
    const r = denetim.denetle('1 adet gövde ve 2 kulp içerir. 34 cm.', KAYNAK, AD)
    expect(r.temiz).toBe(true)
  })

  test('ondalık ayırıcı farkı sorun çıkarmaz', () => {
    const r = denetim.denetle('7,0 litre hacim.', KAYNAK, AD)
    expect(r.temiz).toBe(true)
  })
})

describe('doğruluk denetimi — teknik iddialar', () => {
  test('kaynakta olmayan indüksiyon iddiası yakalanır', () => {
    const r = denetim.denetle('İndüksiyon ocaklarda kullanılabilir.', KAYNAK, AD)
    expect(r.temiz).toBe(false)
    expect(r.bulgular.join(' ')).toMatch(/DESTEKSİZ İDDİA.*ndüksiyon/)
  })

  test('kaynakta olmayan garanti iddiası yakalanır', () => {
    const r = denetim.denetle('2 yıl garantilidir.', KAYNAK, AD)
    expect(r.temiz).toBe(false)
    expect(r.bulgular.join(' ')).toMatch(/garanti/)
  })

  test('kaynakta olmayan bulaşık makinesi iddiası yakalanır', () => {
    const r = denetim.denetle('Bulaşık makinesinde yıkanabilir.', KAYNAK, AD)
    expect(r.temiz).toBe(false)
  })

  test('kaynakta GEÇEN iddia serbesttir', () => {
    const kaynak = '<p>Paslanmaz çelik gövde, indüksiyon tabanlı.</p>'
    const r = denetim.denetle('Paslanmaz çelik gövdesi ve indüksiyon tabanı vardır.', kaynak, 'Tencere')
    expect(r.temiz).toBe(true)
  })

  test('büyük/küçük harf farkı kaçırmaz (Türkçe I/İ)', () => {
    const r = denetim.denetle('İNDÜKSİYON uyumludur.', KAYNAK, AD)
    expect(r.temiz).toBe(false)
  })
})

describe('doğruluk denetimi — fiyat sızıntısı', () => {
  test('TL geçerse yakalanır', () => {
    const r = denetim.denetle('Sadece 2850 TL.', KAYNAK + ' 2850', AD)
    expect(r.temiz).toBe(false)
    expect(r.bulgular.join(' ')).toMatch(/FİYAT/)
  })

  test('kampanya sözü yakalanır', () => {
    const r = denetim.denetle('Ücretsiz kargo fırsatı.', KAYNAK, AD)
    expect(r.temiz).toBe(false)
  })
})

describe('HTML indirgeme', () => {
  test('imza yorumu metne karışmaz', () => {
    const d = denetim.duzMetin('<!--tnc-sablon-v1--><p>Merhaba</p>')
    expect(d).toBe('Merhaba')
  })
})

describe('rozet satırı denetim dışıdır', () => {
  const SABLON = '<!--tnc-sablon-v1--><div style="font-family:x">'
    + '<p>34 cm granit tencere.</p>'
    + '<details><summary>🍲 Ürün İçeriği</summary><div>Granit gövde.</div></details>'
    + '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">'
    + '<span>🛡️ 2 Yıl Garanti</span></div></div>'

  test('rozetteki "garanti" desteksiz iddia SAYILMAZ', () => {
    const kaynak = '<p>34 cm granit tencere, granit gövde.</p>'
    const r = denetim.denetle(denetim.rozetleriCikar(SABLON), kaynak, 'Granit Tencere 34 cm')
    expect(r.temiz).toBe(true)
  })

  test('rozet çıkarılmazsa yanlış alarm verir (11.09 hatası)', () => {
    const kaynak = '<p>34 cm granit tencere, granit gövde.</p>'
    const r = denetim.denetle(SABLON, kaynak, 'Granit Tencere 34 cm')
    expect(r.temiz).toBe(false)
    expect(r.bulgular.join(' ')).toMatch(/garanti/)
  })

  test('rozet çıkarma GEMİNİ metnini kırpmaz', () => {
    const cikan = denetim.duzMetin(denetim.rozetleriCikar(SABLON))
    expect(cikan).toContain('34 cm granit tencere')
    expect(cikan).toContain('Granit gövde')
    expect(cikan).not.toContain('Garanti')
  })
})
