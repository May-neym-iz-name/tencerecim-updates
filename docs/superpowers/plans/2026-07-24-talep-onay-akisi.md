# İptal/İade Talebi Onay Akışı — Implementasyon Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Personel iptal/iade talebini, müşterinin tam olarak ne istediğini görerek onaylayabilsin, iadeyi ürün gelince tamamlayabilsin, onaylamayacağı talebi notla kapatabilsin.

**Architecture:** İkas API talebi reddetmeyi ve "onaylandı-bekliyor" ara durumunu yazmayı desteklemiyor. Bu iki bilgi yeni bir yerel `talep_durumlari` tablosunda tutulur ve mevcut genel senkron aynasıyla PC'ler arasında paylaşılır. Onay/tamamlama fiilen mevcut `ikas:siparis-iade` / `ikas:siparis-iptal` uçlarını çağırır — yeni ikas entegrasyonu yazılmaz. Talep kalemleri ikas'tan paket bazlı okunur.

**Tech Stack:** Electron (CommonJS ana süreç) + React/Vite (ESM renderer) + better-sqlite3 + vitest. İkas Admin GraphQL API.

Tasarım: `docs/superpowers/specs/2026-07-24-talep-onay-akisi-design.md`

## Global Constraints

- **Yeni yetki kodu EKLENMEZ.** Tüm yeni IPC uçları mevcut `ikas_yonet` yetkisini kullanır. Yeni bir kod Supabase `yetki_kodlari` tablosuna da eklenmezse "Özel" rolde toggle çıkmaz.
- **Yeni Supabase SQL dosyası YOK.** Senkron `senk_kayitlar` genel aynasını kullanır; `senk-sema.js` `TABLOLAR`+`SIRA` kaydı yeterlidir.
- **Çok-PC bağı `ikas_siparis_id` iledir**, yerel `online_siparisler.id` ile ASLA değil — yerel id her PC'de farklıdır (autoincrement).
- **Ana süreç dosyaları CommonJS** (`require`/`module.exports`), **renderer dosyaları ESM** (`import`/`export`). İkisi arasında modül paylaşımı yoktur; mantık tekrarı bilinçlidir ve testle eşlenir.
- **Türkçe UI metinleri**, kod/commit mesajları ASCII.
- Testler `npx vitest run` ile çalışır. Mevcut 171 test kırılmamalıdır.
- **Gerçek DB testi YAZILAMAZ.** `better-sqlite3` Electron için derlenmiştir; vitest Node ile koşar ve modülü yükleyemez ("compiled against a different Node.js version"). Bu yüzden projedeki testlerin tamamı saf karar fonksiyonlarını hedefler. DB'ye dokunan her yeni mantıkta doğrulama/dönüşüm saf fonksiyona ayrılmalı ve test ona yazılmalıdır.
- Commit tipi `feat:` / `fix:` / `test:` (conventional commits), gövde Türkçe olabilir ama ASCII karakterlerle.

---

### Task 1: `talep_durumlari` tablosu + senkron kaydı

Yerel tabloyu oluştur ve çok-PC senkronuna sok. Bu task sonunda tablo var, senkron listelerinde kayıtlı, mevcut senkron parite testi geçiyor.

**Files:**
- Modify: `electron/db/database.js` (tablo tanımlarının olduğu `db.exec` bloğu — `bildirimler` tablosunun hemen ardına)
- Modify: `electron/db/senk-sema.js:65` (`kargolar` satırının ardına) ve `electron/db/senk-sema.js:79` (`SIRA` dizisinin sonuna)
- Test: `electron/db/senk-sema.test.js` (mevcut dosya — yeni test eklenmez, mevcut parite testi bu değişikliği doğrular)

**Interfaces:**
- Consumes: yok (ilk task)
- Produces: `talep_durumlari` tablosu — kolonlar: `id INTEGER PK`, `ikas_siparis_id TEXT UNIQUE NOT NULL`, `asama TEXT NOT NULL`, `not_metni TEXT`, `kullanici TEXT`, `tarih TEXT`. Task 2 bu tabloyu okur/yazar.

> **Neden `not_metni`, `not` değil:** `not` SQLite'ta ayrılmış sözcüktür (NOT operatörü). Kolon adı olarak her sorguda tırnaklanması gerekir; sessiz sözdizimi hatası kaynağıdır.

- [ ] **Step 1: Tabloyu ekle**

`electron/db/database.js` içinde `bildirimler` tablosunun `CREATE INDEX ... idx_bildirim_okundu` satırının hemen ardına ekle:

```sql
    -- İkas'a YAZILAMAYAN talep bilgisi. API'de ne "reddet" mutation'ı var ne de
    -- REFUND_REQUEST_ACCEPTED'ı set etme imkânı (2026-07-24 canlı introspection:
    -- 69 mutation tarandı). Bu yüzden "onaylandı, ürün bekleniyor" ve "kapatıldı"
    -- yerelde tutulur. Anahtar ikas_siparis_id: yerel id her PC'de farklıdır.
    CREATE TABLE IF NOT EXISTS talep_durumlari (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ikas_siparis_id TEXT NOT NULL UNIQUE,
      asama TEXT NOT NULL,
      not_metni TEXT,
      kullanici TEXT,
      tarih TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_talep_durum_siparis ON talep_durumlari(ikas_siparis_id);
```

- [ ] **Step 2: Senkron kaydını ekle**

`electron/db/senk-sema.js` içinde `kargolar:` satırının hemen ardına (kapanış `}` öncesi):

```js
  // Talep aşaması: ikas'a yazılamayan "onaylandı/kapatıldı" bilgisi. Çok-PC ŞART —
  // bir mağazada kapatılan talep diğerinde kırmızı durursa aynı iade iki kez işlenir.
  // ikas_siparis_id tüm PC'lerde AYNI → doğal anahtar, dedup garantili.
  talep_durumlari: { kolonlar: ['ikas_siparis_id', 'asama', 'not_metni', 'kullanici', 'tarih'],
                     fk: {}, dogal: ['ikas_siparis_id'], sonradanEklendi: true },
```

Aynı dosyada `SIRA` dizisinin sonuna, `'kargolar',` satırının ardına ekle:

```js
  'talep_durumlari',
```

- [ ] **Step 3: Senkron parite testini çalıştır**

Run: `npx vitest run electron/db/senk-sema.test.js`
Expected: PASS — "TABLOLAR ile SIRA birebir aynı tabloları içerir" testi geçmeli. FAIL alırsan iki listeden birine eklemeyi unutmuşsundur.

- [ ] **Step 4: Tüm testleri çalıştır**

Run: `npx vitest run`
Expected: PASS, 171 test.

- [ ] **Step 5: Commit**

```bash
git add electron/db/database.js electron/db/senk-sema.js
git commit -m "feat(talep): talep_durumlari tablosu + cok-PC senkron kaydi"
```

---

### Task 2: `talep-durumlari.js` — aşama okuma/yazma

Saf DB modülü. IPC uçları Task 4'te bağlanır; burada yalnız fonksiyonlar ve testleri.

**Files:**
- Create: `electron/db/talep-durumlari.js`
- Test: `electron/db/talep-durumlari.test.js`

