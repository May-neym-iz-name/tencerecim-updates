// İstek PDF'inin HTML üreten saf kısmı — DB/electron'suz (emsal: raporlar.test.js).
import { describe, test, expect } from 'vitest'
import istekPdf from './istek-pdf.js'

const { _istekHtml: html } = istekPdf

const liste = (over = {}) => ({
  lokasyon_adi: 'Merkez Şube',
  lokasyon_adres: 'Atatürk Cad. No:1 Karşıyaka/İzmir',
  tedarikci_adi: 'Saflon',
  tarih: '2026-07-23',
  kalemler: [
    { urun_adi: 'Granit Tencere 24cm', miktar: 12 },
    { urun_adi: 'Çelik Kaşık Seti', miktar: 5 },
  ],
  ...over,
})

describe('_istekHtml', () => {
  test('şube adı + adresi + tedarikçi başlıkta geçer', () => {
    const h = html(liste(), '')
    expect(h).toContain('Merkez Şube')
    expect(h).toContain('Karşıyaka')
    expect(h).toContain('Saflon')
  })

  test('tüm kalemlerin tam adı + adedi geçer', () => {
    const h = html(liste(), '')
    expect(h).toContain('Granit Tencere 24cm')
    expect(h).toContain('12')
    expect(h).toContain('Çelik Kaşık Seti')
    expect(h).toContain('5')
  })

  test('logo verilirse <img> gömülür, verilmezse gömülmez', () => {
    expect(html(liste(), 'data:image/png;base64,AAA')).toContain('data:image/png;base64,AAA')
    expect(html(liste(), '')).not.toContain('<img')
  })

  test('HTML kaçış: ürün adındaki < & kaçırılır', () => {
    const h = html(liste({ kalemler: [{ urun_adi: 'A < B & C', miktar: 1 }] }), '')
    expect(h).toContain('A &lt; B &amp; C')
    expect(h).not.toContain('A < B & C')
  })

  test('boş liste patlamaz', () => {
    expect(() => html(liste({ kalemler: [] }), '')).not.toThrow()
  })
})
