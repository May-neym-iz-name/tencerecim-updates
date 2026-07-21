// Türkçe kelime bazlı arama: davranış + İKİZ DOSYA PARİTESİ.
//
// electron/db/tr-arama.js (CJS, Electron) ve src/utils/arama.js (ESM, Vite) aynı mantığın
// iki kopyasıdır — tek dosya paylaşılamıyor. Bu test ikisinin AYNI kaldığını doğrular
// (emsal: src/auth/yetki-paritesi.test.js).
import { describe, test, expect } from 'vitest'
import { trNormal, kelimeler, eslesirMi } from './arama.js'

const arka = require('../../electron/db/tr-arama.js')

// Kullanıcının bildirdiği gerçek ürün (2026-07-20).
const URUN = 'LİNES OSCAR 18 X 10 ÇELİK TENCERE KORDONLU METAL KULP CAM KAPAK'

describe('trNormal — Türkçe harf katlama', () => {
  test('i/ı/İ/I hepsi aynı harfe iner (Türkçe "I sorunu")', () => {
    // ASIL MESELE: toLocaleLowerCase('tr') "LINES"i "lınes" yapar ve "LİNES"i BULAMAZ.
    expect(trNormal('LİNES')).toBe('lines')
    expect(trNormal('LINES')).toBe('lines')
    expect(trNormal('lines')).toBe('lines')
    expect(trNormal('LINES'.toLocaleLowerCase('tr'))).toBe('lines') // 'lınes' bile olsa
  })

  test('ş/ğ/ü/ö/ç katlanır — klavyede özenmeden yazılabilsin', () => {
    expect(trNormal('ÇELİK')).toBe('celik')
    expect(trNormal('çelik')).toBe('celik')
    expect(trNormal('ŞİŞE')).toBe('sise')
    expect(trNormal('GÜVEÇ')).toBe('guvec')
    expect(trNormal('KÖŞE')).toBe('kose')
    expect(trNormal('DÖKÜM')).toBe('dokum')
  })

  test('düzeltme işaretli harfler de katlanır', () => {
    expect(trNormal('KÂSE')).toBe('kase')
  })

  test('null/undefined çökmez', () => {
    expect(trNormal(null)).toBe('')
    expect(trNormal(undefined)).toBe('')
    expect(trNormal(123)).toBe('123')
  })
})

describe('eslesirMi — kelime sırası önemsiz', () => {
  test('KULLANICININ ÖRNEĞİ: karışık sırada, karışık büyük/küçük harfle bulunur', () => {
    expect(eslesirMi(URUN, 'lines ÇELİK TENCERE METAL KULP oscar cam kapak')).toBe(true)
  })

  test('farklı kombinasyonlar da bulur (örnek tek bir durum değil)', () => {
    const aramalar = [
      'cam kapak lines',
      'OSCAR celik',
      'tencere oscar',
      'kordonlu 18',
      'metal kulp',
      'KAPAK TENCERE LINES',      // ASCII I ile
      'lınes',                     // noktasız ı ile
      'çelik tencere',
      'CELIK TENCERE',             // hiç Türkçe karakter yazmadan
      '10 x 18',                   // sayılar da sırasız
    ]
    for (const a of aramalar) {
      expect(eslesirMi(URUN, a), `"${a}" bulmalıydı`).toBe(true)
    }
  })

  test('kelimelerden BİRİ bile yoksa eşleşmez (AND mantığı)', () => {
    expect(eslesirMi(URUN, 'lines tencere PLASTIK')).toBe(false)
    expect(eslesirMi(URUN, 'granit')).toBe(false)
  })

  test('boş arama her şeyi geçirir', () => {
    expect(eslesirMi(URUN, '')).toBe(true)
    expect(eslesirMi(URUN, '   ')).toBe(true)
    expect(eslesirMi(URUN, null)).toBe(true)
  })

  test('fazla boşluklar sorun çıkarmaz', () => {
    expect(eslesirMi(URUN, '  lines    kapak  ')).toBe(true)
    expect(kelimeler('  a   b ')).toEqual(['a', 'b'])
  })

  test('null metin çökmez', () => {
    expect(eslesirMi(null, 'lines')).toBe(false)
  })
})

describe('PARİTE — iki kopya aynı sonucu vermeli', () => {
  const ORNEKLER = [
    URUN, 'LINES', 'LİNES', 'lınes', 'ÇELİK TENCERE', 'GÜVEÇ', 'KÂSE', 'Şişli Ğ Ü Ö Ç',
    'TNC.LNS.00001', '', '   ', 'abc123', 'I i İ ı',
  ]

  test('trNormal her örnekte birebir aynı', () => {
    for (const s of ORNEKLER) {
      expect(arka.trNormal(s), `trNormal("${s}")`).toBe(trNormal(s))
    }
  })

  test('kelimeler her örnekte birebir aynı', () => {
    for (const s of ORNEKLER) {
      expect(arka.kelimeler(s)).toEqual(kelimeler(s))
    }
  })

  test('eslesirMi her kombinasyonda birebir aynı', () => {
    for (const metin of ORNEKLER) {
      for (const arama of ORNEKLER) {
        expect(arka.eslesirMi(metin, arama), `("${metin}","${arama}")`).toBe(eslesirMi(metin, arama))
      }
    }
  })
})