**Interfaces:**
- Consumes: Task 1'in `talep_durumlari` tablosu
- Produces:
  - `asamalar(db) → { [ikas_siparis_id]: { asama, not_metni, kullanici, tarih } }` — tüm kayıtlar tek nesnede (renderer'a toplu gönderim için)
  - `asamaYaz(db, { ikasSiparisId, asama, notMetni, kullanici }) → { ok: true }` — upsert; `asama='kapatildi'` ise `notMetni` zorunlu, boşsa `Error` fırlatır
  - `asamaSil(db, ikasSiparisId) → { ok: true }` — kaydı kaldırır (talep yeniden açılırsa)

- [ ] **Step 1: Failing test yaz**

`electron/db/talep-durumlari.test.js`:

```js
// Talep aşaması DB mantığı. Bellek içi SQLite ile — gerçek şema, mock yok.
import { describe, test, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createRequire } from 'module'

const require_ = createRequire(import.meta.url)
const { asamalar, asamaYaz, asamaSil } = require_('./talep-durumlari.js')

let db
beforeEach(() => {
  db = new Database(':memory:')
  db.exec(`CREATE TABLE talep_durumlari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ikas_siparis_id TEXT NOT NULL UNIQUE,
    asama TEXT NOT NULL,
    not_metni TEXT,
    kullanici TEXT,
    tarih TEXT DEFAULT (datetime('now','localtime'))
  )`)
})

describe('asamaYaz / asamalar', () => {
  test('onay kaydı yazılır ve okunur', () => {
    asamaYaz(db, { ikasSiparisId: 'ORD1', asama: 'onaylandi', kullanici: 'Burak' })
    const a = asamalar(db)
    expect(a.ORD1.asama).toBe('onaylandi')
    expect(a.ORD1.kullanici).toBe('Burak')
  })

  test('aynı sipariş ikinci kez yazılınca ÜZERİNE yazılır (mükerrer satır olmaz)', () => {
    asamaYaz(db, { ikasSiparisId: 'ORD1', asama: 'onaylandi', kullanici: 'Burak' })
    asamaYaz(db, { ikasSiparisId: 'ORD1', asama: 'kapatildi', notMetni: 'müşteri vazgeçti', kullanici: 'Ayşe' })
    const a = asamalar(db)
    expect(a.ORD1.asama).toBe('kapatildi')
    expect(a.ORD1.not_metni).toBe('müşteri vazgeçti')
    expect(db.prepare('SELECT COUNT(*) n FROM talep_durumlari').get().n).toBe(1)
  })

  // Notsuz kapatma sonradan "bunu neden kapatmışız" sorusunu cevapsız bırakır.
  // Doğrulama UI'da DEĞİL burada: IPC ucu doğrudan da çağrılabilir.
  test('kapatma notsuz reddedilir', () => {
    expect(() => asamaYaz(db, { ikasSiparisId: 'ORD1', asama: 'kapatildi' })).toThrow(/not/i)
    expect(() => asamaYaz(db, { ikasSiparisId: 'ORD1', asama: 'kapatildi', notMetni: '   ' })).toThrow(/not/i)
    expect(db.prepare('SELECT COUNT(*) n FROM talep_durumlari').get().n).toBe(0)
  })

  test('bilinmeyen aşama reddedilir', () => {
    expect(() => asamaYaz(db, { ikasSiparisId: 'ORD1', asama: 'saçma' })).toThrow(/aşama/i)
  })

  test('sipariş kimliği yoksa reddedilir', () => {
    expect(() => asamaYaz(db, { asama: 'onaylandi' })).toThrow(/sipariş/i)
  })

  test('kayıt yokken boş nesne döner', () => {
    expect(asamalar(db)).toEqual({})
  })
})

describe('asamaSil', () => {
  test('kayıt kaldırılır', () => {
    asamaYaz(db, { ikasSiparisId: 'ORD1', asama: 'onaylandi' })
    asamaSil(db, 'ORD1')
    expect(asamalar(db)).toEqual({})
  })
})
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npx vitest run electron/db/talep-durumlari.test.js`
Expected: FAIL — "Cannot find module './talep-durumlari.js'"

- [ ] **Step 3: Modülü yaz**

`electron/db/talep-durumlari.js`:

```js
// Talep aşaması: ikas'a YAZILAMAYAN "onaylandı (ürün bekleniyor)" ve "kapatıldı"
// bilgisi. İkas API'sinde ne reddetme mutation'ı var ne de REFUND_REQUEST_ACCEPTED'ı
// set etme imkânı (2026-07-24 canlı introspection). Bu yüzden yerel + çok-PC senkron.
//
// Bu modül SAF DB'dir: getDb() çağırmaz, db parametre alır → mock'suz test edilir
// (emsal: bildirimler.js _ekle). IPC uçları ikas/index.js'te bağlanır.

const ASAMALAR = ['onaylandi', 'kapatildi']

// Tüm aşama kayıtları → { ikas_siparis_id: kayit }. Renderer tek seferde alır;
// sipariş başına sorgu atmak 400+ satırlık listede N+1 olurdu.
function asamalar(db) {
  const satirlar = db.prepare(
    'SELECT ikas_siparis_id, asama, not_metni, kullanici, tarih FROM talep_durumlari'
  ).all()
  return Object.fromEntries(satirlar.map(s => [s.ikas_siparis_id, s]))
}

// Upsert: sipariş başına TEK kayıt. Aşama ilerler (onaylandi → kapatildi) ya da düzeltilir.
function asamaYaz(db, { ikasSiparisId, asama, notMetni = null, kullanici = null } = {}) {
  if (!ikasSiparisId) throw new Error('Sipariş kimliği (ikas_siparis_id) gerekli.')
  if (!ASAMALAR.includes(asama)) throw new Error(`Geçersiz aşama: ${asama}`)
  // Kapatma gerekçesiz kalırsa sonradan denetlenemez. UI doğrulamasına güvenilmez:
  // bu uç doğrudan da çağrılabilir.
  const not = (notMetni || '').trim()
  if (asama === 'kapatildi' && !not) throw new Error('Talebi kapatmak için not (sebep) zorunludur.')

  db.prepare(`
    INSERT INTO talep_durumlari (ikas_siparis_id, asama, not_metni, kullanici, tarih)
    VALUES (@ikasSiparisId, @asama, @not, @kullanici, datetime('now','localtime'))
    ON CONFLICT(ikas_siparis_id) DO UPDATE SET
      asama = excluded.asama, not_metni = excluded.not_metni,
      kullanici = excluded.kullanici, tarih = excluded.tarih
  `).run({ ikasSiparisId, asama, not: not || null, kullanici })
  return { ok: true }
}

function asamaSil(db, ikasSiparisId) {
  db.prepare('DELETE FROM talep_durumlari WHERE ikas_siparis_id = ?').run(ikasSiparisId)
  return { ok: true }
}

module.exports = { ASAMALAR, asamalar, asamaYaz, asamaSil }
```

- [ ] **Step 4: Testlerin geçtiğini gör**

Run: `npx vitest run electron/db/talep-durumlari.test.js`
Expected: PASS, 7 test.

- [ ] **Step 5: Commit**

```bash
git add electron/db/talep-durumlari.js electron/db/talep-durumlari.test.js
git commit -m "feat(talep): talep asama okuma/yazma modulu + testler"
```

---

### Task 3: `talep-detay.js` — talebin hangi kalemleri kapsadığı

İkas'tan paket bazlı talep detayı. Karar mantığı saf fonksiyon olarak ayrılır ki gerçek API verisiyle mock'suz test edilebilsin.

**Files:**
- Create: `electron/ikas/talep-detay.js`
- Test: `electron/ikas/talep-detay.test.js`

