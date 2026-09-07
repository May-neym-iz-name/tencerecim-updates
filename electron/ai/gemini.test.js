import { describe, it, expect, vi } from 'vitest'
import { uret, metinCikar, alttakiniDene, MODELLER } from './gemini.js'

const yanit = (durum, json) => ({ durum, json })
const basarili = (metin) => yanit(200, { candidates: [{ content: { parts: [{ text: metin }] } }] })

describe('alttakiniDene — GECICI / KALICI ayrimi', () => {
  it('yogunluk ve hiz siniri alt modele gecmeyi hak eder', () => {
    for (const k of [503, 429, 500, 502]) expect(alttakiniDene(k)).toBe(true)
  })
  it('bozuk anahtar ve gecersiz istek HER modelde ayni sonucu verir', () => {
    // Denemek bosuna bekleme; kullaniciya hatayi HEMEN soylemek gerekir.
    for (const k of [400, 401, 403, 404]) expect(alttakiniDene(k)).toBe(false)
  })
})

describe('metinCikar', () => {
  it('parcali yaniti birlestirir', () => {
    expect(metinCikar({ candidates: [{ content: { parts: [{ text: 'Mer' }, { text: 'haba' }] } }] }))
      .toBe('Merhaba')
  })
  it('guvenlik suzgecine takilan yanitta BOS doner', () => {
    // content HIC gelmez, yalniz finishReason olur. Bos donmek dogru:
    // cagiran "uretilemedi" der, bos metin gondermez.
    expect(metinCikar({ candidates: [{ finishReason: 'SAFETY' }] })).toBe('')
    expect(metinCikar({})).toBe('')
  })
})

describe('uret — model dusme', () => {
  it('ilk model calisirsa altina INMEZ', async () => {
    const istek = vi.fn().mockResolvedValue(basarili('Merhaba!'))
    const r = await uret({ anahtar: 'k', istem: 'x', _istek: istek })
    expect(r).toEqual({ metin: 'Merhaba!', model: MODELLER[0] })
    expect(istek).toHaveBeenCalledTimes(1)
  })

  it('503 alinca ALT MODELE duser', async () => {
    const istek = vi.fn()
      .mockResolvedValueOnce(yanit(503, { error: { message: 'overloaded' } }))
      .mockResolvedValue(basarili('Tesekkurler!'))
    const r = await uret({ anahtar: 'k', istem: 'x', _istek: istek })
    expect(r.model).toBe(MODELLER[1])
    expect(istek).toHaveBeenCalledTimes(2)
  })

  it('BOZUK ANAHTARDA hemen durur, diger modelleri denemez', async () => {
    const istek = vi.fn().mockResolvedValue(yanit(400, { error: { message: 'API key not valid' } }))
    await expect(uret({ anahtar: 'k', istem: 'x', _istek: istek })).rejects.toThrow('API key not valid')
    expect(istek).toHaveBeenCalledTimes(1)
  })

  it('TUM modeller yogunsa acik hata verir', async () => {
    const istek = vi.fn().mockResolvedValue(yanit(503, { error: { message: 'overloaded' } }))
    await expect(uret({ anahtar: 'k', istem: 'x', _istek: istek })).rejects.toThrow('overloaded')
    expect(istek).toHaveBeenCalledTimes(MODELLER.length)
  })

  it('bos yanitta alt modeli dener', async () => {
    const istek = vi.fn()
      .mockResolvedValueOnce(yanit(200, { candidates: [{ finishReason: 'SAFETY' }] }))
      .mockResolvedValue(basarili('Olur'))
    const r = await uret({ anahtar: 'k', istem: 'x', _istek: istek })
    expect(r.metin).toBe('Olur')
  })

  it('anahtar YOKSA aga hic cikmaz', async () => {
    const istek = vi.fn()
    await expect(uret({ anahtar: '', istem: 'x', _istek: istek })).rejects.toThrow('anahtari girilmemis')
    expect(istek).not.toHaveBeenCalled()
  })
})
