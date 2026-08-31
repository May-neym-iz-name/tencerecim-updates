import { describe, test, expect, vi, beforeEach } from 'vitest'

// 'alis-fatura:kaydet' handler'ı için testler. Bu handler I1 (mal_kabul_senk_id
// sessizce düşüyordu) ve I2 (kullanici alanı hiç doldurulmuyordu) bulgularının
// tam olarak yaşadığı yerdi — sadece `_durumBirlestir`'i sınayan
// fatura-stok.test.js bu iki bulguyu YAKALAYAMADI çünkü hiçbir IPC handler'ı
// test edilmiyordu. Bu dosya o boşluğu kapatır.
//
// CommonJS destructure eden bağımlılıklar (getDb, _yetkiKontrol, _aktifKimlik,
// alis.kaydet, FaturaHatasi) vi.mock ile mock'lanamıyor (ESM-centric, CJS
// destructure'ı görmüyor) — çalışan desen require.cache'i setup'tan önce
// yer değiştirmek (bkz. electron/fatura/okuma.test.js, aynı gerekçe).

// --- ./database mock: getDb().prepare(sql).get(id) sorgu metnine göre yanıtlar ---
const urunSenkMap = {}      // urun_id -> { senk_id }
const tedarikciMap = {}     // tedarikci_id -> { ad, senk_id }
const malKabulMap = {}      // mal_kabul_id -> { senk_id }

const mockGetDb = vi.fn(() => ({
  prepare: (sql) => ({
    get: (id) => {
      if (sql.includes('FROM urunler')) return urunSenkMap[id]
      if (sql.includes('FROM tedarikciler')) return tedarikciMap[id]
      if (sql.includes('FROM mal_kabuller')) return malKabulMap[id]
      throw new Error(`beklenmeyen sorgu mock'landı: ${sql}`)
    },
  }),
}))

const databasePath = require.resolve('./database')
require.cache[databasePath] = {
  id: databasePath, filename: databasePath, loaded: true,
  exports: { getDb: mockGetDb },
}

// --- ../yetki mock: yetkiKontrol hep geçer, kimlik sabit ---
let aktifKimlikDeger = { uid: 'uid-1', eposta: 'muhasebe@tencerecim.com' }
const sahteYetkiKontrol = vi.fn()
const yetkiPath = require.resolve('../yetki')
require.cache[yetkiPath] = {
  id: yetkiPath, filename: yetkiPath, loaded: true,
  exports: {
    _yetkiKontrol: sahteYetkiKontrol,
    _aktifKimlik: () => aktifKimlikDeger,
  },
}

// --- ../fatura/alis mock: kaydet() çağrısını yakalar ---
const mockAlisKaydet = vi.fn()
const alisPath = require.resolve('../fatura/alis')
require.cache[alisPath] = {
  id: alisPath, filename: alisPath, loaded: true,
  exports: { kaydet: (...args) => mockAlisKaydet(...args) },
}

// --- ../fatura/bulut mock: FaturaHatasi sınıfı, gerçek instanceof kontrolü çalışsın diye ---
class FaturaHatasi extends Error {
  constructor(mesaj, kod, ayrinti, status) {
    super(mesaj)
    this.name = 'FaturaHatasi'
    this.kod = kod
    this.ayrinti = ayrinti
    this.status = status
  }
}
const bulutPath = require.resolve('../fatura/bulut')
require.cache[bulutPath] = {
  id: bulutPath, filename: bulutPath, loaded: true,
  exports: { FaturaHatasi, rpc: vi.fn(), sec: vi.fn() },
}

const { 'alis-fatura:kaydet': alisFaturaKaydet } = require('./fatura-stok')

function temelVeri(ekstra = {}) {
  return {
    tedarikci_id: null,
    fatura_no: 'F-1',
    fatura_tarihi: '2026-08-31',
    mal_kabul_id: null,
    kalemler: [{ urun_id: 1, urun_adi: 'Tencere', miktar: 1, birim_fiyat: 100, kdv_orani: 20 }],
    ...ekstra,
  }
}

