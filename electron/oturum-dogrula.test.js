// Yetki sahteciliğine karşı asıl bariyer. Buradaki tek soru şu:
// main process rolü RENDERER'IN SÖYLEDİĞİNDEN mi, yoksa SUPABASE'DEN mi alıyor?
//
// Eski davranışta renderer `{rol:'super_admin'}` gönderiyordu ve main ona
// koşulsuz güveniyordu; DevTools'tan tek satırla tüm müşteri verisine ve API
// secret'larına erişilebiliyordu.
import { describe, it, expect, beforeEach } from 'vitest'
const { olusturDogrulayici, jwtSub } = require('./oturum-dogrula.js')

// Test jetonu: imzası sahte, ama payload'ı gerçek base64url. Sadece `sub`
// okumak için kullanılıyor — doğrulama zaten Supabase'de yapılıyor.
function sahteJwt(sub) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  return `${b64({ alg: 'HS256' })}.${b64({ sub })}.imzayok`
}

const TOKEN = sahteJwt('kullanici-1')
const PROFIL = { rol: 'personel', izinler: null, izinli_lokasyonlar: [3], aktif: true }

// Kurulabilir sahte bağımlılıklar
function kur({ istek, onbellek = null, simdi = 1_000_000 }) {
  const durum = { onbellek, silindi: false, yazilan: null }
  const dogrulayici = olusturDogrulayici({
    istek,
    onbellekOku: () => durum.onbellek,
    onbellekYaz: (v) => { durum.yazilan = v; durum.onbellek = v },
    onbellekSil: () => { durum.silindi = true; durum.onbellek = null },
    simdi: () => simdi,
  })
  return { dogrulayici, durum }
}

const SAAT = 60 * 60 * 1000

describe('jwtSub', () => {
  it('token payload icinden kullanici id okur', () => {
    expect(jwtSub(TOKEN)).toBe('kullanici-1')
  })

  it('bozuk tokende null doner, patlamaz', () => {
    expect(jwtSub('abc')).toBeNull()
    expect(jwtSub(null)).toBeNull()
    expect(jwtSub('a.b.c')).toBeNull()
  })
})

describe('dogrula — cevrimici', () => {
  it('rolu SUPABASE\'den alir, renderer ne gonderirse gondersin', async () => {
    const { dogrulayici } = kur({
      istek: async (yol) => {
        if (yol.includes('/auth/v1/user')) return { durum: 200, govde: { id: 'kullanici-1' } }
        return { durum: 200, govde: [PROFIL] }
      },
    })
    const sonuc = await dogrulayici(TOKEN)
    expect(sonuc.profil.rol).toBe('personel')
    expect(sonuc.kaynak).toBe('supabase')
  })

  it('gecerli dogrulamayi onbellege yazar', async () => {
    const { dogrulayici, durum } = kur({
      istek: async (yol) => yol.includes('/auth/v1/user')
        ? { durum: 200, govde: { id: 'kullanici-1' } }
        : { durum: 200, govde: [PROFIL] },
    })
    await dogrulayici(TOKEN)
    expect(durum.yazilan.uid).toBe('kullanici-1')
    expect(durum.yazilan.profil.rol).toBe('personel')
    expect(durum.yazilan.dogrulanma).toBe(1_000_000)
  })

  it('gecersiz token (401) reddeder ve onbellegi siler', async () => {
    const { dogrulayici, durum } = kur({
      istek: async () => ({ durum: 401, govde: { message: 'invalid token' } }),
      onbellek: { uid: 'kullanici-1', profil: PROFIL, dogrulanma: 1_000_000 },
    })
    expect(await dogrulayici(TOKEN)).toBeNull()
    expect(durum.silindi).toBe(true)
  })

  it('profil satiri yoksa yetki vermez', async () => {
    const { dogrulayici } = kur({
      istek: async (yol) => yol.includes('/auth/v1/user')
        ? { durum: 200, govde: { id: 'kullanici-1' } }
        : { durum: 200, govde: [] },
    })
    expect(await dogrulayici(TOKEN)).toBeNull()
  })

  it('pasif hesaba yetki vermez', async () => {
    const { dogrulayici } = kur({
      istek: async (yol) => yol.includes('/auth/v1/user')
        ? { durum: 200, govde: { id: 'kullanici-1' } }
        : { durum: 200, govde: [{ ...PROFIL, aktif: false }] },
    })
    expect(await dogrulayici(TOKEN)).toBeNull()
  })
})

describe('dogrula — cevrimdisi (12 saat penceresi)', () => {
  const agYok = async () => { throw new Error('getaddrinfo ENOTFOUND') }

  it('taze onbellek varsa calismaya devam eder', async () => {
    const { dogrulayici } = kur({
      istek: agYok,
      onbellek: { uid: 'kullanici-1', profil: PROFIL, dogrulanma: 1_000_000 - 11 * SAAT },
    })
    const sonuc = await dogrulayici(TOKEN)
    expect(sonuc.profil.rol).toBe('personel')
    expect(sonuc.kaynak).toBe('onbellek')
  })

  it('12 saati gecmis onbellegi kullanmaz', async () => {
    const { dogrulayici } = kur({
      istek: agYok,
      onbellek: { uid: 'kullanici-1', profil: PROFIL, dogrulanma: 1_000_000 - 13 * SAAT },
    })
    expect(await dogrulayici(TOKEN)).toBeNull()
  })

  it('BASKA kullanicinin onbellegini kullanmaz', async () => {
    const { dogrulayici } = kur({
      istek: agYok,
      onbellek: { uid: 'baska-kullanici', profil: { ...PROFIL, rol: 'super_admin' }, dogrulanma: 1_000_000 },
    })
    expect(await dogrulayici(TOKEN)).toBeNull()
  })

  it('onbellek hic yoksa yetki vermez', async () => {
    const { dogrulayici } = kur({ istek: agYok, onbellek: null })
    expect(await dogrulayici(TOKEN)).toBeNull()
  })

  it('cevrimdisi onbellek kullanimi onbellegi TAZELEMEZ (sure uzatilamaz)', async () => {
    const { dogrulayici, durum } = kur({
      istek: agYok,
      onbellek: { uid: 'kullanici-1', profil: PROFIL, dogrulanma: 1_000_000 - 11 * SAAT },
    })
    await dogrulayici(TOKEN)
    expect(durum.yazilan).toBeNull()
  })
})

describe('dogrula — girdi dogrulama', () => {
  it('token yoksa aga hic cikmaz', async () => {
    let cagrildi = false
    const { dogrulayici } = kur({ istek: async () => { cagrildi = true; return { durum: 200, govde: {} } } })
    expect(await dogrulayici(null)).toBeNull()
    expect(await dogrulayici('')).toBeNull()
    expect(cagrildi).toBe(false)
  })

  it('renderer profil NESNESI gondermeye calisirsa reddeder', async () => {
    // Eski API'yi taklit eden saldiri: token yerine profil nesnesi.
    const { dogrulayici } = kur({ istek: async () => ({ durum: 200, govde: {} }) })
    expect(await dogrulayici({ rol: 'super_admin', aktif: true })).toBeNull()
  })
})
