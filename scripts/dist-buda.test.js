// dist-buda davranis testleri. Bu betik DOSYA SILER ve build:win sonunda
// otomatik kosar; yanlis surum secmesi yayindaki kurulumu yok eder. Asagidaki
// testler ozellikle "en yeni 3'u dogru sec" davranisini iki yonden kilitler.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
const fs = require('fs')
const os = require('os')
const path = require('path')
const { buda, surumuAyikla, surumleriSirala } = require('./dist-buda.js')

describe('surumuAyikla', () => {
  it('kurulum ve blockmap dosyalarindan surumu cikarir', () => {
    expect(surumuAyikla('tencerecim-setup-1.2.221.exe').anahtar).toBe('1.2.221')
    expect(surumuAyikla('tencerecim-setup-1.2.221.exe.blockmap').anahtar).toBe('1.2.221')
  })

  it('kurulum olmayan dosyalara dokunmaz', () => {
    expect(surumuAyikla('latest.yml')).toBeNull()
    expect(surumuAyikla('builder-debug.yml')).toBeNull()
    expect(surumuAyikla('win-unpacked')).toBeNull()
    expect(surumuAyikla('baska-uygulama-setup-1.0.0.exe')).toBeNull()
  })
})

describe('surumleriSirala', () => {
  // Bu projede surum numarasi 1.2.221'e ulasti; metin siralamasinda
  // '1.2.9' > '1.2.100' cikar ve budayici GERCEK son surumleri silerdi.
  it('surumleri SAYISAL siralar, metin olarak DEGIL', () => {
    const girdi = ['1.2.9', '1.2.100', '1.2.221', '1.2.10'].map((a) => ({
      anahtar: a,
      parcalar: a.split('.').map(Number),
    }))
    expect(surumleriSirala(girdi).map((s) => s.anahtar)).toEqual([
      '1.2.221',
      '1.2.100',
      '1.2.10',
      '1.2.9',
    ])
  })

  it('ana ve ikincil surum farkini da dogru siralar', () => {
    const girdi = ['1.3.0', '2.0.1', '1.2.999'].map((a) => ({
      anahtar: a,
      parcalar: a.split('.').map(Number),
    }))
    expect(surumleriSirala(girdi).map((s) => s.anahtar)).toEqual(['2.0.1', '1.3.0', '1.2.999'])
  })
})

describe('buda', () => {
  let dizin

  const kurulumYaz = (surumler) => {
    for (const s of surumler) {
      fs.writeFileSync(path.join(dizin, `tencerecim-setup-${s}.exe`), 'x'.repeat(100))
      fs.writeFileSync(path.join(dizin, `tencerecim-setup-${s}.exe.blockmap`), 'y')
    }
  }
  const kalanlar = () => fs.readdirSync(dizin).sort()

  beforeEach(() => {
    dizin = fs.mkdtempSync(path.join(os.tmpdir(), 'dist-buda-'))
  })
  afterEach(() => {
    fs.rmSync(dizin, { recursive: true, force: true })
  })

  it('yalniz en yeni 3 surumu birakir, exe ve blockmap birlikte', () => {
    kurulumYaz(['1.2.9', '1.2.100', '1.2.219', '1.2.220', '1.2.221'])
    const sonuc = buda({ tut: 3, dizin })

    expect(sonuc.tutulan).toEqual(['1.2.221', '1.2.220', '1.2.219'])
    expect(kalanlar()).toEqual([
      'tencerecim-setup-1.2.219.exe',
      'tencerecim-setup-1.2.219.exe.blockmap',
      'tencerecim-setup-1.2.220.exe',
      'tencerecim-setup-1.2.220.exe.blockmap',
      'tencerecim-setup-1.2.221.exe',
      'tencerecim-setup-1.2.221.exe.blockmap',
    ])
  })

  it('kurulum disindaki dosyalara ASLA dokunmaz', () => {
    kurulumYaz(['1.2.1', '1.2.221'])
    fs.writeFileSync(path.join(dizin, 'latest.yml'), 'version: 1.2.221')
    fs.writeFileSync(path.join(dizin, 'builder-debug.yml'), 'x')
    fs.mkdirSync(path.join(dizin, 'win-unpacked'))

    buda({ tut: 1, dizin })

    expect(fs.existsSync(path.join(dizin, 'latest.yml'))).toBe(true)
    expect(fs.existsSync(path.join(dizin, 'builder-debug.yml'))).toBe(true)
    expect(fs.existsSync(path.join(dizin, 'win-unpacked'))).toBe(true)
  })

  it('surum sayisi tutma sinirindan azsa hicbir sey silmez', () => {
    kurulumYaz(['1.2.220', '1.2.221'])
    const sonuc = buda({ tut: 3, dizin })

    expect(sonuc.silinen).toEqual([])
    expect(kalanlar()).toHaveLength(4)
  })

  it('--kuru kipinde hicbir dosya silinmez ama rapor uretilir', () => {
    kurulumYaz(['1.2.1', '1.2.220', '1.2.221'])
    const sonuc = buda({ tut: 2, kuru: true, dizin })

    expect(sonuc.silinen).toHaveLength(2) // exe + blockmap
    expect(kalanlar()).toHaveLength(6) // hicbiri gercekten silinmedi
  })

  it('kazanilan baytlari raporlar', () => {
    kurulumYaz(['1.2.1', '1.2.221'])
    const sonuc = buda({ tut: 1, dizin })
    expect(sonuc.bayt).toBe(101) // 100 baytlik exe + 1 baytlik blockmap
  })

  it('dizin yoksa cakilmaz', () => {
    expect(() => buda({ dizin: path.join(dizin, 'yok') })).not.toThrow()
  })
})
