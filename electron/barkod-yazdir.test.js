// Yazıcı listesi yedek yolunun saf kısımları — wmic CSV ayrıştırma + kodlama çözme.
// (Win7 mağaza kasasında getPrintersAsync boş dönüyordu; emsal: istek-pdf.test.js)
import { describe, test, expect } from 'vitest'
import barkodYazdir from './barkod-yazdir.js'

const { _wmicCsvAyristir: ayristir, _bufferCoz: coz } = barkodYazdir

describe('_wmicCsvAyristir', () => {
  test('wmic CSV satırlarını (Node,Default,Name) yazıcıya çevirir', () => {
    const csv = [
      'Node,Default,Name',
      'SERVER-PC,TRUE,Argox OS-214 plus series PPLA',
      'SERVER-PC,FALSE,Microsoft XPS Document Writer',
      '',
    ].join('\r\n')
    expect(ayristir(csv)).toEqual([
      { ad: 'Argox OS-214 plus series PPLA', aciklama: 'Argox OS-214 plus series PPLA', varsayilan: true },
      { ad: 'Microsoft XPS Document Writer', aciklama: 'Microsoft XPS Document Writer', varsayilan: false },
    ])
  })

  test('yazıcı adındaki virgül adı bölmez', () => {
    const csv = 'PC,FALSE,Xprinter XP-470B, Termal'
    expect(ayristir(csv)[0].ad).toBe('Xprinter XP-470B, Termal')
  })

  test('boş/başlık/bozuk satırlar elenir', () => {
    expect(ayristir('Node,Default,Name\r\n\r\nsaçma satır\r\n')).toEqual([])
  })

  test('PowerShell biçimi (PC,True,Ad) de aynı ayrıştırıcıdan geçer', () => {
    const cikti = 'PC,True,Termal Yazıcı\nPC,False,PDF Yazıcı'
    expect(ayristir(cikti).map(y => y.varsayilan)).toEqual([true, false])
  })
})

describe('_bufferCoz', () => {
  test('UTF-16LE BOM\'lu çıktıyı doğru çözer', () => {
    const buf = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('PC,TRUE,Yazıcı', 'utf16le')])
    expect(coz(buf)).toBe('PC,TRUE,Yazıcı')
  })

  test('BOM\'suz ama null baytlı (UTF-16) çıktıyı da yakalar', () => {
    const buf = Buffer.from('PC,TRUE,Test', 'utf16le')
    expect(coz(buf)).toBe('PC,TRUE,Test')
  })

  test('düz utf8 çıktı olduğu gibi döner', () => {
    expect(coz(Buffer.from('PC,TRUE,Türkçe Yazıcı', 'utf8'))).toBe('PC,TRUE,Türkçe Yazıcı')
  })
})
