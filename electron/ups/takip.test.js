// UPS StatusCode → uygulama durumu eşlemesi.
// Kodlar docs/ups-api-reference.md §1'den; 2 = tek gerçek teslim kodu.
// Canlı doğrulandı (2026-07-17): teslim edilmiş 8 gönderinin 8'i de StatusCode=2 döndü.
import { describe, test, expect } from 'vitest'
import takip from './takip.js'

const { _durumCevir: durumCevir } = takip

describe('durumCevir', () => {
  test('kod 2 = TESLİM (tek gerçek teslim kodu)', () => {
    expect(durumCevir(2)).toEqual({ durum: 'teslim', gonderildi: true })
  })

  test('kod 1 (GİRİŞ SCAN EDİLDİ) = gönderildi — kullanıcının beklediği an', () => {
    expect(durumCevir(1)).toEqual({ durum: 'gonderildi', gonderildi: true })
  })

  test('kod 13 (TRACKING NUMBER NOT FOUND) = ağda değil, gönderilmedi', () => {
    // Etiket kesilmiş ama koli UPS ağına girmemiş. Hata DEĞİL, anlamlı sinyal.
    expect(durumCevir(13)).toEqual({ durum: 'yok', gonderildi: false })
  })

  test('kod 3 (ÖZEL DURUM) = ağda, gönderilmiş sayılır ama ayrı işaretlenir', () => {
    expect(durumCevir(3)).toEqual({ durum: 'ozel', gonderildi: true })
  })

  test.each([4, 6, 7, 12, 16, 31, 32, 33, 36, 37, 38])(
    'ağ-içi ara kod %i = gönderildi', (kod) => {
      expect(durumCevir(kod).gonderildi).toBe(true)
      expect(durumCevir(kod).durum).toBe('gonderildi')
    })

  test('bilinmeyen YENİ bir ara kod da gönderildi sayılır (ileriye dönük güvenli)', () => {
    // Kural "bulunduysa ağdadır" olduğu için UPS yeni kod eklerse doğru tarafta kalır.
    expect(durumCevir(99).gonderildi).toBe(true)
  })

  test('null / boş / sayı olmayan = ağda değil (çökmez)', () => {
    expect(durumCevir(null).gonderildi).toBe(false)
    expect(durumCevir('').gonderildi).toBe(false)
    expect(durumCevir(undefined).gonderildi).toBe(false)
    expect(durumCevir('abc').gonderildi).toBe(false)
  })

  test('string gelen kodlar da çalışır (SOAP metin döner)', () => {
    // trackLast StatusCode'u XML'den metin olarak okur — '2' ile 2 aynı olmalı.
    expect(durumCevir('2')).toEqual({ durum: 'teslim', gonderildi: true })
    expect(durumCevir('13')).toEqual({ durum: 'yok', gonderildi: false })
  })
})

