import { describe, it, expect } from 'vitest'
const { HARITA, DIGER, anaTip, sirala } = require('./ana-tip')

// Canlı veritabanından ÖLÇÜLEN kategori listesi + aktif ürün sayıları (2026-09-14,
// %APPDATA%\tencerecim\tencerecim.db). Tahmin değil. Burada SABİTLENİR ki harita
// bozulduğunda ya da yeni bir kategori haritaya eklenmeden açıldığında test kırmızı olsun.
const OLCUM = [
  ['Demir Döküm Tekli Tencereler', 550], ['Granit Tekli Tencereler', 260],
  ['Kaşık Çatal Bıçak', 242], ['Granit Tavalar', 211], ['Çaydanlık Takımları', 203],
  ['Çelik Tekli Tencereler', 127], ['Yemek Takımları', 107], ['Demir Döküm Izgaralar', 100],
  ['Demir Döküm Tavalar', 98], ['Granit Tencere Setleri', 93], ['Mutfak Gereçleri', 74],
  ['Klasik Düdüklüler', 57], ['Çelik Tencere Setleri', 53], ['Granit Sahanlar', 48],
  ['Bardak & Fincan', 41], ['Matik Düdüklüler', 37], ['Güveçler', 34], ['Titanyum Tavalar', 34],
  ['Servis & Sunum', 27], ['Titanyum Tekli Tencereler', 26], ['Kahvaltı Takımları', 26],
  ['Çelik Tavalar', 24], ['Seramik Tavalar', 22], ['Seramik Tekli Tencereler', 21],
  ['Termoslar', 21], ['Yedek Parçalar', 20], ['Kaçerola', 18], ['Cezveler', 16],
  ['Fırın Tepsileri', 15], ['Titanyum Sahanlar', 14], ['Çelik Sahanlar', 14],
  ['Karıştırma ve Saklama Kapları', 13], ['Seramik Tencere Setleri', 12], ['Sütlük', 12],
  ['Bıçaklar', 11], ['Kaseler', 9], ['Mega Çelikler', 7], ['Titanyum Tencere Setleri', 7],
  ['Demir Döküm Tencere Setleri', 7], ['Demir Döküm Sahanlar', 6], ['Izgaralar', 4],
  ['Mega Granitler', 4], ['Süper Hızlı Pişiriciler', 3], ['Rende Kapları', 3],
  ['Tart Kalıpları', 2], ['Süzgeçler', 1], ['Demir Döküm Güveçler', 0], ['OUTLET', 0],
]
const KATEGORISIZ = 172   // kategori_id NULL olan aktif ürün
const AKTIF_URUN = 2906   // toplam aktif ürün

describe('ana tip haritası', () => {
  it('48 kategorinin TAMAMI haritada karşılık bulur', () => {
    const eksik = OLCUM.filter(([ad]) => anaTip(ad) === null).map(([ad]) => ad)
    expect(eksik).toEqual([])
    expect(OLCUM).toHaveLength(48)
  })

  it('toplam korunumu: haritalanan + kategorisiz = aktif ürün', () => {
    const haritalanan = OLCUM.reduce((t, [, n]) => t + n, 0)
    expect(haritalanan).toBe(2734)
    expect(haritalanan + KATEGORISIZ).toBe(AKTIF_URUN)
  })

  it('21 ana tip vardır ve hiçbir kategori iki tipe birden düşmez', () => {
    expect(Object.keys(HARITA)).toHaveLength(21)
    const hepsi = Object.values(HARITA).flat()
    expect(new Set(hepsi).size).toBe(hepsi.length)
    expect(hepsi).toHaveLength(48)
  })

  it('ana tip başına ürün sayıları spec tablosuyla aynı', () => {
    const sayac = {}
    for (const [ad, n] of OLCUM) sayac[anaTip(ad)] = (sayac[anaTip(ad)] || 0) + n
    expect(sayac['Tencere']).toBe(995)   // malzeme ekseni birleşti (kullanıcı kararı)
    expect(sayac['Tava']).toBe(389)
    expect(sayac['Set']).toBe(172)
    expect(sayac['Çatal Kaşık Bıçak']).toBe(253) // Bıçaklar dahil
    expect(sayac['Outlet']).toBe(0)              // ürünü yok → kart çıkmaz
  })

  it('Mega Boy bir ÖLÇÜdür: Mega Granitler/Çelikler Tencere sayılır', () => {
    expect(anaTip('Mega Granitler')).toBe('Tencere')
    expect(anaTip('Mega Çelikler')).toBe('Tencere')
  })

  it('haritada olmayan kategori null döner — "Diğer" DEĞİL', () => {
    expect(anaTip('Uydurma Kategori')).toBeNull()
    expect(anaTip('')).toBeNull()
    expect(anaTip(null)).toBeNull()
    expect(anaTip('Uydurma Kategori')).not.toBe(DIGER)
  })

  it('baştaki/sondaki boşluk eşleşmeyi bozmaz', () => {
    expect(anaTip('  Cezveler  ')).toBe('Cezve')
  })

  it('sıralama: kasada sık kullanılan önde, "Diğer" DAİMA sonda', () => {
    expect(sirala(['Kase', 'Diğer', 'Tencere', 'Tava'])).toEqual(['Tencere', 'Tava', 'Kase', 'Diğer'])
    expect(sirala([DIGER, 'Set'])).toEqual(['Set', DIGER])
  })

  it('bilinmeyen tip sona düşer ama "Diğer"in önünde kalır', () => {
    expect(sirala(['Diğer', 'Zuhur Etmiş Tip', 'Tencere'])).toEqual(['Tencere', 'Zuhur Etmiş Tip', 'Diğer'])
  })
})