beforeEach(() => {
  mockAlisKaydet.mockReset()
  mockAlisKaydet.mockResolvedValue({ ok: true })
  sahteYetkiKontrol.mockReset()
  Object.keys(urunSenkMap).forEach(k => delete urunSenkMap[k])
  Object.keys(tedarikciMap).forEach(k => delete tedarikciMap[k])
  Object.keys(malKabulMap).forEach(k => delete malKabulMap[k])
  urunSenkMap[1] = { senk_id: 'urun-senk-1' }
  aktifKimlikDeger = { uid: 'uid-1', eposta: 'muhasebe@tencerecim.com' }
})

function gecerliVeri(ekstra = {}) {
  return temelVeri(ekstra)
}

describe('alis-fatura:kaydet', () => {
  test('urun_id → senk_id eşlemesi doğru yapılır', async () => {
    await alisFaturaKaydet(temelVeri())
    const [gonderilen] = mockAlisKaydet.mock.calls[0]
    expect(gonderilen.urunSenkIdler).toEqual({ 1: 'urun-senk-1' })
  })

  // I1 regresyon koruması
  test('mal_kabul_id verilmişse → senk_id eşlemesi doğru yapılır ve alis.kaydet\'e geçilir', async () => {
    malKabulMap[42] = { senk_id: 'mk-senk-42' }
    await alisFaturaKaydet(temelVeri({ mal_kabul_id: 42 }))
    const [gonderilen] = mockAlisKaydet.mock.calls[0]
    expect(gonderilen.mal_kabul_senk_id).toBe('mk-senk-42')
  })

  test('mal_kabul_id verilmemişse mal_kabul_senk_id null geçilir', async () => {
    await alisFaturaKaydet(temelVeri({ mal_kabul_id: null }))
    const [gonderilen] = mockAlisKaydet.mock.calls[0]
    expect(gonderilen.mal_kabul_senk_id).toBeNull()
  })

  test('mal_kabul_id verilmiş ama buluta eşitlenmemişse (senk_id yok) HATA ATMAZ, null geçer ve uyarı loglar', async () => {
    // malKabulMap[99] bilerek tanımsız bırakıldı: mal kabul bağı OPSİYONEL,
    // tedarikçi/ürünün aksine faturayı durdurmuyoruz — ama sessiz de kalmıyoruz.
    const uyarSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(alisFaturaKaydet(temelVeri({ mal_kabul_id: 99 }))).resolves.toEqual({ ok: true })
    const [gonderilen] = mockAlisKaydet.mock.calls[0]
    expect(gonderilen.mal_kabul_senk_id).toBeNull()
    expect(uyarSpy).toHaveBeenCalled()
    uyarSpy.mockRestore()
  })

  // I2 regresyon koruması
  test('kullanici alanı aktif oturumun e-postasıyla doldurulur (renderer\'dan ALINMAZ)', async () => {
    aktifKimlikDeger = { uid: 'uid-9', eposta: 'baska@tencerecim.com' }
    // Renderer'dan farklı/sahte bir kullanici gelse bile main kendi kimliğini kullanmalı.
    await alisFaturaKaydet(temelVeri({ kullanici: 'sahte@disaridan.com' }))
    const [gonderilen] = mockAlisKaydet.mock.calls[0]
    expect(gonderilen.kullanici).toBe('baska@tencerecim.com')
  })

  test('aktif kimlik yoksa (eposta null) kullanici null geçilir, çökmez', async () => {
    aktifKimlikDeger = { uid: null, eposta: null }
    await alisFaturaKaydet(temelVeri())
    const [gonderilen] = mockAlisKaydet.mock.calls[0]
    expect(gonderilen.kullanici).toBeNull()
  })

  test('ürünün senk_id\'si yoksa Türkçe hata atılır', async () => {
    urunSenkMap[1] = undefined
    await expect(alisFaturaKaydet(temelVeri())).rejects.toThrow('Ürün buluta henüz eşitlenmemiş: Tencere')
    expect(mockAlisKaydet).not.toHaveBeenCalled()
  })

  test('tedarikçi verilmiş ama senk_id yoksa Türkçe hata atılır', async () => {
    tedarikciMap[7] = { ad: 'ACME', senk_id: null }
    await expect(alisFaturaKaydet(temelVeri({ tedarikci_id: 7 })))
      .rejects.toThrow('Tedarikçi buluta henüz eşitlenmemiş: ACME')
    expect(mockAlisKaydet).not.toHaveBeenCalled()
  })

  test('tedarikçi verilmiş ve senk_id varsa doğru şekilde geçilir', async () => {
    tedarikciMap[7] = { ad: 'ACME', senk_id: 'ted-senk-7' }
    await alisFaturaKaydet(temelVeri({ tedarikci_id: 7 }))
    const [gonderilen] = mockAlisKaydet.mock.calls[0]
    expect(gonderilen.tedarikci_senk_id).toBe('ted-senk-7')
  })

  // I4 regresyon koruması: FaturaHatasi kodları doğru Türkçe mesaja çevrilir
  test('kod=cakisma Türkçe mesaja çevrilir', async () => {
    mockAlisKaydet.mockRejectedValue(new FaturaHatasi('duplicate key', 'cakisma', { code: '23505' }, 409))
    await expect(alisFaturaKaydet(temelVeri()))
      .rejects.toThrow('Bu fatura numarası bu tedarikçi için zaten girilmiş.')
  })

  // Regresyon koruması: Türkçe mesaja çevrilirken `kod` alanı yeni Error
  // nesnesine kopyalanmazsa IPC sınırını geçen `kod` her zaman null olur —
  // Faz 2'nin "'ag' ise stok telafisi yapma" kararı bu alana dayanıyor.
  test('kod=cakisma çeviriden sonra da hata.kod korunur', async () => {
    mockAlisKaydet.mockRejectedValue(new FaturaHatasi('duplicate key', 'cakisma', { code: '23505' }, 409))
    let yakalanan
    try {
      await alisFaturaKaydet(temelVeri())
    } catch (e) {
      yakalanan = e
    }
    expect(yakalanan.kod).toBe('cakisma')
  })

  test('kod=dogrulama (SATIR_TOPLAM_UYUSMUYOR) Türkçe mesaja çevrilir, yetersiz_stok ile KARIŞMAZ', async () => {
    mockAlisKaydet.mockRejectedValue(
      new FaturaHatasi('Sunucu hatası: SATIR_TOPLAM_UYUSMUYOR', 'dogrulama', { message: 'SATIR_TOPLAM_UYUSMUYOR' }, 400))
    await expect(alisFaturaKaydet(temelVeri()))
      .rejects.toThrow('Satır tutarları uyuşmuyor, lütfen miktar ve birim fiyatları kontrol edin.')
  })

  test('kod=yetersiz_stok Türkçe mesaja çevrilir', async () => {
    mockAlisKaydet.mockRejectedValue(new FaturaHatasi('Sunucu hatası: YETERSIZ_STOK', 'yetersiz_stok', {}, 400))
    await expect(alisFaturaKaydet(temelVeri()))
      .rejects.toThrow('Stok yetersiz, fatura kaydedilemedi.')
  })

  // I5 regresyon koruması: 'ag' artık kesinlik iddia etmiyor
  test('kod=ag mesajı "kaydedilmedi" DEMEZ, sonucun doğrulanamadığını söyler', async () => {
    mockAlisKaydet.mockRejectedValue(new FaturaHatasi('Sunucuya ulaşılamadı: timeout', 'ag', null, null))
    let yakalanan
    try {
      await alisFaturaKaydet(temelVeri())
    } catch (e) {
      yakalanan = e
    }
    expect(yakalanan).toBeDefined()
    expect(yakalanan.message).toMatch(/doğrulanamadı/)
    expect(yakalanan.message).not.toMatch(/kaydedilmedi/)
    // IPC sınırını geçmesi için: main.js'teki catch bloğu err.kod'u okuyup
    // renderer'a taşıyor. Türkçe mesaja çevrilirken bu alan KAYBOLURSA
    // ('ag' ise stok telafisi yapma kararı) renderer hep kod=null görür.
    expect(yakalanan.kod).toBe('ag')
  })
})

// Güvenlik regresyon koruması: bu kontrol daha önce hiçbir handler testi
// tarafından doğrulanmıyordu (fatura-stok.test.js sadece saf _durumBirlestir'i
// sınıyor) — yetkiKontrol çağrısı silinse bile testler yeşil kalırdı.
describe('yetki kontrolü', () => {
  test('alis-fatura:kaydet fatura_stok_duzenle yetkisi ister', async () => {
    await alisFaturaKaydet(gecerliVeri()).catch(() => {})
    expect(sahteYetkiKontrol).toHaveBeenCalledWith('fatura_stok_duzenle')
  })
})
