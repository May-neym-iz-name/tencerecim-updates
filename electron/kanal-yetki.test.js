// Kanal → yetki haritası (09.09.2026 güvenlik taraması).
//
// Sabitlenen şeyler:
//   1. Haritadaki her yetki kodu yetki.js'in tanıdığı bir koddur (yazım hatası = sessizce
//      herkese kapalı ya da herkese açık kanal).
//   2. Giriş akışında kullanılan kanallar haritada YOKTUR (oturum kurulmadan çağrılırlar).
//   3. Oturum yokken haritadaki kanal reddedilir; personel kendi sayfasının kanalını çağırabilir.
import { describe, test, expect } from 'vitest'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

const { KANAL_YETKI } = require('./kanal-yetki.js')
const yetki = require('./yetki.js')

const GIRIS_AKISI = ['lokasyonlar:listele', 'veri-senk:degisenler', 'veri-senk:uygula', 'veri-senk:sira',
  'ayar-senk:uygula', 'app:surum', 'auth:profil-ayarla', 'auth:beni-hatirla-getir', 'sistem:dusuk-guc']

describe('KANAL_YETKI', () => {
  test('giriş akışı kanalları haritada yok', () => {
    for (const k of GIRIS_AKISI) expect(KANAL_YETKI[k]).toBeUndefined()
  })

  test('oturum yokken haritadaki her kanal reddedilir', () => {
    yetki._profilYazTestIcin(null)
    for (const [kanal, kod] of Object.entries(KANAL_YETKI)) {
      expect(() => yetki._yetkiKontrol(kod), kanal).toThrow('yetkiniz yok')
    }
  })

  test('personel: sosyal, müşteri, bildirim, kargo kanalları açık; ayar/rapor kanalları kapalı', () => {
    yetki._profilYazTestIcin({ rol: 'personel', aktif: true })
    const acik = ['sosyal:konusmalar', 'musteriler:listele', 'bildirim:sayac', 'ups-ayar:getir', 'fis:yazdir', 'meta-ayar:getir']
    const kapali = ['ikas-ayar:getir', 'ai-ayar:getir', 'panel:ozet', 'meta:girisBaslat']
    for (const k of acik) expect(() => yetki._yetkiKontrol(KANAL_YETKI[k]), k).not.toThrow()
    for (const k of kapali) expect(() => yetki._yetkiKontrol(KANAL_YETKI[k]), k).toThrow()
    yetki._profilYazTestIcin(null)
  })

  test('süper yönetici her kanalı geçer', () => {
    yetki._profilYazTestIcin({ rol: 'super_admin', aktif: true })
    for (const kod of Object.values(KANAL_YETKI)) expect(() => yetki._yetkiKontrol(kod)).not.toThrow()
    yetki._profilYazTestIcin(null)
  })
})

describe('kampanya kanalları', () => {
  test('kampanya:* kampanya_yonet ister; kupon gönderme ve havuz sosyal_medya_yonet ister', () => {
    for (const k of ['kampanya:liste', 'kampanya:getir', 'kampanya:kaydet', 'kampanya:sil',
      'kampanya:kuponlar', 'kampanya:kuponEkle', 'kampanya:kuponSil', 'kampanya:sozlukler', 'kampanya:dagitimlar', 'kampanya:urunAdlari']) {
      expect(KANAL_YETKI[k], k).toBe('kampanya_yonet')
    }
    for (const k of ['meta:kuponGonder', 'sosyal:kuponSablonlari', 'sosyal:kuponHavuz']) {
      expect(KANAL_YETKI[k], k).toBe('sosyal_medya_yonet')
    }
  })
})
