import { describe, it, expect } from 'vitest'
import { adSadelestir, adBasHarfi } from './ad.js'

describe('adSadelestir — YouTube tanitici', () => {
  it('@ ve rastgele son eki atar, kelimeleri ayirir', () => {
    expect(adSadelestir('@MevlutGunay-c7p')).toBe('Mevlut Gunay')
    expect(adSadelestir('@FATMAKANDAŞOĞLU-m7e')).toBe('FATMAKANDAŞOĞLU')
    expect(adSadelestir('@EmineÖZPINAR-d8k6f')).toBe('Emine ÖZPINAR')
  })

  it('bitisik yazilmis adi ayirir', () => {
    expect(adSadelestir('@EylulYagmurOz')).toBe('Eylul Yagmur Oz')
  })

  it('sondaki rakam yigini atilir', () => {
    expect(adSadelestir('@sukrankara117')).toBe('Sukrankara')
    expect(adSadelestir('@tencerecim9423')).toBe('Tencerecim')
  })

  it('nokta ve alt cizgi bosluga cevrilir', () => {
    expect(adSadelestir('@wasabi44.')).toBe('Wasabi')
    expect(adSadelestir('@ayse_oguz')).toBe('Ayse Oguz')
  })

  it('Turkce buyuk harf de kelime siniridir', () => {
    expect(adSadelestir('@AyseİpekYilmaz')).toBe('Ayse İpek Yilmaz')
  })
})

describe('adSadelestir — DOKUNULMAMASI gerekenler', () => {
  it('gercek ad (bosluklu) AYNEN kalir', () => {
    // Instagram/Facebook gercek ad dondurur; ayirmaya calismak bozar.
    expect(adSadelestir('Ayşe Yılmaz')).toBe('Ayşe Yılmaz')
    expect(adSadelestir('Fatma Nur Kandaşoğlu')).toBe('Fatma Nur Kandaşoğlu')
  })

  it('gercek adin SONUNDAKI rakam korunur', () => {
    // Isletme/kisi adlarinda plaka veya yil sik gecer ("Sevgi Ticaret 34").
    // Tanitici temizligi buraya uygulanirsa adin parcasi silinir.
    expect(adSadelestir('Sevgi Ticaret 34')).toBe('Sevgi Ticaret 34')
  })

  it('gercek addaki TIRE bosluga cevrilmez', () => {
    expect(adSadelestir('Ayşe Nur-Kaya')).toBe('Ayşe Nur-Kaya')
  })

  it('"-oglu" gibi GERCEK ad parcasi son ek sanilmaz', () => {
    // Son ek kurali harf+RAKAM karisimi ister; saf harf dizisi korunur.
    expect(adSadelestir('@ahmet-oglu')).toBe('Ahmet Oglu')
  })

  it('tamami rakam olan ad bosaltilmaz', () => {
    expect(adSadelestir('@12345')).toBe('12345')
  })

  it('cevrilemeyen girdi AYNEN doner — bos ad uzun addan kotudur', () => {
    expect(adSadelestir('@')).toBe('@')
    expect(adSadelestir('')).toBe('')
    expect(adSadelestir(null)).toBe('')
  })
})

describe('kirpma', () => {
  it('enFazla verilince sonu kirpar', () => {
    expect(adSadelestir('@EylulYagmurOzdemirKaya', 12)).toBe('Eylul Yagmu…')
  })
  it('enFazla 0 iken kirpmaz', () => {
    expect(adSadelestir('@EylulYagmurOz', 0)).toBe('Eylul Yagmur Oz')
  })
})

describe('adBasHarfi', () => {
  it('avatar harfini SADELESMIS addan alir — "@" gorunmez', () => {
    expect(adBasHarfi('@MevlutGunay-c7p')).toBe('M')
    expect(adBasHarfi('Ayşe Yılmaz')).toBe('A')
    expect(adBasHarfi('')).toBe('?')
  })
})
