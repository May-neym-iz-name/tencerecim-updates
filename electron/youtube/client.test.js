import { describe, test, expect, beforeEach } from 'vitest'

// CommonJS destructure eden bağımlılıklar vi.mock ile mock'lanamıyor (ESM-centric,
// CJS destructure'ı görmüyor) — çalışan desen require.cache'i modül yüklenmeden
// önce yer değiştirmek. Aynı gerekçe: electron/db/fatura-stok-kaydet.test.js.
const ayar = { store: {} }

const ayarPath = require.resolve('../db/youtube-ayarlar')
require.cache[ayarPath] = {
  id: ayarPath, filename: ayarPath, loaded: true,
  exports: {
    _ayarlariGetir: () => ({ ...ayar.store }),
    _ayarKaydetTek: (k, v) => { ayar.store[k] = v == null ? '' : String(v) },
    _baglantiSil: () => {},
  },
}

const client = require('./client')

const KIMLIK = { client_id: 'cid', client_secret: 'csecret', refresh_token: 'rt-kalici' }
const DK = 60 * 1000

beforeEach(() => {
  ayar.store = { ...KIMLIK }
  client.cacheSifirla()
})

// yenilemeGerekli, ağ çağrısının içinden çıkarılmış SAF karardır. Buradaki
// eşik yanlışsa, uzun süren bir video yüklemesi ortasında token ölür ve
// istek 401 alır — testin asıl koruduğu davranış budur.
describe('yenilemeGerekli — token yenileme politikası', () => {
  const SIMDI = 1_000_000_000_000

  test('bitişe uzun süre varsa yenileme gerekmez', () => {
    expect(client.yenilemeGerekli(SIMDI + 60 * DK, SIMDI)).toBe(false)
  })

  test('süresi dolmuş token yenilenir', () => {
    expect(client.yenilemeGerekli(SIMDI - 1, SIMDI)).toBe(true)
  })

  test('token hâlâ geçerli ama payın İÇİNDEyse ÖNCEDEN yenilenir', () => {
    // Bitişe 1 dakika var: geçerli, ama 5 dakikalık payın içinde.
    expect(client.yenilemeGerekli(SIMDI + 1 * DK, SIMDI)).toBe(true)
  })

  test('payın tam sınırında yenilenir (sınır dahil)', () => {
    expect(client.yenilemeGerekli(SIMDI + client.YENILEME_PAYI_MS, SIMDI)).toBe(true)
  })

  test('payın hemen dışında yenilenmez (gereksiz yenileme yapılmaz)', () => {
    expect(client.yenilemeGerekli(SIMDI + client.YENILEME_PAYI_MS + 1, SIMDI)).toBe(false)
  })

  test('hiç token alınmamışsa (bitiş yok) yenileme gerekir', () => {
    expect(client.yenilemeGerekli(null, SIMDI)).toBe(true)
    expect(client.yenilemeGerekli(0, SIMDI)).toBe(true)
    expect(client.yenilemeGerekli(undefined, SIMDI)).toBe(true)
  })
})

describe('accessTokenAl — ağa çıkmadan çözülen durumlar', () => {
  test('token uzun süre geçerliyse mevcut token döner', async () => {
    ayar.store.access_token = 'at-mevcut'
    ayar.store.token_bitis = String(Date.now() + 60 * DK)

    await expect(client.accessTokenAl()).resolves.toBe('at-mevcut')
  })

  test('client_id/secret yoksa açık hata verir', async () => {
    ayar.store = { refresh_token: 'rt' }
    await expect(client.accessTokenAl()).rejects.toThrow(/Client ID\/Secret girilmemiş/)
  })

  test('refresh_token yoksa "bağlanın" der', async () => {
    ayar.store = { client_id: 'cid', client_secret: 'cs' }
    await expect(client.accessTokenAl()).rejects.toThrow(/YouTube'a Bağlan/)
  })

  test('eksik kurulum hataları kod "yetki" taşır (arayüz ayırt edebilsin)', async () => {
    ayar.store = { client_id: 'cid', client_secret: 'cs' }
    await expect(client.accessTokenAl()).rejects.toMatchObject({ kod: 'yetki' })
  })
})

// Kota hatası ile gerçek arıza karıştırılırsa yanlış teşhis konur:
// "yarın tekrar dene" ile "bir şey bozuldu" bambaşka işlerdir.
describe('hataCevir — hata sınıflandırması', () => {
  test('quotaExceeded → kod "kota"', () => {
    const e = client.hataCevir({ error: { message: 'quota', errors: [{ reason: 'quotaExceeded' }] } }, 403)
    expect(e.kod).toBe('kota')
    expect(e.message).toMatch(/kota/i)
  })

  test('dailyLimitExceeded → kod "kota"', () => {
    const e = client.hataCevir({ error: { message: 'limit', errors: [{ reason: 'dailyLimitExceeded' }] } }, 403)
    expect(e.kod).toBe('kota')
  })

  test('invalid_grant → kod "yetki" (yetki iptal edilmiş, yeniden bağlan)', () => {
    const e = client.hataCevir({ error: 'invalid_grant' }, 400)
    expect(e.kod).toBe('yetki')
    expect(e.message).toMatch(/Yeniden bağlanın/)
  })

  test('sıradan API hatası kota/yetki olarak işaretlenmez', () => {
    const e = client.hataCevir({ error: { message: 'video bulunamadı', errors: [{ reason: 'videoNotFound' }] } }, 404)
    expect(e.kod).toBeUndefined()
    expect(e.message).toContain('videoNotFound')
  })

  test('gövdesiz/bozuk yanıt yutulmaz, hata döner', () => {
    const e = client.hataCevir(null, 502)
    expect(e).toBeInstanceOf(Error)
    expect(e.message).toContain('502')
  })
})

describe('durum — ucuz bağlantı sorgusu', () => {
  test('DB durumunu bildirir', () => {
    ayar.store = { ...KIMLIK, kanal_id: 'UC123', kanal_adi: 'Tencerecim' }

    expect(client.durum()).toMatchObject({
      kimlik_girildi: true, bagli: true, kanal_id: 'UC123', kanal_adi: 'Tencerecim',
    })
  })

  test('refresh_token yoksa bagli=false', () => {
    ayar.store = { client_id: 'cid', client_secret: 'cs' }
    expect(client.durum().bagli).toBe(false)
  })

  test('hiçbir şey girilmemişse kimlik_girildi=false', () => {
    ayar.store = {}
    expect(client.durum()).toMatchObject({ kimlik_girildi: false, bagli: false })
  })
})
