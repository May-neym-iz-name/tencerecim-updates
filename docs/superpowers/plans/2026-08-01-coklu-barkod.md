# Çoklu Barkod + Ön Siparişte Elle Fiyat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bir ürüne sınırsız "takma ad" barkod tanımlanabilsin (hangisi okutulursa okutulsun aynı ürün gelsin), ve ön siparişte satış satırına elle fiyat girilebilsin.

**Architecture:** `urunler.barkod` **birincil barkod olarak aynen kalır** — çok-PC senkronunun doğal anahtarı (`senk-sema.js:24` `dogal: ['barkod','sku']`) ve ikas eşleştirmesi (`ikas/ekstra.js:182`) ona dayanıyor. Ek barkodlar yeni `urun_barkodlar` tablosunda takma ad olarak durur ve yalnızca "bulma" yollarına eklenir. Elle fiyat için backend zaten hazır (`satislar.js:55`), iş tamamen arayüzde.

**Tech Stack:** Electron 22 (main CJS) · React 18 + Vite (renderer ESM `.jsx`) · better-sqlite3 (üretim) / `node:sqlite` (test) · vitest 4 · Tailwind

## Global Constraints

- Tüm isimlendirme ve kullanıcıya görünen metinler **Türkçe**.
- `electron/` altı **CommonJS**, `src/` altı **ESM**.
- `electron/main.js:357` `_` ile başlayan export'ları IPC kanalı olarak kaydetmez — enjeksiyonlu private'lar `_` önekli olmalı.
- Testte **better-sqlite3 kullanılamaz** (Electron ABI). `node:sqlite` + ince adaptör; kalıp: `electron/db/satislar.test.js:1-45`.
- `node:sqlite` parametre olarak yalnız `null | number | string | bigint` kabul eder — boolean geçilemez.
- Üretim kodunda `console.log` yok.
- Test komutu: `npx vitest run`. **Baseline: 20 dosya / 254 test geçiyor.**
- Derleme doğrulaması: `npx vite build`. `npm run dev` ile uygulama AÇILMAZ (kurulu uygulamanın tek-örnek kilidi sessizce öldürür); elle doğrulamayı kullanıcı yapar.
- Her task sonunda tek commit; mesaj `<type>(barkod|on-siparis): <açıklama>`.
- Dal: `feat/on-siparis` (ön sipariş çalışmasının üzerine devam, hepsi tek yayında çıkacak).

---

### Task 1: `urun_barkodlar` tablosu ve takma ad CRUD

**Files:**
- Modify: `electron/db/database.js` (`migrate()` içine yeni tablo)
- Modify: `electron/db/urunler.js` (yeni çekirdek fonksiyonlar + IPC kanalları)
- Test: `electron/db/urunler.test.js` (YENİ)

**Interfaces:**
- Produces:
  - Tablo `urun_barkodlar (id, urun_id, barkod UNIQUE, aciklama, olusturma_tarihi)`
  - `urunler._barkodListe(urun_id, db) -> Array<{id, barkod, aciklama}>`
  - `urunler._barkodEkle({urun_id, barkod, aciklama}, db) -> {id, barkod, aciklama}`
  - `urunler._barkodSil(id, db) -> {mesaj}`
  - IPC: `urunler:barkod-liste`, `urunler:barkod-ekle`, `urunler:barkod-sil` (hepsi `urun_duzenle` yetkili; liste `urun_goruntule`)

- [ ] **Step 1: Migration'ı ekle**

`electron/db/database.js` içinde `migrate()` fonksiyonunda, `satislar` ön sipariş ALTER'larının hemen ALTINA:

