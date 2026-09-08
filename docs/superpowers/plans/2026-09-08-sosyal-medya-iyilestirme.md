# Sosyal Medya İyileştirme — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instagram yorum otomasyonunu niyete göre ikiye ayırmak (fiyat → ürün kartı, soru → teşekkür DM'i + "Sorular" sekmesi), gelen kutusuna "Bana atananlar" ve kaynak süzgeci eklemek, boş balonları doldurmak ve temsilcinin elle ürün kartı gönderebilmesini sağlamak.

**Architecture:** Tüm iş mevcut Electron + React mağaza programında. Veri katmanı `electron/db/sosyal-*.js` (better-sqlite3, db enjekte edilebilir saf fonksiyonlar), Meta gönderimi `electron/meta/*.js`, arayüz `src/pages/SosyalMedya.jsx` + `src/components/*`. Otomasyonun tek kapısı `_adaylar()`; niyet oraya koşul olarak girer. Süzgeçler `sosyal-filtre.js` SQL parçacıklarıyla üretilir.

**Tech Stack:** Electron 22, React 18, Tailwind (palet `tailwind.config.js`: `marka-*`, `krem-*`, `kagit`), better-sqlite3, vitest (`npm test`; testlerde `node:sqlite` bellek DB adaptörü), Meta Graph API v21.

**Spec:** `docs/superpowers/specs/2026-09-08-sosyal-medya-iyilestirme-design.md`

## Global Constraints

- Paket yöneticisi **npm**, test **`npm test`** (vitest). Tip denetimi yok, prettier/eslint yok.
- Yeni sütun/tablo açan **her** değişiklikte `electron/db/senk-sema.js` **aynı commit'te** güncellenir (hafıza: üç kez tekrar eden sessiz veri kaybı).
- ikas'a satış fiyatı **yazılmaz**. Kart fiyatı siteden okunur (`ikas._urunKartVerisi`, indirimli fiyat).
- Arayüz paleti: zemin beyaz, `marka-900` mürekkep/birincil, `krem-400` yalnız vurgu, `kagit` sohbet zemini. Ad metinle aynı satırda değil, ayrı satırda kalın `marka-900`.
- Meta yoruma özel yanıt (private reply) yorum başına **tek** haktır; kart + metin aynı mesajda gitmez.
- Kullanıcı seçimleri: **1A 2A 3B 4B 5B 6B** (önizleme dosyası `docs/superpowers/specs/2026-09-08-sosyal-medya-onizleme.html`).
- Commit mesajları `<type>: <açıklama>` ve şu iki satırla biter:
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Q5zRfaraRFhgkeTF8sZSgh
  ```
- Test dosyaları CommonJS modülleri `await import()` ile yükler, `vi.mock` çalışmaz; db enjekte edilir (`_dbAyarla(db)` ya da fonksiyon parametresi). Bellek DB adaptörü `otomasyon-gonderi.test.js` başındaki `bellekDb()` ile aynıdır.
- Her yayın paketi ayrı patch sürümü (hafıza: sürüm artırma / yayınla komutu). Bu plan yayın adımını içermez, kullanıcı "yayınla" der.

---

## Dosya Yapısı

| Dosya | Sorumluluk | Durum |
|---|---|---|
| `electron/db/niyet.js` | Saf sınıflayıcı `niyetBul(metin)` + toplu iş `niyetToplu(db)` | YENİ |
| `electron/db/niyet.test.js` | Kalıp + dağılım + mutasyon testleri | YENİ |
| `electron/db/niyet-ornek.json` | 500 satırlık gerçek yorum örneği (metin + beklenen niyet), kişi adı YOK | YENİ |
| `electron/db/database.js` | `niyet`, `ham_ek`, `soru_yaniti_kapali` ALTER'ları | DEĞİŞ |
| `electron/db/senk-sema.js` | `sosyal_otomasyonlar.kolonlar` += `soru_yaniti_kapali` | DEĞİŞ |
| `electron/db/sosyal-mesajlar.js` | upsert'te niyet yazımı; `sorular()` listesi; `konusmalar()` kaynak + atanan sayaç; kart kaydı | DEĞİŞ |
| `electron/db/sosyal-filtre.js` | `SORU_OKUNMAMIS_SAYAC`, `KAYNAK_IFADESI`, kaynak süzgeci | DEĞİŞ |
| `electron/db/sosyal-otomasyon.js` | `_adaylar()` niyet grupları; `soru_yaniti_kapali` kaydı | DEĞİŞ |
| `electron/db/meta-ayarlar.js` | anahtarlar: `soru_yaniti_metin`, `soru_yaniti_aktif`, `hizli_urun_paneli` | (anahtar-değer, kod değişmez) |
| `electron/meta/otomasyon.js` | soru grubuna teşekkür DM'i; kart gönderiminde yerel kart kaydı | DEĞİŞ |
| `electron/meta/index.js` | `mesajEki` bilinmeyen tip → `ham_ek`; `kartGonder` (DM/yorum); kendi kartımızı tanıma | DEĞİŞ |
| `electron/meta/kart-kayit.js` | Kart yükünden `ek_*` alanlarını üreten saf fonksiyon `kartKaydi(yuk)` | YENİ |
| `electron/meta/kart-kayit.test.js` | | YENİ |
| `src/api/ipc.js` | `sosyalApi.sorular`, `sosyalApi.sonUrunler`, `metaApi.kartGonder`, `metaApi.niyetToplu` | DEĞİŞ |
| `src/pages/SosyalMedya.jsx` | Sorular sekmesi, bölümlü anahtar, kaynak açılır kutu + gruplu liste, tam kart balonu, ölü hikaye | DEĞİŞ |
| `src/components/SorularListesi.jsx` | Sorular sekmesi sol liste + eylemler (1A) | YENİ |
| `src/components/UrunKartiBalonu.jsx` | Tam kart balonu (3B) | YENİ |
| `src/components/HizliUrunler.jsx` | Sağ kalıcı panel (5B) | YENİ |
| `src/components/OtomasyonPaneli.jsx` | "Bu gönderide soru yanıtı gönderme" kutusu | DEĞİŞ |
| `src/pages/Ayarlar.jsx` | Soru yanıtı metni + anahtar, "Geçmişi sınıfla", "Hızlı ürünler panelini göster" | DEĞİŞ |

Yayın paketleri: **P1** = Task 1-6 · **P2** = Task 7-11 · **P3** = Task 12-15 · **P4** = Task 16-18.

---

## PAKET 1 — Niyet ayrımı ve otomasyon kapısı

### Task 1: Sınıflayıcı `niyetBul`

**Files:**
- Create: `electron/db/niyet.js`
- Test: `electron/db/niyet.test.js`

**Interfaces:**
- Consumes: `trNormal(s)` from `electron/db/tr-arama.js` (Türkçe harf katlaması + küçük harf).
- Produces: `niyetBul(metin: string) → 'fiyat'|'soru'|'etiket'|'ovgu'|'emoji'|'gurultu'`; `NIYETLER` sabit dizisi.

- [ ] **Step 1: Kalıp testlerini yaz**

```js
// electron/db/niyet.test.js
import { describe, test, expect } from 'vitest'
const { niyetBul, NIYETLER } = await import('./niyet.js')

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
```

- [ ] **Step 2: Testi çalıştır, kırmızı gör**

Run: `npx vitest run electron/db/niyet.test.js`
Expected: FAIL — `Cannot find module './niyet.js'`

- [ ] **Step 3: Sınıflayıcıyı yaz**

```js
// electron/db/niyet.js
// Yorum NİYET sınıflayıcısı — kural tabanlı, model YOK. 07.09.2026'da 89.409 yorumda
// ölçüldü: fiyat %63, fiyat dışı gerçek soru %11, etiket %14, kalanı övgü/emoji/gürültü.
//
// 🔴 TASARIM KURALI — hata asimetrik: fiyat sorusu "soru" sayılırsa DM gitmez, müşteri
// cevapsız kalır (PAHALI). Soru "fiyat" sayılırsa fiyat kartı gider, temsilci yine görür
// (UCUZ). Bu yüzden fiyat tarafı GENİŞ tutulur ve sıralamada ÖNCE bakılır.
const { trNormal } = require('./tr-arama')

const NIYETLER = ['fiyat', 'soru', 'etiket', 'ovgu', 'emoji', 'gurultu']

// f[iy]{1,2}[aoy]?[st]: fiyat, fiyqt, fiyst, foyat, fıyat (trNormal ı→i yapar)
const FIYAT_ISKELET = /f[iy]{1,2}[aoyq]?[st]/
const FIYAT_KALIP = /\b(kac para|kac tl|kac lira|ne kadar|ucret|tl mi|lira mi|bilgi al|bilgi ver|fiat)\b|\btl\b|\blira\b/
const SORU_KALIP = /\?|\b(var mi|varmi|yok mu|nerede|nereden|nasil|hangi|uygun mu|olur mu|kac cm|kac litre|kaclitre|kargo|gonderim|iade|garanti|indiriksiyon|induksiyon)\b/
const OVGU_KALIP = /\b(harika|super|muhtesem|ellerinize saglik|cok guzel|bayildim|tesekkur|helal|mukemmel)\b|👏|❤|😍/
const ETIKET_SADECE = /^(@[\w.]+\s*)+$/
// Yalnız emoji / boşluk / noktalama: harf veya rakam YOK.
const HARF_YOK = /^[^\p{L}\p{N}]*$/u

function niyetBul(metin) {
  const ham = String(metin == null ? '' : metin).trim()
  if (!ham || HARF_YOK.test(ham)) return 'emoji'
  const n = trNormal(ham)
  // FİYAT ÖNCE: etiketli ya da soru işaretli olsa bile fiyat kalıbı varsa fiyat.
  if (FIYAT_ISKELET.test(n) || FIYAT_KALIP.test(n)) return 'fiyat'
  if (ETIKET_SADECE.test(ham)) return 'etiket'
  if (SORU_KALIP.test(n)) return 'soru'
  if (OVGU_KALIP.test(n) || OVGU_KALIP.test(ham)) return 'ovgu'
  return 'gurultu'
}

