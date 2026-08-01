# Ön Sipariş Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Satış ekranından stok düşürmeyen, peşin ödemeli "ön sipariş" alınabilsin; bu siparişler ayrı bir sekmede listelenip UPS kargosu oluşturulabilsin.

**Architecture:** Ön sipariş ayrı bir tablo veya yeni bir `satislar.tip` değeri DEĞİL, `satislar` tablosuna eklenen bir **bayrak kolonudur** (`on_siparis`). Böylece ciro/kasa/rapor/fiş yolları hiç değişmeden çalışır; yalnızca stok düşümü ve ikas push'u atlanır. Backend'de satış oluşturma ve iptal çekirdekleri `db` enjekte edilebilir `_` önekli fonksiyonlara çıkarılır (projede `senk-veri.js` ve `raporlar.js` aynı deseni kullanıyor) — böylece stok davranışı gerçek SQL ile test edilebilir.

**Tech Stack:** Electron 22 (main process CJS) · React 18 + Vite (renderer ESM, `.jsx`) · better-sqlite3 (üretim) / `node:sqlite` (test) · vitest 4 · Tailwind

## Global Constraints

- Tüm isimlendirme ve kullanıcıya görünen metinler **Türkçe**.
- `electron/` altı **CommonJS** (`require`/`module.exports`), `src/` altı **ESM**.
- `electron/db/*.js` modüllerinde `_` ile başlayan export'lar IPC kanalı olarak kaydedilmez (`electron/main.js:355-362`) — enjeksiyonlu private'lar bu yüzden `_` önekli olmalı.
- Testte **better-sqlite3 kullanılamaz** (Electron ABI'sine derli). Bellek DB için `node:sqlite` + ince adaptör kullanılır; kalıp: `electron/db/senk-bekleyen.test.js:14-46`.
- `node:sqlite` parametre olarak yalnız `null | number | string | bigint` kabul eder — **boolean geçilemez**, `x ? 1 : 0` yazılır.
- Yeni yetki kodu eklenirse **dört nokta birden** güncellenir: `src/auth/izinler.js`, `electron/yetki.js`, `supabase/NN_*.sql`, `src/auth/yetki-paritesi.test.js`.
- Üretim kodunda `console.log` yok.
- Test komutu: `npx vitest run` (tümü) — baseline: **19 dosya / 226 test geçiyor**.
- Her task sonunda commit; commit mesajı `<type>: <açıklama>` (feat/fix/test/docs).

---

### Task 1: Ön siparişli satış — DB kolonları + stok/ikas atlaması

**Files:**
- Modify: `electron/db/database.js:503` (migrate bloğunun devamı)
- Modify: `electron/db/satislar.js:24-100` (handler → enjeksiyonlu çekirdek)
- Test: `electron/db/satislar.test.js` (yeni)

**Interfaces:**
- Consumes: `satisHesapla` (`electron/db/satis-hesapla.js`, mevcut)
- Produces:
  - `satislar._olustur(veri, db, ikasPushFn) -> satisSatiri`
    `veri` alanları mevcutlara ek olarak: `on_siparis?: boolean`, `on_siparis_not?: string|null`
  - `satislar` tablosunda `on_siparis INTEGER DEFAULT 0`, `on_siparis_durum TEXT`, `on_siparis_not TEXT`

- [ ] **Step 1: Migration kolonlarını ekle**

`electron/db/database.js` içinde satır 503'teki `satis_kalemleri ... iade_miktar` satırının hemen ALTINA:

```js
  // satislar — ön sipariş: stokta olmayan ürün için peşin ödemeli sipariş.
  // Stok DÜŞÜLMEZ ve ikas'a push edilmez; ciro/kasa normal satış gibi işler (ödeme anında).
  // on_siparis_durum: 'bekliyor' -> 'kargolandi' -> 'teslim' | 'iptal'
  try { db.exec("ALTER TABLE satislar ADD COLUMN on_siparis INTEGER DEFAULT 0") } catch {}
  try { db.exec("ALTER TABLE satislar ADD COLUMN on_siparis_durum TEXT") } catch {}
  try { db.exec("ALTER TABLE satislar ADD COLUMN on_siparis_not TEXT") } catch {}
```

- [ ] **Step 2: Test dosyasını yaz (başarısız olacak)**

`electron/db/satislar.test.js` oluştur:

```js
// Ön sipariş = stok düşürmeyen satış. Bu testler stok kolunun ATLANDIĞINI sabitler.
// better-sqlite3 BURADA KULLANILAMAZ (Electron ABI'sine derli, vitest düz Node'da koşar).
// Node'un yerleşik sqlite'ı üstüne satislar.js'in kullandığı yüzey (prepare/get/all/run,
// exec, transaction) konur — üretim SQL'i değişmeden gerçek veriyle test edilir.
import { describe, test, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const satislar = require('./satislar.js')

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
let pushEdilen   // ikasPush çağrıldıysa gelen urun_id dizisi

const ikasPushSahte = (idler) => { pushEdilen.push(idler) }

beforeEach(() => {
  db = bellekDb()
  pushEdilen = []
  db.exec(`
    CREATE TABLE lokasyonlar (id INTEGER PRIMARY KEY, ad TEXT);
    CREATE TABLE musteriler (id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT, soyad TEXT);
    CREATE TABLE urunler (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ad TEXT, satis_fiyati REAL,
      kdv_orani REAL DEFAULT 20, aktif INTEGER DEFAULT 1);
    CREATE TABLE urun_stoklar (
      id INTEGER PRIMARY KEY AUTOINCREMENT, urun_id INTEGER, lokasyon_id INTEGER,
      miktar INTEGER DEFAULT 0, minimum_stok INTEGER DEFAULT 0, UNIQUE(urun_id, lokasyon_id));
    CREATE TABLE satislar (
      id INTEGER PRIMARY KEY AUTOINCREMENT, fis_no TEXT UNIQUE, lokasyon_id INTEGER,
      musteri_id INTEGER, odeme_tipi TEXT, durum TEXT DEFAULT 'tamamlandi',
      tip TEXT DEFAULT 'satis', iade_kaynak_id INTEGER,
      ara_toplam REAL, iskonto_toplam REAL, kdv_toplam REAL, genel_toplam REAL,
      notlar TEXT, tarih TEXT DEFAULT CURRENT_TIMESTAMP,
      on_siparis INTEGER DEFAULT 0, on_siparis_durum TEXT, on_siparis_not TEXT);
    CREATE TABLE satis_kalemleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT, satis_id INTEGER, urun_id INTEGER, miktar INTEGER,
      birim_fiyat REAL, iskonto_orani REAL, kdv_orani REAL, toplam REAL,
      iade_miktar INTEGER DEFAULT 0, set_adi TEXT);
    CREATE TABLE satis_odemeler (
      id INTEGER PRIMARY KEY AUTOINCREMENT, satis_id INTEGER, odeme_tipi TEXT, tutar REAL);
    INSERT INTO lokasyonlar (id, ad) VALUES (1, 'Pendik');
    INSERT INTO urunler (id, ad, satis_fiyati, kdv_orani) VALUES (1, 'Tencere', 100, 20);
    INSERT INTO urun_stoklar (urun_id, lokasyon_id, miktar) VALUES (1, 1, 5);
  `)
})

const stok = () => db.prepare('SELECT miktar FROM urun_stoklar WHERE urun_id=1 AND lokasyon_id=1').get().miktar

const veri = (ek = {}) => ({
  lokasyon_id: 1, odeme_tipi: 'nakit',
  kalemler: [{ urun_id: 1, miktar: 2 }],
  ...ek,
})

describe('normal satış (regresyon)', () => {
  test('stoğu düşürür ve ikas push eder', () => {
    satislar._olustur(veri(), db, ikasPushSahte)
    expect(stok()).toBe(3)
    expect(pushEdilen).toEqual([[1]])
  })

  test('yetersiz stokta hata verir', () => {
    expect(() => satislar._olustur(veri({ kalemler: [{ urun_id: 1, miktar: 99 }] }), db, ikasPushSahte))
      .toThrow(/Yetersiz stok/)
  })
})

describe('ön sipariş', () => {
  test('stoğa DOKUNMAZ', () => {
    satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    expect(stok()).toBe(5)
  })

  test('ikas push ETMEZ', () => {
    satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    expect(pushEdilen).toEqual([])
  })

  test('stok yetersizken bile hata vermez', () => {
    db.prepare('UPDATE urun_stoklar SET miktar=0 WHERE urun_id=1').run()
    const s = satislar._olustur(veri({ on_siparis: true, kalemler: [{ urun_id: 1, miktar: 3 }] }), db, ikasPushSahte)
    expect(s.on_siparis).toBe(1)
    expect(stok()).toBe(0)
  })

  test('durumu bekliyor olarak açılır ve not saklanır', () => {
    const s = satislar._olustur(veri({ on_siparis: true, on_siparis_not: '10 gün sonra' }), db, ikasPushSahte)
    expect(s.on_siparis_durum).toBe('bekliyor')
    expect(s.on_siparis_not).toBe('10 gün sonra')
  })

  test('ciroya normal satış gibi girer (tutar ve ödeme kaydı yazılır)', () => {
    const s = satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    expect(s.genel_toplam).toBe(200)
    expect(s.durum).toBe('tamamlandi')
    expect(s.tip).toBe('satis')
    const od = db.prepare('SELECT odeme_tipi, tutar FROM satis_odemeler WHERE satis_id=?').all(s.id)
    expect(od).toEqual([{ odeme_tipi: 'nakit', tutar: 200 }])
  })

  test('kalemleri normal satıştaki gibi yazılır', () => {
    const s = satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    const k = db.prepare('SELECT urun_id, miktar FROM satis_kalemleri WHERE satis_id=?').all(s.id)
    expect(k).toEqual([{ urun_id: 1, miktar: 2 }])
  })

  test('bayrak verilmezse normal satıştır', () => {
    const s = satislar._olustur(veri(), db, ikasPushSahte)
    expect(s.on_siparis).toBe(0)
    expect(s.on_siparis_durum).toBe(null)
  })
})
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu gör**

Run: `npx vitest run electron/db/satislar.test.js`
Expected: FAIL — `satislar._olustur is not a function`

- [ ] **Step 4: `satislar:olustur`'u enjeksiyonlu çekirdeğe çıkar**

`electron/db/satislar.js` satır 24-25'teki

```js
module.exports = {
  'satislar:olustur': ({ lokasyon_id, musteri_id, odeme_tipi = 'nakit', kalemler, notlar, genel_iskonto = 0, odeme_oran = 0, odemeler = null, stok_zorla = false }) => {
    yetkiKontrol('satis_yap')
    lokasyonKontrol(lokasyon_id)
    const db = getDb()
```

bloğunu, `module.exports` bloğunun DIŞINA çıkan bir fonksiyona dönüştür. `module.exports` satırının ÜSTÜNE ekle:

```js
// Satış oluşturma çekirdeği. db ve ikasPush dışarıdan verilir (test enjeksiyonu için;
// üretimde IPC sarmalayıcısı getDb()/gerçek push'u geçer).
// on_siparis=true iken stok kolu TAMAMEN atlanır: yeterlilik kontrolü yapılmaz,
// urun_stoklar güncellenmez, ikas'a push edilmez. Ürün zaten mağazada yoktur.
function olusturUygula(veri, db, ikasPushFn) {
  const {
    lokasyon_id, musteri_id, odeme_tipi = 'nakit', kalemler, notlar,
    genel_iskonto = 0, odeme_oran = 0, odemeler = null, stok_zorla = false,
    on_siparis = false, on_siparis_not = null,
  } = veri || {}
  const onSiparis = !!on_siparis
```

Fonksiyonun geri kalanı mevcut gövdenin aynısıdır; aşağıdaki **dört** noktası değişir.

**(a) Stok yeterlilik kontrolü** — mevcut satır 50:

```js
      if ((!stok || stok.miktar < kalem.miktar) && !stok_zorla) {
```
yerine:
```js
      // Ön siparişte ürün zaten stokta yok; yeterlilik kontrolü uygulanmaz.
      if (!onSiparis && (!stok || stok.miktar < kalem.miktar) && !stok_zorla) {
```

**(b) INSERT** — mevcut satır 74-78:

```js
      const satis = db.prepare(`
        INSERT INTO satislar (fis_no, lokasyon_id, musteri_id, odeme_tipi, notlar, ara_toplam, iskonto_toplam, kdv_toplam, genel_toplam)
        VALUES (?,?,?,?,?,?,?,?,?)
      `).run(fisNoUret(db), lokasyon_id, musteri_id||null, satisOdemeTipi, notlar||null,
        araToplam, iskontoToplam, kdvToplam, genelToplam)
```
yerine:
```js
      const satis = db.prepare(`
        INSERT INTO satislar (fis_no, lokasyon_id, musteri_id, odeme_tipi, notlar, ara_toplam, iskonto_toplam, kdv_toplam, genel_toplam, on_siparis, on_siparis_durum, on_siparis_not)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(fisNoUret(db), lokasyon_id, musteri_id||null, satisOdemeTipi, notlar||null,
        araToplam, iskontoToplam, kdvToplam, genelToplam,
        onSiparis ? 1 : 0, onSiparis ? 'bekliyor' : null, onSiparis ? (on_siparis_not || null) : null)
```

**(c) Stok düşümü** — mevcut satır 84-86:

```js
        // Stok satırı yoksa oluştur (stok_zorla durumunda eksik olabilir); 0 altına düşürme.
        db.prepare('INSERT OR IGNORE INTO urun_stoklar (urun_id, lokasyon_id, miktar, minimum_stok) VALUES (?, ?, 0, 0)').run(k.urun_id, lokasyon_id)
        db.prepare('UPDATE urun_stoklar SET miktar=MAX(0, miktar-?) WHERE urun_id=? AND lokasyon_id=?').run(k.miktar, k.urun_id, lokasyon_id)
```
yerine:
```js
        if (!onSiparis) {
          // Stok satırı yoksa oluştur (stok_zorla durumunda eksik olabilir); 0 altına düşürme.
          db.prepare('INSERT OR IGNORE INTO urun_stoklar (urun_id, lokasyon_id, miktar, minimum_stok) VALUES (?, ?, 0, 0)').run(k.urun_id, lokasyon_id)
          db.prepare('UPDATE urun_stoklar SET miktar=MAX(0, miktar-?) WHERE urun_id=? AND lokasyon_id=?').run(k.miktar, k.urun_id, lokasyon_id)
        }
```

**(d) ikas push** — mevcut satır 96-99:

```js
    const sonuc = insertFn()
    // Satılan ürünlerin güncel stoğunu ikas'a yansıt (arka plan, en iyi çaba).
    ikasPush(kalemMeta.map(k => k.urun_id))
    return sonuc
  },
```
yerine (fonksiyonun sonu):
```js
  const sonuc = insertFn()
  // Satılan ürünlerin güncel stoğunu ikas'a yansıt (arka plan, en iyi çaba).
  // Ön siparişte yerel stok değişmediği için push edilecek bir şey YOK.
  if (!onSiparis) ikasPushFn(kalemMeta.map(k => k.urun_id))
  return sonuc
}
```

- [ ] **Step 5: IPC sarmalayıcısını yaz**

`module.exports` bloğunun başına, eski handler'ın yerine:

```js
module.exports = {
  _olustur: olusturUygula,

  'satislar:olustur': (veri) => {
    yetkiKontrol('satis_yap')
    lokasyonKontrol(veri && veri.lokasyon_id)
    return olusturUygula(veri, getDb(), ikasPush)
  },
```

(Task 3'te bu handler'a `on_siparis_yap` yetki kontrolü eklenecek.)

- [ ] **Step 6: Testleri çalıştır, geçtiğini gör**

Run: `npx vitest run electron/db/satislar.test.js`
Expected: PASS — 9 test

Run: `npx vitest run`
Expected: PASS — 20 dosya, 235 test (baseline 226 + 9)

- [ ] **Step 7: Commit**

```bash
git add electron/db/database.js electron/db/satislar.js electron/db/satislar.test.js
git commit -m "feat(on-siparis): stok dusurmeyen on siparis satisi + db kolonlari"
```

---

### Task 2: Ön sipariş iptali stoğu artırmasın

**Files:**
- Modify: `electron/db/satislar.js:208-228` (`satislar:iptal`)
- Test: `electron/db/satislar.test.js` (Task 1'de oluşturulan dosyaya ekleme)

**Interfaces:**
- Consumes: `satislar._olustur(veri, db, ikasPushFn)` (Task 1)
- Produces: `satislar._iptal(id, db, ikasPushFn) -> { mesaj: string }`

**Neden ayrı task:** `satislar:iptal` iptal edilen satışın kalemlerini stoğa **geri ekler**. Ön siparişte stok hiç düşülmediği için bu, var olmayan stoğu şişirir ve ikas'a yanlış stok gönderir. Özelliğin en sinsi hata noktasıdır.

- [ ] **Step 1: Başarısız testleri ekle**

`electron/db/satislar.test.js` dosyasının SONUNA ekle:

```js
describe('iptal', () => {
  test('normal satış iptali stoğu geri ekler (regresyon)', () => {
    const s = satislar._olustur(veri(), db, ikasPushSahte)
    expect(stok()).toBe(3)
    pushEdilen = []
    satislar._iptal(s.id, db, ikasPushSahte)
    expect(stok()).toBe(5)
    expect(pushEdilen).toEqual([[1]])
    expect(db.prepare('SELECT durum FROM satislar WHERE id=?').get(s.id).durum).toBe('iptal')
  })

  test('ÖN SİPARİŞ iptali stoğu ARTIRMAZ', () => {
    const s = satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    expect(stok()).toBe(5)
    pushEdilen = []
    satislar._iptal(s.id, db, ikasPushSahte)
    expect(stok()).toBe(5)          // olmayan stok şişmedi
    expect(pushEdilen).toEqual([])  // ikas'a yanlış stok gitmedi
  })

  test('ön sipariş iptalinde durum alanları güncellenir', () => {
    const s = satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    satislar._iptal(s.id, db, ikasPushSahte)
    const son = db.prepare('SELECT durum, on_siparis_durum FROM satislar WHERE id=?').get(s.id)
    expect(son).toEqual({ durum: 'iptal', on_siparis_durum: 'iptal' })
  })

  test('zaten iptal edilmiş satış tekrar iptal edilemez', () => {
    const s = satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    satislar._iptal(s.id, db, ikasPushSahte)
    expect(() => satislar._iptal(s.id, db, ikasPushSahte)).toThrow(/bulunamadı veya zaten iptal/)
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npx vitest run electron/db/satislar.test.js`
Expected: FAIL — `satislar._iptal is not a function`

- [ ] **Step 3: `satislar:iptal`'i enjeksiyonlu çekirdeğe çıkar**

`electron/db/satislar.js` içinde, `olusturUygula`'nın altına (yine `module.exports` DIŞINA) ekle:

```js
// Satış iptali çekirdeği. Ön siparişte stok hiç DÜŞÜLMEDİĞİ için geri de EKLENMEZ —
// aksi halde var olmayan stok şişer ve ikas'a yanlış miktar gider.
function iptalUygula(id, db, ikasPushFn) {
  const satis = db.prepare('SELECT * FROM satislar WHERE id=?').get(id)
  if (!satis || satis.durum === 'iptal') throw new Error('Satış bulunamadı veya zaten iptal')
  if (satis.tip === 'iade') throw new Error('İade kaydı iptal edilemez (orijinal satıştan işlem yapın)')
  const onSiparis = !!satis.on_siparis
  const iptalFn = db.transaction(() => {
    if (!onSiparis) {
      const kalemler = db.prepare('SELECT * FROM satis_kalemleri WHERE satis_id=?').all(id)
      for (const k of kalemler) {
        // Zaten iade edilmiş adetler tekrar stoğa eklenmesin.
        const geri = (k.miktar || 0) - (k.iade_miktar || 0)
        if (geri > 0) db.prepare('UPDATE urun_stoklar SET miktar=miktar+? WHERE urun_id=? AND lokasyon_id=?').run(geri, k.urun_id, satis.lokasyon_id)
      }
    }
    db.prepare("UPDATE satislar SET durum='iptal' WHERE id=?").run(id)
    if (onSiparis) db.prepare("UPDATE satislar SET on_siparis_durum='iptal' WHERE id=?").run(id)
  })
  iptalFn()
  if (!onSiparis) {
    // İade edilen ürünlerin güncel stoğunu ikas'a yansıt.
    const kalemler = db.prepare('SELECT DISTINCT urun_id FROM satis_kalemleri WHERE satis_id=?').all(id)
    ikasPushFn(kalemler.map(k => k.urun_id))
  }
  return { mesaj: 'Satış iptal edildi' }
}
```

- [ ] **Step 4: Eski handler'ı sarmalayıcıyla değiştir**

`module.exports` içindeki mevcut `'satislar:iptal': (id) => { ... }` bloğunun TAMAMINI şununla değiştir:

```js
  _iptal: iptalUygula,

  'satislar:iptal': (id) => {
    yetkiKontrol('satis_iptal')
    return iptalUygula(id, getDb(), ikasPush)
  },
```

- [ ] **Step 5: Testleri çalıştır, geçtiğini gör**

Run: `npx vitest run electron/db/satislar.test.js`
Expected: PASS — 13 test

Run: `npx vitest run`
Expected: PASS — 239 test

- [ ] **Step 6: Commit**

```bash
git add electron/db/satislar.js electron/db/satislar.test.js
git commit -m "fix(on-siparis): on siparis iptali stogu geri eklemesin"
```

---

### Task 3: `on_siparis_yap` yetkisi

**Files:**
- Modify: `src/auth/izinler.js:7-22`
- Modify: `electron/yetki.js:7-23`
- Modify: `src/auth/yetki-paritesi.test.js:31-40`
- Modify: `electron/db/satislar.js` (Task 1'de yazılan `'satislar:olustur'` sarmalayıcısı)
- Create: `supabase/09_on_siparis_yetki.sql`

**Interfaces:**
- Consumes: `yetkiKontrol` (`electron/yetki.js`, mevcut)
- Produces: `'on_siparis_yap'` yetki kodu — personel varsayılanında **KAPALI**; yönetici ve super_admin'de açık.

**Neden ayrı yetki:** Bu akış stok yeterlilik kontrolünü bilerek atlar. `satis_yap` ile birlikte verilirse her personel stok güvenilirliğini sessizce bozabilir; kime açılacağına yönetici karar verir (`sosyal_otomasyon_yonet` ile aynı gerekçe).

- [ ] **Step 1: Parite testine kodu ekle (başarısız olmamalı, ama kapsamı genişletir)**

`src/auth/yetki-paritesi.test.js` içinde `TUM_KODLAR` dizisinde satır 32'yi:

```js
  'satis_yap', 'satis_gecmisi_goruntule', 'satis_iptal',
```
şununla değiştir:
```js
  'satis_yap', 'satis_gecmisi_goruntule', 'satis_iptal', 'on_siparis_yap',
```

Aynı dosyanın SONUNA yeni bir describe bloğu ekle:

```js
describe('ön sipariş yetkisi', () => {
  test('personel ön sipariş alamaz (varsayılan kapalı)', () => {
    const p = { rol: 'personel', aktif: true, izinler: {} }
    expect(yetkiVar(p, 'satis_yap')).toBe(true)
    expect(yetkiVar(p, 'on_siparis_yap')).toBe(false)
  })

  test('yönetici ön sipariş alabilir', () => {
    expect(yetkiVar({ rol: 'yonetici', aktif: true, izinler: {} }, 'on_siparis_yap')).toBe(true)
  })

  test('override ile personele açılabilir', () => {
    const p = { rol: 'personel', aktif: true, izinler: { on_siparis_yap: true } }
    expect(yetkiVar(p, 'on_siparis_yap')).toBe(true)
  })
})
```

- [ ] **Step 2: Testi çalıştır**

Run: `npx vitest run src/auth/yetki-paritesi.test.js`
Expected: PASS — iki taraf da bu kodu bilmediği için `false` döner, parite bozulmaz; yeni describe de geçer.

Not: Bu adım kasten yeşildir — testin amacı, ilerideki tek taraflı değişikliği yakalamak. Asıl davranış Step 3'te eklenir.

- [ ] **Step 3: Yetkiyi iki tarafa da tanıt (liste değişmez, yorum eklenir)**

`src/auth/izinler.js` içinde `PERSONEL_VARSAYILAN` set'inin son elemanı `'sosyal_medya_yonet',` satırının ALTINA:

```js
  // 'on_siparis_yap' BİLEREK yok — bkz. electron/yetki.js'teki aynı not.
```

`electron/yetki.js` içinde aynı set'te `'sosyal_medya_yonet',` satırının ALTINA:

```js
  // 'on_siparis_yap' BİLEREK yok: ön sipariş stok yeterlilik kontrolünü ATLAR
  // (stokta olmayan ürün satılır). Yanlış kullanılırsa stok güvenilirliği sessizce
  // bozulur — kime açılacağına yönetici karar verir.
```

- [ ] **Step 4: Supabase yetki kaydını ekle**

`supabase/09_on_siparis_yetki.sql` oluştur:

```sql
-- Ön sipariş yetkisi: stok düşürmeden peşin ödemeli satış alma.
-- "Özel" rolde toggle çıkması için bu kaydın Supabase'de bulunması ŞART.
insert into public.yetki_kodlari (kod, ad, grup) values
  ('on_siparis_yap', 'Ön sipariş alma (stok düşmeden satış)', 'Satış')
on conflict (kod) do nothing;
```

- [ ] **Step 5: Backend kontrolünü ekle**

`electron/db/satislar.js` içinde Task 1'de yazılan sarmalayıcıyı güncelle:

```js
  'satislar:olustur': (veri) => {
    yetkiKontrol('satis_yap')
    // Ön sipariş stok kontrolünü atladığı için AYRI yetki ister.
    if (veri && veri.on_siparis) yetkiKontrol('on_siparis_yap')
    lokasyonKontrol(veri && veri.lokasyon_id)
    return olusturUygula(veri, getDb(), ikasPush)
  },
```

- [ ] **Step 6: Tüm testleri çalıştır**

Run: `npx vitest run`
Expected: PASS — 242 test

- [ ] **Step 7: Commit**

```bash
git add src/auth/izinler.js electron/yetki.js src/auth/yetki-paritesi.test.js electron/db/satislar.js supabase/09_on_siparis_yetki.sql
git commit -m "feat(on-siparis): on_siparis_yap yetki kodu"
```

---

### Task 4: Ön sipariş listeleme ve durum güncelleme IPC

**Files:**
- Modify: `electron/db/satislar.js` (module.exports'a iki yeni kanal)
- Modify: `src/api/ipc.js:29-36` (`satisApi`)
- Test: `electron/db/satislar.test.js` (ekleme)

**Interfaces:**
- Consumes: `satislar._olustur` (Task 1), `satislar._iptal` (Task 2)
- Produces:
  - `satislar._onSiparisler(filtre, db) -> Array<satisSatiri & { musteri_adi, musteri_telefon, musteri_il, musteri_ilce, musteri_adres, musteri_email, lokasyon_adi, takip_no, kargo_durum, kalemler }>`
    `filtre`: `{ durum?: 'bekliyor'|'kargolandi'|'teslim'|'iptal', lokasyon_id?: number, baslangic?: string, bitis?: string }`
  - `satislar._onSiparisDurum(id, durum, db) -> { mesaj: string }` — geçerli durumlar: `'bekliyor'|'kargolandi'|'teslim'`
  - IPC kanalları: `satislar:on-siparisler`, `satislar:on-siparis-durum`
  - Renderer: `satisApi.onSiparisler(params)`, `satisApi.onSiparisDurum(id, durum)`

- [ ] **Step 1: Başarısız testleri ekle**

`electron/db/satislar.test.js` SONUNA:

```js
describe('ön sipariş listeleme', () => {
  test('yalnızca ön siparişleri döner', () => {
    satislar._olustur(veri(), db, ikasPushSahte)                      // normal satış
    const o = satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    const liste = satislar._onSiparisler({}, db)
    expect(liste.map(s => s.id)).toEqual([o.id])
  })

  test('kalemleri ürün adıyla birlikte getirir', () => {
    satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    const [s] = satislar._onSiparisler({}, db)
    expect(s.kalemler).toEqual([{ urun_id: 1, urun_adi: 'Tencere', miktar: 2 }])
  })

  test('durum filtresi uygular', () => {
    const o = satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    expect(satislar._onSiparisler({ durum: 'bekliyor' }, db).map(s => s.id)).toEqual([o.id])
    expect(satislar._onSiparisler({ durum: 'teslim' }, db)).toEqual([])
  })

  test('iptal edilen ön sipariş listede durum iptal ile görünür', () => {
    const o = satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    satislar._iptal(o.id, db, ikasPushSahte)
    expect(satislar._onSiparisler({ durum: 'iptal' }, db).map(s => s.id)).toEqual([o.id])
  })
})

describe('ön sipariş durum güncelleme', () => {
  test('kargolandi olarak işaretlenir', () => {
    const o = satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    satislar._onSiparisDurum(o.id, 'kargolandi', db)
    expect(db.prepare('SELECT on_siparis_durum FROM satislar WHERE id=?').get(o.id).on_siparis_durum).toBe('kargolandi')
  })

  test('geçersiz durum reddedilir', () => {
    const o = satislar._olustur(veri({ on_siparis: true }), db, ikasPushSahte)
    expect(() => satislar._onSiparisDurum(o.id, 'her neyse', db)).toThrow(/Geçersiz ön sipariş durumu/)
  })

  test('ön sipariş olmayan satışın durumu güncellenemez', () => {
    const s = satislar._olustur(veri(), db, ikasPushSahte)
    expect(() => satislar._onSiparisDurum(s.id, 'teslim', db)).toThrow(/Ön sipariş bulunamadı/)
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npx vitest run electron/db/satislar.test.js`
Expected: FAIL — `satislar._onSiparisler is not a function`

- [ ] **Step 3: Çekirdek fonksiyonları yaz**

`electron/db/satislar.js` içinde `iptalUygula`'nın altına, `module.exports` DIŞINA:

```js
const ON_SIPARIS_DURUMLARI = ['bekliyor', 'kargolandi', 'teslim']

// Ön sipariş listesi: satış + müşteri (kargo formunu ön doldurmak için adres alanları
// dahil) + varsa bağlı UPS gönderisinin takip no'su. Kargo bağı kargolar.satis_id
// üzerindendir (satış ekranından oluşturulan kargolarla aynı yol).
function onSiparisleriGetir({ durum, lokasyon_id, baslangic, bitis } = {}, db) {
  let where = 'WHERE s.on_siparis=1'
  const params = []
  if (durum) { where += ' AND COALESCE(s.on_siparis_durum,?)=?'; params.push('bekliyor', durum) }
  if (lokasyon_id) { where += ' AND s.lokasyon_id=?'; params.push(lokasyon_id) }
  if (baslangic) { where += ' AND DATE(s.tarih)>=?'; params.push(baslangic) }
  if (bitis) { where += ' AND DATE(s.tarih)<=?'; params.push(bitis) }
  const satislar = db.prepare(`
    SELECT s.*, l.ad AS lokasyon_adi,
           m.ad||' '||m.soyad AS musteri_adi, m.telefon AS musteri_telefon, m.email AS musteri_email,
           m.adres AS musteri_adres, m.il AS musteri_il, m.ilce AS musteri_ilce,
           (SELECT k.takip_no FROM kargolar k
              WHERE k.satis_id=s.id AND COALESCE(k.durum,'')!='iptal'
              ORDER BY k.id DESC LIMIT 1) AS takip_no,
           (SELECT k.son_durum FROM kargolar k
              WHERE k.satis_id=s.id AND COALESCE(k.durum,'')!='iptal'
              ORDER BY k.id DESC LIMIT 1) AS kargo_durum
    FROM satislar s
    LEFT JOIN lokasyonlar l ON s.lokasyon_id=l.id
    LEFT JOIN musteriler m ON s.musteri_id=m.id
    ${where} ORDER BY s.tarih DESC
  `).all(...params)
  const kalemSorgu = db.prepare(`
    SELECT sk.urun_id, u.ad AS urun_adi, sk.miktar
    FROM satis_kalemleri sk JOIN urunler u ON sk.urun_id=u.id
    WHERE sk.satis_id=?`)
  for (const s of satislar) s.kalemler = kalemSorgu.all(s.id)
  return satislar
}

// Ön sipariş durumu ilerletme. 'iptal' BURADAN yazılmaz — iptal satislar:iptal
// akışının işidir (para/durum bütünlüğü orada kurulur).
function onSiparisDurumYaz(id, durum, db) {
  if (!ON_SIPARIS_DURUMLARI.includes(durum)) throw new Error('Geçersiz ön sipariş durumu')
  const satis = db.prepare('SELECT id FROM satislar WHERE id=? AND on_siparis=1').get(id)
  if (!satis) throw new Error('Ön sipariş bulunamadı')
  db.prepare('UPDATE satislar SET on_siparis_durum=? WHERE id=?').run(durum, id)
  return { mesaj: 'Ön sipariş durumu güncellendi' }
}
```

Test şemasında `kargolar` tablosu yok; alt sorgular tablo yokken patlar. Bu yüzden Step 1'deki `beforeEach` şemasına şu satırı ekle (`satis_odemeler` CREATE'inin altına):

```sql
    CREATE TABLE kargolar (id INTEGER PRIMARY KEY AUTOINCREMENT, satis_id INTEGER, takip_no TEXT, durum TEXT, son_durum TEXT);
```

- [ ] **Step 4: IPC kanallarını kaydet**

`electron/db/satislar.js` `module.exports` içine, `_iptal` satırının yanına:

```js
  _onSiparisler: onSiparisleriGetir,
  _onSiparisDurum: onSiparisDurumYaz,

  'satislar:on-siparisler': (filtre) => {
    yetkiKontrol('satis_gecmisi_goruntule')
    return onSiparisleriGetir(filtre || {}, getDb())
  },

  'satislar:on-siparis-durum': ({ id, durum }) => {
    yetkiKontrol('on_siparis_yap')
    return onSiparisDurumYaz(id, durum, getDb())
  },
```

- [ ] **Step 5: Renderer API'sini ekle**

`src/api/ipc.js` satır 35'teki `iade:` satırının ALTINA:

```js
  onSiparisler: (params) => invoke('satislar:on-siparisler', params),
  onSiparisDurum: (id, durum) => invoke('satislar:on-siparis-durum', { id, durum }),
```

- [ ] **Step 6: Testleri çalıştır**

Run: `npx vitest run electron/db/satislar.test.js`
Expected: PASS — 20 test

Run: `npx vitest run`
Expected: PASS — 249 test

- [ ] **Step 7: Commit**

```bash
git add electron/db/satislar.js electron/db/satislar.test.js src/api/ipc.js
git commit -m "feat(on-siparis): listeleme ve durum guncelleme uclari"
```

---

### Task 5: Satış ekranı ön sipariş kutucuğu

**Files:**
- Modify: `src/pages/Satis.jsx` (state, `satisOlustur`, sepet altı UI)

**Interfaces:**
- Consumes: `satisApi.olustur({ ..., on_siparis, on_siparis_not })` (Task 1), `on_siparis_yap` yetkisi (Task 3)
- Produces: kullanıcı görünür akış — bu task'tan sonraki task'lar buna bağımlı değil.

- [ ] **Step 1: State ve yetkiyi ekle**

`src/pages/Satis.jsx` içinde `const [sonSatis, setSonSatis] = useState(...)` benzeri state tanımlarının yanına ekle:

```jsx
  // Ön sipariş: stokta olmayan ürün için peşin ödemeli satış. Stok düşülmez.
  // KALICI DEĞİL — her satıştan sonra sıfırlanır ki yanlışlıkla açık kalmasın.
  const [onSiparis, setOnSiparis] = useState(false)
  const [onSiparisNot, setOnSiparisNot] = useState('')
  const onSiparisYetkisi = yetkiVar('on_siparis_yap')
```

`yetkiVar` bu dosyada zaten `useAuth()`'tan geliyorsa tekrar tanımlama; gelmiyorsa `kargoYetkisi`'nin türetildiği satırın yanına aynı kalıpla ekle.

- [ ] **Step 2: Payload'a alanları geçir**

`satisOlustur` içinde (satır ~282) `stok_zorla: !!ayarlar.stok_yetersiz_satis,` satırının ALTINA:

```jsx
        // Ön siparişte backend stok kontrolünü ve stok düşümünü atlar.
        on_siparis: onSiparis || undefined,
        on_siparis_not: onSiparis ? (onSiparisNot.trim() || null) : undefined,
```

- [ ] **Step 3: Başarı mesajını ve sıfırlamayı güncelle**

Aynı fonksiyonda satır ~289'daki

```jsx
      toast.success(`✓ Satış tamamlandı — Fiş: ${satis.fis_no}`)
```
yerine:
```jsx
      toast.success(onSiparis
        ? `✓ Ön sipariş alındı (stok düşülmedi) — Fiş: ${satis.fis_no}`
        : `✓ Satış tamamlandı — Fiş: ${satis.fis_no}`)
```

Satır ~294'teki `setParcaliAcik(false); setParcali({ nakit: '', kart: '', havale: '' })` satırının ALTINA:

```jsx
      setOnSiparis(false); setOnSiparisNot('')
```

- [ ] **Step 4: Kutucuğu ve notu ekle**

`src/pages/Satis.jsx` satır 662'deki "➗ Parçalı Ödeme" butonunun ÜSTÜNE:

```jsx
          {onSiparisYetkisi && (
            <div className={`rounded-lg border px-3 py-2 transition-colors ${onSiparis ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={onSiparis} onChange={e => setOnSiparis(e.target.checked)}
                  className="w-4 h-4 accent-amber-600" />
                <span className="text-xs font-semibold text-gray-700">🕐 Ön Sipariş <span className="font-normal text-gray-500">(stok düşülmez)</span></span>
              </label>
              {onSiparis && (
                <input type="text" value={onSiparisNot} onChange={e => setOnSiparisNot(e.target.value)}
                  placeholder="Not (ör. tedarikçiden 10 gün)"
                  className="mt-2 w-full text-xs border border-amber-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400" />
              )}
            </div>
          )}
```

- [ ] **Step 5: Tamamla butonunu ayırt edilir yap**

Satır ~680-683'teki tamamla butonunu şununla değiştir:

```jsx
          <button onClick={() => satisOlustur()} disabled={islemde}
            className={`w-full text-white py-3 rounded-xl font-bold disabled:opacity-50 text-sm transition-colors ${
              onSiparis ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'}`}>
            {islemde ? '⏳ İşleniyor...' : `${onSiparis ? '🕐 Ön Siparişi Kaydet' : '✓ Satışı Tamamla'}  ₺${genelToplamSon.toFixed(2)}`}
          </button>
```

- [ ] **Step 6: Elle doğrula**

`npm run dev` ile uygulamayı aç. Yönetici hesabıyla:
1. Stoğu 0 olan bir ürünü sepete ekle → "Ön Sipariş" kutucuğunu işaretle → tamamla.
   Beklenen: satış oluşur, "Ön sipariş alındı" toast'ı çıkar, hata YOK.
2. Ürünler sekmesinde o ürünün stoğuna bak. Beklenen: **değişmemiş**.
3. Kutucuk işaretsiz aynı ürünü satmayı dene. Beklenen: "Yetersiz stok" hatası.

Not: `npm run dev` iki sessiz sebeple ölebilir — kurulu uygulama açıksa tek-örnek kilidi yüzünden Electron kod 0 ile çıkar; önce kurulu uygulamayı kapat.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Satis.jsx
git commit -m "feat(on-siparis): satis ekrani on siparis kutucugu"
```

---

### Task 6: Ön Siparişler sekmesi ve kargo oluşturma

**Files:**
- Create: `src/pages/OnSiparisler.jsx`
- Create: `src/pages/SiparisMerkezi.jsx`
- Modify: `src/App.jsx:23` ve `src/App.jsx:37`

**Interfaces:**
- Consumes: `satisApi.onSiparisler`, `satisApi.onSiparisDurum`, `satisApi.iptal` (Task 4), `KargoFormu` (`src/components/KargoFormu.jsx`, mevcut), `lokasyonGondericiApi.ilIlceBul` (mevcut, `src/pages/OnlineSiparisler.jsx:187-211` kalıbı)
- Produces: `/online-siparisler` rotası artık iki sekmeli.

**Not:** `src/pages/OnlineSiparisler.jsx` **hiç değişmez** — 934 satırlık dosyaya dokunmamak bilinçli karar.

- [ ] **Step 1: Ön Siparişler sayfasını oluştur**

`src/pages/OnSiparisler.jsx`:

```jsx
import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { satisApi } from '../api/ipc'
import { lokasyonGondericiApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'
import KargoFormu from '../components/KargoFormu'

// Satış ekranından alınan ön siparişler (stok düşmeyen peşin ödemeli satışlar).
// Ürün geldiğinde buradan UPS kargosu oluşturulur ve durum ilerletilir.
const DURUM_ETIKET = {
  bekliyor: { ad: '🕐 Bekliyor', renk: 'bg-amber-100 text-amber-800' },
  kargolandi: { ad: '📦 Kargolandı', renk: 'bg-blue-100 text-blue-800' },
  teslim: { ad: '✓ Teslim Edildi', renk: 'bg-green-100 text-green-800' },
  iptal: { ad: '✕ İptal', renk: 'bg-red-100 text-red-700' },
}

export default function OnSiparisler() {
  const { yetkiVar } = useAuth()
  const [durum, setDurum] = useState('bekliyor')
  const [liste, setListe] = useState([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [kargoAcik, setKargoAcik] = useState(false)
  const [kargoBaslangic, setKargoBaslangic] = useState(null)
  const [kargoSatisId, setKargoSatisId] = useState(null)

  const yonetebilir = yetkiVar('on_siparis_yap')
  const kargoYetkisi = yetkiVar('kargo_yonet')

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    try {
      setListe(await satisApi.onSiparisler({ durum: durum || undefined }))
    } catch (e) { toast.error(e.message || 'Ön siparişler yüklenemedi') }
    finally { setYukleniyor(false) }
  }, [durum])

  useEffect(() => { yukle() }, [yukle])

  async function durumYaz(s, yeni) {
    try {
      await satisApi.onSiparisDurum(s.id, yeni)
      toast.success('Durum güncellendi')
      yukle()
    } catch (e) { toast.error(e.message || 'Durum güncellenemedi') }
  }

  async function iptalEt(s) {
    if (!window.confirm(`${s.fis_no} numaralı ön sipariş iptal edilsin mi? (Stok etkilenmez)`)) return
    try {
      await satisApi.iptal(s.id)
      toast.success('Ön sipariş iptal edildi')
      yukle()
    } catch (e) { toast.error(e.message || 'İptal edilemedi') }
  }

  // Kargo formunu müşterinin kayıtlı adresiyle ön doldur (il/ilçe adı → UPS kodu).
  // Kalıp: src/pages/OnlineSiparisler.jsx:187-211 ile aynı; bağ satisId üzerinden kurulur.
  async function kargoAc(s) {
    let ilIlce = { ilKodu: null, il: s.musteri_il || '', ilceKodu: null, ilce: s.musteri_ilce || '' }
    try { ilIlce = await lokasyonGondericiApi.ilIlceBul(s.musteri_il, s.musteri_ilce) } catch { /* bulunamazsa kullanıcı formdan seçer */ }
    setKargoSatisId(s.id)
    setKargoBaslangic({
      aliciAd: s.musteri_adi || '',
      aliciTelefon: s.musteri_telefon || '',
      aliciEmail: s.musteri_email || '',
      aliciAdres: s.musteri_adres || '',
      ilKodu: ilIlce.ilKodu, il: ilIlce.il, ilceKodu: ilIlce.ilceKodu, ilce: ilIlce.ilce,
      odemeTipi: 2, // gönderici öder
      musteriId: s.musteri_id || null,
      satisId: s.id,
      faturaNo: s.fis_no,
      referans: s.fis_no || '',
      aciklama: `Ön sipariş ${s.fis_no}`,
      gondericiLokasyonId: s.lokasyon_id || null,
    })
    setKargoAcik(true)
  }

  async function kargoTamamlandi() {
    setKargoAcik(false)
    if (kargoSatisId) await durumYaz({ id: kargoSatisId }, 'kargolandi')
    setKargoSatisId(null)
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-lg font-bold">🕐 Ön Siparişler</h2>
        <select value={durum} onChange={e => setDurum(e.target.value)}
          className="text-sm border rounded-lg px-2 py-1.5">
          <option value="bekliyor">Bekleyenler</option>
          <option value="kargolandi">Kargolananlar</option>
          <option value="teslim">Teslim edilenler</option>
          <option value="iptal">İptal edilenler</option>
          <option value="">Tümü</option>
        </select>
        <button onClick={yukle} className="text-sm text-gray-500 hover:text-gray-800">↻ Yenile</button>
      </div>

      {yukleniyor && <p className="text-sm text-gray-400">Yükleniyor…</p>}
      {!yukleniyor && liste.length === 0 && (
        <p className="text-sm text-gray-400">Bu filtrede ön sipariş yok.</p>
      )}

      <div className="space-y-2">
        {liste.map(s => {
          const d = DURUM_ETIKET[s.on_siparis_durum || 'bekliyor'] || DURUM_ETIKET.bekliyor
          const iptalEdilmis = s.durum === 'iptal'
          return (
            <div key={s.id} className="border rounded-xl p-3 bg-white">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{s.fis_no}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${d.renk}`}>{d.ad}</span>
                <span className="text-xs text-gray-500">{s.tarih}</span>
                <span className="ml-auto font-bold text-sm">₺{Number(s.genel_toplam || 0).toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-600">
                {s.musteri_adi || 'Müşteri seçilmemiş'}
                {s.musteri_telefon ? ` · ${s.musteri_telefon}` : ''}
                {` · ${s.odeme_tipi}`}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {s.kalemler.map(k => `${k.urun_adi} ×${k.miktar}`).join(', ')}
              </div>
              {s.on_siparis_not && <div className="text-xs text-amber-700 mt-1">📝 {s.on_siparis_not}</div>}
              {s.takip_no && <div className="text-xs text-blue-700 mt-1">📦 {s.takip_no}{s.kargo_durum ? ` — ${s.kargo_durum}` : ''}</div>}

              {!iptalEdilmis && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {kargoYetkisi && s.on_siparis_durum !== 'teslim' && (
                    <button onClick={() => kargoAc(s)}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                      📦 Kargo Oluştur
                    </button>
                  )}
                  {yonetebilir && s.on_siparis_durum !== 'teslim' && (
                    <button onClick={() => durumYaz(s, 'teslim')}
                      className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                      ✓ Teslim Edildi
                    </button>
                  )}
                  {yetkiVar('satis_iptal') && (
                    <button onClick={() => iptalEt(s)}
                      className="text-xs border border-red-300 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50">
                      ✕ İptal
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <KargoFormu acik={kargoAcik} kapat={() => { setKargoAcik(false); setKargoSatisId(null) }}
        baslangic={kargoBaslangic} onTamam={kargoTamamlandi} />
    </div>
  )
}
```

**Doğrulanmış arayüzler** (plan yazılırken kaynaktan teyit edildi):
- `KargoFormu({ acik, kapat, baslangic, onTamam })` — `src/components/KargoFormu.jsx:20`
- `baslangic` kabul edilen alanlar `BOS` nesnesinde tanımlı — `KargoFormu.jsx:7-15`: `aliciAd, aliciTelefon, aliciCep, aliciEmail, aliciAdres, ilKodu, il, ilceKodu, ilce, postaKodu, koliAdedi, agirlik, aciklama, servisSeviyesi, odemeTipi, faturaNo, referans, musteriId, satisId, gondericiLokasyonId, onlineSiparisId, iade, kapidaOdeme, kapidaOdemeTutar, kapidaOdemeTipi`. Listede olmayan bir anahtar forma ulaşmaz.
- `lokasyonGondericiApi.ilIlceBul(il, ilce)` → `{ ilKodu, il, ilceKodu, ilce }` — `src/api/ipc.js:122` (kanal `ups:il-ilce-bul`). Bulunamazsa kodlar `null` gelir; `''` DEĞİL.

- [ ] **Step 2: Sekmeli sarmalayıcıyı oluştur**

`src/pages/SiparisMerkezi.jsx`:

```jsx
import { useSearchParams } from 'react-router-dom'
import Sekmeler from '../components/Sekmeler'
import { useAuth } from '../auth/AuthContext'
import OnlineSiparisler from './OnlineSiparisler.jsx'
import OnSiparisler from './OnSiparisler.jsx'

// Web siparişleri (ikas) + mağazadan alınan ön siparişler tek sayfada sekmeli.
// ?sekme=on-siparis ile doğrudan ön sipariş sekmesi açılabilir.
export default function SiparisMerkezi() {
  const { yetkiVar } = useAuth()
  const [params] = useSearchParams()
  const sekmeler = [
    yetkiVar('online_siparis_goruntule') && { kod: 'online', ad: '🛍️ Online Siparişler', el: <OnlineSiparisler /> },
    yetkiVar('satis_gecmisi_goruntule') && { kod: 'on-siparis', ad: '🕐 Ön Siparişler', el: <OnSiparisler /> },
  ].filter(Boolean)
  return <Sekmeler sekmeler={sekmeler} aktifKod={params.get('sekme')} />
}
```

- [ ] **Step 3: Rotayı bağla**

`src/App.jsx` satır 23'ü:

```jsx
import OnlineSiparisler from './pages/OnlineSiparisler.jsx'
```
şununla değiştir:
```jsx
import SiparisMerkezi from './pages/SiparisMerkezi.jsx'
```

Satır 37'yi:

```jsx
  { to: '/online-siparisler', label: '🛍️ Online Siparişler', yetki: 'online_siparis_goruntule', el: <OnlineSiparisler /> },
```
şununla değiştir:
```jsx
  { to: '/online-siparisler', label: '🛍️ Siparişler', yetkiler: ['online_siparis_goruntule', 'satis_gecmisi_goruntule'], el: <SiparisMerkezi /> },
```

`yetkiler` (çoğul) alanının menüde desteklendiğini `src/App.jsx:34`'teki `SatisFinans` satırı doğruluyor.

- [ ] **Step 4: Elle doğrula**

`npm run dev` ile:
1. Siparişler → Ön Siparişler sekmesi. Task 5'te alınan ön sipariş listede, durum "Bekliyor".
2. "Kargo Oluştur" → müşterinin adı/telefonu/adresi ön dolu geliyor mu?
3. Kargo oluştur → liste yenilenince durum "Kargolandı" ve takip no görünüyor mu?
4. "Teslim Edildi" → durum "Teslim Edildi", filtreyi değiştirince doğru grupta çıkıyor mu?
5. Online Siparişler sekmesi eskisi gibi çalışıyor mu (regresyon)?

- [ ] **Step 5: Commit**

```bash
git add src/pages/OnSiparisler.jsx src/pages/SiparisMerkezi.jsx src/App.jsx
git commit -m "feat(on-siparis): on siparisler sekmesi ve kargo olusturma"
```

---

### Task 7: Satış Geçmişi'nde rozet ve iade koruması

**Files:**
- Modify: `src/pages/SatisGecmisi.jsx:177-190` (rozet alanı) ve `:185`, `:265` (iade butonu koşulu)

**Interfaces:**
- Consumes: `satislar:listele` çıktısındaki `on_siparis` kolonu (Task 1'de eklendi; `SELECT s.*` sayesinde otomatik gelir)
- Produces: yok (son task)

**Neden gerekli:** `satislar:iade` stoğu ARTIRIR ve kaynak satışta `tip='satis'` şartı arar. Ön sipariş satırında iade butonunun görünmesi kullanıcıyı hataya sürükler; para iadesi İptal ile yapılır.

- [ ] **Step 1: Rozeti ekle**

`src/pages/SatisGecmisi.jsx` içinde satır 182 civarındaki durum rozetini render eden ifadenin YANINA (aynı hücrede, rozetin hemen ardına):

```jsx
                  {s.on_siparis === 1 && (
                    <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                      🕐 Ön Sipariş
                    </span>
                  )}
```

- [ ] **Step 2: İade butonunu gizle**

Satır 185 ve satır 265'teki

```jsx
s.durum === 'tamamlandi' && s.tip !== 'iade'
```
koşullarının HER İKİSİNİ de şununla değiştir:
```jsx
s.durum === 'tamamlandi' && s.tip !== 'iade' && s.on_siparis !== 1
```

Not: Bu koşul **iade** butonunu kapsar. Aynı satırda iptal butonu da varsa iptal koşuluna `on_siparis` şartı EKLENMEZ — ön sipariş iptali desteklenen akıştır (Task 2).

- [ ] **Step 3: Elle doğrula**

`npm run dev` ile Satış & Kasa → Satış Geçmişi:
1. Task 5'te alınan ön sipariş satırında "🕐 Ön Sipariş" rozeti var mı?
2. O satırda **iade** butonu görünmüyor, **iptal** butonu görünüyor mu?
3. Normal satış satırında iade butonu hâlâ var mı (regresyon)?

- [ ] **Step 4: Tüm testleri çalıştır**

Run: `npx vitest run`
Expected: PASS — 249 test

- [ ] **Step 5: Commit**

```bash
git add src/pages/SatisGecmisi.jsx
git commit -m "feat(on-siparis): satis gecmisi rozeti ve iade korumasi"
```

---

## Yayın öncesi kontrol listesi

- [ ] `npx vitest run` tamamen yeşil
- [ ] `supabase/09_on_siparis_yetki.sql` Supabase SQL editöründe çalıştırıldı (yoksa "Özel" rolde toggle çıkmaz)
- [ ] Yöneticiye `on_siparis_yap` yetkisi verildi, personelde kapalı olduğu doğrulandı
- [ ] Ön sipariş alındıktan sonra **ürün stoğu değişmedi** ve ikas'ta stok değişmedi (canlı teyit)
- [ ] Ön sipariş kasa gün sonu nakit beklentisine dahil (nakit alındıysa)
- [ ] Sürüm `package.json`'da patch hanesinden artırıldı (1.2.148 → 1.2.149)

## Kapsam dışı (tasarım dokümanı Bölüm 8)

Mal kabul → stok girişi → teslimde düşüm zinciri · çok-PC senkron (`electron/db/senk-sema.js` güncellenmiyor, ön sipariş alındığı PC'de görünür) · Dashboard bekleyen ön sipariş kartı · ön sipariş iadesi · müşteriye otomatik "ürününüz geldi" bildirimi