**Interfaces:**
- Consumes: yok (bağımsız)
- Produces:
  - `_talepPaketleri(order) → { talepli: [{ paketNo, durum, sebepId, notu, iadeKargo, kalemler: [{ id, ad, miktar, tutar }] }], talepDisi: [{ id, ad, miktar, tutar }], talepToplami }` — saf fonksiyon, ağ yok
  - `TALEP_SORGUSU` — GraphQL sorgu metni (Task 4 kullanır)

> **Neden paket bazlı:** canlı veride sipariş 1141437359 üç üründen oluşuyor ve iki pakete bölünmüş; talep yalnız Paket-2'de (tek ürün, 2.670 TL). Sipariş bazlı bakan bir kod 7.970 TL'lik tam iade önerirdi.

- [ ] **Step 1: Failing test yaz**

`electron/ikas/talep-detay.test.js`:

```js
// Talep kalem ayıklama — SAF, ağsız (emsal: ikas/bildirim-uret.js _durumdanBildirim).
// Fixture GERÇEK veridir: sipariş 1141437359 (Sebiha Yıldız), 2026-07-24'te canlı
// ikas API'sinden çekildi. 3 ürün / 2 paket; talep yalnız ikinci pakette.
import { describe, test, expect } from 'vitest'
import { createRequire } from 'module'

const require_ = createRequire(import.meta.url)
const { _talepPaketleri } = require_('./talep-detay.js')

const GERCEK_SIPARIS = {
  orderNumber: '1141437359',
  status: 'REFUND_REQUESTED',
  orderPackageStatus: 'REFUND_REQUESTED',
  cancelReason: null,
  orderPackages: [
    { id: 'ea53d3db', orderPackageNumber: '1141437359-1', orderPackageFulfillStatus: 'DELIVERED',
      refundReasonId: null, returnShippingMethod: null, note: null,
      orderLineItemIds: ['1f309ae7', '024d3e62'] },
    { id: '401d2425', orderPackageNumber: '1141437359-2', orderPackageFulfillStatus: 'REFUND_REQUESTED',
      refundReasonId: null, returnShippingMethod: null, note: null,
      orderLineItemIds: ['32643bdd'] },
  ],
  orderLineItems: [
    { id: '1f309ae7', quantity: 1, finalPrice: 3100, variant: { name: 'Sofram Grand 40x15' } },
    { id: '024d3e62', quantity: 1, finalPrice: 2200, variant: { name: 'Sofram Grand 32x11' } },
    { id: '32643bdd', quantity: 1, finalPrice: 2670, variant: { name: 'Sofram Grand 36x13' } },
  ],
}

describe('_talepPaketleri', () => {
  test('yalnız talepteki paketin kalemlerini döner', () => {
    const r = _talepPaketleri(GERCEK_SIPARIS)
    expect(r.talepli).toHaveLength(1)
    expect(r.talepli[0].paketNo).toBe('1141437359-2')
    expect(r.talepli[0].kalemler).toEqual([
      { id: '32643bdd', ad: 'Sofram Grand 36x13', miktar: 1, tutar: 2670 },
    ])
  })

  // Asıl koruma bu: personel 7.970 değil 2.670 iade etmeli.
  test('talep toplamı sipariş toplamı DEĞİL, yalnız talepteki kalemlerdir', () => {
    expect(_talepPaketleri(GERCEK_SIPARIS).talepToplami).toBe(2670)
  })

  test('talep dışı kalemler ayrı listelenir (bağlam için)', () => {
    const r = _talepPaketleri(GERCEK_SIPARIS)
    expect(r.talepDisi.map(k => k.id)).toEqual(['1f309ae7', '024d3e62'])
  })

  test('iptal talebi de yakalanır', () => {
    const sip = {
      ...GERCEK_SIPARIS,
      orderPackages: [{ id: 'p1', orderPackageNumber: 'X-1', orderPackageFulfillStatus: 'CANCEL_REQUESTED',
                       refundReasonId: null, returnShippingMethod: null, note: null, orderLineItemIds: ['1f309ae7'] }],
    }
    expect(_talepPaketleri(sip).talepli[0].durum).toBe('CANCEL_REQUESTED')
  })

  // Paket henüz oluşmamışken gelen iptal talebi: sipariş durumu tek kaynaktır.
  // Bu düşerse iptal talepleri hiç görünmez (bkz. src/utils/talep.js aynı kural).
  test('paket yokken sipariş durumundan tüm kalemler talep sayılır', () => {
    const sip = { ...GERCEK_SIPARIS, status: 'CANCEL_REQUESTED', orderPackages: [] }
    const r = _talepPaketleri(sip)
    expect(r.talepli).toHaveLength(1)
    expect(r.talepli[0].kalemler).toHaveLength(3)
    expect(r.talepDisi).toEqual([])
  })

  test('talep yoksa boş döner', () => {
    const sip = { ...GERCEK_SIPARIS, status: 'CREATED',
      orderPackages: [{ id: 'p', orderPackageNumber: 'X-1', orderPackageFulfillStatus: 'DELIVERED',
                        refundReasonId: null, returnShippingMethod: null, note: null, orderLineItemIds: ['1f309ae7'] }] }
    const r = _talepPaketleri(sip)
    expect(r.talepli).toEqual([])
    expect(r.talepToplami).toBe(0)
  })

  test('bozuk/eksik veride patlamaz', () => {
    expect(_talepPaketleri(null).talepli).toEqual([])
    expect(_talepPaketleri({}).talepli).toEqual([])
  })

  // Sebep/not canlı veride null geldi — varlığına GÜVENİLMEZ, ama doluysa taşınmalı.
  test('sebep ve not doluysa taşınır', () => {
    const sip = {
      ...GERCEK_SIPARIS,
      orderPackages: [{ id: 'p', orderPackageNumber: 'X-1', orderPackageFulfillStatus: 'REFUND_REQUESTED',
                        refundReasonId: 'R7', returnShippingMethod: 'CARGO', note: 'kapak kırık',
                        orderLineItemIds: ['32643bdd'] }],
    }
    const p = _talepPaketleri(sip).talepli[0]
    expect(p.sebepId).toBe('R7')
    expect(p.notu).toBe('kapak kırık')
    expect(p.iadeKargo).toBe('CARGO')
  })
})
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npx vitest run electron/ikas/talep-detay.test.js`
Expected: FAIL — "Cannot find module './talep-detay.js'"

- [ ] **Step 3: Modülü yaz**

`electron/ikas/talep-detay.js`:

