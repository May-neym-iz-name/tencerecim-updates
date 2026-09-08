// Yorum niyet sınıflayıcısı testleri (08.09.2026).
// Tasarım kuralı: hata ASİMETRİK — fiyat sorusu "soru" sayılırsa DM gitmez (pahalı),
// soru "fiyat" sayılırsa kart gider ama temsilci yine görür (ucuz). Fiyat tarafı GENİŞ.
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
const { niyetBul, NIYETLER, niyetToplu } = await import('./niyet.js')

describe('niyetBul — kalıplar', () => {
  test.each([
    ['fiyatı ne kadar', 'fiyat'],
    ['Fiyat?', 'fiyat'],
    ['fiyqt', 'fiyat'],            // yazım hatası iskeleti
    ['foyat bilgisi', 'fiyat'],
    ['kaç para bu', 'fiyat'],
    ['kaç tl', 'fiyat'],
    ['ücreti nedir', 'fiyat'],
    ['ne kadar', 'fiyat'],
    ['bilgi alabilir miyim', 'fiyat'],  // GENİŞ taraf: bilgi isteme = fiyat sayılır
    ['indüksiyona uygun mu', 'soru'],
    ['gölcük mağazasında var mı', 'soru'],
    ['kapağı ayrı satılıyor mu?', 'soru'],
    ['nereden alabilirim', 'soru'],
    ['@ayse @fatma', 'etiket'],
    ['@ayse', 'etiket'],
    ['😍😍😍', 'emoji'],
    ['', 'emoji'],
    ['harika ürün ellerinize sağlık', 'ovgu'],
    ['süper 👏', 'ovgu'],
    ['çekilişe katılıyorum', 'gurultu'],
    ['aaaa', 'gurultu'],
  ])('%s → %s', (metin, beklenen) => {
    expect(niyetBul(metin)).toBe(beklenen)
  })

  test('fiyat ile soru aynı metindeyse FİYAT kazanır (hata asimetrik)', () => {
    expect(niyetBul('indüksiyona uygun mu fiyatı ne kadar')).toBe('fiyat')
    expect(niyetBul('@ayse fiyat?')).toBe('fiyat')      // etiket + fiyat → fiyat
  })

  test('NIYETLER altı değeri sırasıyla içerir', () => {
    expect(NIYETLER).toEqual(['fiyat', 'soru', 'etiket', 'ovgu', 'emoji', 'gurultu'])
  })

  test('null/undefined emoji sayılır, patlamaz', () => {
    expect(niyetBul(null)).toBe('emoji')
    expect(niyetBul(undefined)).toBe('emoji')
  })
})

const ORNEK = JSON.parse(readFileSync(new URL('./niyet-ornek.json', import.meta.url), 'utf-8'))

describe('niyetBul — gerçek veri dağılımı (500 rastgele IG yorumu)', () => {
  const say = {}
  for (const m of ORNEK) { const n = niyetBul(m); say[n] = (say[n] || 0) + 1 }
  const pay = (k) => (say[k] || 0) / ORNEK.length

  test('fiyat payı %55-72 bandında (07.09 ölçümü %63; geniş taraf)', () => {
    expect(pay('fiyat')).toBeGreaterThan(0.55)
    expect(pay('fiyat')).toBeLessThan(0.72)
  })
  // Bu örnek çekiliş gönderilerinden ağır (etiket %16, "katıldım" gürültüsü); 07.09'daki
  // %11,1 "fiyat dışı gerçek soru" ölçümü tüm yorumlar üzerindeydi. 08.09 ölçümü bu
  // örnekte %4,2 → bant %2,5-12. Bandı oynatmadan önce örneği elle oku.
  test('soru payı %2,5-12 bandında (08.09 ölçümü %4,2)', () => {
    expect(pay('soru')).toBeGreaterThan(0.025)
    expect(pay('soru')).toBeLessThan(0.12)
  })
  test('gürültü %15 üstüne çıkmaz (08.09 ölçümü %8,6)', () => {
    expect(pay('gurultu')).toBeLessThan(0.15)
  })
})

describe('niyetBul — mutasyon: fiyat iskeleti bozulunca test kırmızı olmalı', () => {
  // İskelet regex'i yanlışlıkla daraltılırsa dağılım testinin gerçekten yakaladığını
  // kanıtlar: yalnız TAM "fiyat" kelimesi kabul edilirse pay geniş sınıflayıcının en az
  // 5 puan altına iner (08.09 ölçümü: dar %55,2 / geniş %63,8).
  test('yalnız tam kelime, geniş sınıflayıcıdan ≥5 puan az yakalar', () => {
    const dar = (m) => /\bfiyat\b/.test(String(m).toLocaleLowerCase('tr')) ? 'fiyat' : 'x'
    const n = ORNEK.filter(m => dar(m) === 'fiyat').length / ORNEK.length
    const genis = ORNEK.filter(m => niyetBul(m) === 'fiyat').length / ORNEK.length
    expect(n).toBeLessThan(genis - 0.05)
  })
})

describe('niyetToplu', () => {
  test('yalnız niyet=NULL gelen yorumları doldurur, dolu olana dokunmaz', () => {
    const d = new DatabaseSync(':memory:')
    d.exec(`CREATE TABLE sosyal_mesajlar (id INTEGER PRIMARY KEY, tur TEXT, yon TEXT, metin TEXT, niyet TEXT)`)
    d.exec(`INSERT INTO sosyal_mesajlar (tur,yon,metin,niyet) VALUES
      ('yorum','gelen','fiyat?',NULL), ('yorum','gelen','var mı',NULL),
      ('yorum','gelen','fiyat?','ovgu'), ('dm','gelen','fiyat?',NULL), ('yorum','giden','fiyat?',NULL)`)
    const db = {
      prepare: (s) => { const p = d.prepare(s); return { all: (...a) => p.all(...a), run: (...a) => p.run(...a), get: (...a) => p.get(...a) } },
      transaction: (fn) => (...a) => { d.exec('BEGIN'); try { const r = fn(...a); d.exec('COMMIT'); return r } catch (e) { d.exec('ROLLBACK'); throw e } },
    }
    expect(niyetToplu(db)).toEqual({ islenen: 2 })
    expect(d.prepare('SELECT niyet FROM sosyal_mesajlar ORDER BY id').all().map(r => r.niyet))
      .toEqual(['fiyat', 'soru', 'ovgu', null, null])
  })
})
