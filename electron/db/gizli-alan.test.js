// Yerel veritabanındaki API secret'larının şifrelenmesi.
//
// Risk: userData/tencerecim.db düz SQLite. Bilgisayar çalınır ya da dosya
// kopyalanırsa ikas client_secret, UPS şifresi ve Meta sayfa token'ı düz metin
// okunabiliyordu.
//
// TUZAK: ikas_ayarlar ve ups_ayarlar Supabase'e SENKRONLANIYOR (ayar-senk.js).
// Şifreli değer buluta giderse diğer PC onu çözemez (DPAPI makineye/kullanıcıya
// bağlıdır) ve entegrasyonlar sessizce ölür. Bu yüzden şifreleme sadece DİSKTE;
// okuma yolları hep çözülmüş değer döndürmeli.
import { describe, it, expect } from 'vitest'
const { DatabaseSync } = require('node:sqlite')
const {
  ONEK, sifreliMi, sifrele, coz, HASSAS_ANAHTARLAR, tabloyuSifrele,
} = require('./gizli-alan.js')

// Sahte DPAPI: gerçek safeStorage yerine geri döndürülebilir bir dönüşüm.
const kripto = {
  kullanilabilir: () => true,
  sifrele: (duz) => Buffer.from('KASA' + duz, 'utf8'),
  coz: (buf) => {
    const s = buf.toString('utf8')
    if (!s.startsWith('KASA')) throw new Error('cozulemedi')
    return s.slice(4)
  },
}
const kriptoYok = { kullanilabilir: () => false, sifrele: () => { throw new Error('yok') }, coz: () => { throw new Error('yok') } }

describe('sifrele / coz', () => {
  it('gidip gelir', () => {
    const s = sifrele('gizli-deger-123', kripto)
    expect(s).not.toContain('gizli-deger-123')
    expect(coz(s, kripto)).toBe('gizli-deger-123')
  })

  it('sifreli degeri onekiyle tanir', () => {
    expect(sifreliMi(sifrele('x', kripto))).toBe(true)
    expect(sifreliMi('duz metin')).toBe(false)
    expect(sifreliMi(null)).toBe(false)
  })

  it('zaten sifreli degeri TEKRAR sifrelemez', () => {
    const bir = sifrele('x', kripto)
    expect(sifrele(bir, kripto)).toBe(bir)
  })

  it('duz metni coz() degistirmeden dondurur (gecis donemi)', () => {
    expect(coz('henuz-sifrelenmemis', kripto)).toBe('henuz-sifrelenmemis')
  })

  it('bos deger sifrelenmez', () => {
    expect(sifrele('', kripto)).toBe('')
    expect(sifrele(null, kripto)).toBe(null)
  })

  it('sifreleme yoksa duz metin kalir — veri kaybetmektense duz sakla', () => {
    expect(sifrele('x', kriptoYok)).toBe('x')
  })

  it('cozulemeyen deger (baska PC/kullanici) bos doner, patlamaz', () => {
    const baskaPc = ONEK + Buffer.from('BOZUK', 'utf8').toString('base64')
    expect(coz(baskaPc, kripto)).toBe('')
  })
})

describe('HASSAS_ANAHTARLAR', () => {
  it('gercek secret alanlarini kapsar', () => {
    expect(HASSAS_ANAHTARLAR.ikas_ayarlar).toContain('client_secret')
    expect(HASSAS_ANAHTARLAR.ups_ayarlar).toContain('sifre')
    expect(HASSAS_ANAHTARLAR.meta_ayarlar).toContain('app_secret')
    expect(HASSAS_ANAHTARLAR.meta_ayarlar).toContain('sayfa_token')
  })

  it('secret OLMAYAN alanlari kapsamaz (gereksiz sifreleme senkronu riske atar)', () => {
    expect(HASSAS_ANAHTARLAR.ikas_ayarlar).not.toContain('store_name')
    expect(HASSAS_ANAHTARLAR.ikas_ayarlar).not.toContain('otomatik_senk')
    expect(HASSAS_ANAHTARLAR.ups_ayarlar).not.toContain('gonderici_adres')
  })
})

describe('tabloyuSifrele (tek seferlik gecis)', () => {
  function db_kur() {
    const db = new DatabaseSync(':memory:')
    db.exec('CREATE TABLE ikas_ayarlar (anahtar TEXT PRIMARY KEY, deger TEXT)')
    return db
  }

  it('duz metin secret satirini sifreler', () => {
    const db = db_kur()
    db.exec("INSERT INTO ikas_ayarlar VALUES ('client_secret','abc123'),('store_name','tencerecim')")

    const sayi = tabloyuSifrele(db, 'ikas_ayarlar', kripto)
    expect(sayi).toBe(1)

    const satirlar = Object.fromEntries(
      db.prepare('SELECT anahtar, deger FROM ikas_ayarlar').all().map((s) => [s.anahtar, s.deger]),
    )
    expect(sifreliMi(satirlar.client_secret)).toBe(true)
    expect(coz(satirlar.client_secret, kripto)).toBe('abc123')
    // Hassas olmayan alan DOKUNULMAZ — senkronla buluta gidiyor.
    expect(satirlar.store_name).toBe('tencerecim')
  })

  it('ikinci calistirmada hicbir sey yapmaz (cift sifreleme yok)', () => {
    const db = db_kur()
    db.exec("INSERT INTO ikas_ayarlar VALUES ('client_secret','abc123')")
    tabloyuSifrele(db, 'ikas_ayarlar', kripto)
    expect(tabloyuSifrele(db, 'ikas_ayarlar', kripto)).toBe(0)

    const s = db.prepare("SELECT deger FROM ikas_ayarlar WHERE anahtar='client_secret'").get()
    expect(coz(s.deger, kripto)).toBe('abc123')
  })

  it('bos secret satirini sifrelemez', () => {
    const db = db_kur()
    db.exec("INSERT INTO ikas_ayarlar VALUES ('client_secret','')")
    expect(tabloyuSifrele(db, 'ikas_ayarlar', kripto)).toBe(0)
  })

  it('sifreleme kullanilamiyorsa hicbir sey degistirmez', () => {
    const db = db_kur()
    db.exec("INSERT INTO ikas_ayarlar VALUES ('client_secret','abc123')")
    expect(tabloyuSifrele(db, 'ikas_ayarlar', kriptoYok)).toBe(0)
    const s = db.prepare("SELECT deger FROM ikas_ayarlar WHERE anahtar='client_secret'").get()
    expect(s.deger).toBe('abc123')
  })
})