```js
// Talebin HANGİ kalemleri kapsadığını çıkarır. Talep PAKET bazlıdır: bir sipariş
// birden çok pakete bölünebilir ve talep yalnız bir paketi ilgilendirebilir.
// Canlı örnek (1141437359): 3 ürün / 2 paket, talep yalnız 2.670 TL'lik pakette —
// sipariş bazlı bakan kod 7.970 TL'lik tam iade önerirdi.
//
// _talepPaketleri SAF ve ağsızdır → gerçek API fixture'ıyla mock'suz test edilir
// (emsal: bildirim-uret.js _durumdanBildirim).

const TALEP_DURUMLARI = ['REFUND_REQUESTED', 'CANCEL_REQUESTED']

// İkas'tan çekilecek alanlar. orderLineItemIds paket↔kalem bağını kurar.
const TALEP_SORGUSU = `query($f: StringFilterInput){
  listOrder(id: $f, pagination:{page:1,limit:1}){
    data {
      id orderNumber status orderPackageStatus cancelReason
      orderPackages { id orderPackageNumber orderPackageFulfillStatus
                      refundReasonId returnShippingMethod note orderLineItemIds }
      orderLineItems { id quantity finalPrice variant { name } }
    }
  }
}`

function _kalem(li) {
  return {
    id: li.id,
    ad: li.variant?.name || 'Ürün',
    miktar: Number(li.quantity) || 0,
    tutar: Number(li.finalPrice) || 0,
  }
}

// Döner: { talepli: [...paket], talepDisi: [...kalem], talepToplami }
function _talepPaketleri(order) {
  const bos = { talepli: [], talepDisi: [], talepToplami: 0 }
  if (!order) return bos

  const kalemler = Array.isArray(order.orderLineItems) ? order.orderLineItems : []
  const kalemHarita = new Map(kalemler.map(li => [li.id, li]))
  const paketler = Array.isArray(order.orderPackages) ? order.orderPackages : []

  const talepliPaketler = paketler.filter(p => TALEP_DURUMLARI.includes(p.orderPackageFulfillStatus))

  // Paket YOKSA (henüz oluşmamış) paket durumu bilgi taşımaz → sipariş durumu tek
  // kaynaktır ve talep tüm kalemleri kapsar. İptal talepleri çoğunlukla bu aşamada
  // gelir; bu dal düşerse hiç görünmezler. (Aynı kural: src/utils/talep.js)
  if (!talepliPaketler.length) {
    if (!TALEP_DURUMLARI.includes(order.status)) return bos
    const hepsi = kalemler.map(_kalem)
    return {
      talepli: [{
        paketNo: order.orderNumber || '—', durum: order.status,
        sebepId: null, notu: null, iadeKargo: null, kalemler: hepsi,
      }],
      talepDisi: [],
      talepToplami: hepsi.reduce((s, k) => s + k.tutar * k.miktar, 0),
    }
  }

  const talepliKalemIdleri = new Set()
  const talepli = talepliPaketler.map(p => {
    const ids = Array.isArray(p.orderLineItemIds) ? p.orderLineItemIds : []
    ids.forEach(id => talepliKalemIdleri.add(id))
    return {
      paketNo: p.orderPackageNumber || p.id,
      durum: p.orderPackageFulfillStatus,
      sebepId: p.refundReasonId || null,
      notu: p.note || null,
      iadeKargo: p.returnShippingMethod || null,
      kalemler: ids.map(id => kalemHarita.get(id)).filter(Boolean).map(_kalem),
    }
  })

  const talepDisi = kalemler.filter(li => !talepliKalemIdleri.has(li.id)).map(_kalem)
  const talepToplami = talepli
    .flatMap(p => p.kalemler)
    .reduce((s, k) => s + k.tutar * k.miktar, 0)

  return { talepli, talepDisi, talepToplami }
}

module.exports = { TALEP_DURUMLARI, TALEP_SORGUSU, _talepPaketleri }
```

- [ ] **Step 4: Testlerin geçtiğini gör**

Run: `npx vitest run electron/ikas/talep-detay.test.js`
Expected: PASS, 8 test.

- [ ] **Step 5: Commit**

```bash
git add electron/ikas/talep-detay.js electron/ikas/talep-detay.test.js
git commit -m "feat(talep): paket bazli talep kalem ayiklama + gercek veri testleri"
```

---

### Task 4: IPC uçları

Üç uç: talep detayını çek, onayla, kapat. Ayrıca aşamaları listeye taşıyan bir uç.

**Files:**
- Modify: `electron/ikas/index.js` (`'ikas:siparis-iade'` ucunun hemen ardına, aynı `module.exports` nesnesi içinde)
- Modify: `src/api/ipc.js` (`siparisIade` satırının ardına)

**Interfaces:**
- Consumes: Task 2 `asamalar/asamaYaz`, Task 3 `TALEP_SORGUSU/_talepPaketleri`; mevcut `graphql()` yardımcısı (aynı dosyada tanımlı), mevcut `getDb()`
- Produces (renderer `ikasApi` üzerinden):
  - `talepDetay({ id }) → { talepli, talepDisi, talepToplami, asama }` — `id` yerel `online_siparisler.id`
  - `talepOnayla({ id }) → { ok: true }`
  - `talepKapat({ id, not }) → { ok: true }`
  - `talepAsamalari() → { [ikas_siparis_id]: kayit }`

- [ ] **Step 1: Uçları ekle**

`electron/ikas/index.js` — dosyanın en üstündeki `require` bloğuna ekle:

```js
const { asamalar, asamaYaz } = require('../db/talep-durumlari')
const { TALEP_SORGUSU, _talepPaketleri } = require('./talep-detay')
```

`'ikas:siparis-iade'` ucunun kapanışından sonra, aynı nesne içine:

```js
  // Talebin İÇERİĞİ: müşteri hangi ürünleri talep etti. Paket bazlı — bkz. talep-detay.js.
  'ikas:talep-detay': async ({ id }) => {
    const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
    const db = getDb()
    const sip = db.prepare('SELECT * FROM online_siparisler WHERE id = ?').get(id)
    if (!sip) throw new Error('Sipariş bulunamadı')
    if (!sip.ikas_siparis_id) throw new Error('ikas sipariş kimliği yok')
    const veri = await graphql(TALEP_SORGUSU, { f: { eq: sip.ikas_siparis_id } })
    const o = veri?.listOrder?.data?.[0]
    if (!o) throw new Error('Sipariş ikas\'ta bulunamadı')
    const detay = _talepPaketleri(o)
    return { ...detay, asama: asamalar(db)[sip.ikas_siparis_id] || null }
  },

  // Onay: ikas'a HİÇBİR ŞEY yazılmaz (API'de karşılığı yok), para/stok değişmez.
  // Yalnız "onaylandı, ürün bekleniyor" işareti — çok-PC senkronla paylaşılır.
  'ikas:talep-onayla': async ({ id, kullanici = null }) => {
    const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
    const db = getDb()
    const sip = db.prepare('SELECT ikas_siparis_id FROM online_siparisler WHERE id = ?').get(id)
    if (!sip?.ikas_siparis_id) throw new Error('ikas sipariş kimliği yok')
    return asamaYaz(db, { ikasSiparisId: sip.ikas_siparis_id, asama: 'onaylandi', kullanici })
  },

  // Kapatma: ikas'ta talep REFUND_REQUESTED olarak KALIR (reddetme mutation'ı yok).
  // Bu yüzden eleme yerelden yapılır; aksi halde her senkron talebi geri diriltirdi.
  'ikas:talep-kapat': async ({ id, not, kullanici = null }) => {
    const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
    const db = getDb()
    const sip = db.prepare('SELECT ikas_siparis_id FROM online_siparisler WHERE id = ?').get(id)
    if (!sip?.ikas_siparis_id) throw new Error('ikas sipariş kimliği yok')
    return asamaYaz(db, { ikasSiparisId: sip.ikas_siparis_id, asama: 'kapatildi', notMetni: not, kullanici })
  },

  // Liste ekranı için toplu okuma: sipariş başına sorgu N+1 olurdu.
  'ikas:talep-asamalari': async () => {
    const { _yetkiKontrol } = require('../yetki'); _yetkiKontrol('ikas_yonet')
    return asamalar(getDb())
  },
```

- [ ] **Step 2: Renderer köprüsünü ekle**

`src/api/ipc.js` içinde `siparisIade: (veri) => invoke('ikas:siparis-iade', veri),` satırının ardına:

```js
  talepDetay: (veri) => invoke('ikas:talep-detay', veri),
  talepOnayla: (veri) => invoke('ikas:talep-onayla', veri),
  talepKapat: (veri) => invoke('ikas:talep-kapat', veri),
  talepAsamalari: () => invoke('ikas:talep-asamalari'),
```

