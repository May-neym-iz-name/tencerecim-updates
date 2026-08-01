// Frontend (src/auth/izinler.js, ESM) ile backend (electron/yetki.js, CJS) AYNI yetki
// mantığını iki dilde tekrar ediyor. İki liste elle senkron tutuluyor → kayma kaçınılmaz.
//
// 2026-07-17'de gerçekten kaydılar: 'sosyal_medya_yonet' frontend'in personel varsayılanında
// vardı, backend'de yoktu. Sonuç sessizdi — personel Sosyal Medya sekmesini görüyor, açıyor,
// ama kaydete basınca "Bu işlem için yetkiniz yok" yiyordu.
//
// Bu test içleri karşılaştırmaz (yetki.js listesini dışa vermiyor); İKİ TARAFIN AYNI CEVABI
// VERDİĞİNİ doğrular. Yeni bir yetki eklerken tek tarafı güncellersen burada patlar.
import { describe, test, expect } from 'vitest'
import { createRequire } from 'module'
import { yetkiVar } from './izinler.js'

const require = createRequire(import.meta.url)
const yetkiBackend = require('../../electron/yetki.js')

// Backend'i profille besleyip yetkiyi davranışsal ölç: hata fırlatmıyorsa yetki var.
function backendYetkiVar(profil, kod) {
  yetkiBackend['auth:profil-ayarla'](profil)
  try {
    yetkiBackend._yetkiKontrol(kod)
    return true
  } catch {
    return false
  } finally {
    yetkiBackend['auth:profil-temizle']()
  }
}

// Uygulamada geçen tüm yetki kodları (Supabase yetki_kodlari + sosyal medya kodları).
const TUM_KODLAR = [
  'satis_yap', 'satis_gecmisi_goruntule', 'satis_iptal', 'on_siparis_yap',
  'urun_goruntule', 'urun_duzenle', 'urun_sil', 'fiyat_degistir',
  'stok_goruntule', 'stok_duzenle', 'stok_sayim', 'mal_kabul_yonet',
  'musteri_goruntule', 'musteri_duzenle', 'musteri_sil',
  'kargo_yonet', 'kargo_iptal', 'online_siparis_goruntule', 'bildirim_goruntule',
  'kasa_kullan', 'gider_yonet', 'rapor_goruntule',
  'ayarlar_duzenle', 'excel_ice_aktar', 'ikas_yonet', 'kullanici_yonetimi',
  'sosyal_medya_yonet', 'sosyal_otomasyon_yonet',
]

const ROLLER = ['super_admin', 'yonetici', 'personel', 'ozel']

describe('yetki paritesi (frontend izinler.js ↔ backend yetki.js)', () => {
  test.each(ROLLER)('%s rolünde iki taraf her kod için aynı cevabı verir', (rol) => {
    const profil = { rol, aktif: true, izinler: {} }
    const farklar = TUM_KODLAR.filter(
      kod => yetkiVar(profil, kod) !== backendYetkiVar(profil, kod)
    )
    expect(farklar).toEqual([])
  })

  test('kullanıcıya özel override iki tarafta da rol varsayılanını ezer', () => {
    const profil = { rol: 'personel', aktif: true, izinler: { sosyal_otomasyon_yonet: true } }
    expect(yetkiVar(profil, 'sosyal_otomasyon_yonet')).toBe(true)
    expect(backendYetkiVar(profil, 'sosyal_otomasyon_yonet')).toBe(true)
  })

  test('pasif kullanıcı iki tarafta da hiçbir şey yapamaz', () => {
    const profil = { rol: 'super_admin', aktif: false, izinler: {} }
    expect(yetkiVar(profil, 'satis_yap')).toBe(false)
    expect(backendYetkiVar(profil, 'satis_yap')).toBe(false)
  })
})

describe('bildirim yetkisi', () => {
  test('personel bildirimleri varsayılan görebilir', () => {
    const p = { rol: 'personel', aktif: true, izinler: {} }
    expect(yetkiVar(p, 'bildirim_goruntule')).toBe(true)
  })

  test('özel rol yalnızca override ile görür', () => {
    expect(yetkiVar({ rol: 'ozel', aktif: true, izinler: {} }, 'bildirim_goruntule')).toBe(false)
    expect(yetkiVar({ rol: 'ozel', aktif: true, izinler: { bildirim_goruntule: true } }, 'bildirim_goruntule')).toBe(true)
  })
})

describe('sosyal medya yetkileri', () => {
  test('personel sosyal medyayı kullanır ama otomasyonu YÖNETEMEZ', () => {
    const p = { rol: 'personel', aktif: true, izinler: {} }
    expect(yetkiVar(p, 'sosyal_medya_yonet')).toBe(true)
    expect(yetkiVar(p, 'sosyal_otomasyon_yonet')).toBe(false)
  })

  test('yönetici otomasyonu yönetebilir', () => {
    const p = { rol: 'yonetici', aktif: true, izinler: {} }
    expect(yetkiVar(p, 'sosyal_otomasyon_yonet')).toBe(true)
  })
})

describe('ön sipariş yetkisi', () => {
  test('personel ön sipariş alamaz (varsayılan kapalı)', () => {
    const p = { rol: 'personel', aktif: true, izinler: {} }
    expect(yetkiVar(p, 'satis_yap')).toBe(true)
    expect(yetkiVar(p, 'on_siparis_yap')).toBe(false)
  })

  test('yönetici ön sipariş alabilir', () => {
    expect(yetkiVar({ rol: 'yonetici', aktif: true, izinler: {} }, 'on_siparis_yap')).toBe(true)
  })

  test('override ile personele açılabilir', () => {
    const p = { rol: 'personel', aktif: true, izinler: { on_siparis_yap: true } }
    expect(yetkiVar(p, 'on_siparis_yap')).toBe(true)
  })
})
