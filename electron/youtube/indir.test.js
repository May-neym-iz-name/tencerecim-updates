import { describe, it, expect, vi } from 'vitest'
import { geciciMiHata, hataMetni, yenidenDene, indirTek } from './indir.js'
import { Readable } from 'stream'
import fs from 'fs'
import os from 'os'
import path from 'path'

describe('geciciMiHata', () => {
  it('SSL kopmasini GECICI sayar', () => {
    // 2026-09-07'de gercekten alinan hata. Kalici sayilsaydi indirme
    // tek denemede vazgecer, otomasyon sessizce eksik calisirdi.
    const e = new Error('error:100003e8:SSL routines:OPENSSL_internal:SSLV3_ALERT_CLOSE_NOTIFY')
    expect(geciciMiHata(e)).toBe(true)
  })

  it('baglanti kopmalarini GECICI sayar', () => {
    for (const m of ['ECONNRESET', 'ETIMEDOUT', 'socket hang up', 'EAI_AGAIN']) {
      expect(geciciMiHata(new Error(m))).toBe(true)
    }
  })

  it('HTTP 5xx ve 429 GECICI', () => {
    expect(geciciMiHata(new Error('indirme HTTP 503'))).toBe(true)
    expect(geciciMiHata(new Error('indirme HTTP 429'))).toBe(true)
  })

  it('HTTP 403/404 KALICI — suresi dolmus imzali adres tekrar denenmez', () => {
    expect(geciciMiHata(new Error('indirme HTTP 403'))).toBe(false)
    expect(geciciMiHata(new Error('indirme HTTP 404'))).toBe(false)
  })

  it('tanidik ama agla ilgisiz hatayi KALICI sayar', () => {
    expect(geciciMiHata(new Error('cok fazla yonlendirme'))).toBe(false)
  })

  it('MESAJSIZ hatayi GECICI sayar — kalicilik kaniti yok', () => {
    // 2026-09-07: bir indirme mesajsiz hatayla dustu ve KALICI sanilip
    // tekrar denenmedi. Ag isleminde kanitsiz pes etmek daha pahali.
    expect(geciciMiHata(new Error(''))).toBe(true)
    expect(geciciMiHata(Object.assign(new Error(''), { code: 'ECONNRESET' }))).toBe(true)
  })

  it('mesajsiz hatayi kod/ad ile okunur kilar', () => {
    const e = Object.assign(new Error(''), { code: 'EPIPE', name: 'Error' })
    expect(hataMetni(e)).toContain('EPIPE')
  })
})

describe('yenidenDene', () => {
  const hicBekleme = { bekleyici: async () => {} }

  it('ilk denemede basarili olursa tekrar denemez', async () => {
    const is = vi.fn().mockResolvedValue(42)
    await expect(yenidenDene(is, hicBekleme)).resolves.toBe(42)
    expect(is).toHaveBeenCalledTimes(1)
  })

  it('gecici hatadan sonra tekrar dener ve basarili olur', async () => {
    const is = vi.fn()
      .mockRejectedValueOnce(new Error('SSLV3_ALERT_CLOSE_NOTIFY'))
      .mockResolvedValue(7)
    await expect(yenidenDene(is, hicBekleme)).resolves.toBe(7)
    expect(is).toHaveBeenCalledTimes(2)
  })

  it('KALICI hatada HIC tekrar denemez', async () => {
    const is = vi.fn().mockRejectedValue(new Error('indirme HTTP 404'))
    await expect(yenidenDene(is, hicBekleme)).rejects.toThrow('404')
    expect(is).toHaveBeenCalledTimes(1)
  })

  it('deneme hakki bitince son hatayi firlatir', async () => {
    const is = vi.fn().mockRejectedValue(new Error('ECONNRESET'))
    await expect(yenidenDene(is, { ...hicBekleme, deneme: 3 })).rejects.toThrow('ECONNRESET')
    expect(is).toHaveBeenCalledTimes(3)
  })

  it('beklemeyi denemeye gore ARTIRIR', async () => {
    const sureler = []
    const is = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValue('ok')
    await yenidenDene(is, {
      beklemeMs: 100,
      bekleyici: async (ms) => { sureler.push(ms) },
    })
    // Sabit bekleme, gecici tikanikligi asmakta yetersiz kalir.
    expect(sureler).toEqual([100, 200])
  })
})