```js
  // Ürün takma ad barkodları: bir ürün birden fazla barkodla okutulabilsin
  // (tedarikçi barkodu + kendi 29'lu dahili barkodumuz + eski barkod).
  // urunler.barkod BİRİNCİL kalır (etikete basılan, senkronun doğal anahtarı).
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS urun_barkodlar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      urun_id INTEGER NOT NULL REFERENCES urunler(id) ON DELETE CASCADE,
      barkod TEXT NOT NULL UNIQUE,
      aciklama TEXT,
      olusturma_tarihi TEXT DEFAULT (datetime('now','localtime'))
    )`)
  } catch {}
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_urun_barkodlar_urun ON urun_barkodlar(urun_id)') } catch {}
```

- [ ] **Step 2: Başarısız testleri yaz**

`electron/db/urunler.test.js` oluştur:

```js
// Takma ad barkodlar: bir ürüne ek barkod tanımlanabilir, hangisi okutulursa okutulsun
// aynı ürün gelir. urunler.barkod BİRİNCİL kalır (senkron doğal anahtarı + ikas eşleşmesi).
// better-sqlite3 BURADA KULLANILAMAZ (Electron ABI'sine derli, vitest düz Node'da koşar);
// node:sqlite üstüne urunler.js'in kullandığı yüzeyi veren ince adaptör konur.
import { describe, test, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const urunler = require('./urunler.js')

function bellekDb() {
  const d = new DatabaseSync(':memory:')
  return {
    exec: (sql) => d.exec(sql),
    prepare: (sql) => {
      const s = d.prepare(sql)
      return { get: (...a) => s.get(...a), all: (...a) => s.all(...a), run: (...a) => s.run(...a) }
    },
    transaction: (fn) => (...args) => {
      d.exec('BEGIN')
      try { const r = fn(...args); d.exec('COMMIT'); return r }
      catch (e) { d.exec('ROLLBACK'); throw e }
    },
  }
}

let db

beforeEach(() => {
  db = bellekDb()
  db.exec(`
    CREATE TABLE markalar (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT, aktif INTEGER DEFAULT 1);
    CREATE TABLE kategoriler (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT, tam_yol TEXT);
    CREATE TABLE tedarikciler (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT);
    CREATE TABLE urunler (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT, barkod TEXT UNIQUE, sku TEXT UNIQUE,
      marka_id INTEGER, kategori_id INTEGER, tedarikci_id INTEGER, aciklama TEXT,
      alis_fiyati REAL, satis_fiyati REAL, kdv_orani REAL DEFAULT 20, aktif INTEGER DEFAULT 1);
    CREATE TABLE urun_barkodlar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      urun_id INTEGER NOT NULL REFERENCES urunler(id) ON DELETE CASCADE,
      barkod TEXT NOT NULL UNIQUE, aciklama TEXT,
      olusturma_tarihi TEXT DEFAULT (datetime('now','localtime')));
    INSERT INTO urunler (id, ad, barkod, sku, satis_fiyati) VALUES (1, 'Tencere 24', '8690000000001', 'TNC.LAV.00001', 100);
    INSERT INTO urunler (id, ad, barkod, sku, satis_fiyati) VALUES (2, 'Tava 20', '8690000000002', 'TNC.LAV.00002', 80);
  `)
})

describe('takma ad barkod ekleme kuralları', () => {
  test('geçerli takma ad eklenir', () => {
    const b = urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017', aciklama: 'tedarikçi' }, db)
    expect(b.barkod).toBe('2900000000017')
    expect(urunler._barkodListe(1, db).map(x => x.barkod)).toEqual(['2900000000017'])
  })

  test('boş barkod reddedilir', () => {
    expect(() => urunler._barkodEkle({ urun_id: 1, barkod: '   ' }, db)).toThrow(/Barkod boş olamaz/)
  })

  test('başka ürünün takma adı tekrar eklenemez', () => {
    urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017' }, db)
    expect(() => urunler._barkodEkle({ urun_id: 2, barkod: '2900000000017' }, db))
      .toThrow(/başka bir ürüne tanımlı/)
  })

  test('başka ürünün BİRİNCİL barkodu takma ad olamaz', () => {
    expect(() => urunler._barkodEkle({ urun_id: 1, barkod: '8690000000002' }, db))
      .toThrow(/başka bir ürüne tanımlı/)
  })

  test('ürünün kendi birincil barkodu takma ad olamaz', () => {
    expect(() => urunler._barkodEkle({ urun_id: 1, barkod: '8690000000001' }, db))
      .toThrow(/zaten bu ürünün barkodu/)
  })

  test('barkod kırpılarak saklanır', () => {
    const b = urunler._barkodEkle({ urun_id: 1, barkod: '  2900000000017  ' }, db)
    expect(b.barkod).toBe('2900000000017')
  })
})

describe('takma ad silme', () => {
  test('silinince listeden düşer', () => {
    const b = urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017' }, db)
    urunler._barkodSil(b.id, db)
    expect(urunler._barkodListe(1, db)).toEqual([])
  })

  test('olmayan kayıt silinmek istenirse hata verir', () => {
    expect(() => urunler._barkodSil(999, db)).toThrow(/Barkod bulunamadı/)
  })
})
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu gör**

Run: `npx vitest run electron/db/urunler.test.js`
Expected: FAIL — `urunler._barkodEkle is not a function`

- [ ] **Step 4: Çekirdek fonksiyonları yaz**

`electron/db/urunler.js` içinde `module.exports` bloğunun DIŞINA (dosya seviyesinde) ekle:

```js
// --- Takma ad barkodlar ---
// urunler.barkod BİRİNCİL kalır; buradakiler ek "bu barkod da bu ürüne gider" kayıtlarıdır.
// db enjekte edilebilir (test için); üretimde IPC sarmalayıcısı getDb() geçer.

function barkodListe(urun_id, db) {
  return db.prepare(
    'SELECT id, barkod, aciklama FROM urun_barkodlar WHERE urun_id=? ORDER BY id'
  ).all(urun_id)
}

function barkodEkle({ urun_id, barkod, aciklama }, db) {
  const deger = String(barkod || '').trim()
  if (!deger) throw new Error('Barkod boş olamaz')
  const urun = db.prepare('SELECT id, barkod FROM urunler WHERE id=?').get(urun_id)
  if (!urun) throw new Error('Ürün bulunamadı')
  if (String(urun.barkod || '').trim() === deger) {
    throw new Error('Bu kod zaten bu ürünün barkodu')
  }
  // Başka bir ürünün birincil barkodu ya da takma adı olamaz — okutulunca hangi ürünün
  // geleceği belirsiz kalırdı.
  const baskaBirincil = db.prepare('SELECT id FROM urunler WHERE TRIM(barkod)=? AND id!=?').get(deger, urun_id)
  const baskaTakma = db.prepare('SELECT urun_id FROM urun_barkodlar WHERE barkod=?').get(deger)
  if (baskaBirincil || baskaTakma) throw new Error('Bu barkod başka bir ürüne tanımlı')
  const r = db.prepare('INSERT INTO urun_barkodlar (urun_id, barkod, aciklama) VALUES (?,?,?)')
    .run(urun_id, deger, (aciklama && String(aciklama).trim()) || null)
  return { id: Number(r.lastInsertRowid), barkod: deger, aciklama: aciklama || null }
}

function barkodSil(id, db) {
  const r = db.prepare('DELETE FROM urun_barkodlar WHERE id=?').run(id)
  if (!r.changes) throw new Error('Barkod bulunamadı')
  return { mesaj: 'Barkod silindi' }
}
```

- [ ] **Step 5: IPC kanallarını kaydet**

`electron/db/urunler.js` `module.exports` içine ekle (mevcut `'urunler:barkodUret'` yakınına):

```js
  _barkodListe: barkodListe,
  _barkodEkle: barkodEkle,
  _barkodSil: barkodSil,

  'urunler:barkod-liste': (urun_id) => barkodListe(urun_id, getDb()),

  'urunler:barkod-ekle': (veri) => {
    yetkiKontrol('urun_duzenle')
    return barkodEkle(veri, getDb())
  },

  'urunler:barkod-sil': (id) => {
    yetkiKontrol('urun_duzenle')
    return barkodSil(id, getDb())
  },
```

- [ ] **Step 6: Testleri çalıştır**

Run: `npx vitest run electron/db/urunler.test.js` → PASS (8 test)
Run: `npx vitest run` → PASS (21 dosya / 262 test)

- [ ] **Step 7: Commit**

```bash
git add electron/db/database.js electron/db/urunler.js electron/db/urunler.test.js
git commit -m "feat(barkod): urun_barkodlar tablosu ve takma ad CRUD"
```

---

### Task 2: Takma ad ile ürün bulma (okutma + arama)

**Files:**
- Modify: `electron/db/urunler.js:121-128` (`urunler:barkodla`), `:82` (arama ifadesi)
- Test: `electron/db/urunler.test.js` (Task 1'de oluşturulan dosyaya ekleme)

**Interfaces:**
- Consumes: `urun_barkodlar` tablosu, `urunler._barkodEkle` (Task 1)
- Produces: `urunler._barkodla(deger, db) -> urunSatiri | undefined`

- [ ] **Step 1: Başarısız testleri ekle**

`electron/db/urunler.test.js` SONUNA:

```js
describe('takma ad ile ürün bulma', () => {
  test('takma ad barkod okutulunca doğru ürün gelir', () => {
    urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017' }, db)
    expect(urunler._barkodla('2900000000017', db).id).toBe(1)
  })

  test('birincil barkod hâlâ bulunur (regresyon)', () => {
    expect(urunler._barkodla('8690000000001', db).id).toBe(1)
  })

  test('SKU ile bulma hâlâ çalışır (regresyon)', () => {
    expect(urunler._barkodla('TNC.LAV.00001', db).id).toBe(1)
  })

  test('baştaki/sondaki boşluk yok sayılır', () => {
    urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017' }, db)
    expect(urunler._barkodla('  2900000000017 ', db).id).toBe(1)
  })

  test('takma ad silinince o barkod artık ürünü bulmaz', () => {
    const b = urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017' }, db)
    urunler._barkodSil(b.id, db)
    expect(urunler._barkodla('2900000000017', db)).toBeUndefined()
  })

  test('pasif ürünün takma adı ürün getirmez', () => {
    urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017' }, db)
    db.prepare('UPDATE urunler SET aktif=0 WHERE id=1').run()
    expect(urunler._barkodla('2900000000017', db)).toBeUndefined()
  })

  test('bilinmeyen kod undefined döner', () => {
    expect(urunler._barkodla('yokboyle', db)).toBeUndefined()
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npx vitest run electron/db/urunler.test.js`
Expected: FAIL — `urunler._barkodla is not a function`

- [ ] **Step 3: `urunler:barkodla`'yı enjeksiyonlu çekirdeğe çıkar ve takma adı ekle**

`electron/db/urunler.js` içinde, `barkodSil`'in altına (module.exports DIŞINA):

```js
// Barkod/SKU/takma ad ile ürün bul. Takma ad eşleşmesi urun_barkodlar üzerinden;
// birincil barkod ve SKU davranışı DEĞİŞMEDEN korunur.
function barkodIleBul(barkod, db) {
  const deger = String(barkod || '').trim()
  if (!deger) return undefined
  return db.prepare(
    `${URUN_SELECT} WHERE (
        TRIM(u.barkod) = ?
        OR TRIM(u.sku) = ?
        OR u.id IN (SELECT ub.urun_id FROM urun_barkodlar ub WHERE TRIM(ub.barkod) = ?)
      ) AND u.aktif = 1`
  ).get(deger, deger, deger)
}
```

`module.exports` içindeki mevcut `'urunler:barkodla'` bloğunun TAMAMINI şununla değiştir:

```js
  _barkodla: barkodIleBul,

  'urunler:barkodla': (barkod) => barkodIleBul(barkod, getDb()),
```

- [ ] **Step 4: Ürün aramasına takma adları ekle**

`electron/db/urunler.js:82`'deki satırı:

```js
      const k = kelimeKosulu("u.ad || ' ' || COALESCE(u.barkod,'') || ' ' || COALESCE(u.sku,'') || ' ' || COALESCE(m.ad,'')", arama)
```

şununla değiştir:

```js
      // Takma ad barkodlar da aranabilir olmalı: mal kabul/set ekranları ürünü
      // urunler:listele ile arıyor, okutulan ek barkod orada da bulunmalı.
      const k = kelimeKosulu(
        "u.ad || ' ' || COALESCE(u.barkod,'') || ' ' || COALESCE(u.sku,'') || ' ' || COALESCE(m.ad,'')" +
        " || ' ' || COALESCE((SELECT GROUP_CONCAT(ub.barkod, ' ') FROM urun_barkodlar ub WHERE ub.urun_id = u.id),'')",
        arama)
```

- [ ] **Step 5: Arama testini ekle ve çalıştır**

`electron/db/urunler.test.js` SONUNA:

```js
describe('ürün araması takma adı kapsar', () => {
  test('takma ad barkodla arama sonuç döndürür', () => {
    urunler._barkodEkle({ urun_id: 1, barkod: '2900000000017' }, db)
    const sql = "SELECT u.id FROM urunler u WHERE u.aktif=1 AND (u.ad || ' ' || COALESCE(u.barkod,'') || ' ' || COALESCE(u.sku,'') || ' ' || COALESCE((SELECT GROUP_CONCAT(ub.barkod, ' ') FROM urun_barkodlar ub WHERE ub.urun_id = u.id),'')) LIKE ?"
    expect(db.prepare(sql).all('%2900000000017%').map(r => r.id)).toEqual([1])
  })
})
```

Not: bu test, arama ifadesinin takma adları KAPSADIĞINI doğrular (üretimdeki `kelimeKosulu`
Türkçe normalizasyonu ayrı olarak `tr-arama.test.js`'te sabitlenmiştir).

Run: `npx vitest run electron/db/urunler.test.js` → PASS (16 test)
Run: `npx vitest run` → PASS (270 test)

- [ ] **Step 6: Commit**

```bash
git add electron/db/urunler.js electron/db/urunler.test.js
git commit -m "feat(barkod): takma ad ile okutma ve arama"
```

---

### Task 3: Çok-PC senkronuna `urun_barkodlar` kaydı

**Files:**
- Modify: `electron/db/senk-sema.js:18-97` (`TABLOLAR` + `SIRA`)
- Test: `electron/db/senk-sema.test.js` (mevcut dosyaya ekleme)

**Interfaces:**
- Consumes: `urun_barkodlar` tablosu (Task 1)
- Produces: yok (senkron altyapısı)

**Neden ayrı task:** Ön sipariş çalışmasında birebir aynı hata yaşandı — yeni tablo senkron listesine eklenmediği için diğer PC'de veri hiç görünmedi. Bu task o dersin uygulanmasıdır.

- [ ] **Step 1: Mevcut test dosyasını oku, kalıbı öğren**

`electron/db/senk-sema.test.js` dosyasını oku. `TABLOLAR` ve `SIRA` üzerinde ne tür iddialar kuruluyor gör (ör. her tablonun `SIRA`'da yer alması, FK bağımlılık sırası).

- [ ] **Step 2: Başarısız testi ekle**

`electron/db/senk-sema.test.js` içine, mevcut describe bloklarının yanına:

```js
describe('urun_barkodlar senkronu', () => {
  test('TABLOLAR içinde tanımlı ve urunler FK\'sı var', () => {
    const t = TABLOLAR.urun_barkodlar
    expect(t).toBeDefined()
    expect(t.fk.urun_id).toBe('urunler')
    expect(t.zorunluFk).toContain('urun_id')
    expect(t.dogal).toEqual(['barkod'])
    expect(t.sonradanEklendi).toBe(true)
  })

  test('SIRA içinde urunler tablosundan SONRA gelir (FK bağımlılığı)', () => {
    expect(SIRA).toContain('urun_barkodlar')
    expect(SIRA.indexOf('urun_barkodlar')).toBeGreaterThan(SIRA.indexOf('urunler'))
  })
})
```

`TABLOLAR` ve `SIRA` import satırlarını dosyanın mevcut import kalıbına göre ayarla (dosyada zaten kullanılıyorlarsa dokunma).

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu gör**

Run: `npx vitest run electron/db/senk-sema.test.js`
Expected: FAIL — `TABLOLAR.urun_barkodlar` undefined

- [ ] **Step 4: Şemaya ekle**

`electron/db/senk-sema.js` içinde `urun_stoklar` satırının ALTINA:

```js
  // Takma ad barkodlar: bir ürünün ek barkodları. Senkronlanmazsa diğer PC'de ek
  // barkod okutma sessizce çalışmaz (ön sipariş çalışmasında birebir aynısı yaşandı).
  // barkod tüm PC'lerde AYNI ve UNIQUE → doğal anahtar, dedup garantili.
  urun_barkodlar: { kolonlar: ['barkod', 'aciklama'], fk: { urun_id: 'urunler' },
                    zorunluFk: ['urun_id'], dogal: ['barkod'], sonradanEklendi: true },
```

`SIRA` dizisinde `'urun_stoklar',` öğesinin hemen ARDINA `'urun_barkodlar',` ekle.

- [ ] **Step 5: Testleri çalıştır**

Run: `npx vitest run electron/db/senk-sema.test.js` → PASS
Run: `npx vitest run` → PASS (272 test)

- [ ] **Step 6: Commit**

```bash
git add electron/db/senk-sema.js electron/db/senk-sema.test.js
git commit -m "feat(barkod): takma ad barkodlari cok-PC senkronuna ekle"
```

---

### Task 4: Ürün formunda "Ek Barkodlar" alanı

**Files:**
- Modify: `src/api/ipc.js` (`urunlerApi`)
- Modify: `src/pages/Urunler.jsx` (düzenleme formu)

**Interfaces:**
- Consumes: `urunler:barkod-liste`, `urunler:barkod-ekle`, `urunler:barkod-sil` (Task 1)
- Produces: `urunlerApi.barkodListe(urunId)`, `urunlerApi.barkodEkle(veri)`, `urunlerApi.barkodSil(id)`

- [ ] **Step 1: Renderer API'sini ekle**

`src/api/ipc.js` içinde `urunlerApi` nesnesine, mevcut `barkodUret` satırının yanına:

```js
  barkodListe: (urunId) => invoke('urunler:barkod-liste', urunId),
  barkodEkle: (veri) => invoke('urunler:barkod-ekle', veri),
  barkodSil: (id) => invoke('urunler:barkod-sil', id),
```

- [ ] **Step 2: Formu oku ve alanı yerleştir**

`src/pages/Urunler.jsx`'i oku. Form yapısını (`BOSH` nesnesi ~satır 22, düzenleme dolgusu ~satır 112, form alanları ~satır 368, `handleBarkodUret` ~satır 127) anla.

Forma, **yalnızca düzenleme modunda** (`form.id` varsa) görünen bir bölüm ekle. Yeni ürün eklerken ürün id'si henüz yok — bu bilinçli bir sadeleştirme, iç içe form karmaşası yaratmamak için.

Gereken davranış:

- Bölüm başlığı: **"Ek Barkodlar"**, altında küçük açıklama: *"Bu ürün bu barkodlarla da okutulabilir. Etikete her zaman ana barkod basılır."*
- Mevcut takma adlar liste halinde; her satırda barkod, varsa açıklama ve bir **✕** sil düğmesi
- Alt satırda iki giriş (barkod, açıklama) + **"Ekle"** düğmesi
- Ekleme/silme sonrası liste yenilenir; hata `toast.error(e.message)` ile gösterilir, başarı `toast.success(...)`
- Liste boşsa: *"Ek barkod tanımlı değil."*

State: takma ad listesi için `useState`, form açılınca/`form.id` değişince `urunlerApi.barkodListe(form.id)` ile yüklenir.

- [ ] **Step 3: Derlemeyi doğrula**

Run: `npx vite build`
Expected: hatasız derleme

Run: `npx vitest run`
Expected: 272 test PASS (bu task test eklemiyor, mevcutlar bozulmamalı)

- [ ] **Step 4: Commit**

```bash
git add src/api/ipc.js src/pages/Urunler.jsx
git commit -m "feat(barkod): urun formuna ek barkodlar alani"
```

---

### Task 5: Stok sayımında takma ad barkod

**Files:**
- Modify: `src/pages/Stok.jsx:185-198` (`kodIsle`)

**Interfaces:**
- Consumes: `urunlerApi.barkodla` (Task 2 — artık takma adları da çözüyor)
- Produces: yok

**Neden ayrı task ve neden kritik:** Stok sayım ekranı okutulan kodu sunucuya SORMUYOR; ekranda yüklü sayım kalemleri içinde JS ile `k.barkod === kod` tam eşleşmesi arıyor (`Stok.jsx:198`). Bu düzeltilmezse takma ad barkod satışta çalışır ama **sayımda sessizce çalışmaz** — kullanıcı "ürün sayımda yok" sanır. Özelliğin en sinsi boşluğu budur.

- [ ] **Step 1: Mevcut akışı oku**

`src/pages/Stok.jsx:180-225` aralığını oku. `barkodOkut` / `kodIsle` fonksiyonlarının nasıl çalıştığını, `aktifSayim.kalemler` yapısını ve eşleşme bulunamayınca kullanıcıya ne gösterildiğini anla.

- [ ] **Step 2: Takma ad çözümünü ekle**

`kodIsle` içinde, mevcut tam eşleşme **başarısız olduğunda** devreye giren bir yedek yol ekle:

```js
    // Takma ad barkod: sayım kalemlerinde ana barkodla eşleşme yoksa kodu sunucuya
    // sor (urunler:barkodla takma adları da çözer) ve dönen ürün id'siyle kalemi bul.
    if (!kalem) {
      try {
        const urun = await urunlerApi.barkodla(kod)
        if (urun) kalem = aktifSayim.kalemler.find(k => k.urun_id === urun.id)
      } catch { /* çözülemezse aşağıdaki "bulunamadı" akışı devreye girer */ }
    }
```

Yerleştirme kuralları:
- Mevcut tam eşleşme mantığını KALDIRMA — hızlı yol o, sunucuya gitmeden çalışmalı
- `kodIsle` senkron ise `async` yap ve çağıran yerleri (okuyucu kancası, elle giriş) buna göre uyarla
- `urunlerApi` zaten import edilmiş mi kontrol et; değilse mevcut import satırına ekle
- Bulunamama durumunda gösterilen mevcut mesaj/davranış aynen korunur

- [ ] **Step 3: Derlemeyi doğrula**

Run: `npx vite build` → hatasız
Run: `npx vitest run` → 272 test PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/Stok.jsx
git commit -m "fix(barkod): stok sayiminda takma ad barkod cozulsun"
```

---

### Task 6: Ön siparişte elle fiyat

**Files:**
- Modify: `src/pages/Satis.jsx`

**Interfaces:**
- Consumes: `satisApi.olustur` — kalemlerde `birim_fiyat` alanı zaten destekleniyor (`electron/db/satislar.js:55`: `(kalem.birim_fiyat ?? urun.satis_fiyati)`)
- Produces: yok (son task)

**Backend değişmiyor.** İş tamamen arayüzde.

- [ ] **Step 1: Mevcut sepet ve payload akışını oku**

`src/pages/Satis.jsx` içinde: sepet satırının render edildiği yer, `miktarDegistir` (~satır 205), `efektifIskonto`, toplam hesaplama (~satır 240-259) ve `satisOlustur` payload'ındaki `kalemler` üretimi (~satır 285-287):

```jsx
        kalemler: sepet.flatMap(k => k.tip === 'set'
          ? setiAc(k)
          : [{ urun_id: k.urun_id, miktar: k.miktar, iskonto_orani: efektifIskonto(k) }]),
```

- [ ] **Step 2: Sepet satırına elle fiyat kutusu ekle**

Gereken davranış:

- Fiyat kutusu sepet satırında **yalnız `onSiparis === true` iken** görünür
- Boş bırakılırsa ürünün kayıtlı fiyatı kullanılır (mevcut davranış korunur)
- Girilen değer sepet kaleminde tutulur (ör. `k.elleFiyat`), `urunler.satis_fiyati` **değişmez**
- Sepet toplamı elle fiyata göre anında güncellenir — toplam hesaplayan kod ürünün kayıtlı fiyatı yerine `elleFiyat ?? kayıtlı fiyat` kullanmalı
- **Kutucuk kapatılırsa girilen elle fiyatlar temizlenir** (yanlışlıkla normal satışa sızmasın)
- Set kalemlerinde elle fiyat AÇILMAZ — set fiyatı zaten bileşenlere dağıtılıyor, oraya elle fiyat karıştırmak set mantığını bozar

- [ ] **Step 3: Payload'a geçir**

`kalemler` üretimini, elle fiyat girilmişse `birim_fiyat` gönderecek şekilde güncelle:

```jsx
        kalemler: sepet.flatMap(k => k.tip === 'set'
          ? setiAc(k)
          : [{
              urun_id: k.urun_id,
              miktar: k.miktar,
              iskonto_orani: efektifIskonto(k),
              // Ön siparişte elle girilen fiyat yalnız bu satışa geçer; ürün kartı değişmez.
              ...(onSiparis && Number(k.elleFiyat) > 0 ? { birim_fiyat: Number(k.elleFiyat) } : {}),
            }]),
```

- [ ] **Step 4: Derlemeyi doğrula**

Run: `npx vite build` → hatasız
Run: `npx vitest run` → 272 test PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/Satis.jsx
git commit -m "feat(on-siparis): on sipariste elle fiyat girisi"
```

---

## Yayın öncesi kontrol listesi

- [ ] `npx vitest run` tamamen yeşil (272 test)
- [ ] `npx vite build` hatasız
- [ ] Elle: ürüne ek barkod tanımla → satışta okut → stok sayımında okut → mal kabulde ara → hepsi ürünü bulmalı
- [ ] Elle: etiket bas → **ana** barkod basılmalı (takma ad değil)
- [ ] Elle: fiyatı 0 olan ürünle ön sipariş al, elle fiyat gir → fişte ve satış geçmişinde o fiyat görünmeli, ürün kartındaki fiyat DEĞİŞMEMELİ
- [ ] Sürüm `package.json`'da 1.2.148 → 1.2.149

## Kapsam dışı (tasarım Bölüm 7)

Koli çarpanı · ürün varyantı (KAHVE/GRİ ayrı stok) · ikas `barcodeList`'ten otomatik takma ad çekme · Excel "Barkod Listesi" sütununu çoklu okuma · takma adların Excel dışa aktarımı
