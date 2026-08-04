import { describe, test, expect } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { icerideAcilirMi, IC_PENCERE_HOSTLARI } = require('./dis-link.js')

describe('icerideAcilirMi', () => {
  test('listedeki alan adı uygulama penceresinde açılır', () => {
    expect(icerideAcilirMi('https://www.ups.com/track?tracknum=1Z999')).toBe(true)
    expect(icerideAcilirMi('https://ups.com.tr/')).toBe(true)
  })

  test('alt alan adları da içeride açılır', () => {
    expect(icerideAcilirMi('https://wwwapps.ups.com/tracking/tracking.cgi')).toBe(true)
  })

  test('listede olmayan siteler tarayıcıya gider', () => {
    expect(icerideAcilirMi('https://www.instagram.com/p/abc123/')).toBe(false)
    expect(icerideAcilirMi('https://ikas.com/panel')).toBe(false)
  })

  test('nokta sınırı: benzeyen ama farklı alan adı içeri ALINMAZ', () => {
    // includes() ile yazılsaydı bunların hepsi sızardı — dış içeriği uygulamanın
    // süreç ağacına sokan gerçek bir güvenlik açığı olurdu.
    expect(icerideAcilirMi('https://sahte-ups.com.saldirgan.net/')).toBe(false)
    expect(icerideAcilirMi('https://notups.com/')).toBe(false)
    expect(icerideAcilirMi('https://ups.com.evil.io/track')).toBe(false)
  })

  test('büyük harfli alan adı da eşleşir', () => {
    expect(icerideAcilirMi('https://WWW.UPS.COM/track')).toBe(true)
  })

  test('ayrıştırılamayan veya boş adres içeri alınmaz', () => {
    expect(icerideAcilirMi('')).toBe(false)
    expect(icerideAcilirMi(null)).toBe(false)
    expect(icerideAcilirMi('sadece düz metin')).toBe(false)
  })

  test('liste boş bırakılırsa her şey tarayıcıya gider', () => {
    expect(icerideAcilirMi('https://www.ups.com/track', [])).toBe(false)
  })

  test('varsayılan liste kısa kalmalı — her ek host ~50-300 MB maliyet demek', () => {
    expect(IC_PENCERE_HOSTLARI.length).toBeLessThanOrEqual(4)
  })
})
