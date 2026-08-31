// KVKK denetim kaydı: müşteri verisi programdan dışarı çıktığında kim, ne
// zaman, neyi çıkardı sorusunun cevabı. Bugüne kadar bu soruya verilecek
// hiçbir cevap yoktu.
//
// Kayıt YEREL kalır: log'un kendisi kişisel veri içerir ve senkron kuyruğunu
// şişirir (senk-sema'ya bilerek eklenmedi).
import { describe, it, expect, beforeEach } from 'vitest'
const { DatabaseSync } = require('node:sqlite')
const { tabloKur, yaz, listele, TURLER } = require('./disa-aktarim-log.js')

let db
beforeEach(() => {
  db = new DatabaseSync(':memory:')
  tabloKur(db)
})

describe('yaz', () => {
  it('kaydi yazar ve geri okur', () => {
    yaz(db, {
      tur: TURLER.YEDEK,
      kullanici_email: 'personel@ornek.com',
      uid: 'kullanici-1',
      kapsam: 'tum veritabani',
      kayit_sayisi: 1,
      dosya_adi: 'tencerecim_yedek.tncyedek',
    })

    const kayitlar = listele(db)
    expect(kayitlar).toHaveLength(1)
    expect(kayitlar[0].tur).toBe('yedek')
    expect(kayitlar[0].kullanici_email).toBe('personel@ornek.com')
    expect(kayitlar[0].dosya_adi).toBe('tencerecim_yedek.tncyedek')
    expect(kayitlar[0].tarih).toBeTruthy()
  })

  it('kullanici bilinmiyorsa da kayit DUSMEZ', () => {
    // Kim olduğunu bilmemek, olayı hiç kaydetmemekten iyidir.
    yaz(db, { tur: TURLER.PDF, dosya_adi: 'istek.pdf' })
    const k = listele(db)
    expect(k).toHaveLength(1)
    expect(k[0].kullanici_email).toBe('(bilinmiyor)')
  })

  it('bilinmeyen tur yazilmaz — log kirlenmesin', () => {
    expect(() => yaz(db, { tur: 'uydurma', dosya_adi: 'x' })).toThrow(/tur/i)
  })

  it('yazma hatasi cagiran islemi COKERTMEZ', () => {
    // Denetim kaydı yazılamadı diye kullanıcının yedeği iptal olmamalı.
    const bozukDb = { prepare: () => { throw new Error('tablo yok') } }
    expect(() => yaz(bozukDb, { tur: TURLER.YEDEK, dosya_adi: 'x' })).not.toThrow()
  })
})

describe('listele', () => {
  it('en yeni kayit basta gelir', () => {
    yaz(db, { tur: TURLER.PDF, dosya_adi: 'birinci.pdf' })
    yaz(db, { tur: TURLER.YEDEK, dosya_adi: 'ikinci.tncyedek' })
    const k = listele(db)
    expect(k[0].dosya_adi).toBe('ikinci.tncyedek')
  })

  it('varsayilan olarak en fazla 500 kayit doner', () => {
    for (let i = 0; i < 520; i++) yaz(db, { tur: TURLER.PDF, dosya_adi: `d${i}.pdf` })
    expect(listele(db)).toHaveLength(500)
    expect(listele(db, 10)).toHaveLength(10)
  })
})

describe('silinemezlik', () => {
  it('modul silme fonksiyonu SUNMAZ', () => {
    const modul = require('./disa-aktarim-log.js')
    const silmeGibi = Object.keys(modul).filter((k) => /sil|temizle|delete/i.test(k))
    expect(silmeGibi).toEqual([])
  })
})