- [ ] **Step 3: Uygulamanın açıldığını doğrula**

Run: `npm run dev`
Expected: Uygulama açılır, konsolda hata yok. Online Siparişler sekmesi eskisi gibi çalışır (henüz UI değişmedi).
Açılmazsa: kurulu uygulama tek-örnek kilidini tutuyor olabilir — kapat ve tekrar dene (bilinen tuzak).
Doğruladıktan sonra kapat.

- [ ] **Step 4: Tüm testleri çalıştır**

Run: `npx vitest run`
Expected: PASS, 186 test (171 + Task 2'den 7 + Task 3'ten 8).

- [ ] **Step 5: Commit**

```bash
git add electron/ikas/index.js src/api/ipc.js
git commit -m "feat(talep): talep detay/onayla/kapat IPC uclari"
```

---

### Task 5: `bekleyenTalepMi` yerel aşamayı hesaba katsın

Kapatılan talep listeden düşer, onaylanan kalır.

**Files:**
- Modify: `src/utils/talep.js`
- Modify: `src/utils/talep.test.js`
- Modify: `electron/db/panel.js` (KPI sorgusu)

**Interfaces:**
- Consumes: Task 4 `talepAsamalari()` çıktısı
- Produces: `bekleyenTalepMi(siparis, asama)` — ikinci parametre opsiyonel `{ asama: 'onaylandi'|'kapatildi' }`; verilmezse eski davranış. `urunBekleniyorMu(asama) → boolean`.

- [ ] **Step 1: Failing test yaz**

`src/utils/talep.test.js` — import satırını güncelle:

```js
import { bekleyenTalepMi, urunBekleniyorMu, BEKLEYEN_TALEP_DURUMLARI } from './talep.js'
```

Dosyanın sonundaki son `test(...)` bloğunun ardına, `describe` kapanışından ÖNCE ekle:

```js
  // Kapatılan talep ikas'ta REFUND_REQUESTED olarak KALIR (reddetme mutation'ı yok) —
  // eleme yerel aşamadan yapılmazsa her senkron talebi geri diriltir.
  test('kapatılmış talep listeden düşer', () => {
    const s = { durum: 'REFUND_REQUESTED', kargo_durumu: 'REFUND_REQUESTED' }
    expect(bekleyenTalepMi(s)).toBe(true)
    expect(bekleyenTalepMi(s, { asama: 'kapatildi' })).toBe(false)
  })

  test('onaylanmış talep listede KALIR (ürün bekleniyor)', () => {
    const s = { durum: 'REFUND_REQUESTED', kargo_durumu: 'REFUND_REQUESTED' }
    expect(bekleyenTalepMi(s, { asama: 'onaylandi' })).toBe(true)
  })

  test('aşama verilmezse eski davranış korunur', () => {
    expect(bekleyenTalepMi({ durum: 'REFUND_REQUESTED', kargo_durumu: null })).toBe(true)
  })
})

describe('urunBekleniyorMu', () => {
  test('yalnız onaylandı aşamasında true', () => {
    expect(urunBekleniyorMu({ asama: 'onaylandi' })).toBe(true)
    expect(urunBekleniyorMu({ asama: 'kapatildi' })).toBe(false)
    expect(urunBekleniyorMu(null)).toBe(false)
    expect(urunBekleniyorMu(undefined)).toBe(false)
  })
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npx vitest run src/utils/talep.test.js`
Expected: FAIL — `urunBekleniyorMu is not a function`

- [ ] **Step 3: `talep.js`'i güncelle**

`src/utils/talep.js` — `bekleyenTalepMi` fonksiyonunu değiştir ve altına yeni fonksiyonu ekle:

```js
// Sipariş FİİLEN iptal/iade talebinde mi?
// Kural: paket durumu (orderPackageStatus) daha güncel gerçeği yansıtır, o kazanır.
// Talep sonuçlanınca ya da sipariş akışta ilerleyince ikas paket durumunu günceller;
// sipariş `status` alanı ise eski değerde takılı kalabilir (canlı örnek: 8971042426
// durum=REFUND_REQUESTED / kargo_durumu=REFUND_REQUEST_ACCEPTED).
// İstisna: paket henüz oluşmamışsa paket durumu bilgi taşımaz → sipariş durumuna
// bakılır. İptal talepleri çoğunlukla bu aşamada gelir.
//
// asama: yerel talep aşaması ({ asama: 'onaylandi'|'kapatildi' }) — ikas'a yazılamayan
// bilgi. 'kapatildi' eler: ikas'ta talep REFUND_REQUESTED olarak kalacağı için eleme
// buradan yapılmazsa her senkron talebi geri diriltir. 'onaylandi' ELEMEZ — ürün
// beklendiği sürece görünür kalmalı.
export function bekleyenTalepMi(siparis, asama = null) {
  if (!siparis) return false
  if (asama?.asama === 'kapatildi') return false
  const paket = siparis.kargo_durumu || ''
  const belirleyici = PAKET_YOK.includes(paket) ? siparis.durum : paket
  return !!belirleyici && BEKLEYEN_TALEP_DURUMLARI.includes(belirleyici)
}

// Onaylanmış ama ürünü henüz gelmemiş talep → listede sarı etiketle ayrılır.
export function urunBekleniyorMu(asama) {
  return asama?.asama === 'onaylandi'
}
```

- [ ] **Step 4: KPI sorgusunu güncelle**

`electron/db/panel.js` — `bekleyenTalepSayisi` sorgusunu değiştir:

```js
    // Fiilen iptal/iade talebinde olan siparişler. Paket durumu daha güncel gerçeği
    // yansıtır → o kazanır; paket henüz oluşmamışsa (''/UNFULFILLED) sipariş durumuna
    // bakılır. Yerelde KAPATILAN talepler sayılmaz (ikas'ta REFUND_REQUESTED kalırlar).
    // Karşılığı: src/utils/talep.js bekleyenTalepMi (ESM↔CJS köprüsü yok).
    const bekleyenTalepSayisi = db.prepare(`
      SELECT COUNT(*) n FROM online_siparisler o
      WHERE (CASE WHEN COALESCE(o.kargo_durumu,'') IN ('','UNFULFILLED')
                  THEN COALESCE(o.durum,'') ELSE o.kargo_durumu END)
            IN ('REFUND_REQUESTED','CANCEL_REQUESTED')
        AND NOT EXISTS (SELECT 1 FROM talep_durumlari t
                        WHERE t.ikas_siparis_id = o.ikas_siparis_id AND t.asama = 'kapatildi')
    `).get().n
```

- [ ] **Step 5: Testlerin geçtiğini gör**

Run: `npx vitest run`
Expected: PASS, 190 test (171 mevcut + 7 Task 2 + 8 Task 3 + 4 Task 5).

- [ ] **Step 6: Commit**

```bash
git add src/utils/talep.js src/utils/talep.test.js electron/db/panel.js
git commit -m "feat(talep): kapatilan talep listeden duser, onaylanan kalir"
```

---

### Task 6: Talep modalı — UI

**Files:**
- Create: `src/components/TalepModal.jsx`
- Modify: `src/pages/OnlineSiparisler.jsx`

**Interfaces:**
- Consumes: Task 4 `ikasApi.talepDetay/talepOnayla/talepKapat/talepAsamalari`, Task 5 `urunBekleniyorMu`
- Produces: `<TalepModal siparis detay yukleniyor hata onKapat onOnayla onIadeTamamla onTalepKapat />`

- [ ] **Step 1: Modal bileşenini yaz**

