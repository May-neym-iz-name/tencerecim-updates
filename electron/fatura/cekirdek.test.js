import { describe, test, expect, vi } from 'vitest'
const { faturaKes, _belgeTipiTahmin, FaturaCekirdekHatasi } = require('./cekirdek')

function sahteBagimlilik(gecersizKilinan = {}) {
  return {
    saglayici: { faturaGonder: vi.fn(async () => ({ guid: 'G1', url: 'U1' })) },
    rpc: {
      faturaKesBasla: vi.fn(async () => 'senk-1'),
      faturaKesBitir: vi.fn(async () => true),
      faturaKesTelafi: vi.fn(async () => true),
    },
    ayarlar: { firmId: 'F' },
    ...gecersizKilinan,
  }
}

function girdi(degisiklik = {}) {
  return {
    kanal: 'ikas',
    kanal_siparis_id: 'SIP-1',
    kullanici: 'burak',
    tarih: '2026-09-01',
    fatura_no: '',
    musteri: { id: 1, unvan: 'Deneme Ltd', adres: 'X Mah.', vergi_no: '1234567890' },
    kalemler: [
      { urun_senk_id: 'u-1', sku: 'TNC.LAV.00001', ad: 'Tencere', barkod: '869',
        miktar: 2, birim_fiyat: 120, kdv_orani: 20, satir_toplam: 240 },
    ],
    ...degisiklik,
  }
}

function saglayiciHatasi(kod, mesaj = 'patladı') {
  const e = new Error(mesaj); e.name = 'SaglayiciHatasi'; e.kod = kod; return e
}

describe('faturaKes — başarı', () => {
  test('sahiplenir, gönderir, tamam yazar', async () => {
    const b = sahteBagimlilik()
    const s = await faturaKes(girdi(), b)

    expect(b.rpc.faturaKesBasla).toHaveBeenCalledTimes(1)
    expect(b.saglayici.faturaGonder).toHaveBeenCalledTimes(1)
    expect(b.rpc.faturaKesBitir).toHaveBeenCalledWith(expect.objectContaining({
      senk_id: 'senk-1', durum: 'tamam', guid: 'G1', url: 'U1',
    }))
    expect(b.rpc.faturaKesTelafi).not.toHaveBeenCalled()
    expect(s).toMatchObject({ durum: 'tamam', guid: 'G1', url: 'U1', senk_id: 'senk-1' })
  })

  test('RPC kalemleri urun_senk_id, sağlayıcı kalemleri SKU taşır (aynı satir_toplam)', async () => {
    const b = sahteBagimlilik()
    await faturaKes(girdi(), b)

    const rpcKalem = b.rpc.faturaKesBasla.mock.calls[0][0].kalemler[0]
    const sagKalem = b.saglayici.faturaGonder.mock.calls[0][0].kalemler[0]
    expect(rpcKalem).toMatchObject({ urun_senk_id: 'u-1', urun_adi: 'Tencere', satir_toplam: 240 })
    expect(rpcKalem.sku).toBeUndefined()
    expect(sagKalem).toMatchObject({ sku: 'TNC.LAV.00001', satir_toplam: 240 })
    // Aynı tutar iki tarafa da gider: fatura ile kaydımız kuruşu kuruşuna tutar.
    expect(rpcKalem.satir_toplam).toBe(sagKalem.satir_toplam)
  })

  test('sağlayıcıya ayarlar (firmId) geçirilir', async () => {
    const b = sahteBagimlilik()
    await faturaKes(girdi(), b)
    expect(b.saglayici.faturaGonder.mock.calls[0][1]).toEqual({ firmId: 'F' })
  })
})

describe('faturaKes — iş hatası (KESİN başarısızlık)', () => {
  test('telafi ÇAĞRILIR, stok iade edilir', async () => {
    const b = sahteBagimlilik()
    b.saglayici.faturaGonder = vi.fn(async () => { throw saglayiciHatasi('is_hatasi', 'Hatalı para birimi') })

    const s = await faturaKes(girdi(), b)
    expect(b.rpc.faturaKesTelafi).toHaveBeenCalledWith(expect.objectContaining({ senk_id: 'senk-1' }))
    expect(b.rpc.faturaKesBitir).not.toHaveBeenCalled()
    expect(s).toMatchObject({ durum: 'hata' })
    expect(s.mesaj).toMatch(/para birimi/)
  })

  test('yapilandirma hatası da KESİN başarısızlıktır, telafi çalışır', async () => {
    const b = sahteBagimlilik()
    b.saglayici.faturaGonder = vi.fn(async () => { throw saglayiciHatasi('yapilandirma', 'firmId hatalı') })

    const s = await faturaKes(girdi(), b)
    expect(b.rpc.faturaKesTelafi).toHaveBeenCalled()
    expect(s.durum).toBe('hata')
  })
})

