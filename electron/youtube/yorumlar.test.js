import { describe, it, expect } from 'vitest'
import { threadCevir, videoKimlikleri } from './yorumlar.js'

const KANAL = 'UCb7b4edsAQP0_X1iZh4Pegw'

// Gercek commentThreads.list yanitinin bicimi (part=snippet,replies).
function thread({ videoId = 'vid1', ustId = 'c1', ustYazar = 'UCmusteri',
                  ustAd = 'Ayse', ustMetin = 'Fiyat nedir?', yanitlar = [] } = {}) {
  return {
    id: ustId,
    snippet: {
      videoId,
      topLevelComment: {
        id: ustId,
        snippet: {
          authorDisplayName: ustAd,
          ...(ustYazar ? { authorChannelId: { value: ustYazar } } : {}),
          textOriginal: ustMetin,
          textDisplay: ustMetin + ' <br>',
          publishedAt: '2026-09-06T10:00:00Z',
        },
      },
    },
    ...(yanitlar.length ? { replies: { comments: yanitlar } } : {}),
  }
}
const yanit = (id, yazar, metin) => ({
  id,
  snippet: {
    parentId: 'c1', authorDisplayName: 'X', authorChannelId: { value: yazar },
    textOriginal: metin, publishedAt: '2026-09-06T11:00:00Z',
  },
})

describe('threadCevir', () => {
  it('ust yorumu sosyal_mesajlar satirina cevirir', () => {
    const [s] = threadCevir(thread(), KANAL)
    expect(s).toMatchObject({
      platform: 'youtube', tur: 'yorum', harici_id: 'c1',
      konu_id: 'vid1', ust_id: null, gonderen_ad: 'Ayse',
      metin: 'Fiyat nedir?', yon: 'gelen',
    })
  })

  it('KENDI kanalimizin yorumunu GIDEN sayar', () => {
    // Yanlis olsaydi kendi yanitimiz "cevap bekleyen soru" gibi listelenirdi.
    const [s] = threadCevir(thread({ ustYazar: KANAL }), KANAL)
    expect(s.yon).toBe('giden')
  })

  it('textOriginal tercih edilir — textDisplay HTML kacisi icerir', () => {
    const [s] = threadCevir(thread({ ustMetin: 'Merhaba & hos geldiniz' }), KANAL)
    expect(s.metin).toBe('Merhaba & hos geldiniz')
    expect(s.metin).not.toContain('<br>')
  })

  it('yanitlari UST YORUMUN kimligine baglar (agac TEK seviyeli)', () => {
    // Yanitin KENDI parentId alanina GUVENILMEZ: baglanti ust yorumun id'sinden
    // kurulur. _yanitlananlariKapat supurucusu ust_id = harici_id esitligine
    // baktigi icin yanlis baglanti "cevaplandi" isaretini tumden bozar.
    // Fixture bilerek FARKLI bir parentId tasiyor.
    const y = yanit('r1', KANAL, 'Merhaba, DM atabilirsiniz')
    y.snippet.parentId = 'BASKA_BIR_KIMLIK'
    const satirlar = threadCevir(thread({ yanitlar: [y] }), KANAL)
    expect(satirlar).toHaveLength(2)
    expect(satirlar[1]).toMatchObject({ harici_id: 'r1', ust_id: 'c1', yon: 'giden' })
  })

  it('musterinin yaniti da GELEN kalir', () => {
    const satirlar = threadCevir(thread({ yanitlar: [yanit('r2', 'UCbaskasi', 'Ben de merak ettim')] }), KANAL)
    expect(satirlar[1].yon).toBe('gelen')
  })

  it('snippet yoksa cokmez', () => {
    expect(threadCevir({}, KANAL)).toEqual([])
    expect(threadCevir(null, KANAL)).toEqual([])
  })

  it('kanal kimligi bilinmiyorsa hersey GELEN sayilir', () => {
    // Guvenli taraf: bilinmeyen yazar "giden" sayilirsa musteri sorusu
    // cevaplanmis gibi gorunur ve kaybolur.
    const [s] = threadCevir(thread({ ustYazar: KANAL }), null)
    expect(s.yon).toBe('gelen')
  })

  it('YAZAR ve KANAL ikisi de bilinmiyorsa GELEN kalir (null === null tuzagi)', () => {
    // Silinmis/anonim yazarda authorChannelId GELMEZ. Duz esitlik yazilsaydi
    // null === null dogru cikip yorum "bizim yanitimiz" sayilir ve gelen
    // kutusundan kaybolurdu. Iki tarafin da DOLU olmasi sart.
    const [s] = threadCevir(thread({ ustYazar: null }), null)
    expect(s.gonderen_id).toBe(null)
    expect(s.yon).toBe('gelen')
  })
})

describe('videoKimlikleri', () => {
  it('tekil ve bossuz dondurur', () => {
    expect(videoKimlikleri([
      { konu_id: 'a' }, { konu_id: 'a' }, { konu_id: 'b' }, { konu_id: null },
    ])).toEqual(['a', 'b'])
  })
})