`src/components/TalepModal.jsx`:

```jsx
// İptal/iade talebi inceleme ve onay modalı.
// Asıl işi: müşterinin TAM OLARAK ne talep ettiğini göstermek. Talep paket bazlıdır;
// çok kalemli bir siparişte yalnız bir paket talepte olabilir. Bu bilgi olmadan
// personel tüm siparişi iade edebilir (canlı örnek: 2.670 yerine 7.970 TL).
import { useState } from 'react'

const para = n => (Number(n) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺'

const IADE_KARGO = { CARGO: 'Kargo ile', CUSTOMER: 'Müşteri getirecek', STORE: 'Mağazadan' }

export default function TalepModal({
  siparis, detay, yukleniyor, hata, mesgul,
  onKapat, onOnayla, onIadeTamamla, onTalepKapat,
}) {
  const [kapatmaAcik, setKapatmaAcik] = useState(false)
  const [not, setNot] = useState('')

  const iptalTalebi = detay?.talepli?.some(p => p.durum === 'CANCEL_REQUESTED')
  const onaylanmis = detay?.asama?.asama === 'onaylandi'
  // Detay gelmediyse KÖR ONAY yaptırma: neyin iade edileceği bilinmiyor.
  const aksiyonAcik = !yukleniyor && !hata && detay?.talepli?.length > 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4" onClick={onKapat}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b">
          <h3 className="text-lg font-bold text-gray-800">
            {iptalTalebi ? 'İptal' : 'İade'} Talebi — Sipariş #{siparis.siparis_no}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">{siparis.musteri_ad}</p>
        </div>

        <div className="p-5 space-y-4">
          {yukleniyor && <p className="text-sm text-gray-500">Talep detayı ikas'tan alınıyor…</p>}

          {hata && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              <p className="font-semibold">Talep detayı alınamadı</p>
              <p className="text-xs mt-1">{hata}</p>
              <p className="text-xs mt-2">
                Hangi ürünlerin talep edildiği bilinmediği için onay işlemleri kapalı.
                İkas panelinden kontrol edin.
              </p>
            </div>
          )}

          {detay?.talepli?.map(p => (
            <div key={p.paketNo} className="rounded-lg border-2 border-red-200 bg-red-50 p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-red-800">Paket {p.paketNo}</span>
                <span className="text-xs text-red-600">
                  {p.durum === 'CANCEL_REQUESTED' ? 'İptal Talebi' : 'İade Talebi'}
                </span>
              </div>
              {p.kalemler.map(k => (
                <div key={k.id} className="flex justify-between text-sm py-0.5">
                  <span className="text-gray-800">{k.ad}</span>
                  <span className="text-gray-600 whitespace-nowrap ml-3">{k.miktar} ad · {para(k.tutar)}</span>
                </div>
              ))}
              {(p.notu || p.iadeKargo) && (
                <div className="mt-2 pt-2 border-t border-red-200 text-xs text-red-700 space-y-0.5">
                  {p.notu && <p>Müşteri notu: {p.notu}</p>}
                  {p.iadeKargo && <p>İade yöntemi: {IADE_KARGO[p.iadeKargo] || p.iadeKargo}</p>}
                </div>
              )}
            </div>
          ))}

          {detay?.talepli?.length > 0 && (
            <p className="text-right font-bold text-gray-800">
              Talep toplamı: {para(detay.talepToplami)}
            </p>
          )}

          {/* Talep dışı kalemler: yanlış ürünü iade etmeyi önleyen bağlam. */}
          {detay?.talepDisi?.length > 0 && (
            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-400 mb-1">Bu siparişte talep dışı:</p>
              {detay.talepDisi.map(k => (
                <div key={k.id} className="flex justify-between text-xs text-gray-400 py-0.5">
                  <span>{k.ad}</span>
                  <span className="whitespace-nowrap ml-3">{k.miktar} ad · {para(k.tutar)}</span>
                </div>
              ))}
            </div>
          )}

          {onaylanmis && (
            <div className="rounded-lg bg-yellow-50 border border-yellow-300 p-3 text-sm text-yellow-800">
              Bu talep onaylandı, ürünün gelmesi bekleniyor.
              {detay.asama.kullanici && <span className="text-xs"> ({detay.asama.kullanici} · {detay.asama.tarih})</span>}
            </div>
          )}
        </div>

        <div className="p-5 border-t space-y-2">
          {!kapatmaAcik && (
            <>
              {iptalTalebi ? (
                <button onClick={onIadeTamamla} disabled={!aksiyonAcik || !!mesgul}
                  className="w-full bg-orange-600 text-white px-4 py-2.5 rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50">
                  ✅ İptali Onayla — siparişi ikas'ta iptal et
                </button>
              ) : (
                <>
                  {!onaylanmis && (
                    <button onClick={onOnayla} disabled={!aksiyonAcik || !!mesgul}
                      className="w-full bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm hover:bg-green-800 disabled:opacity-50">
                      ✅ Onayla — ürün bekleniyor
                      <span className="block text-[11px] font-normal opacity-80">Para iadesi yapılmaz, stok değişmez</span>
                    </button>
                  )}
                  <button onClick={onIadeTamamla} disabled={!aksiyonAcik || !!mesgul}
                    className="w-full bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                    💰 Ürün geldi — iadeyi tamamla
                    <span className="block text-[11px] font-normal opacity-80">Para iadesi + stok geri ekleme</span>
                  </button>
                </>
              )}
              <button onClick={() => setKapatmaAcik(true)} disabled={!!mesgul}
                className="w-full border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
                🚫 Talebi Kapat
              </button>
            </>
          )}

          {kapatmaAcik && (
            <div className="space-y-2">
              <label className="block text-sm text-gray-700">
                Kapatma sebebi <span className="text-red-600">*</span>
                <textarea value={not} onChange={e => setNot(e.target.value)} rows={2}
                  placeholder="Örn: müşteri telefonla vazgeçti"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
              </label>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                İkas API'si talep reddetmeyi desteklemiyor. Bu işlem talebi yalnız
                uygulamada kapatır — ikas panelinden de reddetmeniz gerekir.
              </p>
              <div className="flex gap-2">
                <button onClick={() => { setKapatmaAcik(false); setNot('') }}
                  className="flex-1 border px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Vazgeç</button>
                <button onClick={() => onTalepKapat(not)} disabled={!not.trim() || !!mesgul}
                  className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50">
                  {mesgul === 'talep-kapat' ? '…' : 'Talebi Kapat'}
                </button>
              </div>
            </div>
          )}

          <button onClick={onKapat} className="w-full text-gray-500 text-sm py-1 hover:text-gray-700">Vazgeç</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Sayfaya bağla — import ve durum**

`src/pages/OnlineSiparisler.jsx` — import bloğuna ekle:

```jsx
import TalepModal from '../components/TalepModal'
import { bekleyenTalepMi, urunBekleniyorMu } from '../utils/talep'
```

(mevcut `import { bekleyenTalepMi } from '../utils/talep'` satırını yukarıdakiyle değiştir)

`talepFiltre` durumunun ardına ekle:

```jsx
  // Yerel talep aşamaları (ikas'a yazılamayan onay/kapatma bilgisi). Sipariş başına
  // sorgu N+1 olurdu → tek seferde alınır.
  const [asamalar, setAsamalar] = useState({})
  const [talepModal, setTalepModal] = useState(null)   // { siparis, detay, yukleniyor, hata }

  const asamalariYukle = useCallback(() => {
    ikasApi.talepAsamalari().then(setAsamalar).catch(() => {})
  }, [])
  useEffect(() => { asamalariYukle() }, [asamalariYukle])
