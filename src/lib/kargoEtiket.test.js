// Kargo etiketi HTML üretimi — A4 (varsayılan) ve termal (dikey barkod) düzenler.
import { describe, test, expect } from 'vitest'
import { kargoEtiketHtml } from './kargoEtiket'

const veri = {
  siparis_no: 'SIP-123', takip_no: '1Z999', kargo_firma: 'UPS',
  musteri_ad: 'Ayşe Yılmaz', musteri_telefon: '(555) 111 22 33',
  teslimat_adres: 'Çınar Mah. No:5', teslimat_ilce: 'Gölcük', teslimat_il: 'Kocaeli',
  siparis_tarihi: '13.08.2026 10:00', odeme_yontemi: 'Kredi Kartı',
  barkodSvg: '<svg viewBox="0 0 200 32"></svg>',
  kalemler: Array.from({ length: 10 }, (_, i) => ({ ad: `Ürün ${i + 1}`, miktar: 2, birim_fiyat: 100, sku: `TNC.X.${i}` })),
}

describe('kargoEtiketHtml', () => {
  test('varsayılan (A4) düzen değişmedi: yazdır butonu + tablo var, @page yok', () => {
    const h = kargoEtiketHtml(veri)
    expect(h).toContain('window.print()')
    expect(h).toContain('<table>')
    expect(h).not.toContain('@page')
  })

  test('termal düzen: sayfa ölçüsü ayarlardan gelir, barkod dikey şeritte', () => {
    const h = kargoEtiketHtml(veri, { termal: true, genislikMm: 100, yukseklikMm: 135 })
    expect(h).toContain('size: 100mm 135mm')
    expect(h).toContain('rotate(90deg)')
    expect(h).toContain('dikey-kutu')
    expect(h).toContain('1Z999')
    expect(h).toContain('Ayşe Yılmaz')
  })

  test('termal düzende kalem sınırı: 8 yazılır, kalanı özetlenir', () => {
    const h = kargoEtiketHtml(veri, { termal: true })
    expect(h).toContain('Ürün 8')
    expect(h).not.toContain('Ürün 9')
    expect(h).toContain('+2 kalem daha')
  })

  test('takip no yoksa termal etikette barkod şeridi çıkmaz', () => {
    // CSS sınıf tanımı her zaman durur; ŞERİT div'inin kendisi (class="dikey-kutu") olmamalı.
    const h = kargoEtiketHtml({ ...veri, takip_no: null }, { termal: true })
    expect(h).not.toContain('class="dikey-kutu"')
  })
})
