import { describe, it, expect } from 'vitest'
import { istemKur, yanitiTemizle, ENFAZLA_KARAKTER } from './yorum-yanit.js'

describe('istemKur', () => {
  it('yorum, kisi ve video basligini yerlestirir', () => {
    const i = istemKur({ yorum: 'Fiyatı nedir?', kisi: 'Ayşe', video: 'Çelik Kase Seti' })
    expect(i).toContain('Fiyatı nedir?')
    expect(i).toContain('Ayşe')
    expect(i).toContain('Çelik Kase Seti')
    expect(i).toContain(String(ENFAZLA_KARAKTER))
  })

  it('eksik alanlarda cokmez, yer tutucu birakmaz', () => {
    const i = istemKur({ yorum: 'test' })
    expect(i).not.toContain('{kisi}')
    expect(i).not.toContain('{video}')
    expect(i).toContain('(bilinmiyor)')
  })

  it('cok uzun yorumu kirpar — istem sisirilmesin', () => {
    const i = istemKur({ yorum: 'a'.repeat(5000) })
    expect(i.length).toBeLessThan(3000)
  })

  it('mutlak iddia yasagini ve mesru terim istisnasini TASIR', () => {
    // Istem katmani kapinin ikizidir; biri degisip digeri kalirsa model
    // engellenecek metni uretmeye devam eder (07.09 dersi).
    const i = istemKur({ yorum: 'x' })
    expect(i).toContain('cizilmez')
    expect(i).toContain('paslanmaz celik')
  })
})

describe('yanitiTemizle', () => {
  it('tum yaniti saran tirnaklari atar', () => {
    expect(yanitiTemizle('"Merhaba, tesekkurler!"')).toBe('Merhaba, tesekkurler!')
    expect(yanitiTemizle('“Merhaba”')).toBe('Merhaba')
  })
  it('IC tirnaklara dokunmaz', () => {
    expect(yanitiTemizle('Urun "Soft" serisinden')).toBe('Urun "Soft" serisinden')
  })
  it('basliklari atar', () => {
    expect(yanitiTemizle('Yanıt: Merhaba')).toBe('Merhaba')
    expect(yanitiTemizle('Cevap:  Merhaba')).toBe('Merhaba')
  })
  it('bos girdide cokmez', () => {
    expect(yanitiTemizle(null)).toBe('')
    expect(yanitiTemizle('  ')).toBe('')
  })
})