```

- [ ] **Step 3: Filtre ve sayımı aşamaya duyarlı yap**

Aynı dosyada `filtreli` useMemo içindeki talep satırını ve `talepSayisi`'nı değiştir:

```jsx
    if (talepFiltre && !bekleyenTalepMi(s, asamalar[s.ikas_siparis_id])) return false
```

useMemo bağımlılık dizisine `asamalar` ekle. Ardından:

```jsx
  // Bildirim butonu sayısı: TÜM yüklü siparişlerden (filtreden bağımsız) — ek sorgu yok.
  const talepSayisi = useMemo(
    () => siparisler.filter(s => bekleyenTalepMi(s, asamalar[s.ikas_siparis_id])).length,
    [siparisler, asamalar])
  // Onaylanmış, ürünü beklenen talepler — bildirim butonunda ayrıca gösterilir.
  const bekleyenUrunSayisi = useMemo(
    () => siparisler.filter(s => bekleyenTalepMi(s, asamalar[s.ikas_siparis_id])
                              && urunBekleniyorMu(asamalar[s.ikas_siparis_id])).length,
    [siparisler, asamalar])
```

- [ ] **Step 4: Bildirim butonu metnini güncelle**

Bildirim butonundaki `<span className="font-bold">{talepSayisi} İptal/İade Talebi</span>` satırını değiştir:

```jsx
            <span className="font-bold">
              {talepSayisi} İptal/İade Talebi
              {bekleyenUrunSayisi > 0 && ` · ${bekleyenUrunSayisi} ürün bekleniyor`}
            </span>
```

- [ ] **Step 5: "Talebi İncele" butonu + modal**

Sipariş detay panelinde, `{/* Alt satır: geri alınamaz işlemler */}` yorumundan ÖNCE ekle:

```jsx
                {bekleyenTalepMi(secili, asamalar[secili.ikas_siparis_id]) && (
                  <div className="pt-2">
                    <button onClick={() => talepAc(secili)} disabled={!!islemMesgul}
                      className="w-full bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                      {urunBekleniyorMu(asamalar[secili.ikas_siparis_id])
                        ? '📦 Talep — ürün bekleniyor, incele'
                        : '🔎 Talebi İncele'}
                    </button>
                  </div>
                )}
```

`iadeAc` fonksiyonunun ardına işleyicileri ekle:

```jsx
  // Talep modalını aç: detay ikas'tan gelir. Gelmezse modal AÇILIR ama onay
  // butonları kapalı kalır — neyin iade edileceğini bilmeden onay verilmemeli.
  const talepAc = async (s) => {
    setTalepModal({ siparis: s, detay: null, yukleniyor: true, hata: null })
    try {
      const detay = await ikasApi.talepDetay({ id: s.id })
      setTalepModal({ siparis: s, detay, yukleniyor: false, hata: null })
    } catch (e) {
      setTalepModal({ siparis: s, detay: null, yukleniyor: false, hata: e.message })
    }
  }

  const talepOnayla = async () => {
    setIslemMesgul('talep-onay')
    try {
      await ikasApi.talepOnayla({ id: talepModal.siparis.id })
      toast.success('Talep onaylandı — ürün bekleniyor')
      asamalariYukle(); setTalepModal(null)
    } catch (e) { toast.error('Onay başarısız: ' + e.message) }
    finally { setIslemMesgul(null) }
  }

  const talepKapatIslemi = async (not) => {
    setIslemMesgul('talep-kapat')
    try {
      await ikasApi.talepKapat({ id: talepModal.siparis.id, not })
      toast.success('Talep kapatıldı — ikas panelinden de reddetmeyi unutmayın')
      asamalariYukle(); setTalepModal(null)
    } catch (e) { toast.error('Kapatma başarısız: ' + e.message) }
    finally { setIslemMesgul(null) }
  }

  // Talepten iade/iptale geçiş: talep edilen kalemler SEÇİLİ gelir — asıl koruma bu.
  const talepIadeTamamla = async () => {
    const s = talepModal.siparis
    const iptalTalebi = talepModal.detay?.talepli?.some(p => p.durum === 'CANCEL_REQUESTED')
    setTalepModal(null)
    if (iptalTalebi) { ikasIptal(s); return }
    const talepKalemIdleri = new Set((talepModal.detay?.talepli || []).flatMap(p => p.kalemler.map(k => k.id)))
    await iadeAc(s, talepKalemIdleri)
  }
