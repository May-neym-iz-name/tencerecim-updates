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

describe('kupon_dagitim senkronu', () => {
  test('listede, doğal anahtar kupon_kodu, FK yok', () => {
    expect(TABLOLAR.kupon_dagitim).toBeDefined()
    expect(SIRA).toContain('kupon_dagitim')
    expect(TABLOLAR.kupon_dagitim.dogal).toEqual(['kupon_kodu'])
    expect(TABLOLAR.kupon_dagitim.fk).toEqual({})
    expect(TABLOLAR.kupon_dagitim.sonradanEklendi).toBe(true)
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

  // Yeni sütun açan her değişiklikte senk listesi AYNI commit'te güncellenmeli —
  // ozel_aciklama/whatsapp/mesaj_tipi üç kez unutulmuştu (sessiz veri kaybı).
  test('soru_yaniti_kapali kolonu senkronlanır (08.09.2026)', () => {
    expect(TABLOLAR.sosyal_otomasyonlar.kolonlar).toContain('soru_yaniti_kapali')
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

// --- Satış ekranı hiyerarşisi kolonları (2026-09-14) ---
// Bu testler [[setlerimiz]] "Bonus düzeltme" dersinin bekçisidir: web_link sütunu
// v1.2.177'de açılmış ama senkron listesine YAZILMAMIŞTI → bir PC'de girilen link
// diğerine hiç ulaşmıyordu (sessiz veri kaybı). Yeni kolon açan herkes buradan geçsin.
describe('satış hiyerarşisi senkronu', () => {
  test('kategoriler.ana_tip senkron kolonlarında', () => {
    expect(TABLOLAR.kategoriler.kolonlar).toContain('ana_tip')
  })

  test('urunler.model ve setler.model senkron kolonlarında', () => {
    expect(TABLOLAR.urunler.kolonlar).toContain('model')
    expect(TABLOLAR.setler.kolonlar).toContain('model')
  })

  test('marka_modelleri senkronlanır', () => {
    expect(TABLOLAR.marka_modelleri).toBeDefined()
    expect(TABLOLAR.marka_modelleri.kolonlar).toEqual(['model_adi', 'oncelik', 'aktif'])
  })

  test('marka_modelleri.marka_id ZORUNLU FK — markasız model satırı anlamsız', () => {
    expect(TABLOLAR.marka_modelleri.fk).toEqual({ marka_id: 'markalar' })
    expect(TABLOLAR.marka_modelleri.zorunluFk).toEqual(['marka_id'])
  })

  test('marka_modelleri doğal çifti (marka_id, model_adi) — kopya satır üretilemez', () => {
    expect(TABLOLAR.marka_modelleri.dogalCift).toEqual(['marka_id', 'model_adi'])
  })

  test('marka_modelleri SIRA içinde ve markalar\'dan SONRA', () => {
    expect(SIRA).toContain('marka_modelleri')
    expect(SIRA.indexOf('marka_modelleri')).toBeGreaterThan(SIRA.indexOf('markalar'))
  })
})

// Kolon imzası nöbeti: senkron kolon listesine SONRADAN eklenen alanın eski satırlarda
// hiç yayınlanmaması sınıfı ("sessiz kayıp") bu depoda beş kez yaşandı. 15.09.2026'da
// ölçülen son vakası: buluttaki 25 set kaydının 25'inde ikas_urun_id ANAHTARI yoktu →
// diğer PC'nin "Hızlı ürünler" panelinde hiçbir set çıkmıyordu.
describe('kolon imzası nöbeti', () => {
  const ESKI = '2000-01-01T00:00:00.000Z'

  function db() {
    const d = new DatabaseSync(':memory:')
    d.exec(`CREATE TABLE senk_durum (anahtar TEXT PRIMARY KEY, deger TEXT);
      CREATE TABLE markalar (id INTEGER PRIMARY KEY, ad TEXT, aktif INTEGER DEFAULT 1,
        senk_id TEXT, senk_guncelleme TEXT);
      CREATE TABLE kategoriler (id INTEGER PRIMARY KEY, ad TEXT, tam_yol TEXT, aktif INTEGER,
        ana_tip TEXT, ust_kategori_id INTEGER, senk_id TEXT, senk_guncelleme TEXT);
      CREATE TABLE setler (id INTEGER PRIMARY KEY, ad TEXT, fiyat REAL, aktif INTEGER DEFAULT 1,
        sku TEXT, barkod TEXT, kdv_orani REAL, aciklama TEXT, web_link TEXT,
        ikas_varyant_id TEXT, ikas_urun_id TEXT, model TEXT,
        marka_id INTEGER, kategori_id INTEGER, senk_id TEXT, senk_guncelleme TEXT);`)
    d.prepare(`INSERT INTO markalar (id, ad, senk_id, senk_guncelleme) VALUES (1,'Sofram','m1',?)`).run(ESKI)
    // 1: ikas'a bağlı (bilgiyi TAŞIYAN satır) · 2: bağsız (boş) · 3: boş string
    d.prepare(`INSERT INTO setler (id, ad, ikas_urun_id, marka_id, senk_id, senk_guncelleme)
      VALUES (1,'Bağlı set','cd90503d',1,'s1',?)`).run(ESKI)
    d.prepare(`INSERT INTO setler (id, ad, ikas_urun_id, senk_id, senk_guncelleme)
      VALUES (2,'Bağsız set',NULL,'s2',?)`).run(ESKI)
    d.prepare(`INSERT INTO setler (id, ad, ikas_urun_id, senk_id, senk_guncelleme)
      VALUES (3,'Boş metin','','s3',?)`).run(ESKI)
    return d
  }
  const damga = (d, id) => d.prepare('SELECT senk_guncelleme g FROM setler WHERE id = ?').get(id).g

  test('yeniKolonDamgala YALNIZ o kolonu dolu olan satırı tazeler', () => {
    // Kritik: boş satırı da damgalasaydık, alanı BOŞ olan PC son yazan olup karşı
    // taraftaki DOLU değeri ezerdi (son-yazan-kazanır). Dolu filtresi yarışı kaldırır.
    const d = db()
    const n = sema.yeniKolonDamgala(d, 'setler', ['ikas_urun_id'])
    expect(n).toBe(1)
    expect(damga(d, 1)).not.toBe(ESKI)
    expect(damga(d, 2)).toBe(ESKI)
    expect(damga(d, 3)).toBe(ESKI)
  })

  test('ebeveyn de tazelenir — pull imleci yalnız ileri gider', () => {
    const d = db()
    sema.yeniKolonDamgala(d, 'setler', ['ikas_urun_id'])
    expect(d.prepare("SELECT senk_guncelleme g FROM markalar WHERE id = 1").get().g).not.toBe(ESKI)
  })

  test('kolon listesinde OLMAYAN alan hiçbir satırı damgalamaz', () => {
    const d = db()
    expect(sema.yeniKolonDamgala(d, 'setler', ['boyle_bir_kolon_yok'])).toBe(0)
    expect(damga(d, 1)).toBe(ESKI)
  })

  test('ilk kurulumda damgalama YOK — yalnız taban imza yazılır', () => {
    // Aksi hâlde bu sürüme geçen her PC tüm katalogu tek seferde push'a sokardı.
    const d = db()
    sema.kolonImzaBakimi(d)
    expect(damga(d, 1)).toBe(ESKI)
    expect(d.prepare("SELECT deger FROM senk_durum WHERE anahtar='kolimza_setler'").get().deger)
      .toBe(sema.kolonImzasi(sema.TABLOLAR.setler))
  })

  test('imza değişince yeni kolonu dolu satır yeniden damgalanır', () => {
    const d = db()
    // ikas_urun_id'nin HENÜZ eklenmediği bir geçmişi taklit et.
    const eskiImza = sema.kolonImzasi(sema.TABLOLAR.setler)
      .split(',').filter(k => k !== 'ikas_urun_id').join(',')
    d.prepare("INSERT INTO senk_durum (anahtar, deger) VALUES ('kolimza_setler', ?)").run(eskiImza)
    sema.kolonImzaBakimi(d)
    expect(damga(d, 1)).not.toBe(ESKI)
    expect(damga(d, 2)).toBe(ESKI)
  })

  test('imza aynıysa hiçbir satıra dokunulmaz (her açılışta push üretmez)', () => {
    const d = db()
    sema.kolonImzaBakimi(d)
    sema.kolonImzaBakimi(d)
    expect(damga(d, 1)).toBe(ESKI)
  })

  test('imza FK kolonlarını da kapsar — FK eklemek de yayın gerektirir', () => {
    expect(sema.kolonImzasi(sema.TABLOLAR.setler)).toContain('marka_id')
  })

  test('şema varsayılanında duran satır bilgi taşımaz — damgalanmaz', () => {
    // sosyal_sablonlar.tur DEFAULT 'urun': 436 satırın 432'si varsayılanda. Bu ayrım
    // olmadan onarım 4 yerine 436 satır push eder, karşı PC'deki taze düzenlemeyi
    // bayat kopyayla ezme penceresi açardı (ölçüm 15.09.2026).
    const d = db()
    d.prepare("UPDATE setler SET model = 'Atlas' WHERE id = 2").run()
    d.prepare("UPDATE setler SET model = 'yok' WHERE id = 3").run()
    d.prepare('UPDATE setler SET senk_guncelleme = ?').run(ESKI)
    expect(sema.yeniKolonDamgala(d, 'setler', ['model'], { model: 'yok' })).toBe(1)
    expect(damga(d, 2)).not.toBe(ESKI)
    expect(damga(d, 3)).toBe(ESKI)
  })
})
