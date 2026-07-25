// Pull sayfalamasının SESSİZ VERİ KAYBI invariantları.
//
// Gerçek vaka (2026-07): push Supabase'e 500'lük dilimler hâlinde upsert ettiği için bir
// dilimin TÜM satırları aynı `yuklenme` damgasını alır. Eski pull `.gt(sonSatirinDamgasi)`
// ile ilerliyordu → sayfa bir damga grubunun ORTASINDA bittiyse gruptaki kalan satırlar
// BİR DAHA HİÇ çekilmiyordu. 46 ürünlük bir batch'ten 2 ürün (FALEZ PEDRA 20/22 SAHAN)
// Gölcük mağazasına hiç ulaşmadı; ürün Pendik'te ve bulutta vardı.
import { describe, test, expect } from 'vitest'
import { sayfaIsle } from './veriSenk.js'

// n satırlık, verilen damgalara sahip sahte sayfa.
const sayfa = (...damgalar) => damgalar.map((yuklenme, i) => ({ senk_id: `s${i}`, yuklenme }))
const tekrar = (damga, n) => Array.from({ length: n }, () => damga)

describe('pull sayfalama', () => {
  test('sayfa dolmadıysa hepsi alınır ve döngü biter', () => {
    const r = sayfaIsle(sayfa('t1', 't2', 't3'), 10)

    expect(r.alinacak).toHaveLength(3)
    expect(r.cursor).toBe('t3')
    expect(r.bitti).toBe(true)
  })

  test('dolu sayfanın son damga grubu bu turda ALINMAZ (yarım olabilir)', () => {
    // Son damga 't3' sayfada 2 satır — ama sunucuda 500 tane olabilir. Alma, imleci ona kur.
    const r = sayfaIsle(sayfa('t1', 't2', 't3', 't3'), 4)

    expect(r.alinacak.map(x => x.yuklenme)).toEqual(['t1', 't2'])
    expect(r.cursor).toBe('t3')
    expect(r.bitti).toBe(false)
  })

  test('imleç .gte sözleşmesine uyar: atlanan grup bir sonraki turda TAM gelir', () => {
    // 1. sayfa: t3 grubu yarım göründü → alınmadı, cursor = 't3'.
    const s1 = sayfaIsle(sayfa('t1', 't2', 't3', 't3'), 4)
    expect(s1.cursor).toBe('t3')

    // 2. sayfa: sorgu .gte('t3') olduğu için t3 grubunun TAMAMI yeniden gelir.
    const s2 = sayfaIsle(sayfa('t3', 't3', 't3'), 4)

    expect(s2.alinacak).toHaveLength(3)
    expect(s2.bitti).toBe(true)
    // Kritik: hiçbir t3 satırı kaybolmadı. Eski .gt mantığında ilk sayfadaki 2 t3
    // alınır, cursor 't3' olur ve kalan t3'ler bir daha ASLA çekilmezdi.
  })

  test('tek damga tüm sayfayı doldurursa ilerlenir ve UYARI verilir (sonsuz döngü olmaz)', () => {
    const r = sayfaIsle(sayfa(...tekrar('t9', 4)), 4)

    expect(r.alinacak).toHaveLength(4)
    expect(r.cursor).not.toBe('t9') // imleç ilerledi, aynı sayfa tekrar çekilmez
    expect(r.cursor > 't9').toBe(true)
    expect(r.uyari).toMatch(/sayfalama bu grubu bölebilir/)
    expect(r.bitti).toBe(false)
  })

  test('imleç hiçbir durumda GERİ gitmez', () => {
    const durumlar = [
      sayfaIsle(sayfa('t1', 't2', 't3'), 10),
      sayfaIsle(sayfa('t1', 't2', 't3', 't3'), 4),
      sayfaIsle(sayfa(...tekrar('t9', 4)), 4),
    ]
    for (const r of durumlar) expect(r.cursor >= 't1').toBe(true)
  })

  test('gerçek vaka: batch sayfa sınırında bölünse de hiçbir satır düşmez', () => {
    // Sunucudaki tam veri: 8 ayrı damgalı eski satır + aynı damgalı 6'lık bir batch.
    // Sayfa boyu 10 → ilk sayfa batch'in TAM ORTASINDA biter. Kaybı üreten desen budur.
    // (Oranlar gerçeğe sadık: grup < sayfa. Grup > sayfa durumu ayrı testte.)
    const batch = tekrar('2026-07-09T09:21:43.578603Z', 6)
    const sunucu = sayfa('2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04',
      '2026-07-05', '2026-07-06', '2026-07-07', '2026-07-08', ...batch)
    const SAYFA = 10

    // İmleçten itibaren .gte ile sayfa sayfa çek (gerçek döngünün taklidi).
    const gorulen = new Set()
    let cursor = '1970-01-01'
    for (let tur = 0; tur < 50; tur++) {
      const kalan = sunucu.filter(r => r.yuklenme >= cursor).slice(0, SAYFA)
      if (!kalan.length) break
      const r = sayfaIsle(kalan, SAYFA)
      for (const x of r.alinacak) gorulen.add(`${x.yuklenme}#${x.senk_id}`)
      cursor = r.cursor
      if (r.bitti) break
    }

    // Hepsi görüldü — batch'ten tek satır bile düşmedi.
    expect(gorulen.size).toBe(sunucu.length)
  })

  test('BİLİNEN SINIR: bir damga grubu sayfa boyundan büyükse kayıp sürer', () => {
    // Bu davranış bilerek kabul edilmiştir (alternatifi sonsuz döngü). Sessiz değil:
    // uyarı üretilir. Ölçüm 2026-07 — en büyük grup 500, SAYFA 1000, yani bugün
    // erişilemez. Push dilimi (500) SAYFA'nın (1000) altında KALMALI; bu test o
    // bağımlılığın farkında olunmasını sağlar.
    const SAYFA = 4
    const r = sayfaIsle(sayfa(...tekrar('tB', SAYFA)), SAYFA) // sunucuda 6 tane var diyelim

    expect(r.alinacak).toHaveLength(SAYFA) // yalnız 4'ü alınabildi
    expect(r.uyari).toBeTruthy()           // ama SESSİZ değil
    expect(r.cursor > 'tB').toBe(true)     // ve döngü kilitlenmiyor
  })
})