```

Sayfanın modal bölümüne (mevcut `{iadeModal && (` bloğunun yanına) ekle:

```jsx
      {talepModal && (
        <TalepModal
          siparis={talepModal.siparis} detay={talepModal.detay}
          yukleniyor={talepModal.yukleniyor} hata={talepModal.hata} mesgul={islemMesgul}
          onKapat={() => setTalepModal(null)}
          onOnayla={talepOnayla}
          onIadeTamamla={talepIadeTamamla}
          onTalepKapat={talepKapatIslemi}
        />
      )}
```

- [ ] **Step 6: `iadeAc` önceden seçili kalemleri kabul etsin**

Mevcut `iadeAc` (yaklaşık satır 284) tüm kalemleri tam adet seçili başlatıyor. Talepten gelindiğinde YALNIZ talep edilen kalemler seçili olmalı. Fonksiyonun tamamını şununla değiştir:

```jsx
  // İade ekranını açar: ikas_kalem_id + güncel fiyatlar için tazele, taze kalemleri yükle.
  // talepKalemleri: talepten gelindiğinde yalnız talep edilen ikas kalem id'leri (Set).
  // ASIL KORUMA BURASI — personel müşterinin istemediği ürünü iade etmesin diye
  // varsayılan seçim talebe daraltılır (canlı örnek: 2.670 yerine 7.970 TL riski).
  // Verilmezse eski davranış: hepsi tam adet seçili.
  async function iadeAc(s, talepKalemleri = null) {
    setIslemMesgul('iade-hazirla')
    try {
      await ikasApi.siparisTazele(s.id)
      const taze = await onlineSiparisApi.getir(s.id)
      const kalemler = (taze.kalemler || []).filter(k => k.ikas_kalem_id)
      if (!kalemler.length) { toast.error('İade edilebilir kalem bulunamadı (ikas kalem ID yok).'); return }
      const secimler = {}
      kalemler.forEach(k => {
        const talepte = !talepKalemleri || talepKalemleri.has(k.ikas_kalem_id)
        secimler[k.ikas_kalem_id] = talepte ? (Number(k.miktar) || 0) : 0
      })
      setIadeModal({ siparis: taze, kalemler, secimler, refundShipping: false, bildir: true })
    } catch (e) { toast.error('İade ekranı açılamadı: ' + e.message) }
    finally { setIslemMesgul('') }
  }
```

> Not: `iadeAc` bir `function` bildirimidir (arrow değil) — Step 5'teki `talepIadeTamamla` içinde `await iadeAc(s, talepKalemIdleri)` çağrısı hoisting sayesinde sıralamadan bağımsız çalışır.

- [ ] **Step 7: Uygulamayı çalıştır ve gerçek talebi doğrula**

Run: `npm run dev`

Doğrula:
1. Online Siparişler'de 🔔 butonu **1 talep** gösteriyor.
2. Butona tıkla → yalnız sipariş **1141437359** (Sebiha Yıldız) listeleniyor.
3. Siparişi seç → "🔎 Talebi İncele" görünüyor, tıkla.
4. Modalda **yalnız 36x13 Basık Tencere** talep edilen olarak, **2.670,00 ₺** talep toplamı; diğer iki ürün soluk "talep dışı" bölümünde.
5. "✅ Onayla — ürün bekleniyor" → toast, buton "📦 Talep — ürün bekleniyor" oluyor, bildirim butonu "1 İptal/İade Talebi · 1 ürün bekleniyor" diyor.
6. Tekrar aç → "💰 Ürün geldi — iadeyi tamamla" → iade modalı açılıyor ve **yalnız 36x13 seçili** geliyor. **İade ETME**, vazgeç.
7. "🚫 Talebi Kapat" → not boşken buton kapalı; not yazınca aktif. **Kapatma** (gerçek talep), vazgeç.

- [ ] **Step 8: Tüm testleri çalıştır**

Run: `npx vitest run`
Expected: PASS, 190 test (171 mevcut + 7 Task 2 + 8 Task 3 + 4 Task 5).

- [ ] **Step 9: Commit**

```bash
git add src/components/TalepModal.jsx src/pages/OnlineSiparisler.jsx
git commit -m "feat(talep): talep inceleme modali + onay/kapatma akisi"
```

---

### Task 7: Onaylanmış talep listede sarı etiketle görünsün

**Files:**
- Modify: `src/pages/OnlineSiparisler.jsx` (liste satırı — mevcut "İptal" rozetinin olduğu hücre, ~satır 509)

**Interfaces:**
- Consumes: Task 5 `urunBekleniyorMu`, Task 6 `asamalar` durumu

- [ ] **Step 1: Rozeti ekle**

Liste satırında durum rozetlerinin bulunduğu hücrede, mevcut rozetlerin yanına:

```jsx
                    {urunBekleniyorMu(asamalar[s.ikas_siparis_id]) && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
                        Ürün Bekleniyor
                      </span>
                    )}
```

- [ ] **Step 2: Görsel doğrulama**

Run: `npm run dev`
Doğrula: Task 6'da onayladığın sipariş listede sarı "Ürün Bekleniyor" etiketiyle görünüyor.
Sonra o siparişin onayını geri almak için: uygulamayı kapat, aşağıdaki komutla kaydı sil (test kaydıydı):

```bash
node -e "const D=require('better-sqlite3');const db=new D(process.env.APPDATA+'/tencerecim/tencerecim.db');console.log(db.prepare('DELETE FROM talep_durumlari').run())"
```

(Bu komut `electron` ile çalıştırılmalı: `ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron -e "..."` — better-sqlite3 Electron için derlenmiştir.)

- [ ] **Step 3: Tüm testleri çalıştır**

Run: `npx vitest run`
Expected: PASS, 190 test (171 mevcut + 7 Task 2 + 8 Task 3 + 4 Task 5).

- [ ] **Step 4: Commit**

```bash
git add src/pages/OnlineSiparisler.jsx
git commit -m "feat(talep): onaylanmis talep icin 'Urun Bekleniyor' rozeti"
```

---

### Task 8: Bildirim geri-taraması kapatılan talepleri atlasın

Kapatılan bir talep için bildirim üretilmemeli — aksi halde kapatma anlamsızlaşır.

**Files:**
- Modify: `electron/ikas/bildirim-uret.js` (`mevcutTalepleriBildir` sorgusu)

**Interfaces:**
- Consumes: Task 1 `talep_durumlari` tablosu

- [ ] **Step 1: Sorguyu güncelle**

`mevcutTalepleriBildir` içindeki sorguyu değiştir:

```js
    // Yalnız FİİLEN talepte olanlar. Paket durumu kazanır; paket yoksa sipariş
    // durumuna bakılır (karşılığı: src/utils/talep.js bekleyenTalepMi).
    // Yerelde KAPATILAN talepler atlanır: ikas'ta REFUND_REQUESTED kalacakları için
    // atlanmazsa kapatma anlamsızlaşır, her taramada bildirim doğar.
    const satirlar = db.prepare(`
      SELECT o.ikas_siparis_id, o.siparis_no, o.durum, o.kargo_durumu, o.toplam,
             o.para_birimi, o.musteri_ad
      FROM online_siparisler o
      WHERE (CASE WHEN COALESCE(o.kargo_durumu,'') IN ('','UNFULFILLED')
                  THEN COALESCE(o.durum,'') ELSE o.kargo_durumu END) IN (${yer})
        AND NOT EXISTS (SELECT 1 FROM talep_durumlari t
                        WHERE t.ikas_siparis_id = o.ikas_siparis_id AND t.asama = 'kapatildi')
    `).all(...BEKLEYEN_TALEP)
```

- [ ] **Step 2: Testleri çalıştır**

Run: `npx vitest run`
Expected: PASS, 190 test (171 mevcut + 7 Task 2 + 8 Task 3 + 4 Task 5).

- [ ] **Step 3: Commit**

```bash
git add electron/ikas/bildirim-uret.js
git commit -m "feat(talep): geri-tarama kapatilan talepleri atlar"
```

---

### Task 9: Belgeleme ve kapanış

**Files:**
- Modify: `docs/ikas-api-reference.md`

- [ ] **Step 1: API kısıtlarını referansa işle**

`docs/ikas-api-reference.md` içinde sipariş mutation'ları bölümünün sonuna (`Other order mutations available` listesinin ardına) ekle:

```markdown
**⚠️ TALEP AKIŞI SINIRLARI (canlı introspection, 2026-07-24):**
- **Talebi reddetme mutation'ı YOKTUR.** 69 mutation tarandı; `reject` içeren tek bir
  uç yok. `REFUND_REJECTED` / `CANCEL_REJECTED` durumları OKUNUR ama API'den SET EDİLEMEZ.
  Red yalnız ikas panelinden yapılabilir.
- **`REFUND_REQUEST_ACCEPTED` de set edilemez** — "onayladım, ürün bekliyorum" ara durumu
  API'ye yazılamaz, yerelde tutulmalıdır (uygulamada `talep_durumlari` tablosu).
- **Talep PAKET bazlıdır.** Hangi kalemlerin talep edildiği
  `Order.orderPackages[].orderLineItemIds` ile okunur; `orderPackageFulfillStatus`
  `REFUND_REQUESTED`/`CANCEL_REQUESTED` olan paket(ler) taleplidir. Sipariş bazlı bakmak
  yanlış tutarda iade yapılmasına yol açar.
- `OrderPackage.refundReasonId` bir ID'dir ve **metne çeviren sorgu yoktur** (63 query
  tarandı). `note` ve `returnShippingMethod` çoğu talepte `null` gelir — varlıklarına
  güvenen UI yazma.
```

- [ ] **Step 2: Commit**

```bash
git add docs/ikas-api-reference.md
git commit -m "docs: ikas talep akisi API sinirlarini referansa isle"
```

- [ ] **Step 3: Son kontrol**

Run: `npx vitest run`
Expected: PASS, 190 test (171 mevcut + 7 Task 2 + 8 Task 3 + 4 Task 5).

Run: `npm run build`
Expected: Vite derlemesi hatasız tamamlanır.

---

## Kapsam dışı (bu planda YOK)

- Müşteriye otomatik bildirim (WhatsApp altyapısı var; ayrı iş).
- İade sebebi metni (ikas API'sinde karşılığı yok).
- Ayrı "Talepler" sayfası (bildirim butonu + KPI kartı giriş noktası olarak yeterli).
- Yayın (sürüm artırma, build, release) — kullanıcı "yayınla" dediğinde ayrıca yapılır.
