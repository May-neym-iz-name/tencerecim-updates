import { describe, it, expect } from 'vitest'
import { istatistikCevir, bayatlar } from './istatistik.js'

// videos.list part=statistics gercek yanit bicimi. Sayilar METIN gelir.
const oge = (ek = {}) => ({
  id: 'vid1',
  statistics: { viewCount: '12345', likeCount: '89', commentCount: '7', ...ek },
})

describe('istatistikCevir', () => {
  it('metin sayilari sayiya cevirir', () => {
    expect(istatistikCevir(oge())).toEqual({
      konu_id: 'vid1', izlenme: 12345, begeni: 89, yorum_adet: 7,
    })
  })

  it('kanal begeniyi GIZLEDIYSE null verir, sifir DEGIL', () => {
    const { likeCount, ...kalan } = oge().statistics
    const r = istatistikCevir({ id: 'vid1', statistics: kalan })
    expect(r.begeni).toBeNull()
    expect(r.izlenme).toBe(12345)
  })

  it('BOS METNI sifira cevirmez — olcum yok ile sifir izlenme ayri seydir', () => {
    expect(istatistikCevir(oge({ viewCount: '' })).izlenme).toBeNull()
  })

  it('sayiya cevrilemeyen degeri null yapar', () => {
    expect(istatistikCevir(oge({ likeCount: 'abc' })).begeni).toBeNull()
  })

  it('gercek sifiri KORUR', () => {
    expect(istatistikCevir(oge({ commentCount: '0' })).yorum_adet).toBe(0)
  })

  it('statistics yoksa null doner (part istenmemis yanit)', () => {
    expect(istatistikCevir({ id: 'vid1' })).toBeNull()
    expect(istatistikCevir(null)).toBeNull()
  })
})

describe('bayatlar', () => {
  const SIMDI = 1_757_000_000_000

  it('taze kaydi CEKMEZ', () => {
    const taze = SIMDI - 1 * 3600 * 1000
    expect(bayatlar([{ konu_id: 'a', istatistik_ts: taze }], { simdi: SIMDI })).toEqual([])
  })

  it('6 saatten eski kaydi ceker', () => {
    const eski = SIMDI - 7 * 3600 * 1000
    expect(bayatlar([{ konu_id: 'a', istatistik_ts: eski }], { simdi: SIMDI })).toEqual(['a'])
  })

  it('hic olculmemis kaydi (null) ceker', () => {
    expect(bayatlar([{ konu_id: 'a', istatistik_ts: null }], { simdi: SIMDI })).toEqual(['a'])
  })

  it('bozuk/sifir damgayi bayat sayar', () => {
    const satirlar = [{ konu_id: 'a', istatistik_ts: 0 }, { konu_id: 'b', istatistik_ts: 'xx' }]
    expect(bayatlar(satirlar, { simdi: SIMDI })).toEqual(['a', 'b'])
  })

  it('tazelik penceresi ayarlanabilir', () => {
    const yarimSaatOnce = SIMDI - 1800 * 1000
    const satir = [{ konu_id: 'a', istatistik_ts: yarimSaatOnce }]
    expect(bayatlar(satir, { simdi: SIMDI, tazeSaat: 6 })).toEqual([])
    expect(bayatlar(satir, { simdi: SIMDI, tazeSaat: 0.1 })).toEqual(['a'])
  })

  it('bos girdide patlamaz', () => {
    expect(bayatlar(null)).toEqual([])
    expect(bayatlar([])).toEqual([])
  })
})