describe('faturaKes — ağ hatası (BELİRSİZ)', () => {
  test('telafi ÇAĞRILMAZ, belirsiz yazılır', async () => {
    const b = sahteBagimlilik()
    b.saglayici.faturaGonder = vi.fn(async () => { throw saglayiciHatasi('ag', 'sonuç doğrulanamadı') })

    const s = await faturaKes(girdi(), b)
    // 🔴 Faz 2'nin en kritik kararı: fatura kesilmiş OLABİLİR. Stok iade edilirse
    // hem stok hem fatura iki kez sayılır.
    expect(b.rpc.faturaKesTelafi).not.toHaveBeenCalled()
    expect(b.rpc.faturaKesBitir).toHaveBeenCalledWith(expect.objectContaining({
      senk_id: 'senk-1', durum: 'belirsiz',
    }))
    expect(s).toMatchObject({ durum: 'belirsiz' })
  })

  test('kod taşımayan beklenmedik hata da BELİRSİZ sayılır', async () => {
    const b = sahteBagimlilik()
    b.saglayici.faturaGonder = vi.fn(async () => { throw new Error('beklenmedik') })

    const s = await faturaKes(girdi(), b)
    // Sınıflandıramadığımız hatada "kesinlikle olmadı" varsayımı stok/fatura
    // mükerrerliği üretir; güvenli taraf belirsizdir.
    expect(b.rpc.faturaKesTelafi).not.toHaveBeenCalled()
    expect(s.durum).toBe('belirsiz')
  })

  test('telafi kendisi patlarsa asıl hata kaybolmaz', async () => {
    const b = sahteBagimlilik()
    b.saglayici.faturaGonder = vi.fn(async () => { throw saglayiciHatasi('is_hatasi', 'reddedildi') })
    b.rpc.faturaKesTelafi = vi.fn(async () => { throw new Error('telafi çöktü') })

    const s = await faturaKes(girdi(), b)
    expect(s.durum).toBe('hata')
    expect(s.mesaj).toMatch(/reddedildi/)
    expect(s.telafi_yapilamadi).toBe(true)
  })
})

describe('faturaKes — guardlar (sahiplenmeden ÖNCE)', () => {
  test('kalemsiz siparişte ağa da RPC\'ye de çıkılmaz', async () => {
    const b = sahteBagimlilik()
    await expect(faturaKes(girdi({ kalemler: [] }), b)).rejects.toThrow(/kalem/i)
    expect(b.rpc.faturaKesBasla).not.toHaveBeenCalled()
    expect(b.saglayici.faturaGonder).not.toHaveBeenCalled()
  })

  test('SKU\'su boş kalemde sahiplenme YAPILMAZ ve ürün adı mesajda geçer', async () => {
    const b = sahteBagimlilik()
    const g = girdi()
    g.kalemler[0].sku = ''
    await expect(faturaKes(g, b)).rejects.toThrow(/Tencere/)
    expect(b.rpc.faturaKesBasla).not.toHaveBeenCalled()
  })

  test('urun_senk_id yoksa sahiplenme YAPILMAZ (stok düşümü hedefsiz kalır)', async () => {
    const b = sahteBagimlilik()
    const g = girdi()
    delete g.kalemler[0].urun_senk_id
    await expect(faturaKes(g, b)).rejects.toThrow(/bulut kimliği|senk/i)
    expect(b.rpc.faturaKesBasla).not.toHaveBeenCalled()
  })

  test('müşteri ünvanı yoksa sahiplenme YAPILMAZ', async () => {
    const b = sahteBagimlilik()
    await expect(faturaKes(girdi({ musteri: { id: 1, adres: 'X' } }), b)).rejects.toThrow(/ünvan/i)
    expect(b.rpc.faturaKesBasla).not.toHaveBeenCalled()
  })

  test('RPC yetersiz stok derse sağlayıcıya HİÇ gidilmez', async () => {
    const b = sahteBagimlilik()
    const e = new Error('YETERSIZ_STOK: Tencere için 3 adet fatura stoğu eksik')
    e.kod = 'yetersiz_stok'
    b.rpc.faturaKesBasla = vi.fn(async () => { throw e })

    await expect(faturaKes(girdi(), b)).rejects.toThrow(/eksik/)
    expect(b.saglayici.faturaGonder).not.toHaveBeenCalled()
  })
})

describe('_belgeTipiTahmin', () => {
  test('10 haneli VKN → e_fatura adayı, 11 haneli TCKN → e_arsiv adayı', () => {
    expect(_belgeTipiTahmin('1234567890')).toBe('e_fatura')
    expect(_belgeTipiTahmin('12345678901')).toBe('e_arsiv')
  })

  test('vergi kimliği yoksa tahmin YAPILMAZ (null)', () => {
    // Tahmini kesin bilgi gibi yazmıyoruz; belge_tipi_kaynak zaten 'tahmin'.
    expect(_belgeTipiTahmin('')).toBe(null)
    expect(_belgeTipiTahmin(undefined)).toBe(null)
    expect(_belgeTipiTahmin('123')).toBe(null)
  })
})
