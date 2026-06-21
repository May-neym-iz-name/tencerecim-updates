import { describe, test, expect } from 'vitest'
import { yetkiVar, lokasyonErisim, erisilebilirLokasyonlar } from './izinler.js'

const lokasyonlar = [{ id: 1, ad: 'Pendik' }, { id: 2, ad: 'Gölcük' }]

describe('yetkiVar', () => {
  test('süper yönetici her yetkiye sahiptir', () => {
    const p = { rol: 'super_admin', aktif: true, izinler: {} }
    expect(yetkiVar(p, 'kullanici_yonetimi')).toBe(true)
    expect(yetkiVar(p, 'fiyat_degistir')).toBe(true)
  })

  test('yönetici kullanıcı yönetimi hariç her şeyi yapar', () => {
    const p = { rol: 'yonetici', aktif: true, izinler: {} }
    expect(yetkiVar(p, 'fiyat_degistir')).toBe(true)
    expect(yetkiVar(p, 'kullanici_yonetimi')).toBe(false)
  })

  test('personel sınırlı varsayılan yetkilere sahiptir', () => {
    const p = { rol: 'personel', aktif: true, izinler: {} }
    expect(yetkiVar(p, 'satis_yap')).toBe(true)
    expect(yetkiVar(p, 'stok_sayim')).toBe(true)
    expect(yetkiVar(p, 'fiyat_degistir')).toBe(false)
    expect(yetkiVar(p, 'rapor_goruntule')).toBe(false)
  })

  test('kullanıcıya özel override rol varsayılanını ezer', () => {
    const p = { rol: 'personel', aktif: true, izinler: { fiyat_degistir: true, satis_yap: false } }
    expect(yetkiVar(p, 'fiyat_degistir')).toBe(true)  // override ile açıldı
    expect(yetkiVar(p, 'satis_yap')).toBe(false)       // override ile kapatıldı
  })

  test('özel rol sadece override edilen yetkilere sahiptir', () => {
    const p = { rol: 'ozel', aktif: true, izinler: { stok_sayim: true, satis_gecmisi_goruntule: true } }
    expect(yetkiVar(p, 'stok_sayim')).toBe(true)
    expect(yetkiVar(p, 'satis_yap')).toBe(false)
  })

  test('pasif kullanıcının hiçbir yetkisi yoktur', () => {
    const p = { rol: 'super_admin', aktif: false, izinler: {} }
    expect(yetkiVar(p, 'satis_yap')).toBe(false)
  })
})

describe('lokasyonErisim', () => {
  test('süper yönetici tüm lokasyonlara erişir', () => {
    expect(lokasyonErisim({ rol: 'super_admin', aktif: true }, 2)).toBe(true)
  })

  test('boş izinli_lokasyonlar tüm lokasyonlar demektir', () => {
    expect(lokasyonErisim({ rol: 'personel', aktif: true, izinli_lokasyonlar: [] }, 1)).toBe(true)
  })

  test('sadece izinli lokasyona erişir', () => {
    const p = { rol: 'ozel', aktif: true, izinli_lokasyonlar: [2] }
    expect(lokasyonErisim(p, 2)).toBe(true)
    expect(lokasyonErisim(p, 1)).toBe(false)
  })
})

describe('erisilebilirLokasyonlar', () => {
  test('Gölcük personeli sadece Gölcük görür', () => {
    const p = { rol: 'ozel', aktif: true, izinli_lokasyonlar: [2] }
    const sonuc = erisilebilirLokasyonlar(p, lokasyonlar)
    expect(sonuc).toHaveLength(1)
    expect(sonuc[0].ad).toBe('Gölcük')
  })
})