// 2026-07-20: ikas panelinde teslim edilmis siparisler "Kargoya Hazir"da takili kaldi.
// Kok neden: _bekleyenKargolar teslim olmus kargolari `son_durum_kodu != 2` ile eliyor
// (UPS'i bosuna sorgulamamak icin dogru bir optimizasyon), ama kopru eklenmeden ONCE
// teslim olmus kargolar ikas'a hic bildirilmedigi icin o eleme onlari sonsuza dek
// gorunmez yapiyordu. Olcum: yerelde teslim 73 kargo, ikas'a bildirilen 1.
describe('_ikasBekleyenTeslimler (telafi turu)', () => {
  // better-sqlite3 DEGIL: o prebuilt ikili Electron icin derlenmis (npmRebuild:false),
  // vitest'in Node'unda NODE_MODULE_VERSION uyusmazligiyla yuklenmiyor. node:sqlite
  // ayni prepare/run/all/exec yuzeyini sunuyor ve SQL'i gercek SQLite'a calistiriyor.
  const { DatabaseSync } = require('node:sqlite')
  const kur = () => {
    const db = new DatabaseSync(':memory:')
    db.exec(`
      CREATE TABLE online_siparisler(id INTEGER PRIMARY KEY, ikas_siparis_id TEXT,
        kargo_durumu TEXT, ikas_kargo_durumu TEXT);
      CREATE TABLE kargolar(id INTEGER PRIMARY KEY, takip_no TEXT, durum TEXT,
        son_durum_kodu INTEGER, olusturma_tarihi TEXT, online_siparis_id INTEGER,
        ikas_siparis_id TEXT, tip TEXT);`)
    return db
  }
  const siparis = (db, id, kargoDurumu, bizYazdik) =>
    db.prepare('INSERT INTO online_siparisler VALUES(?,?,?,?)')
      .run(id, 'IK' + id, kargoDurumu, bizYazdik)
  const kargo = (db, id, sipId, kod, tip = 'gonderi', durum = null) =>
    db.prepare("INSERT INTO kargolar VALUES(?,?,?,?,datetime('now','localtime'),?,NULL,?)")
      .run(id, 'T' + id, durum, kod, sipId, tip)

  test('UPS teslim ama ikas bildirilmemis -> TELAFI EDILIR', () => {
    const db = kur()
    siparis(db, 1, 'READY_FOR_SHIPMENT', null)
    kargo(db, 10, 1, 2)
    const r = takip._ikasBekleyenTeslimler(db)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ siparis_id: 1, takip_no: 'T10' })
  })

  test('zaten bildirilmisse tekrar edilmez', () => {
    const db = kur()
    siparis(db, 1, 'READY_FOR_SHIPMENT', 'DELIVERED')
    kargo(db, 10, 1, 2)
    expect(takip._ikasBekleyenTeslimler(db)).toHaveLength(0)
  })

  test('ikas zaten DELIVERED ise dokunulmaz', () => {
    const db = kur()
    siparis(db, 1, 'DELIVERED', null)
    kargo(db, 10, 1, 2)
    expect(takip._ikasBekleyenTeslimler(db)).toHaveLength(0)
  })

  test('teslim OLMAYAN kargo telafiye girmez (normal tur zaten isler)', () => {
    const db = kur()
    siparis(db, 1, 'READY_FOR_SHIPMENT', null)
    kargo(db, 10, 1, 31)          // agda ama teslim degil
    expect(takip._ikasBekleyenTeslimler(db)).toHaveLength(0)
  })

  test('IADE kargosu telafiye GIRMEZ', () => {
    // Iadenin ikas karsiligi yok: giden siparisi "Teslim Edildi" yapip yanlis bildirim gonderirdi.
    const db = kur()
    siparis(db, 1, 'READY_FOR_SHIPMENT', null)
    kargo(db, 10, 1, 2, 'iade')
    expect(takip._ikasBekleyenTeslimler(db)).toHaveLength(0)
  })

  test('iptal edilmis kargo telafiye girmez', () => {
    const db = kur()
    siparis(db, 1, 'READY_FOR_SHIPMENT', null)
    kargo(db, 10, 1, 2, 'gonderi', 'iptal')
    expect(takip._ikasBekleyenTeslimler(db)).toHaveLength(0)
  })

  test('cok kargolu siparis: TESLIM olanin takip no su secilir, satir TEK olur', () => {
    const db = kur()
    siparis(db, 1, 'READY_FOR_SHIPMENT', null)
    kargo(db, 10, 1, 31)   // yolda
    kargo(db, 11, 1, 2)    // teslim
    const r = takip._ikasBekleyenTeslimler(db)
    expect(r).toHaveLength(1)
    expect(r[0].takip_no).toBe('T11')
  })

  test('ikas siparisi olmayan (magaza ici) kargo telafiye girmez', () => {
    const db = kur()
    db.prepare('INSERT INTO online_siparisler VALUES(?,?,?,?)').run(1, null, 'READY_FOR_SHIPMENT', null)
    kargo(db, 10, 1, 2)
    expect(takip._ikasBekleyenTeslimler(db)).toHaveLength(0)
  })
})

// 2026-07-28: kargo durum bildirimleri — teslim + ozel durum bildirim uretir,
// digerleri uretmez; dedup anahtari elle yenilemede tekrar eklemeyi engeller.
describe('_bildirimKur (kargo bildirimi)', () => {
  const { _bildirimKur: bildirimKur } = takip
  const k = { takip_no: '1Z999', alici_ad: 'Ali Veli', tip: 'gonderi' }

  test('teslim -> normal onem, kargo_teslim tipi', () => {
    const b = bildirimKur(k, 'teslim', 'ISTANBUL')
    expect(b).toMatchObject({ tip: 'kargo_teslim', onem: 'normal', dedup_anahtar: 'kargo:1Z999:teslim' })
    expect(b.mesaj).toBe('Ali Veli — 1Z999 — ISTANBUL')
  })

  test('ozel durum -> YUKSEK onem (ses calar), kargo_sorun tipi', () => {
    const b = bildirimKur(k, 'ozel', 'ADRESTE BULUNAMADI')
    expect(b).toMatchObject({ tip: 'kargo_sorun', onem: 'yuksek', dedup_anahtar: 'kargo:1Z999:ozel' })
  })

  test('gonderildi / yok bildirim URETMEZ (kalabalik olmasin karari)', () => {
    expect(bildirimKur(k, 'gonderildi', '')).toBeNull()
    expect(bildirimKur(k, 'yok', '')).toBeNull()
  })

  test('iade kargosunun teslimi ayri baslikla anlatilir', () => {
    const b = bildirimKur({ ...k, tip: 'iade' }, 'teslim', '')
    expect(b.baslik).toContain('ade')
  })

  test('alici adi / metin yoksa mesaj bos parcasiz kurulur', () => {
    const b = bildirimKur({ takip_no: '1Z1' }, 'teslim')
    expect(b.mesaj).toBe('1Z1')
  })
})