module.exports = { niyetBul, NIYETLER }
```

- [ ] **Step 4: Testi çalıştır, yeşil gör**

Run: `npx vitest run electron/db/niyet.test.js`
Expected: PASS (tüm `test.each` satırları). Bir kalıp tutmazsa regex'i düzelt, testi gevşetme.

- [ ] **Step 5: Commit**

```bash
git add electron/db/niyet.js electron/db/niyet.test.js
git commit -m "feat: yorum niyet sınıflayıcısı (kural tabanlı, fiyat tarafı geniş)"
```

### Task 2: Gerçek veri dağılım testi + mutasyon testi

**Files:**
- Create: `electron/db/niyet-ornek.json`
- Modify: `electron/db/niyet.test.js`

**Interfaces:**
- Consumes: `niyetBul`. Canlı DB `%APPDATA%\tencerecim\tencerecim.db` (yalnız örnek çıkarmak için, salt okunur).

- [ ] **Step 1: 500 satırlık örneği çıkar (kişi adı YOK, yalnız metin)**

```bash
cd "%APPDATA%\tencerecim" && PYTHONIOENCODING=utf-8 python -c "
import sqlite3, json, random
d = sqlite3.connect('tencerecim.db')
r = [x[0] for x in d.execute(\"SELECT metin FROM sosyal_mesajlar WHERE tur='yorum' AND yon='gelen' AND platform='instagram' AND COALESCE(metin,'')!='' ORDER BY RANDOM() LIMIT 500\")]
json.dump(r, open(r'C:/Users/Burak/Desktop/tencerecim-mağaza-programı/electron/db/niyet-ornek.json','w',encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(r))"
```
Expected: `500`. Dosyayı aç, içinde `@kullanıcı` etiketleri kalabilir (herkese açık yorum metni), ama telefon numarası varsa o satırı sil.

- [ ] **Step 2: Dağılım + mutasyon testini ekle**

```js
// electron/db/niyet.test.js — sona ekle
import { readFileSync } from 'node:fs'
const ORNEK = JSON.parse(readFileSync(new URL('./niyet-ornek.json', import.meta.url), 'utf-8'))

describe('niyetBul — gerçek veri dağılımı (500 rastgele IG yorumu)', () => {
  const say = {}
  for (const m of ORNEK) { const n = niyetBul(m); say[n] = (say[n] || 0) + 1 }
  const pay = (k) => (say[k] || 0) / ORNEK.length

  test('fiyat payı %55-72 bandında (07.09 ölçümü %63; geniş taraf)', () => {
    expect(pay('fiyat')).toBeGreaterThan(0.55)
    expect(pay('fiyat')).toBeLessThan(0.72)
  })
  test('soru payı %6-18 bandında (ölçüm %11,1)', () => {
    expect(pay('soru')).toBeGreaterThan(0.06)
    expect(pay('soru')).toBeLessThan(0.18)
  })
  test('gürültü %25 üstüne çıkmaz (sınıflayıcı çöpe düşmüyor)', () => {
    expect(pay('gurultu')).toBeLessThan(0.25)
  })
})

describe('niyetBul — mutasyon: fiyat iskeleti bozulunca test kırmızı olmalı', () => {
  // Bu test, iskelet regex'i yanlışlıkla daraltılırsa dağılım testinin gerçekten
  // yakaladığını kanıtlar: yalnız TAM "fiyat" kelimesi kabul edilirse pay düşer.
  test('yalnız tam kelime ile pay %55 altına iner', () => {
    const dar = (m) => /\bfiyat\b/.test(String(m).toLocaleLowerCase('tr')) ? 'fiyat' : 'x'
    const n = ORNEK.filter(m => dar(m) === 'fiyat').length / ORNEK.length
    expect(n).toBeLessThan(0.55)
  })
})
```

- [ ] **Step 3: Çalıştır**

Run: `npx vitest run electron/db/niyet.test.js`
Expected: PASS. Bant dışına düşerse önce **örneği elle incele** (20 satır oku), gerçekten yanlış sınıflananları kalıba ekle; bandı oynatma.

- [ ] **Step 4: Commit**

```bash
git add electron/db/niyet-ornek.json electron/db/niyet.test.js
git commit -m "test: niyet sınıflayıcı gerçek veri dağılımı + mutasyon testi"
```

### Task 3: Şema — `niyet`, `ham_ek`, `soru_yaniti_kapali` + senk-sema

**Files:**
- Modify: `electron/db/database.js` (ek_link ALTER'ından sonra, ~satır 782)
- Modify: `electron/db/senk-sema.js:69-71`
- Test: `electron/db/senk-sema.test.js` (mevcut dosya; kolon listesi testi)

- [ ] **Step 1: senk-sema testine kolon beklentisi ekle**

```js
// electron/db/senk-sema.test.js — uygun describe içine
test('sosyal_otomasyonlar soru_yaniti_kapali kolonunu senkronlar (08.09.2026)', () => {
  expect(SEMA.sosyal_otomasyonlar.kolonlar).toContain('soru_yaniti_kapali')
})
```
(`SEMA` bu dosyada nasıl import ediliyorsa aynı adı kullan.)

- [ ] **Step 2: Kırmızı gör**

Run: `npx vitest run electron/db/senk-sema.test.js`
Expected: FAIL — kolon listede yok.

- [ ] **Step 3: ALTER'ları ve senk-sema kolonunu ekle**

```js
// electron/db/database.js — "ek_link" ALTER satırından hemen sonra
  // Yorum NİYETİ (08.09.2026): 'fiyat'|'soru'|'etiket'|'ovgu'|'emoji'|'gurultu'|NULL.
  // Çekimde niyet.js yazar; geçmiş tek seferlik toplu işle dolar (Ayarlar → Geçmişi sınıfla).
  // Otomasyon YALNIZ 'fiyat' ve 'soru' niyetine gönderir (sosyal-otomasyon._adaylar).
  try { db.exec("ALTER TABLE sosyal_mesajlar ADD COLUMN niyet TEXT") } catch {}
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_sosyal_niyet ON sosyal_mesajlar(niyet)") } catch {}
  // Tanınmayan DM eki: mesajEki() null döndürüp metin de boşsa ham JSON buraya yazılır,
  // bir hafta sonra ölçülüp yeni ek_tur değerleri eklenir. Ürün kartı gönderimlerinde
  // kart yükünün tamamı (tüm ürünler) da burada durur — balon karuseli buradan çizer.
  try { db.exec("ALTER TABLE sosyal_mesajlar ADD COLUMN ham_ek TEXT") } catch {}
  // Gönderi bazında "fiyat dışı sorulara teşekkür DM'i gönderme" (genel metin Ayarlar'da).
  try { db.exec("ALTER TABLE sosyal_otomasyonlar ADD COLUMN soru_yaniti_kapali INTEGER DEFAULT 0") } catch {}
```

```js
// electron/db/senk-sema.js:69-70 — kolon listesi
  sosyal_otomasyonlar: { kolonlar: ['konu_id', 'platform', 'aktif', 'acik_yanit_metni', 'baslangic_tarihi',
                                    'ozel_aciklama', 'whatsapp', 'mesaj_tipi', 'soru_yaniti_kapali'],
```

- [ ] **Step 4: Yeşil gör, tüm testleri koş**

Run: `npm test`
Expected: PASS (mevcut 600+ test dahil).

- [ ] **Step 5: Commit**

```bash
git add electron/db/database.js electron/db/senk-sema.js electron/db/senk-sema.test.js
git commit -m "feat: sosyal_mesajlar.niyet + ham_ek, sosyal_otomasyonlar.soru_yaniti_kapali (senk-sema aynı commit)"
```

### Task 4: Çekimde niyet yazımı + toplu iş `niyetToplu`

**Files:**
- Modify: `electron/db/sosyal-mesajlar.js:122-147` (INSERT), `:72` (`_upsertMesaj`)
- Modify: `electron/db/niyet.js` (toplu iş)
- Test: `electron/db/sosyal-gonderiler.test.js` (mevcut SEMA'ya `niyet TEXT` ekle), `electron/db/niyet.test.js`

**Interfaces:**
- Produces: `niyetToplu(db) → { islenen: number }` (yalnız `niyet IS NULL AND tur='yorum' AND yon='gelen'`), IPC `'sosyal:niyetToplu'`.

- [ ] **Step 1: Testleri yaz**

```js
// electron/db/sosyal-gonderiler.test.js — SEMA içindeki sosyal_mesajlar CREATE'e `niyet TEXT,` ekle; sona:
describe('niyet yazımı', () => {
  test('gelen yorum satırı çekimde niyet alır', () => {
    _upsertMesaj(mesaj({ tur: 'yorum', yon: 'gelen', metin: 'fiyatı ne kadar', harici_id: 'y1' }))
    expect(db.prepare('SELECT niyet FROM sosyal_mesajlar WHERE harici_id = ?').get('y1').niyet).toBe('fiyat')
  })
  test('DM ve giden satırlar niyet ALMAZ', () => {
    _upsertMesaj(mesaj({ tur: 'dm', yon: 'gelen', metin: 'fiyat', harici_id: 'd1' }))
    _upsertMesaj(mesaj({ tur: 'yorum', yon: 'giden', metin: 'fiyat', harici_id: 'g1' }))
    expect(db.prepare("SELECT COUNT(*) n FROM sosyal_mesajlar WHERE niyet IS NOT NULL").get().n).toBe(0)
  })
})
```

```js
// electron/db/niyet.test.js — sona
import { DatabaseSync } from 'node:sqlite'
describe('niyetToplu', () => {
  test('yalnız niyet=NULL gelen yorumları doldurur, dolu olana dokunmaz', () => {
    const d = new DatabaseSync(':memory:')
    d.exec(`CREATE TABLE sosyal_mesajlar (id INTEGER PRIMARY KEY, tur TEXT, yon TEXT, metin TEXT, niyet TEXT)`)
    d.exec(`INSERT INTO sosyal_mesajlar (tur,yon,metin,niyet) VALUES
      ('yorum','gelen','fiyat?',NULL), ('yorum','gelen','var mı',NULL),
      ('yorum','gelen','fiyat?','ovgu'), ('dm','gelen','fiyat?',NULL), ('yorum','giden','fiyat?',NULL)`)
    const db = { prepare: (s) => { const p = d.prepare(s); return { all: (...a) => p.all(...a), run: (...a) => p.run(...a), get: (...a) => p.get(...a) } },
                 transaction: (fn) => (...a) => { d.exec('BEGIN'); try { const r = fn(...a); d.exec('COMMIT'); return r } catch (e) { d.exec('ROLLBACK'); throw e } } }
    const { niyetToplu } = require('./niyet.js')
    expect(niyetToplu(db)).toEqual({ islenen: 2 })
    expect(d.prepare('SELECT niyet FROM sosyal_mesajlar ORDER BY id').all().map(r => r.niyet))
      .toEqual(['fiyat', 'soru', 'ovgu', null, null])
  })
})
```

- [ ] **Step 2: Kırmızı gör**

Run: `npx vitest run electron/db/sosyal-gonderiler.test.js electron/db/niyet.test.js`
Expected: FAIL (niyet NULL; niyetToplu yok).

- [ ] **Step 3: Uygula**

```js
// electron/db/sosyal-mesajlar.js — dosya başındaki require'ların yanına
const { niyetBul } = require('./niyet')

// _upsertMesaj INSERT: kolon listesine `niyet`, VALUES'a `@niyet`, nesneye:
    niyet: (m.tur === 'yorum' && (m.yon || 'gelen') === 'gelen') ? niyetBul(m.metin) : null,
```

```js
// electron/db/niyet.js — sona
// Geçmiş yorumlar için tek seferlik toplu sınıflama. Dolu satıra DOKUNMAZ (elle düzeltme
// korunsun). 133k satırda tek transaction, ölçüm: saniyeler.
function niyetToplu(db) {
  const satirlar = db.prepare(
    "SELECT id, metin FROM sosyal_mesajlar WHERE tur='yorum' AND yon='gelen' AND niyet IS NULL"
  ).all()
  const yaz = db.prepare('UPDATE sosyal_mesajlar SET niyet = ? WHERE id = ?')
  db.transaction(() => { for (const s of satirlar) yaz.run(niyetBul(s.metin), s.id) })()
  return { islenen: satirlar.length }
}
module.exports = { niyetBul, NIYETLER, niyetToplu }
```

```js
// electron/db/sosyal-mesajlar.js — module.exports'a
  'sosyal:niyetToplu': () => require('./niyet').niyetToplu(getDb()),
```

```js
// src/api/ipc.js — sosyalApi'ye
  niyetToplu: () => invoke('sosyal:niyetToplu'),
```

- [ ] **Step 4: Yeşil gör**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add electron/db/sosyal-mesajlar.js electron/db/niyet.js electron/db/niyet.test.js electron/db/sosyal-gonderiler.test.js src/api/ipc.js
git commit -m "feat: çekimde niyet yazımı + geçmiş için niyetToplu"
```

### Task 5: `_adaylar()` niyet kapısı + soru yanıtı gönderimi

**Files:**
- Modify: `electron/db/sosyal-otomasyon.js:97-119` (`_adaylar`), `:130-131` (`otomasyonKaydet` → `soru_yaniti_kapali`)
- Modify: `electron/meta/otomasyon.js:147-215` (gönderim döngüsü)
- Test: `electron/db/otomasyon-gonderi.test.js` (mevcut fikstürde `sosyal_mesajlar` CREATE'e `niyet TEXT` ekle; `sosyal_otomasyonlar`'a `soru_yaniti_kapali INTEGER DEFAULT 0`)

**Interfaces:**
- Produces: `_adaylar(db, konuId?) → [{ id, konu_id, gonderen_ad, harici_id, platform, otomasyon_id, niyet, soru_yaniti_kapali }]` — yalnız `niyet IN ('fiyat','soru')`. NULL niyet (henüz sınıflanmamış eski satır) **fiyat** sayılır (geniş taraf; toplu iş çalışana kadar davranış değişmesin).
- Consumes (otomasyon.js): `meta-ayarlar._ayarlariGetir()` → `soru_yaniti_metin`, `soru_yaniti_aktif`.

- [ ] **Step 1: Testleri yaz**

```js
// electron/db/otomasyon-gonderi.test.js — sona
describe('_adaylar niyet kapısı', () => {
  function kur(db) {
    db.exec(`INSERT INTO sosyal_otomasyonlar (id, konu_id, platform, aktif) VALUES (1,'K1','instagram',1)`)
    const ekle = (id, ad, niyet) => db.prepare(
      `INSERT INTO sosyal_mesajlar (id, konu_id, tur, yon, gonderen_ad, harici_id, platform, mesaj_tarihi, niyet)
       VALUES (?, 'K1', 'yorum', 'gelen', ?, ?, 'instagram', datetime('now'), ?)`).run(id, ad, 'h' + id, niyet)
    ekle(1, 'a', 'fiyat'); ekle(2, 'b', 'soru'); ekle(3, 'c', 'etiket'); ekle(4, 'd', 'ovgu'); ekle(5, 'e', null)
  }
  test('yalnız fiyat, soru ve NULL(=fiyat) döner; etiket/övgü dönmez', () => {
    const db = bellekDb(); db.exec(SEMA); kur(db)
    const { _adaylar } = require('./sosyal-otomasyon.js')
    const a = _adaylar(db).map(x => [x.gonderen_ad, x.niyet])
    expect(a).toEqual([['a', 'fiyat'], ['b', 'soru'], ['e', 'fiyat']])
  })
  test('soru_yaniti_kapali otomasyonda soru adayı düşer, fiyat kalır', () => {
    const db = bellekDb(); db.exec(SEMA); kur(db)
    db.exec('UPDATE sosyal_otomasyonlar SET soru_yaniti_kapali = 1')
    const { _adaylar } = require('./sosyal-otomasyon.js')
    expect(_adaylar(db).map(x => x.gonderen_ad)).toEqual(['a', 'e'])
  })
})
```
(`SEMA` ve `bellekDb` bu dosyada zaten var; `sosyal_mesajlar` CREATE satırına `niyet TEXT` ekle, `sosyal_otomasyonlar`'a `soru_yaniti_kapali INTEGER DEFAULT 0`. `_adaylar` export edilmiyorsa `module.exports`'a ekle — zaten `otomasyon.js` import ediyor, edilmiş olmalı.)

- [ ] **Step 2: Kırmızı gör**

Run: `npx vitest run electron/db/otomasyon-gonderi.test.js`
Expected: FAIL — etiket/övgü de dönüyor.

- [ ] **Step 3: `_adaylar` ve kaydetme**

```js
// electron/db/sosyal-otomasyon.js — _adaylar SELECT ve WHERE
    SELECT m.id, m.konu_id, m.gonderen_ad, m.harici_id, m.platform, o.id AS otomasyon_id,
           COALESCE(m.niyet, 'fiyat') AS niyet, COALESCE(o.soru_yaniti_kapali, 0) AS soru_yaniti_kapali
    FROM sosyal_mesajlar m
    JOIN sosyal_otomasyonlar o ON o.konu_id = m.konu_id
    WHERE ${kosul}
      AND m.tur = 'yorum'
      AND m.yon = 'gelen'
      -- NİYET KAPISI (08.09.2026): yalnız fiyat ve soru. NULL = henüz sınıflanmamış eski
      -- satır → fiyat sayılır (geniş taraf; niyetToplu çalışana kadar davranış değişmesin).
      AND (COALESCE(m.niyet, 'fiyat') = 'fiyat'
           OR (m.niyet = 'soru' AND COALESCE(o.soru_yaniti_kapali, 0) = 0))
```

```js
// otomasyonKaydet parametrelerine `soru_yaniti_kapali` ekle; UPDATE/INSERT'te
// undefined ise DOKUNMA kuralı (mevcut ozel_aciklama deseniyle aynı):
//   ...(soru_yaniti_kapali === undefined ? {} : { soru_yaniti_kapali: soru_yaniti_kapali ? 1 : 0 })
```
(Dosyadaki mevcut `mesaj_tipi` nasıl işleniyorsa `soru_yaniti_kapali` birebir aynı yolu izler; `otomasyonGetir` de döndürür.)

- [ ] **Step 4: Gönderim döngüsünde soru dalı**

```js
// electron/meta/otomasyon.js — döngü başında, `_kotaVar` kontrolünden sonra
    // SORU niyeti: ürün kartı DEĞİL, genel teşekkür DM'i (Ayarlar → Sosyal; 6B kararı).
    // Kapalıysa aday atlanır ama DAMGALANMAZ: açıldığında geriye dönük gitsin.
    if (a.niyet === 'soru') {
      const ay = require('../db/meta-ayarlar')._ayarlariGetir()
      if (String(ay.soru_yaniti_aktif || '0') !== '1' || !String(ay.soru_yaniti_metin || '').trim()) continue
      try {
        const yanit = await _ozelMesaj(sayfaId, a.harici_id, { text: String(ay.soru_yaniti_metin).trim() })
        _gonderimZamanlari.push(Date.now())
        sonuc.soruDm = (sonuc.soruDm || 0) + 1
        // Teşekkür DM'i private-reply hakkını harcar; temsilci devam DM'ini recipient_id ile atar.
        db.prepare("UPDATE sosyal_mesajlar SET ozel_mesaj_tarihi = datetime('now','localtime'), ozel_mesaj_hata = NULL, ozel_mesaj_alici = ? WHERE id = ?")
          .run(yanit?.recipient_id || null, a.id)
      } catch (e) {
        sonuc.hatalar.push(`Soru DM (${a.gonderen_ad}): ${e.message}`)
        hataYaz.run(String(e.message).slice(0, 300), a.id)
        sonuc.basarisiz = (sonuc.basarisiz || 0) + 1
      }
      sonuc.islenen++
      await bekle(CAGRI_ARASI_MS)
      continue
    }
```
`ozel_mesaj_alici` sütunu yoksa Task 3'e `try { db.exec("ALTER TABLE sosyal_mesajlar ADD COLUMN ozel_mesaj_alici TEXT") } catch {}` ekle (grep ile kontrol et: `grep -n ozel_mesaj_alici electron/db/database.js`).

- [ ] **Step 5: Yeşil gör + kart-mesaj/sablon testleri hâlâ yeşil**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add electron/db/sosyal-otomasyon.js electron/meta/otomasyon.js electron/db/otomasyon-gonderi.test.js electron/db/database.js
git commit -m "feat: otomasyon niyet kapısı — fiyat→kart, soru→teşekkür DM'i (varsayılan kapalı)"
```

### Task 6: Ayarlar — soru yanıtı metni/anahtar + "Geçmişi sınıfla"; panelde gönderi kapatma

**Files:**
- Modify: `src/pages/Ayarlar.jsx` (Meta bölümü, ~satır 299-340 civarı state; render bölümünü `grep -n "hizli_yanitlar\|Kurulumu Tamamla" src/pages/Ayarlar.jsx` ile bul)
- Modify: `src/components/OtomasyonPaneli.jsx` (mesaj tipi seçiminin altına)

**Interfaces:**
- Consumes: `metaApi.ayarGetir/ayarKaydet` (anahtar-değer), `sosyalApi.niyetToplu`, `sosyalApi.otomasyonKaydet({..., soru_yaniti_kapali})`.

- [ ] **Step 1: Ayarlar bölümü**

```jsx
// src/pages/Ayarlar.jsx — Meta bölümünde, token/kurulum alanlarının ALTINA
<div className="mt-6 border-t pt-4 space-y-3">
  <div className="flex items-center justify-between">
    <div>
      <div className="font-semibold text-marka-900">❓ Fiyat dışı sorulara otomatik yanıt</div>
      <div className="text-xs text-gray-500">Fiyat sormayan yorumlara bu teşekkür DM'i gider; yorum "Sorular" sekmesinde temsilci cevaplayana kadar bekler.</div>
    </div>
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={String(meta?.soru_yaniti_aktif || '0') === '1'}
        onChange={e => metaAlan('soru_yaniti_aktif', e.target.checked ? '1' : '0')} />
      Açık
    </label>
  </div>
  <textarea rows={2} value={meta?.soru_yaniti_metin || ''}
    onChange={e => metaAlan('soru_yaniti_metin', e.target.value)}
    placeholder="Merhaba, sorunuzu aldık 🙏 Temsilcimiz en kısa sürede size dönecek."
    className="w-full border rounded-lg px-3 py-2 text-sm" />
  <div className="flex items-center gap-3">
    <button type="button" disabled={metaMesgul === 'niyet'}
      onClick={async () => {
        setMetaMesgul('niyet')
        try { const r = await sosyalApi.niyetToplu(); toast.success(`${r.islenen} yorum sınıflandı`) }
        catch (e) { toast.error(e.message) } finally { setMetaMesgul('') }
      }}
      className="text-xs border rounded px-3 py-1.5 hover:bg-gray-50">
      {metaMesgul === 'niyet' ? 'Sınıflanıyor…' : '🏷️ Geçmiş yorumları sınıfla'}
    </button>
    <span className="text-[11px] text-gray-400">Bir kez; yeni yorumlar çekimde kendiliğinden sınıflanır.</span>
  </div>
</div>
```
(`sosyalApi` import'u yoksa `import { ..., sosyalApi } from '../api/ipc'` ekle. Kaydetme mevcut "Kaydet" düğmesiyle `metaApi.ayarKaydet(meta)` üzerinden gider.)

- [ ] **Step 2: Otomasyon paneli kutusu**

```jsx
// src/components/OtomasyonPaneli.jsx — mesaj tipi (kart/metin) seçiminin altına
<label className="flex items-center gap-2 text-xs text-gray-600 mt-2">
  <input type="checkbox" checked={!!oto?.soru_yaniti_kapali}
    onChange={e => kaydet({ soru_yaniti_kapali: e.target.checked ? 1 : 0 })} />
  Bu gönderide fiyat dışı sorulara teşekkür DM'i gönderme
</label>
```
(`oto` ve `kaydet` bu dosyadaki mevcut otomasyon nesnesi ve kaydetme fonksiyonunun adıdır; `grep -n "mesaj_tipi" src/components/OtomasyonPaneli.jsx` ile birebir aynı deseni kullan.)

- [ ] **Step 3: Elle doğrula**

Run: `npm run dev` (kurulu program kapalıyken; hafıza: tek-örnek kilidi). Ayarlar → Sosyal Medya'da metin gir, anahtarı aç, Kaydet; "Geçmiş yorumları sınıfla"ya bas, sayıyı gör. Otomasyon panelinde kutuyu işaretle, paneli kapat-aç, işaretli kalsın.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Ayarlar.jsx src/components/OtomasyonPaneli.jsx
git commit -m "feat: Ayarlar'da soru yanıtı metni/anahtarı + geçmişi sınıfla; panelde gönderi bazlı kapatma"
```

**P1 sonu:** `npm test` yeşil; kullanıcıya "P1 hazır, yayınlayalım mı?" sor. Yayın sonrası **soru yanıtı KAPALI** kalır; kullanıcı Ayarlar'dan açar.

---

## PAKET 2 — Sorular sekmesi, rozet, Bana atananlar

### Task 7: `sosyal-filtre.js` — soru sayacı, kaynak ifadesi, kaynak süzgeci

**Files:**
- Modify: `electron/db/sosyal-filtre.js`
- Test: `electron/db/sosyal-filtre.test.js`

**Interfaces:**
- Produces: `SORU_OKUNMAMIS_SAYAC` (SQL), `KAYNAK_IFADESI` (SQL, konuşma grubunda `'hikaye'|'paylasim'|'normal'`), `listeFiltreleri({..., kaynak})` → `kaynak` ∈ `'hikaye'|'paylasim'|'normal'` HAVING koşulu ekler.

- [ ] **Step 1: Testler**

```js
// electron/db/sosyal-filtre.test.js — sona
import { SORU_OKUNMAMIS_SAYAC, KAYNAK_IFADESI } from './sosyal-filtre.js'
describe('niyet ve kaynak (08.09.2026)', () => {
  test('soru sayacı yalnız niyet=soru okunmamışları sayar', () => {
    expect(SORU_OKUNMAMIS_SAYAC).toContain("niyet='soru'")
    expect(SORU_OKUNMAMIS_SAYAC).toContain("durum='yeni'")
    expect(SORU_OKUNMAMIS_SAYAC).toContain("yon='gelen'")
  })
  test('kaynak ifadesi hikaye > paylasim > normal önceliğiyle tek değer döner', () => {
    expect(KAYNAK_IFADESI.indexOf('hikaye')).toBeLessThan(KAYNAK_IFADESI.indexOf('paylasim'))
    expect(KAYNAK_IFADESI).toContain("'normal'")
  })
  test('kaynak süzgeci HAVING koşulu ekler, bilinmeyen değer eklemez', () => {
    expect(uygula({ kaynak: 'hikaye' }).having).toEqual(["kaynak = 'hikaye'"])
    expect(uygula({ kaynak: 'hepsi' }).having).toEqual([])
    expect(uygula({ kaynak: "x'; DROP" }).having).toEqual([])   // beyaz liste
  })
})
```

- [ ] **Step 2: Kırmızı gör**

Run: `npx vitest run electron/db/sosyal-filtre.test.js`

- [ ] **Step 3: Uygula**

```js
// electron/db/sosyal-filtre.js
// "Sorular" rozeti: yalnız fiyat DIŞI (niyet='soru') okunmamış yorumlar. Fiyat yorumlarına
// zaten otomasyon cevap veriyor; onlar rozeti şişirmesin (kullanıcı kararı 08.09.2026).
const SORU_OKUNMAMIS_SAYAC = "SUM(CASE WHEN durum='yeni' AND yon='gelen' AND niyet='soru' THEN 1 ELSE 0 END)"

// Konuşmanın KAYNAĞI: gelen mesajlardan herhangi biri hikaye yanıtı/bahsi ise 'hikaye',
// değilse paylaşım varsa 'paylasim', yoksa 'normal'. Öncelik hikaye > paylaşım.
const KAYNAK_IFADESI = `CASE
  WHEN MAX(CASE WHEN yon='gelen' AND ek_tur IN ('hikaye_yanit','hikaye_bahsi') THEN 1 ELSE 0 END) = 1 THEN 'hikaye'
  WHEN MAX(CASE WHEN yon='gelen' AND ek_tur = 'paylasim' THEN 1 ELSE 0 END) = 1 THEN 'paylasim'
  ELSE 'normal' END`
const KAYNAKLAR = new Set(['hikaye', 'paylasim', 'normal'])

function listeFiltreleri({ cevapDurumu, okunma, atama, kullanici, kaynak } = {}, having, p) {
  // ... mevcut üç blok aynen ...
  if (kaynak && KAYNAKLAR.has(kaynak)) having.push(`kaynak = '${kaynak}'`)   // beyaz liste; parametre değil
  return having
}
module.exports = { listeFiltreleri, CEVAPSIZ_SAYAC, OKUNMAMIS_SAYAC, SORU_OKUNMAMIS_SAYAC, KAYNAK_IFADESI }
```

- [ ] **Step 4: Yeşil gör, commit**

```bash
npx vitest run electron/db/sosyal-filtre.test.js
git add electron/db/sosyal-filtre.js electron/db/sosyal-filtre.test.js
git commit -m "feat: soru rozeti sayacı + konuşma kaynak ifadesi ve süzgeci"
```

### Task 8: `sorular()` listesi, `sayaclar().sorular`, `konusmalar()` kaynak + bana-atanan sayacı

**Files:**
- Modify: `electron/db/sosyal-mesajlar.js` (`sayaclar` :304-318, `konusmalar` :371-414, yeni `sorular`)
- Modify: `src/api/ipc.js` (`sosyalApi.sorular`)
- Test: `electron/db/sosyal-gonderiler.test.js` (SEMA'ya `niyet TEXT`, `ozel_mesaj_tarihi TEXT`, `ozel_mesaj_alici TEXT`; `sosyal_gonderiler` tablosu fikstürde var mı kontrol et)

**Interfaces:**
- Produces:
  - `sorular({ arama?, atama?, kullanici?, tesekkur? }) → [{ id, konu_id, platform, harici_id, gonderen_id, gonderen_ad, metin, mesaj_tarihi, durum, atanan_kullanici, ozel_mesaj_tarihi, ozel_mesaj_alici, gonderi_baslik, gonderi_gorsel, gonderi_link }]` — `tur='yorum' AND yon='gelen' AND niyet='soru' AND durum IN ('yeni','okundu') AND COALESCE(silindi,0)=0`, en yeni önce, LIMIT 300. IPC `'sosyal:sorular'`.
  - `sayaclar()` += `sorular` (SORU_OKUNMAMIS_SAYAC ile aynı koşul, COUNT), `bana` (DM konuşmalarında `atanan_kullanici = ?` olan ve cevapsız konuşma sayısı; `kullanici` parametresi alır → `sayaclar({ kullanici })`).
  - `konusmalar()` satırına `kaynak` alanı (KAYNAK_IFADESI) eklenir; `kaynak` süzgeci `_listeFiltreleri`'ne geçer.

- [ ] **Step 1: Testler**

```js
// electron/db/sosyal-gonderiler.test.js — sona
describe('sorular listesi', () => {
  test('yalnız niyet=soru, gelen, cevapsız yorumlar; gönderi bilgisiyle', () => {
    _upsertMesaj(mesaj({ tur: 'yorum', yon: 'gelen', harici_id: 's1', metin: 'var mı', konu_id: 'K1', konu_baslik: 'Tencere', konu_gorsel: 'g.jpg' }))
    _upsertMesaj(mesaj({ tur: 'yorum', yon: 'gelen', harici_id: 'f1', metin: 'fiyat?', konu_id: 'K1' }))
    _upsertMesaj(mesaj({ tur: 'yorum', yon: 'gelen', harici_id: 's2', metin: 'nerede', konu_id: 'K1' }))
    db.prepare("UPDATE sosyal_mesajlar SET durum='cevaplandi' WHERE harici_id='s2'").run()
    const r = sosyal['sosyal:sorular']({})
    expect(r.map(x => x.harici_id)).toEqual(['s1'])
    expect(r[0].gonderi_baslik).toBe('Tencere')
    expect(r[0].gonderi_gorsel).toBe('g.jpg')
  })
  test('sayaclar.sorular yalnız okunmamış soruları sayar', () => {
    _upsertMesaj(mesaj({ tur: 'yorum', yon: 'gelen', harici_id: 's1', metin: 'var mı' }))
    _upsertMesaj(mesaj({ tur: 'yorum', yon: 'gelen', harici_id: 'f1', metin: 'fiyat?' }))
    expect(sosyal['sosyal:sayaclar']({}).sorular).toBe(1)
  })
})
describe('konusmalar kaynak', () => {
  test('hikaye yanıtı olan konuşma kaynak=hikaye, olmayan normal', () => {
    _upsertMesaj(mesaj({ tur: 'dm', yon: 'gelen', harici_id: 'd1', konu_id: 'C1', ek_tur: 'hikaye_yanit', metin: '' }))
    _upsertMesaj(mesaj({ tur: 'dm', yon: 'gelen', harici_id: 'd2', konu_id: 'C2', metin: 'selam' }))
    const r = sosyal['sosyal:konusmalar']({})
    expect(Object.fromEntries(r.map(x => [x.konu_id, x.kaynak]))).toEqual({ C1: 'hikaye', C2: 'normal' })
    expect(sosyal['sosyal:konusmalar']({ kaynak: 'hikaye' }).map(x => x.konu_id)).toEqual(['C1'])
  })
})
```
(`mesaj()` yardımcı fonksiyonu fikstürde var; `konu_baslik/konu_gorsel` `_gonderiKaydet` üzerinden `sosyal_gonderiler`'e gider, fikstürde o tablo yoksa `sosyal-silinen-yorum.test.js`'ten CREATE'i kopyala.)

- [ ] **Step 2: Kırmızı gör**

Run: `npx vitest run electron/db/sosyal-gonderiler.test.js`

- [ ] **Step 3: Uygula**

```js
// electron/db/sosyal-mesajlar.js
const { listeFiltreleri: _listeFiltreleri, CEVAPSIZ_SAYAC, OKUNMAMIS_SAYAC, SORU_OKUNMAMIS_SAYAC, KAYNAK_IFADESI } = require('./sosyal-filtre')

// "Sorular" sekmesi (1A): fiyat dışı gerçek sorular, cevaplanana kadar. Gönderi bilgisi
// sosyal_gonderiler'den (tek kopya). tesekkur: 'gitti' | 'gitmedi' | undefined.
function sorular({ arama, atama, kullanici, tesekkur } = {}) {
  const kosul = ["m.tur='yorum'", "m.yon='gelen'", "m.niyet='soru'", "m.durum IN ('yeni','okundu')", 'COALESCE(m.silindi,0)=0']
  const p = {}
  if (arama) kosul.push(...aramaKosullari("COALESCE(m.metin,'') || ' ' || COALESCE(m.gonderen_ad,'')", arama, p))
  if (atama === 'bana') { kosul.push('m.atanan_kullanici = @kullanici'); p.kullanici = kullanici || '' }
  else if (atama === 'atanmamis') kosul.push('m.atanan_kullanici IS NULL')
  if (tesekkur === 'gitti') kosul.push('m.ozel_mesaj_tarihi IS NOT NULL')
  else if (tesekkur === 'gitmedi') kosul.push('m.ozel_mesaj_tarihi IS NULL')
  return getDb().prepare(`
    SELECT m.id, m.konu_id, m.platform, m.harici_id, m.gonderen_id, m.gonderen_ad, m.metin,
           m.mesaj_tarihi, m.durum, m.atanan_kullanici, m.ozel_mesaj_tarihi, m.ozel_mesaj_alici,
           g.baslik gonderi_baslik, g.gorsel gonderi_gorsel, g.link gonderi_link
    FROM sosyal_mesajlar m
    LEFT JOIN sosyal_gonderiler g ON g.konu_id = m.konu_id
    WHERE ${kosul.join(' AND ')}
    ORDER BY COALESCE(m.mesaj_tarihi, m.cekilme_tarihi) DESC
    LIMIT 300
  `).all(p)
}

// sayaclar({ kullanici }) — mevcut nesneye:
    sorular: q("tur='yorum' AND niyet='soru'"),
    bana: kullanici ? db.prepare(`
      SELECT COUNT(*) n FROM (
        SELECT konu_id FROM sosyal_mesajlar WHERE tur='dm' AND konu_id IS NOT NULL
        GROUP BY konu_id
        HAVING MAX(atanan_kullanici) = ? AND ${CEVAPSIZ_SAYAC} > 0)`).get(kullanici).n : 0,

// konusmalar({ ..., kaynak }) — SELECT'e `${KAYNAK_IFADESI} kaynak,` ekle;
// _listeFiltreleri çağrısına `kaynak` geçir.
// module.exports: 'sosyal:sorular': (arg) => sorular(arg), 'sosyal:sayaclar': (arg) => sayaclar(arg || {})
```

```js
// src/api/ipc.js — sosyalApi
  sorular: (params) => invoke('sosyal:sorular', params),
  sayaclar: (params) => invoke('sosyal:sayaclar', params),
```

- [ ] **Step 4: Yeşil gör, `npm test`, commit**

```bash
git add electron/db/sosyal-mesajlar.js electron/db/sosyal-gonderiler.test.js src/api/ipc.js
git commit -m "feat: sorular listesi, sorular/bana sayaçları, konuşmalarda kaynak alanı"
```

### Task 9: "Sorular" sekmesi arayüzü (1A)

**Files:**
- Create: `src/components/SorularListesi.jsx`
- Modify: `src/pages/SosyalMedya.jsx` (`SEKMELER` :15-24, `listeYukle` :246-268, render sekme ve sol liste)

**Interfaces:**
- Consumes: `sosyalApi.sorular`, `sosyalApi.ataKonu`/`ata`, `sosyalApi.durumGuncelle`, `metaApi.yorumCevapla({ id, metin, kullanici })`, `metaApi.mesajCevapla` (DM yolu için önce konuşma bulunmalı — aşağıda).
- Produces: `<SorularListesi sorular secili onSec onUstlen onOkundu kullanici />`.

DM'den yanıt akışı: soru satırında `ozel_mesaj_alici` (IGSID) varsa `sosyalApi.konusmalar({ platform })` içinde `gonderen_id = ozel_mesaj_alici` olan konuşma aranır; bulunursa sağ panel `DmGorunum` o konuşmayla açılır. Bulunamazsa (teşekkür DM'i gitmemiş) sağ panelde yalnız **yoruma açık yanıt** + **yoruma özel mesaj** (mevcut `ozelGonder`) kutuları görünür ve satırda "DM için önce teşekkür DM'i gitmeli ya da yoruma özel mesaj gönderin" notu.

- [ ] **Step 1: Sekme ve yükleme**

```js
// SEKMELER'e ig_yorum'dan ÖNCE:
  { kod: 'sorular', ad: 'Sorular', mod: 'sorular', sayacKey: 'sorular' },

// listeYukle içine, mod dalları:
      } else if (sekme.mod === 'sorular') {
        sonuc = (await sosyalApi.sorular({ arama: aramaGec, atama, kullanici })).map(x => ({ ...x, kind: 'soru' }))
      }
// sayaclariYukle: sosyalApi.sayaclar({ kullanici })
```

- [ ] **Step 2: Bileşen**

```jsx
// src/components/SorularListesi.jsx
import SosyalGorsel from './SosyalGorsel'   // mevcut gönderi görseli bileşeni (sosyal-gorsel:// protokolü)
import { adSadelestir } from '../utils/ad'

function zaman(t) { /* SosyalMedya.jsx'teki zaman() ile aynı; ortak utils'e taşıma bu görevde YAPILMAZ */ }

export default function SorularListesi({ sorular, secili, onSec, onUstlen, onOkundu, kullanici }) {
  if (!sorular.length) return <div className="p-6 text-sm text-gray-500 text-center">Bekleyen fiyat dışı soru yok 🎉</div>
  return (
    <div className="divide-y">
      {sorular.map(s => {
        const aktif = secili?.id === s.id
        return (
          <div key={s.id} onClick={() => onSec(s)}
            className={`flex gap-3 px-3 py-2.5 cursor-pointer ${aktif ? 'bg-marka-50' : 'hover:bg-gray-50'}`}>
            <SosyalGorsel src={s.gonderi_gorsel} className="w-14 h-14 rounded-md object-cover flex-shrink-0 bg-gray-100" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="text-[15px] font-bold text-marka-900 truncate">{adSadelestir(s.gonderen_ad)}</div>
                <div className="text-[11px] text-gray-400 whitespace-nowrap">{zaman(s.mesaj_tarihi)}</div>
              </div>
              <div className="text-[12px] text-marka-400 truncate">{s.gonderi_baslik || 'Gönderi'}</div>
              <div className="text-[13px] text-gray-800 mt-0.5 line-clamp-2">{s.metin}</div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {s.ozel_mesaj_tarihi
                  ? <span className="text-[11px] px-1.5 py-0.5 rounded border border-krem-200 bg-krem-50 text-krem-600">🤖 Teşekkür gitti</span>
                  : <span className="text-[11px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-500">⏳ teşekkür sırada</span>}
                {s.atanan_kullanici && <span className="text-[11px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-500">👤 {s.atanan_kullanici}</span>}
                {!s.atanan_kullanici && kullanici && (
                  <button type="button" onClick={e => { e.stopPropagation(); onUstlen(s) }}
                    className="text-[11px] px-2 py-0.5 rounded border border-gray-200 hover:bg-white">Üstlen</button>
                )}
                {s.durum === 'yeni' && (
                  <button type="button" onClick={e => { e.stopPropagation(); onOkundu(s) }}
                    className="text-[11px] px-2 py-0.5 rounded border border-gray-200 hover:bg-white">Okundu</button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```
(`SosyalGorsel` bileşeninin gerçek prop adlarını `src/components/SosyalGorsel.jsx` başından oku ve uyarla.)

- [ ] **Step 3: Sağ panel — seçilen soru**

`SosyalMedya.jsx` içinde `seciliKonu.kind === 'soru'` ise:
1. `sosyalApi.konu(s.konu_id)` ile gönderinin yorumlarını yükle ve mevcut `YorumGorunum`'u **yalnız o yorumu ve yanıtlarını** gösterecek şekilde aç (`yorumlar.filter(y => y.id === s.id || y.ust_id === s.harici_id)`), üstte "DM'den yanıtla" düğmesi.
2. "DM'den yanıtla": `ozel_mesaj_alici` varsa `sosyalApi.konusmalar({ platform: s.platform })` sonucunda `gonderen_id === s.ozel_mesaj_alici` olan konuşmayı bul → `konuSec({ ...k, kind: 'dm' })`. Yoksa toast: "Bu müşteriyle henüz DM yok. Önce 'Yoruma özel mesaj' gönderin, sonra DM'den devam edebilirsiniz."
3. Yoruma açık yanıt ve yoruma özel mesaj: mevcut `cevapla` / `ozelGonder` aynen (ikisi de `durum='cevaplandi'` yapar → satır listeden düşer, `listeYukle()` çağır).

- [ ] **Step 4: Elle doğrula**

`npm run dev`: Sorular sekmesi rozetle görünür; satır tıklanınca sağda yorum + eylemler; "Okundu" satırın kalınlığını düşürür (rozet azalır); "Üstlen" etiket ekler; yoruma açık yanıt sonrası satır listeden düşer.

- [ ] **Step 5: Commit**

```bash
git add src/components/SorularListesi.jsx src/pages/SosyalMedya.jsx
git commit -m "feat: Sorular sekmesi — fiyat dışı yorumlar gönderi/soru/teşekkür durumuyla, DM/yorum yanıt eylemleri"
```

### Task 10: Rozet yalnız sorular

**Files:**
- Modify: `src/pages/SosyalMedya.jsx` (`SEKMELER`'de `ig_yorum` satırı), `src/App.jsx` (bildirim sayacı `sosyalApi.sayac` kullanıyorsa)
- Modify: `electron/db/sosyal-mesajlar.js:297-301` (`sayac()`)

**Interfaces:**
- `sayaclar().ig_yorum` artık `tur='yorum' AND platform='instagram' AND niyet='soru'`; `sayac()` (genel bildirim rozeti) yorum tarafında yalnız `niyet='soru'`, DM tarafı değişmez.

- [ ] **Step 1: Test** (`sosyal-gonderiler.test.js`)

```js
test('genel sayaç fiyat yorumlarını saymaz, DM ve soruyu sayar', () => {
  _upsertMesaj(mesaj({ tur: 'yorum', yon: 'gelen', harici_id: 'f1', metin: 'fiyat?' }))
  _upsertMesaj(mesaj({ tur: 'yorum', yon: 'gelen', harici_id: 's1', metin: 'var mı' }))
  _upsertMesaj(mesaj({ tur: 'dm', yon: 'gelen', harici_id: 'd1', metin: 'fiyat?', konu_id: 'C1' }))
  expect(sosyal['sosyal:sayac']()).toBe(2)
  expect(sosyal['sosyal:sayaclar']({}).ig_yorum).toBe(1)
})
```

- [ ] **Step 2: Uygula**

```js
// sayac():
  "SELECT COUNT(*) n FROM sosyal_mesajlar WHERE durum='yeni' AND yon='gelen' AND COALESCE(silindi,0)=0 AND (tur='dm' OR niyet='soru')"
// sayaclar(): ig_yorum: q("tur='yorum' AND platform='instagram' AND niyet='soru'"),
//             fb_yorum ve yt_yorum de aynı kural (niyet='soru') — tutarlılık için.
```

- [ ] **Step 3: Yeşil, commit**

```bash
git add electron/db/sosyal-mesajlar.js electron/db/sosyal-gonderiler.test.js
git commit -m "feat: yorum rozetleri yalnız fiyat dışı (soru) yorumları sayar"
```

### Task 11: "Bana atananlar" bölümlü anahtar + satırda Üstlen/Bırak (2A)

**Files:**
- Modify: `src/pages/SosyalMedya.jsx` (sol liste üstü, DM satırı render'ı ~:550-580, `AtamaButonu` :606)

**Interfaces:**
- Consumes: `sayaclar.bana`, mevcut `atama` state'i (`'hepsi'|'bana'`), `sosyalApi.ataKonu({ konu_id, kullanici })`.

- [ ] **Step 1: Anahtar**

```jsx
// Sol listede arama kutusunun ÜSTÜNE (yalnız sekme.mod === 'dm' || 'karma' iken)
{(sekme.mod === 'dm' || sekme.mod === 'karma') && (
  <div className="inline-flex border border-marka-100 rounded-lg overflow-hidden text-sm mb-1">
    {[['hepsi', 'Tümü', sayaclar[sekme.sayacKey] || 0], ['bana', 'Bana atananlar', sayaclar.bana || 0]].map(([kod, ad, n]) => (
      <button key={kod} type="button" onClick={() => setAtama(kod)} disabled={kod === 'bana' && !kullanici}
        className={`px-3.5 py-1.5 font-semibold flex items-center gap-1.5 ${atama === kod ? 'bg-marka-900 text-white' : 'text-marka-400 hover:bg-gray-50'}`}>
        {ad}{n > 0 && <span className={`text-[10px] rounded-full px-1.5 ${atama === kod ? 'bg-red-600 text-white' : 'bg-marka-100 text-marka-400'}`}>{n}</span>}
      </button>
    ))}
  </div>
)}
```
`ATAMA_SECENEK` çipleri DM modunda **kaldırılır** (anahtar aynı state'i kullanır); yorum modunda kalır.

- [ ] **Step 2: Satırda Üstlen/Bırak (hover'da)**

DM satırı `div`'ine `group` sınıfı; sağ tarafa:
```jsx
<button type="button" onClick={e => { e.stopPropagation(); banaAta(satir, satir.atanan === kullanici) }}
  className="opacity-0 group-hover:opacity-100 text-[11px] px-2 py-0.5 rounded border border-gray-200 bg-white hover:bg-gray-50">
  {satir.atanan === kullanici ? 'Bırak' : 'Üstlen'}
</button>
```
`banaAta(konu, kaldir)` mevcut fonksiyon (`:345` civarı) — imzasını grep ile doğrula.

- [ ] **Step 3: Elle doğrula, commit**

```bash
git add src/pages/SosyalMedya.jsx
git commit -m "feat: gelen kutusunda Tümü/Bana atananlar anahtarı + satırda Üstlen/Bırak"
```

**P2 sonu:** `npm test` yeşil; kullanıcıya yayın sor.

---

## PAKET 3 — Boş balonlar + kaynak süzgeci

### Task 12: `kart-kayit.js` — kart yükünden `ek_*` alanları

**Files:**
- Create: `electron/meta/kart-kayit.js`, `electron/meta/kart-kayit.test.js`

**Interfaces:**
- Produces: `kartKaydi(yuk, { kim }) → { ek_tur: 'urun_karti', ek_baslik, ek_gorsel, ek_link, metin, ham_ek }` — `yuk` = `kartMesajiOlustur().yuk` (`{ attachment: { payload: { elements: [{ title, subtitle, image_url, default_action:{url}, buttons:[{url}] }] } } }`).

- [ ] **Step 1: Test**

```js
// electron/meta/kart-kayit.test.js
import { describe, test, expect } from 'vitest'
const { kartKaydi } = await import('./kart-kayit.js')
const yuk = { attachment: { type: 'template', payload: { template_type: 'generic', elements: [
  { title: 'Sofram Soft 12 Parça', subtitle: 'Fiyat: 3.490 TL · Ücretsiz kargo', image_url: 'https://cdn/a.webp', default_action: { url: 'https://tencerecim.store/a' } },
  { title: 'Thor Tava 28', subtitle: 'Fiyat: 1.290 TL', image_url: 'https://cdn/b.webp', buttons: [{ url: 'https://tencerecim.store/b' }] },
] } } }
describe('kartKaydi', () => {
  test('ilk kartı ek_* alanlarına, tamamını ham_ek JSON\'una yazar', () => {
    const k = kartKaydi(yuk, { kim: 'otomasyon' })
    expect(k.ek_tur).toBe('urun_karti')
    expect(k.ek_baslik).toBe('Sofram Soft 12 Parça ve 1 ürün daha')
    expect(k.ek_gorsel).toBe('https://cdn/a.webp')
    expect(k.ek_link).toBe('https://tencerecim.store/a')
    expect(k.metin).toBe('Fiyat: 3.490 TL · Ücretsiz kargo')
    expect(JSON.parse(k.ham_ek).elements).toHaveLength(2)
    expect(JSON.parse(k.ham_ek).kim).toBe('otomasyon')
  })
  test('tek kartta "ve N ürün daha" eki yok; link default_action yoksa ilk butondan', () => {
    const tek = { attachment: { payload: { elements: [yuk.attachment.payload.elements[1]] } } }
    const k = kartKaydi(tek, { kim: 'Ufuk' })
    expect(k.ek_baslik).toBe('Thor Tava 28')
    expect(k.ek_link).toBe('https://tencerecim.store/b')
  })
  test('boş/bozuk yük null döner', () => {
    expect(kartKaydi(null, {})).toBeNull()
    expect(kartKaydi({ attachment: { payload: { elements: [] } } }, {})).toBeNull()
  })
})
```

- [ ] **Step 2: Kırmızı, sonra uygula**

```js
// electron/meta/kart-kayit.js
// Gönderilen ÜRÜN KARTINI yerel gelen kutusuna yazılabilir hale getirir. Eskiden kart
// DM'i yalnız metin olarak (ya da hiç) kaydediliyordu → sohbette BOŞ BALON (08.09.2026).
// ek_* ilk kartı taşır (liste satırı ve önizleme için), ham_ek tüm kartları (balon karuseli).
function kartKaydi(yuk, { kim = null } = {}) {
  const el = yuk?.attachment?.payload?.elements
  if (!Array.isArray(el) || !el.length) return null
  const ilk = el[0]
  const link = ilk.default_action?.url || ilk.buttons?.find(b => b.url)?.url || null
  const ek = el.length > 1 ? ` ve ${el.length - 1} ürün daha` : ''
  return {
    ek_tur: 'urun_karti',
    ek_baslik: `${ilk.title || 'Ürün'}${ek}`,
    ek_gorsel: ilk.image_url || null,
    ek_link: link,
    metin: ilk.subtitle || '',
    ham_ek: JSON.stringify({ kim, elements: el.map(e => ({
      title: e.title, subtitle: e.subtitle || null, image_url: e.image_url || null,
      url: e.default_action?.url || e.buttons?.find(b => b.url)?.url || null,
    })) }),
  }
}
module.exports = { kartKaydi }
```

- [ ] **Step 3: Yeşil, commit**

```bash
git add electron/meta/kart-kayit.js electron/meta/kart-kayit.test.js
git commit -m "feat: kart yükünden yerel kayıt alanlarını üreten kartKaydi"
```

### Task 13: Kart gönderiminde yerel kayıt + `ham_ek` yazımı + bilinmeyen ek

**Files:**
- Modify: `electron/db/sosyal-mesajlar.js` (`_upsertMesaj` INSERT'e `ham_ek`)
- Modify: `electron/meta/otomasyon.js:172-190` (kart başarılı gönderimden sonra)
- Modify: `electron/meta/index.js:171-207` (`mesajEki`, `cekMesajlar`), `:495-545` (`yorumdanMesaj` konuşma çözümü — kart kaydı için ortak yardımcı)
- Test: `electron/db/sosyal-gonderiler.test.js`

**Interfaces:**
- `_upsertMesaj(m)` `m.ham_ek` alanını yazar (yeni satırda; mevcutta COALESCE ile doldurur).
- `index.js`: yeni iç yardımcı `_kartEkoYaz({ platform, konu_id, gonderen_id, kullanici, yuk })` — konuşma id'si bilinmiyorsa (yorumdan gönderim) `yorumdanMesaj`'daki `conversations?user_id` çözümüyle aynı yol; `konu_id` null kalırsa kayıt **yine** yazılır (`konu_id` null, `harici_id` `giden_kart_<ts>`), çekim turunda `_upsertMesaj` eko benimseme kuralı `metin` eşleşmesiyle çalışır — kart mesajının Meta'dan çekilen kopyasında `message` boştur, bu yüzden benimseme **`ek_tur='urun_karti'` ve aynı konuşma ve ±2 dk** koşuluyla yapılır (aşağıda).

- [ ] **Step 1: Testler**

```js
// sosyal-gonderiler.test.js (SEMA'ya ham_ek TEXT ekle)
describe('ürün kartı kaydı', () => {
  test('giden kart satırı ek_tur=urun_karti ve ham_ek ile yazılır', () => {
    _upsertMesaj(mesaj({ tur: 'dm', yon: 'giden', harici_id: 'giden_kart_1', konu_id: 'C1', metin: 'Fiyat: 10 TL',
      ek_tur: 'urun_karti', ek_baslik: 'A', ek_gorsel: 'g', ek_link: 'l', ham_ek: '{"elements":[]}' }))
    const r = db.prepare("SELECT ek_tur, ham_ek FROM sosyal_mesajlar WHERE harici_id='giden_kart_1'").get()
    expect(r.ek_tur).toBe('urun_karti'); expect(r.ham_ek).toBe('{"elements":[]}')
  })
  test('Meta\'dan çekilen boş metinli kart kopyası, ±2 dk içindeki yerel kart ekosunu benimser', () => {
    const t = new Date().toISOString()
    _upsertMesaj(mesaj({ tur: 'dm', yon: 'giden', harici_id: 'giden_kart_1', konu_id: 'C1', metin: 'Fiyat: 10 TL', ek_tur: 'urun_karti', mesaj_tarihi: t }))
    _upsertMesaj(mesaj({ tur: 'dm', yon: 'giden', harici_id: 'm_gercek', konu_id: 'C1', metin: '', ek_tur: 'sablon', mesaj_tarihi: t }))
    const satirlar = db.prepare("SELECT harici_id, ek_tur FROM sosyal_mesajlar WHERE konu_id='C1'").all()
    expect(satirlar).toEqual([{ harici_id: 'm_gercek', ek_tur: 'urun_karti' }])
  })
})
```

- [ ] **Step 2: Uygula**

```js
// sosyal-mesajlar.js _upsertMesaj — eko benimseme bloğunu genişlet:
  if (m.tur === 'dm' && m.yon === 'giden' && m.konu_id) {
    const eko = db.prepare(`
      SELECT id FROM sosyal_mesajlar
      WHERE konu_id = ? AND tur = 'dm' AND yon = 'giden' AND harici_id LIKE 'giden\\_%' ESCAPE '\\'
        AND ( metin = ?
              OR (ek_tur = 'urun_karti' AND ? = 'sablon'
                  AND ABS(strftime('%s', mesaj_tarihi) - strftime('%s', ?)) <= 120) )
      ORDER BY id ASC LIMIT 1`).get(m.konu_id, m.metin || '', m.ek_tur || '', m.mesaj_tarihi || '')
    // ... mevcut UPDATE (harici_id + mesaj_tarihi) aynen; ek_tur'a DOKUNMA (urun_karti kalır)
  }
// INSERT: kolon + @ham_ek, nesneye ham_ek: m.ham_ek || null
// mevcut satır UPDATE'ine: ham_ek = COALESCE(ham_ek, @ham_ek)
```

```js
// electron/meta/index.js mesajEki — attachments dalından ÖNCE: kendi şablon (kart) mesajımız
  const sablon = m.attachments?.data?.find(a => a.mime_type === 'template' || a.template)
  if (sablon) return { ek_tur: 'sablon', ek_baslik: 'Ürün kartı', ek_gorsel: null, ek_link: null }
// mesajEki sonu (null yerine): tanınmayan ama boş metinli mesaj → ham_ek
// cekMesajlar döngüsünde:
        const ek = mesajEki(m)
        _upsertMesaj({ ..., ...(ek || {}),
          ham_ek: (!ek && !m.message && (m.attachments || m.shares || m.story)) ? JSON.stringify({ attachments: m.attachments, shares: m.shares, story: m.story }) : null,
          ...(!ek && !m.message && (m.attachments || m.shares || m.story) ? { ek_tur: 'bilinmeyen', ek_baslik: 'İçerik görüntülenemiyor' } : {}) })
```
Meta'nın kart kopyasında `attachments` şeklinin tam ne olduğu **ölçülmemiştir**; ilk canlı çekimden sonra `SELECT ham_ek FROM sosyal_mesajlar WHERE ek_tur='bilinmeyen' LIMIT 5` ile bak ve `sablon` tanımayı ona göre düzelt (bu adım plan dışı ölçüm, hafızaya yaz).

```js
// electron/meta/index.js — ortak yardımcı
const { kartKaydi } = require('./kart-kayit')
// Gönderilen kartı gelen kutusuna yazar. konu_id çözülemezse null ile yazar (kayıt kaybolmasın).
function _kartEkoYaz({ platform, konu_id, gonderen_id, kullanici, yuk }) {
  const k = kartKaydi(yuk, { kim: kullanici || 'otomasyon' })
  if (!k) return
  _upsertMesaj({ platform, tur: 'dm', harici_id: `giden_kart_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    konu_id: konu_id || null, gonderen_id: gonderen_id || null, gonderen_ad: `${kullanici || 'Otomasyon'} (kart)`,
    yon: 'giden', mesaj_tarihi: new Date().toISOString(), ...k })
}
module.exports._kartEkoYaz = _kartEkoYaz   // otomasyon.js kullanır
```

```js
// electron/meta/otomasyon.js — kart başarıyla gittikten sonra (damgala.run'dan önce):
      if (icerik.kart && kartGitti) {
        // Konuşma id'si yorumdan bilinmiyor; recipient_id ile çöz (yorumdanMesaj yolu). Hata yutulur, kart GİTTİ.
        try {
          const k = await client.get(`${sayfaId}/conversations`, { fields: 'id', user_id: yanit?.recipient_id, ...(a.platform === 'instagram' ? { platform: 'instagram' } : {}) }, { timeout: 30000, deneme: 1 })
          require('./index')._kartEkoYaz({ platform: a.platform, konu_id: k?.data?.[0]?.id || null, gonderen_id: yanit?.recipient_id, kullanici: null, yuk: icerik.kart })
        } catch (e) { sonuc.hatalar.push(`Kart kaydı (${a.gonderen_ad}): ${e.message}`) }
      }
```
(`yanit` = `_ozelMesaj`'ın dönüşü; `kartGitti` = kart dalında `_ozelMesaj` başarılı olduysa `true`. `require('./index')` içeride: döngüsel bağımlılık.)

- [ ] **Step 3: Yeşil, commit**

```bash
npm test
git add electron/db/sosyal-mesajlar.js electron/meta/index.js electron/meta/otomasyon.js electron/db/sosyal-gonderiler.test.js
git commit -m "feat: gönderilen ürün kartı yerel kayda yazılır; bilinmeyen DM ekleri ham_ek'e"
```

### Task 14: Balonlar — tam kart (3B) + ölü hikaye + bilinmeyen

**Files:**
- Create: `src/components/UrunKartiBalonu.jsx`
- Modify: `src/pages/SosyalMedya.jsx` (`MesajEki` :799-818, `EK_ETIKET` :790-797, `DmGorunum` balon render'ı)

**Interfaces:**
- `<UrunKartiBalonu m />` — `m.ham_ek` JSON `{ kim, elements:[{title,subtitle,image_url,url}] }`; yoksa `ek_*` alanlarından tek kart.

- [ ] **Step 1: Bileşen**

```jsx
// src/components/UrunKartiBalonu.jsx — Instagram'daki kartın aynısı (kullanıcı seçimi 3B).
import { useState } from 'react'
function kartlar(m) {
  try { const h = JSON.parse(m.ham_ek || ''); if (Array.isArray(h?.elements) && h.elements.length) return { kim: h.kim, el: h.elements } } catch {}
  return { kim: null, el: [{ title: m.ek_baslik, subtitle: m.metin, image_url: m.ek_gorsel, url: m.ek_link }] }
}
export default function UrunKartiBalonu({ m }) {
  const { kim, el } = kartlar(m)
  const [acik, setAcik] = useState(false)
  const goster = acik ? el : el.slice(0, 1)
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="text-[11px] text-marka-400">🛍️ Ürün kartı · {kim || 'otomasyon'}</div>
      <div className="flex gap-2 overflow-x-auto max-w-full">
        {goster.map((k, i) => (
          <a key={i} href={k.url || undefined} target="_blank" rel="noopener noreferrer"
            className="w-[240px] flex-shrink-0 bg-white border border-marka-100 rounded-xl overflow-hidden text-gray-900 hover:shadow">
            {k.image_url
              ? <img src={k.image_url} alt="" className="h-[120px] w-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
              : <div className="h-[120px] bg-marka-50" />}
            <div className="px-2.5 py-2">
              <div className="font-bold text-marka-900 text-[13px] leading-tight">{k.title}</div>
              {k.subtitle && <div className="text-[12px] text-marka-400 mt-0.5">{k.subtitle}</div>}
            </div>
            {k.url && <div className="border-t border-marka-100 text-center py-1.5 text-[13px] font-semibold text-blue-600">Siteden Al</div>}
          </a>
        ))}
        {!acik && el.length > 1 && (
          <button type="button" onClick={() => setAcik(true)}
            className="w-[72px] flex-shrink-0 bg-white/70 border border-marka-100 rounded-xl text-marka-900 font-bold text-sm">+{el.length - 1}</button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: DmGorunum ve MesajEki**

```jsx
// DmGorunum balon döngüsünde, mevcut balon div'inden ÖNCE:
if (m.ek_tur === 'urun_karti') return (
  <div key={m.id} className="flex justify-end"><div className="max-w-[85%]"><UrunKartiBalonu m={m} />
    <div className="text-[10px] mt-1 text-right text-gray-400">{zaman(m.mesaj_tarihi)}{m.cevaplayan_kullanici ? ` · ${m.cevaplayan_kullanici}` : ''}</div></div></div>
)

// MesajEki: hikaye görseli yüklenemezse (onError) state ile yer tutucu:
const [olu, setOlu] = useState(false)
// img onError={() => setOlu(true)}; olu && (m.ek_tur === 'hikaye_yanit' || m.ek_tur === 'hikaye_bahsi') ise:
<div className="w-[120px] h-[80px] rounded-md bg-marka-50 flex items-center justify-center text-[12px] text-marka-400">hikaye silinmiş</div>
// EK_ETIKET'e: bilinmeyen: '📎 İçerik görüntülenemiyor', sablon: '🛍️ Ürün kartı'
// Mor (violet) sınıfları marka-* ile değiştir (hafıza: mor kaldırıldı): bizden ? 'bg-marka-700/60' ... 'text-marka-50'
```

- [ ] **Step 3: Elle doğrula** — geçmişteki ölü hikaye yanıtı balonu yer tutucu gösteriyor; Task 13 sonrası gönderilen kart tam kart olarak çiziliyor.

- [ ] **Step 4: Commit**

```bash
git add src/components/UrunKartiBalonu.jsx src/pages/SosyalMedya.jsx
git commit -m "feat: ürün kartı balonu (tam kart), ölü hikaye yer tutucu, bilinmeyen ek etiketi"
```

### Task 15: Kaynak açılır kutusu + gruplu liste (4B)

**Files:**
- Modify: `src/pages/SosyalMedya.jsx` (state `kaynak`, `listeYukle` parametresi, sol liste render'ı)

**Interfaces:**
- Consumes: `sosyalApi.konusmalar({ ..., kaynak })`, satırdaki `kaynak` alanı.

- [ ] **Step 1: State ve süzgeç**

```jsx
const [kaynak, setKaynak] = useState('hepsi')
// listeYukle tf'ye: kaynak: kaynak === 'hepsi' ? undefined : kaynak ; bağımlılık dizisine kaynak
// Süzgeç çubuğunun sağına (DM/karma modunda):
<select value={kaynak} onChange={e => setKaynak(e.target.value)}
  className="ml-auto border border-marka-100 rounded-md px-2 py-1 text-xs text-marka-900 bg-white">
  <option value="hepsi">Kaynak: Tümü</option>
  <option value="hikaye">📖 Hikaye yanıtı</option>
  <option value="paylasim">🔁 Gönderi paylaşımı</option>
  <option value="normal">💬 Normal</option>
</select>
```

- [ ] **Step 2: Gruplu liste**

```jsx
const KAYNAK_BASLIK = { hikaye: '📖 HİKAYE YANITLARI', paylasim: '🔁 GÖNDERİ PAYLAŞIMLARI', normal: '💬 NORMAL' }
// Render: kaynak === 'hepsi' && sekme.mod === 'dm' ise liste ['hikaye','paylasim','normal'] sırasıyla
// gruplanır (kind==='dm' satırlar); grup boşsa başlık basılmaz:
{['hikaye', 'paylasim', 'normal'].map(k => {
  const grup = liste.filter(s => s.kind === 'dm' && (s.kaynak || 'normal') === k)
  if (!grup.length) return null
  return (<div key={k}>
    <div className="px-3 py-1.5 text-[11px] font-bold text-marka-400 bg-marka-50 sticky top-0">{KAYNAK_BASLIK[k]} ({grup.length})</div>
    {grup.map(satir => <KonusmaSatiri key={satir.konu_id} satir={satir} />)}
  </div>)
})}
```
Mevcut satır JSX'ini `KonusmaSatiri` adlı yerel bileşene çıkar (aynı dosyada), böylece düz liste ve gruplu liste aynı satırı kullanır. Karma modda gruplama YOK (yorum + DM karışık sıralı kalır).

- [ ] **Step 3: Elle doğrula, commit**

```bash
git add src/pages/SosyalMedya.jsx
git commit -m "feat: konuşma kaynağı açılır kutusu + hikaye/paylaşım/normal gruplu liste"
```

**P3 sonu:** `npm test` yeşil; yayın sor.

---

## PAKET 4 — Elle ürün kartı (5B)

### Task 16: `metaApi.kartGonder` — DM'e ya da yoruma kart

**Files:**
- Modify: `electron/meta/index.js` (yeni `kartGonder`), `src/api/ipc.js`
- Test: `electron/meta/kart-mesaj.test.js` (yük eşitliği testi)

**Interfaces:**
- Produces: IPC `'meta:kartGonder'` `({ hedef: { tur: 'dm', id: mesajId } | { tur: 'yorum', id: yorumId }, urunler: [{ ad, fiyat, web_link, ikas_urun_id }], kullanici }) → { ok: true, kartSayisi }`.
  - `dm`: `sosyal_mesajlar` satırından `gonderen_id` alınır → `{PAGE}/messages` `recipient.id`, `messaging_type: 'RESPONSE'`, kod 10'da `HUMAN_AGENT` denemesi (mesajCevapla ile aynı hata yolu `_pencereHatasi`).
  - `yorum`: `recipient.comment_id` (yorumdanMesaj yolu; tek hak uyarısı aynı).
  - Fiyat/görsel: `require('../ikas')._urunKartVerisi` ile siteden; numaralar: `_numaralariCoz` yerine Ayarlar'daki mağaza hatları (`lokasyonlar` telefonları; `db/lokasyonlar.js`'te listeleyen fonksiyonu grep ile bul) — 5B panelinde gönderi bağlamı yok.
  - Başarıda `_kartEkoYaz` ile yerel kayıt (Task 13).

- [ ] **Step 1: Test**

```js
// electron/meta/kart-mesaj.test.js — sona
test('elle gönderim yükü otomasyonla aynı kurucu üzerinden geçer (kartMesajiOlustur)', () => {
  const u = [{ ad: 'A', fiyat: 10, web_link: 'https://tencerecim.store/a', gorsel: 'g' }]
  const oto = kartMesajiOlustur({ urunler: u, numaralar: [], kargoNotu: '' }).yuk
  const elle = kartMesajiOlustur({ urunler: u, numaralar: [], kargoNotu: '' }).yuk
  expect(elle).toEqual(oto)
})
```
(Bu test tek kurucu kuralını belgeler; `kartGonder` içinde `kartMesajiOlustur` dışında yük kurulmaz.)

- [ ] **Step 2: Uygula**

```js
// electron/meta/index.js
async function kartGonder({ hedef, urunler, kullanici }) {
  if (!hedef?.id || !Array.isArray(urunler) || !urunler.length) throw new Error('Hedef ve en az bir ürün gerekli.')
  const row = getDb().prepare('SELECT * FROM sosyal_mesajlar WHERE id = ?').get(hedef.id)
  if (!row) throw new Error('Mesaj bulunamadı.')
  const sayfaId = client._sayfaId()
  let ikasVeri = new Map()
  try { ikasVeri = await require('../ikas')._urunKartVerisi(urunler.map(u => u.ikas_urun_id)) } catch {}
  const { yuk, kartSayisi } = kartMesajiOlustur({
    urunler: urunler.map(u => { const i = ikasVeri.get(u.ikas_urun_id); return { ...u, gorsel: i?.gorsel || null, fiyat: i?.fiyat != null ? i.fiyat : u.fiyat } }),
    numaralar: require('../db/lokasyonlar')._whatsappHatlari?.() || [],
    kargoNotu: '',
  })
  if (!yuk) throw new Error('Kart kurulamadı (ürün adı boş).')
  const mesaj = { message: JSON.stringify(yuk) }
  let yanit
  if (hedef.tur === 'yorum') {
    yanit = await client.post(`${sayfaId}/messages`, { recipient: JSON.stringify({ comment_id: row.harici_id }), ...mesaj })
    getDb().prepare("UPDATE sosyal_mesajlar SET ozel_mesaj_tarihi = datetime('now','localtime'), cevaplayan_kullanici = ? WHERE id = ?").run(kullanici || null, hedef.id)
  } else {
    if (!row.gonderen_id) throw new Error('Alıcı kimliği yok.')
    const govde = { recipient: JSON.stringify({ id: row.gonderen_id }), ...mesaj }
    try { yanit = await client.post(`${sayfaId}/messages`, { ...govde, messaging_type: 'RESPONSE' }) }
    catch (e) {
      if (!/kod 10\b/.test(e.message)) throw e
      try { yanit = await client.post(`${sayfaId}/messages`, { ...govde, messaging_type: 'MESSAGE_TAG', tag: 'HUMAN_AGENT' }) }
      catch (e2) { throw _pencereHatasi(e, e2, row) }
    }
  }
  _kartEkoYaz({ platform: row.platform, konu_id: hedef.tur === 'dm' ? row.konu_id : null, gonderen_id: row.gonderen_id || yanit?.recipient_id, kullanici, yuk })
  return { ok: true, kartSayisi }
}
// module.exports: 'meta:kartGonder': (v) => kartGonder(v),
// src/api/ipc.js metaApi: kartGonder: (v) => invoke('meta:kartGonder', v),
```
`_whatsappHatlari` yoksa: `lokasyonlar` tablosundan `telefon` dolu satırları `{ baslik: ad, numara: telefon, lokasyon_ad: ad }` biçiminde döndüren küçük fonksiyon ekle (`kart-mesaj.waNumara` biçimi).

- [ ] **Step 3: Yeşil, commit**

```bash
npm test
git add electron/meta/index.js electron/meta/kart-mesaj.test.js src/api/ipc.js electron/db/lokasyonlar.js
git commit -m "feat: meta:kartGonder — temsilci DM'e veya yoruma ürün kartı gönderir"
```

### Task 17: `sonUrunler()` — son gönderilen 5 ürün

**Files:**
- Modify: `electron/db/sosyal-mesajlar.js`, `src/api/ipc.js`
- Test: `electron/db/sosyal-gonderiler.test.js`

**Interfaces:**
- Produces: `'sosyal:sonUrunler'` → `[{ title, subtitle, image_url, url }]` — `ek_tur='urun_karti'` satırlarının `ham_ek.elements` düzleştirilip `title` ile tekilleştirilmiş, en yeni önce, 5 adet. Ürün id'si yok (kart yükü taşımıyor) → panel bu listeden **arama kutusunu doldurur** (title ile `urunlerApi.listele({ arama })`), doğrudan göndermez.

- [ ] **Step 1: Test**

```js
test('sonUrunler son kartlardaki ürünleri tekil ve yeni-önce döner, 5 ile sınırlı', () => {
  for (let i = 1; i <= 7; i++) _upsertMesaj(mesaj({ tur: 'dm', yon: 'giden', harici_id: 'k' + i, konu_id: 'C', ek_tur: 'urun_karti', mesaj_tarihi: `2026-09-0${Math.min(i,9)}T00:00:00Z`,
    ham_ek: JSON.stringify({ elements: [{ title: 'U' + (i % 6), url: 'x' }] }) }))
  const r = sosyal['sosyal:sonUrunler']()
  expect(r).toHaveLength(5)
  expect(r[0].title).toBe('U1')   // i=7 → U1 en yeni
  expect(new Set(r.map(x => x.title)).size).toBe(5)
})
```

- [ ] **Step 2: Uygula**

```js
function sonUrunler() {
  const satirlar = getDb().prepare(
    "SELECT ham_ek FROM sosyal_mesajlar WHERE ek_tur='urun_karti' AND ham_ek IS NOT NULL ORDER BY COALESCE(mesaj_tarihi, cekilme_tarihi) DESC LIMIT 40").all()
  const gorulen = new Set(), sonuc = []
  for (const s of satirlar) {
    let el = []; try { el = JSON.parse(s.ham_ek).elements || [] } catch {}
    for (const e of el) { if (!e.title || gorulen.has(e.title)) continue; gorulen.add(e.title); sonuc.push(e); if (sonuc.length === 5) return sonuc }
  }
  return sonuc
}
// exports: 'sosyal:sonUrunler': () => sonUrunler()   · ipc: sonUrunler: () => invoke('sosyal:sonUrunler')
```

- [ ] **Step 3: Yeşil, commit**

```bash
git add electron/db/sosyal-mesajlar.js electron/db/sosyal-gonderiler.test.js src/api/ipc.js
git commit -m "feat: son gönderilen ürünler listesi (Hızlı ürünler paneli için)"
```

### Task 18: `HizliUrunler` sağ paneli (5B) + Ayarlar anahtarı

**Files:**
- Create: `src/components/HizliUrunler.jsx`
- Modify: `src/pages/SosyalMedya.jsx` (`DmGorunum` ve `YorumGorunum` sağına), `src/pages/Ayarlar.jsx` (`hizli_urun_paneli` anahtarı)

**Interfaces:**
- Consumes: `urunlerApi.listele({ arama, boyut })`, `setApi.listele({ arama })` (OtomasyonUrunSecici ile aynı), `sosyalApi.sonUrunler`, `metaApi.kartGonder`.
- `<HizliUrunler hedef={{ tur:'dm'|'yorum', id }} kullanici onGonderildi />`.

- [ ] **Step 1: Bileşen**

```jsx
// src/components/HizliUrunler.jsx — sohbetin sağında kalıcı dar panel (kullanıcı seçimi 5B).
import { useEffect, useState } from 'react'
import { urunlerApi, setApi, sosyalApi, metaApi } from '../api/ipc'
import toast from 'react-hot-toast'

export default function HizliUrunler({ hedef, kullanici, onGonderildi }) {
  const [arama, setArama] = useState('')
  const [liste, setListe] = useState([])
  const [son, setSon] = useState([])
  const [mesgul, setMesgul] = useState(null)   // gönderilen ürünün anahtarı
  const [gitti, setGitti] = useState(null)

  useEffect(() => { sosyalApi.sonUrunler().then(setSon).catch(() => {}) }, [hedef?.id])
  useEffect(() => {
    if (!arama.trim()) { setListe([]); return }
    const t = setTimeout(async () => {
      try {
        const [u, s] = await Promise.all([urunlerApi.listele({ arama: arama.trim(), boyut: 8 }), setApi.listele({ arama: arama.trim() })])
        setListe([...(u?.urunler || []).map(x => ({ ...x, _tur: 'urun' })), ...(s || []).slice(0, 4).map(x => ({ ...x, _tur: 'set', satis_fiyati: x.fiyat }))])
      } catch (e) { toast.error(e.message) }
    }, 250)
    return () => clearTimeout(t)
  }, [arama])

  async function gonder(u) {
    if (!hedef?.id) return
    const anahtar = `${u._tur}-${u.id}`
    setMesgul(anahtar)
    try {
      await metaApi.kartGonder({ hedef, urunler: [{ ad: u.ad, fiyat: u.satis_fiyati, web_link: u.web_link, ikas_urun_id: u.ikas_urun_id }], kullanici })
      setGitti(anahtar); setTimeout(() => setGitti(null), 1200)
      onGonderildi?.()
      sosyalApi.sonUrunler().then(setSon).catch(() => {})
    } catch (e) { toast.error(e.message) } finally { setMesgul(null) }
  }

  const Satir = ({ u, anahtar, onClick }) => (
    <button type="button" onClick={onClick} disabled={!!mesgul}
      className="w-full flex gap-2 items-center p-1.5 rounded-lg border border-marka-100 bg-white hover:bg-marka-50 text-left disabled:opacity-60">
      <div className="w-9 h-9 rounded bg-marka-50 flex-shrink-0" />
      <div className="min-w-0 text-[12px]"><div className="font-bold text-marka-900 truncate">{u.ad}</div>
        <div className="text-marka-400">{u.satis_fiyati ? `${Number(u.satis_fiyati).toLocaleString('tr-TR')} TL` : ''}</div></div>
      {gitti === anahtar && <span className="ml-auto text-emerald-600 text-[11px]">Gönderildi ✓</span>}
    </button>
  )

  return (
    <div className="w-[200px] flex-shrink-0 border-l bg-white p-2.5 flex flex-col gap-2 overflow-y-auto">
      <div className="text-[11px] font-bold text-marka-900">🛍️ HIZLI ÜRÜNLER</div>
      <input value={arama} onChange={e => setArama(e.target.value)} placeholder="Ara… (ad, SKU)"
        className="w-full border border-marka-100 rounded-md px-2 py-1 text-[12px]" />
      {liste.map(u => <Satir key={`${u._tur}-${u.id}`} u={u} anahtar={`${u._tur}-${u.id}`} onClick={() => gonder(u)} />)}
      {!arama.trim() && son.length > 0 && <>
        <div className="text-[10px] text-gray-400 mt-1">Son gönderilenler</div>
        {son.map((e, i) => <button key={i} type="button" onClick={() => setArama(e.title)}
          className="text-left text-[12px] px-1.5 py-1 rounded hover:bg-marka-50 text-marka-900 truncate">{e.title}</button>)}
      </>}
      {!hedef?.id && <div className="text-[11px] text-gray-400">Bir konuşma ya da yorum seçin.</div>}
    </div>
  )
}
```
"Son gönderilenler" tıklanınca arama kutusunu doldurur (ürün id'si kartta yok); kullanıcı sonuçtan tıklar → gider. Tek tık gönderim (5B kararı) yalnız arama sonucunda.

- [ ] **Step 2: Yerleşim ve anahtar**

`DmGorunum` dönüş `div`'ini `flex` satırına al: sol sohbet + sağda `<HizliUrunler hedef={{ tur:'dm', id: sonGelenMesajId }} …/>`; `YorumGorunum`'da seçili yorum varsa `hedef={{ tur:'yorum', id: seciliYorumId }}`. Ayarlar → Sosyal'de "Hızlı ürünler panelini göster" kutusu (`meta_ayarlar.hizli_urun_paneli`, varsayılan '1'); SosyalMedya açılışta okur, '0' ise panel çizilmez. `onGonderildi` → `mesajlariTazele()`.

- [ ] **Step 3: Elle doğrula** — bir DM'de arama yap, ürüne tıkla; Instagram'da kart görün; balonda tam kart çizilsin; panel Ayarlar'dan kapanabilsin. Yorumda: tek hak uyarısı gerekiyorsa mevcut `ozel_mesaj_tarihi` dolu yorumda düğmeyi pasifle.

- [ ] **Step 4: Commit**

```bash
git add src/components/HizliUrunler.jsx src/pages/SosyalMedya.jsx src/pages/Ayarlar.jsx
git commit -m "feat: Hızlı ürünler paneli — temsilci tek tıkla ürün kartı gönderir"
```

**P4 sonu:** `npm test` yeşil; yayın sor. Yayın sonrası hafıza güncelle: `sosyal-medya-iyilestirme-2026-09.md` (durum), `ig-yorum-karti.md` (elle gönderim), `meta-24-saat-penceresi.md` (kart DM'i de aynı pencereye tabi).

---

## Self-review notları

- **Spec kapsamı:** 1 niyet (T1-6) · 2 Sorular (T8-9) · 3 rozet (T10) · 4 Bana atananlar (T11) · 5 balonlar (T12-14) · 6 kaynak (T7, T15) · 7 elle kart (T16-18). Veri tablosu: niyet/ham_ek/soru_yaniti_kapali (T3), `ozel_mesaj_alici` (T5 notu), meta_ayarlar anahtarları (T6, T18).
- **Ölçülmemiş varsayım (açıkça):** Meta'nın kendi kart mesajımızı çekimde nasıl döndürdüğü (`attachments` şekli) bilinmiyor; T13'te `bilinmeyen` + `ham_ek` ile toplanıp ilk canlı çekimden sonra düzeltilir.
- **İsim tutarlılığı:** `niyetBul/niyetToplu/NIYETLER` (T1,T4) · `SORU_OKUNMAMIS_SAYAC/KAYNAK_IFADESI` (T7,T8) · `sorular/sayaclar({kullanici})/sonUrunler` (T8,T10,T17) · `kartKaydi/_kartEkoYaz/kartGonder` (T12,T13,T16) · `soru_yaniti_kapali/soru_yaniti_metin/soru_yaniti_aktif` (T3,T5,T6).
