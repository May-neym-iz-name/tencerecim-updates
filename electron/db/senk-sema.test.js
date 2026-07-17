// Senkron şeması invariantları.
// Bunlar "sessiz veri kaybı" sınıfı hatalar: yanlışsa senkron çalışıyor GÖRÜNÜR ama
// bazı tablolar hiç gönderilmez/uygulanmaz ve kimse fark etmez.
import { describe, test, expect } from 'vitest'
import sema from './senk-sema.js'

const { TABLOLAR, SIRA } = sema

describe('senk şeması invariantları', () => {
  test('TABLOLAR ile SIRA birebir aynı tabloları içerir', () => {
    // senk-veri.js "degisenler" SIRA'yı gezer: TABLOLAR'a ekleyip SIRA'ya eklemeyi
    // unutursan o tablo HİÇ push edilmez — hata vermez, sadece senkronlanmaz.
    expect([...SIRA].sort()).toEqual(Object.keys(TABLOLAR).sort())
  })

  test('SIRA hiçbir tabloyu tekrar etmez', () => {
    expect(SIRA.length).toBe(new Set(SIRA).size)
  })

  test('her FK referansı SIRA’da o tablodan ÖNCE gelir', () => {
    // Sonra gelirse referans çözülemez → FK null kalır (veya zorunluFk ise satır ertelenir).
    const hatalar = []
    for (const [tablo, cfg] of Object.entries(TABLOLAR)) {
      for (const ref of Object.values(cfg.fk || {})) {
        if (ref === tablo) continue // kendine referans (kategoriler.ust_kategori_id) — sıralama gerekmez
        if (SIRA.indexOf(ref) > SIRA.indexOf(tablo)) hatalar.push(`${tablo} -> ${ref}`)
      }
    }
    expect(hatalar).toEqual([])
  })

  test('her FK referansı senkronlanan bir tabloyu gösterir', () => {
    const hatalar = []
    for (const [tablo, cfg] of Object.entries(TABLOLAR)) {
      for (const ref of Object.values(cfg.fk || {})) {
        if (!TABLOLAR[ref]) hatalar.push(`${tablo} -> ${ref} (senkronlanmıyor)`)
      }
    }
    expect(hatalar).toEqual([])
  })

  test('zorunluFk’lar fk içinde tanımlı', () => {
    for (const [tablo, cfg] of Object.entries(TABLOLAR)) {
      for (const k of (cfg.zorunluFk || [])) {
        expect(Object.keys(cfg.fk || {}), `${tablo}.${k}`).toContain(k)
      }
    }
  })
})

describe('sosyal_sablonlar senkronu', () => {
  test('şablonlar senkron listesinde', () => {
    expect(TABLOLAR.sosyal_sablonlar).toBeDefined()
    expect(SIRA).toContain('sosyal_sablonlar')
  })

  test('ürün ve set bağı FK olarak taşınır (id değil senk_id)', () => {
    expect(TABLOLAR.sosyal_sablonlar.fk).toEqual({ urun_id: 'urunler', set_id: 'setler' })
  })

  test('ürün/set bağı ZORUNLU değil — çözülemezse şablon yine de gelsin', () => {
    expect(TABLOLAR.sosyal_sablonlar.zorunluFk).toBeUndefined()
  })

  test('sonradanEklendi işaretli: mevcut satırlar "şimdi" damgalanmalı', () => {
    // Aksi halde 2000-01-01 damgası push imlecinin gerisinde kalır ve mevcut
    // şablonlar HİÇ gönderilmez (sessiz). Bkz. senk-sema.js kur() notu.
    expect(TABLOLAR.sosyal_sablonlar.sonradanEklendi).toBe(true)
  })

  test('otomasyonun kendisi senkronlanmaz (iki PC = çift DM riski)', () => {
    expect(TABLOLAR.sosyal_otomasyonlar).toBeUndefined()
    expect(TABLOLAR.sosyal_otomasyon_sablonlar).toBeUndefined()
  })
})
