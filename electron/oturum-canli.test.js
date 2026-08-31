// Supabase URL + publishable anahtar İKİ dosyada tekrarlanıyor:
//   src/lib/supabase.js   (renderer, vite ile paketleniyor)
//   electron/oturum-canli.js (main process, CJS)
//
// Ortak modül paylaşamıyorlar. Biri değişip diğeri unutulursa main process
// oturumu HİÇ doğrulayamaz ve herkes çevrimdışı moda düşer — sessiz ve
// teşhisi zor bir arıza. Bu test o kaymayı yakalar.
//
// (Aynı sınıf hata yetki kodlarında gerçekten yaşandı: bkz. yetki-paritesi.test.js)
import { describe, it, expect } from 'vitest'
const fs = require('fs')
const path = require('path')

function sabitleriOku(dosya) {
  const metin = fs.readFileSync(path.resolve(__dirname, '..', dosya), 'utf8')
  const url = metin.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/)
  const key = metin.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)['"]/)
  return { url: url && url[1], key: key && key[1] }
}

describe('Supabase sabit paritesi', () => {
  it('renderer ve main process ayni projeye baglanir', () => {
    const renderer = sabitleriOku('src/lib/supabase.js')
    const main = sabitleriOku('electron/oturum-canli.js')

    expect(renderer.url).toBeTruthy()
    expect(main.url).toBe(renderer.url)
    expect(main.key).toBe(renderer.key)
  })

  it('main process GIZLI anahtar tasimaz', () => {
    const metin = fs.readFileSync(path.resolve(__dirname, 'oturum-canli.js'), 'utf8')
    expect(metin).not.toMatch(/sb_secret_/)
    expect(metin).not.toMatch(/service_role/)
  })
})

// --- dogrula/aktifJwt/_aktifTokenTemizle -----------------------------------
//
// oturum-canli.js gerçek doğrulamayı './oturum-dogrula'nın olusturDogrulayici()
// çıktısına devreder (ağ + safeStorage burada gizli). O yüzden gerçek ağ/Electron
// olmadan davranışı sınamak için './oturum-dogrula' modülünü require.cache'e
// önceden yerleştiriyoruz — aynı desen electron/fatura/okuma.test.js'te de var
// (vi.mock CJS destructure ile çalışmıyor, cache ön-kurulumu çalışıyor).
//
// KRİTİK güvenlik davranışı: başarısız doğrulamadan sonra aktifJwt() token'ı
// SIZDIRMAMALI — main'in bulut çağrıları o token'ı fatura API'sine gönderir.

let dogrulaHamSonuc = null // bir sonraki dogrulaHam(token) çağrısının döneceği değer

const dogrulaDosyaYolu = require.resolve('./oturum-dogrula')
require.cache[dogrulaDosyaYolu] = {
  id: dogrulaDosyaYolu,
  filename: dogrulaDosyaYolu,
  loaded: true,
  exports: {
    olusturDogrulayici: () => async () => dogrulaHamSonuc,
    jwtSub: () => null,
    ONBELLEK_OMRU_MS: 0,
  },
}

const oturumCanli = require('./oturum-canli')

describe('dogrula / aktifJwt / _aktifTokenTemizle', () => {
  it('başarılı doğrulamadan sonra aktifJwt() token\'ı döndürür', async () => {
    dogrulaHamSonuc = { profil: { aktif: true, rol: 'personel' }, uid: 'u1', kaynak: 'supabase' }
    await oturumCanli.dogrula('gecerli-jwt')
    expect(oturumCanli.aktifJwt()).toBe('gecerli-jwt')
  })

  it('başarısız doğrulamadan sonra aktifJwt() null döndürür (güvenlik davranışı)', async () => {
    dogrulaHamSonuc = null
    await oturumCanli.dogrula('gecersiz-jwt')
    expect(oturumCanli.aktifJwt()).toBeNull()
  })

  it('önce başarılı sonra başarısız doğrulama: eski token bellekte kalmaz', async () => {
    dogrulaHamSonuc = { profil: { aktif: true, rol: 'personel' }, uid: 'u1', kaynak: 'supabase' }
    await oturumCanli.dogrula('eski-jwt')
    expect(oturumCanli.aktifJwt()).toBe('eski-jwt')

    dogrulaHamSonuc = null
    await oturumCanli.dogrula('bozuk-jwt')
    expect(oturumCanli.aktifJwt()).toBeNull()
  })

  it('_aktifTokenTemizle() sonrası aktifJwt() null döner', async () => {
    dogrulaHamSonuc = { profil: { aktif: true, rol: 'personel' }, uid: 'u1', kaynak: 'supabase' }
    await oturumCanli.dogrula('cikis-oncesi-jwt')
    expect(oturumCanli.aktifJwt()).toBe('cikis-oncesi-jwt')

    oturumCanli._aktifTokenTemizle()
    expect(oturumCanli.aktifJwt()).toBeNull()
  })
})
