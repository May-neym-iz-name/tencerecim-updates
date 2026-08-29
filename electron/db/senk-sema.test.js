// Senkron şeması invariantları.
// Bunlar "sessiz veri kaybı" sınıfı hatalar: yanlışsa senkron çalışıyor GÖRÜNÜR ama
// bazı tablolar hiç gönderilmez/uygulanmaz ve kimse fark etmez.
import { describe, test, expect } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
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

})

describe('sosyal_otomasyonlar senkronu (v1.2.114)', () => {
  test('otomasyon durumu ORTAK — her PC görsün/açsın/kapatsın', () => {
    // Senkronlamamak asıl tehlikeydi: diğer PC kapalı sanıp AYNI gönderiye ikinci
    // otomasyon kurup açabiliyordu → aynı yoruma iki DM.
    expect(TABLOLAR.sosyal_otomasyonlar).toBeDefined()
    expect(TABLOLAR.sosyal_otomasyon_sablonlar).toBeDefined()
    expect(SIRA).toContain('sosyal_otomasyonlar')
    expect(SIRA).toContain('sosyal_otomasyon_sablonlar')
  })

  test('konu_id doğal anahtar — iki PC aynı gönderi için MÜKERRER kayıt üretemez', () => {
    // konu_id Meta gönderi kimliği: tüm PC'lerde AYNI → dedup birleştirir.
    expect(TABLOLAR.sosyal_otomasyonlar.dogal).toEqual(['konu_id'])
  })

  test('bağlantı tablosu otomasyon+şablon çiftinde tekil', () => {
    expect(TABLOLAR.sosyal_otomasyon_sablonlar.dogalCift).toEqual(['otomasyon_id', 'sablon_id'])
    expect(TABLOLAR.sosyal_otomasyon_sablonlar.zorunluFk).toEqual(['otomasyon_id', 'sablon_id'])
  })

  test('otomasyon SIRA’da şablonlardan sonra (FK çözülebilsin)', () => {
    expect(SIRA.indexOf('sosyal_otomasyon_sablonlar')).toBeGreaterThan(SIRA.indexOf('sosyal_otomasyonlar'))
    expect(SIRA.indexOf('sosyal_otomasyon_sablonlar')).toBeGreaterThan(SIRA.indexOf('sosyal_sablonlar'))
  })

  test('sonradanEklendi: mevcut otomasyonlar da bir kez yukarı çıksın', () => {
    expect(TABLOLAR.sosyal_otomasyonlar.sonradanEklendi).toBe(true)
    expect(TABLOLAR.sosyal_otomasyon_sablonlar.sonradanEklendi).toBe(true)
  })
})

describe('urun_barkodlar senkronu', () => {
  test('TABLOLAR içinde tanımlı ve urunler FK\'sı var', () => {
    const t = TABLOLAR.urun_barkodlar
    expect(t).toBeDefined()
    expect(t.fk.urun_id).toBe('urunler')
    expect(t.zorunluFk).toContain('urun_id')
    expect(t.dogal).toEqual(['barkod'])
    expect(t.sonradanEklendi).toBe(true)
  })

  test('SIRA içinde urunler tablosundan SONRA gelir (FK bağımlılığı)', () => {
    expect(SIRA).toContain('urun_barkodlar')
    expect(SIRA.indexOf('urun_barkodlar')).toBeGreaterThan(SIRA.indexOf('urunler'))
  })
})

// Ebeveyni damgalamadan çocuğu yeniden damgalamak, çocuğu KARŞI PC'de sonsuza dek öksüz
// bırakır: pull imleci yalnız ileri gider, ebeveynin eski yüklenme zamanını geçmişse
// ebeveyn bir daha çekilmez. 2026-08-29'da 3 BİGATTİ istek listesinin 9 kalemi böyle
// bulundu (07.08 kopya temizliği kalemleri damgaladı, istek_listeleri'ni damgalamadı).
describe('yenidenDamgala: ebeveyn de tazelenir', () => {
  const ESKI = '2000-01-01T00:00:00.000Z'

  function kurulumDb() {
    const d = new DatabaseSync(':memory:')
    d.exec(`
      CREATE TABLE tedarikciler (id INTEGER PRIMARY KEY, senk_id TEXT, senk_guncelleme TEXT);
      CREATE TABLE urunler (id INTEGER PRIMARY KEY, senk_id TEXT, senk_guncelleme TEXT);
      CREATE TABLE istek_listeleri (id INTEGER PRIMARY KEY, tedarikci_id INTEGER, lokasyon_id INTEGER,
        senk_id TEXT, senk_guncelleme TEXT);
      CREATE TABLE istek_listesi_kalemleri (id INTEGER PRIMARY KEY, istek_id INTEGER, urun_id INTEGER,
        senk_id TEXT, senk_guncelleme TEXT);
      INSERT INTO tedarikciler (id, senk_id, senk_guncelleme) VALUES (1,'t1','${ESKI}');
      INSERT INTO urunler (id, senk_id, senk_guncelleme) VALUES (1,'u1','${ESKI}'), (2,'u2','${ESKI}');
      INSERT INTO istek_listeleri (id, tedarikci_id, senk_id, senk_guncelleme) VALUES
        (1,1,'l1','${ESKI}'), (2,1,'l2','${ESKI}');
      INSERT INTO istek_listesi_kalemleri (id, istek_id, urun_id, senk_id, senk_guncelleme) VALUES
        (1,1,1,'k1','${ESKI}');
    `)
    return d
  }

  test('çocuk damgalanınca REFERANS VERİLEN ebeveyn de damgalanır', () => {
    const d = kurulumDb()
    sema.yenidenDamgala(d, 'istek_listesi_kalemleri')
    const kalem = d.prepare('SELECT senk_guncelleme g FROM istek_listesi_kalemleri WHERE id=1').get()
    const liste = d.prepare('SELECT senk_guncelleme g FROM istek_listeleri WHERE id=1').get()
    const urun = d.prepare('SELECT senk_guncelleme g FROM urunler WHERE id=1').get()
    expect(kalem.g).not.toBe(ESKI)
    expect(liste.g).not.toBe(ESKI) // asıl koruma: ebeveyn de yukarı çıkmalı
    expect(urun.g).not.toBe(ESKI)  // urun_id de FK — o da tazelenir
  })

  test('referans VERİLMEYEN ebeveyn satırlarına dokunulmaz', () => {
    // Tüm tabloyu damgalamak (ör. urunler'in 6600 satırı) gereksiz dev bir push üretir.
    const d = kurulumDb()
    sema.yenidenDamgala(d, 'istek_listesi_kalemleri')
    expect(d.prepare('SELECT senk_guncelleme g FROM istek_listeleri WHERE id=2').get().g).toBe(ESKI)
    expect(d.prepare('SELECT senk_guncelleme g FROM urunler WHERE id=2').get().g).toBe(ESKI)
  })

  test('senk_id’siz satırlar damgalanmaz (henüz senkrona girmemiş)', () => {
    const d = kurulumDb()
    d.exec("UPDATE istek_listeleri SET senk_id = NULL WHERE id = 1")
    sema.yenidenDamgala(d, 'istek_listesi_kalemleri')
    expect(d.prepare('SELECT senk_guncelleme g FROM istek_listeleri WHERE id=1').get().g).toBe(ESKI)
  })
})