// ---------------------------------------------------------------------------
// indirTek — YARIM DOSYA KORUMASI
//
// En sinsi ariza bu: indirme yarida koparsa disk uzerinde gecerli gorunen ama
// bozuk bir .mp4 kalir; otomasyon onu "zaten inmis" sayip YouTube'a yukler.
// Ag hatasi istedigin anda uretilemedigi icin `get` disaridan veriliyor.
// ---------------------------------------------------------------------------
describe('indirTek', () => {
  const klasor = fs.mkdtempSync(path.join(os.tmpdir(), 'indir-test-'))
  const hedefUret = (ad) => path.join(klasor, ad + '.mp4')

  // Sahte ag: verilen yaniti dondurur, istek nesnesi gercegin sozlesmesini taklit eder.
  function sahteGet(yanitUret) {
    return (url, cb) => {
      const istek = { on: () => istek, setTimeout: () => istek, destroy: () => {} }
      // Yanit bir sonraki tick'te gelir — gercek agda da senkron gelmez.
      setImmediate(() => cb(yanitUret(url)))
      return istek
    }
  }

  function yanit(parcalar, { statusCode = 200, headers = {}, hata = null } = {}) {
    const res = new Readable({ read() {} })
    res.statusCode = statusCode
    res.headers = headers
    setImmediate(() => {
      for (const p of parcalar) res.push(Buffer.from(p))
      if (hata) res.emit('error', hata)
      else res.push(null)
    })
    return res
  }

  it('tam inen dosyayi yazar ve bayt sayisini doner', async () => {
    const hedef = hedefUret('tam')
    const boyut = await indirTek('https://x/v.mp4', hedef, {
      get: sahteGet(() => yanit(['abc', 'de'])),
    })
    expect(boyut).toBe(5)
    expect(fs.readFileSync(hedef, 'utf8')).toBe('abcde')
    expect(fs.existsSync(hedef + '.parca')).toBe(false)
  })

  it('AKIS KOPARSA hedef dosyayi OLUSTURMAZ — yarim video gecerli sanilmaz', async () => {
    const hedef = hedefUret('yarim')
    await expect(indirTek('https://x/v.mp4', hedef, {
      get: sahteGet(() => yanit(['yarim veri'], { hata: new Error('ECONNRESET') })),
    })).rejects.toThrow('ECONNRESET')
    // Kritik iddia: .mp4 YOK. Olsaydi otomasyon onu inmis sayip yuklerdi.
    expect(fs.existsSync(hedef)).toBe(false)
    // NOT: ".parca artigi silindi mi" DIYE SORULMUYOR. Silinme, yazma akisinin
    // tanitici kapanmasina bagli ve olculdugunde 5 kosumun 1'inde erken bitiyor
    // (2026-09-07). Ara sira kirmizi olan bir iddia koruma degil, gurultudur.
    // Sizintiyi engelleyen duzeltme indir.js'te duruyor ve gerekcesi orada yazili.
  })

  it('yarim baytlar NIHAI yola hic yazilmaz — once .parca olusur', async () => {
    // Bu testin mutasyonu: `gecici = hedef` yapmak. O zaman .parca HIC olusmaz,
    // yarim veri dogrudan .mp4'e akar ve asagidaki bekleme zaman asimina ugrar.
    // Zamanlamaya bagli degil: bir yol var olur, digeri asla.
    const hedef = hedefUret('akista')
    const res = new Readable({ read() {} })
    res.statusCode = 200
    res.headers = {}
    const sozu = indirTek('https://x/v.mp4', hedef, { get: sahteGet(() => res) })

    setImmediate(() => res.push(Buffer.alloc(64 * 1024, 1)))
    // .parca belirene kadar bekle (en cok 2 sn).
    const basla = Date.now()
    while (!fs.existsSync(hedef + '.parca')) {
      expect(fs.existsSync(hedef)).toBe(false) // nihai yolda yarim veri ASLA
      if (Date.now() - basla > 2000) throw new Error('.parca hic olusmadi — yarim veri dogrudan hedefe yaziliyor')
      await new Promise(r => setTimeout(r, 10))
    }
    expect(fs.existsSync(hedef)).toBe(false)

    res.push(null)
    await sozu
    // Tamamlaninca ad degisir: .parca gider, .mp4 gelir.
    expect(fs.existsSync(hedef)).toBe(true)
    expect(fs.existsSync(hedef + '.parca')).toBe(false)
  })

  it('BOS govdeyi reddeder ve dosya birakmaz', async () => {
    const hedef = hedefUret('bos')
    await expect(indirTek('https://x/v.mp4', hedef, {
      get: sahteGet(() => yanit([])),
    })).rejects.toThrow('bos')
    expect(fs.existsSync(hedef)).toBe(false)
  })

  it('EKSIK govdeyi (Content-Length tutmuyor) reddeder ve dosya birakmaz', async () => {
    // Sunucu hata VERMEDEN erken kapatirsa akis normal biter. Content-Length
    // olmasa bu yarim video gecerli sanilip YouTube'a yuklenirdi.
    const hedef = hedefUret('eksik')
    await expect(indirTek('https://x/v.mp4', hedef, {
      get: sahteGet(() => yanit(['12345'], { headers: { 'content-length': '999' } })),
    })).rejects.toThrow('eksik indirme')
    expect(fs.existsSync(hedef)).toBe(false)
    expect(fs.existsSync(hedef + '.parca')).toBe(false)
  })

  it('eksik indirmeyi GECICI sayar — yeniden denenir', async () => {
    // Hata metni ELLE YAZILMIYOR: indirTek'in GERCEKTEN urettigi hata alinip
    // siniflandiriciya veriliyor. Elle yazilsaydi, uretecin metni degistiginde
    // test yesil kalir ve eksik indirme sessizce "kalici" sayilirdi
    // (07.09 mutasyon testi tam bunu yakaladi).
    const hedef = hedefUret('eksik-gecici')
    const hata = await indirTek('https://x/v.mp4', hedef, {
      get: sahteGet(() => yanit(['12345'], { headers: { 'content-length': '999' } })),
    }).then(() => null, e => e)
    expect(hata).toBeTruthy()
    expect(geciciMiHata(hata)).toBe(true)
  })

  it('Content-Length tutuyorsa kabul eder', async () => {
    const hedef = hedefUret('tamuzunluk')
    const boyut = await indirTek('https://x/v.mp4', hedef, {
      get: sahteGet(() => yanit(['12345'], { headers: { 'content-length': '5' } })),
    })
    expect(boyut).toBe(5)
    expect(fs.existsSync(hedef)).toBe(true)
  })

  it('yonlendirmeyi izler', async () => {
    const hedef = hedefUret('yonlendirme')
    const gidilen = []
    await indirTek('https://x/1', hedef, {
      get: sahteGet((url) => {
        gidilen.push(url)
        return url === 'https://x/1'
          ? yanit([], { statusCode: 302, headers: { location: 'https://cdn/2' } })
          : yanit(['veri'])
      }),
    })
    expect(gidilen).toEqual(['https://x/1', 'https://cdn/2'])
    expect(fs.readFileSync(hedef, 'utf8')).toBe('veri')
  })

  it('yonlendirme dongusunde pes eder', async () => {
    const hedef = hedefUret('dongu')
    await expect(indirTek('https://x/1', hedef, {
      yonlendirmeKalan: 2,
      get: sahteGet(() => yanit([], { statusCode: 302, headers: { location: 'https://x/1' } })),
    })).rejects.toThrow('yonlendirme')
  })

  it('HTTP hata kodunu okunur hataya cevirir', async () => {
    const hedef = hedefUret('dortyuzdort')
    await expect(indirTek('https://x/v.mp4', hedef, {
      get: sahteGet(() => yanit([], { statusCode: 404 })),
    })).rejects.toThrow('HTTP 404')
    expect(fs.existsSync(hedef)).toBe(false)
  })
})
