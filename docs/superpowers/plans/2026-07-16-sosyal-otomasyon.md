# Gönderi Bazlı Otomatik Yorum Cevabı — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instagram gönderilerine gelen her yoruma, o gönderiye atanmış ürün şablonlarından üretilen tek bir özel mesaj (DM) ve ardından herkese açık bir teşekkür yanıtı otomatik gönderilsin.

**Architecture:** Saf mesaj birleştirme mantığı DB'den ayrı bir dosyada (`sablon-mesaj.js`, `satis-hesapla.js` deseni) — birim testi buradan. Şablon/otomasyon CRUD ayrı bir IPC modülünde. Çalıştırıcı (`otomasyon.js`) mevcut 120 sn'lik Meta polling turuna eklenir, yorumlar çekildikten sonra çalışır. Arayüz Sosyal Medya sekmesine iki parça ekler: gönderi detayında otomasyon paneli + şablon kütüphanesi.

**Tech Stack:** Electron 22 (Node 16, global `fetch` YOK → yerleşik `https`), better-sqlite3, React 18 + Tailwind, vitest.

**Spec:** `docs/superpowers/specs/2026-07-16-sosyal-otomasyon-design.md`

## Global Constraints

- **Meta: yorum başına TEK özel mesaj.** Bir gönderideki tüm ürünler tek mesajda birleşmeli.
- **Meta: mesaj ~1000 karakter.** Aşılırsa kaydetmeden önce uyar; kesik mesaj gönderme.
- **Meta: yorum 7 günden yeni olmalı.** Aday sorgusunda `mesaj_tarihi >= now - 7 gün`.
- **Meta: özel yanıt saatte 750 çağrı (IG hesabı başına).** Kod sınırı **saatte 500, hesap geneli**.
- **Özel mesaj uç noktası: `POST {PAGE_ID}/messages`** — IG için de Sayfa ID'si. `{ig_id}` DEĞİL.
- **`gonderen_ad != 'tenceremtava'` filtresi ZORUNLU** — kendi açık yanıtımız sonraki turda yorum olarak geri gelir; filtresiz sonsuz döngü olur.
- **Tekilleştirme `gonderen_ad` ile** — IG yorumlarında `from` istenemez (çekimi kırar), `gonderen_id` hep NULL.
- **Açık yanıt yalnız DM başarılıysa** yazılır.
- **Kişi başına gönderide tek DM.**
- Türkçe kod/yorum/arayüz. Sabitler UPPER_SNAKE_CASE, fonksiyonlar camelCase.
- IPC deseni: `module.exports = { 'kanal:adi': fn }`; `_` önekli export'lar IPC'ye kaydedilmez.

---

### Task 1: Mesaj birleştirme (saf mantık)

**Files:**
- Create: `electron/meta/sablon-mesaj.js`
- Test: `electron/meta/sablon-mesaj.test.js`

**Interfaces:**
- Consumes: yok (saf fonksiyon, bağımlılıksız)
- Produces:
  - `fiyatYaz(n: number|null) → string|null` — 1450 → `"1.450 TL"`, null/0 → `null`
  - `sablonBloku(s: {urun_adi, aciklama, fiyat, link, whatsapp}, whatsappYaz: boolean) → string`
  - `mesajOlustur({sablonlar: Array, selamlama?: string}) → {metin: string, karakter: number, asildi: boolean}`
  - `MAKS_KARAKTER = 1000`

- [ ] **Step 1: Write the failing test**

```javascript
// electron/meta/sablon-mesaj.test.js
import { describe, test, expect } from 'vitest'
import sablonMesaj from './sablon-mesaj.js'

const { fiyatYaz, mesajOlustur, MAKS_KARAKTER } = sablonMesaj

const kase = {
  urun_adi: "Çelik Kase Seti 6'lı",
  aciklama: '18/10 paslanmaz çelik, iç içe geçen tasarım',
  fiyat: 1450,
  link: 'tencerecim.store/celik-kase-seti',
  whatsapp: '0555 123 45 67',
}
const granit = {
  urun_adi: 'Granit Tencere Seti 7 Parça',
  aciklama: 'Çizilmez granit kaplama',
  fiyat: 2300,
  link: 'tencerecim.store/granit-set',
  whatsapp: '0555 123 45 67',
}

describe('fiyatYaz', () => {
  test('binlik ayıracı ile TL yazar', () => {
    expect(fiyatYaz(1450)).toBe('1.450 TL')
    expect(fiyatYaz(2300.5)).toBe('2.300,5 TL')
  })

  test('fiyat yoksa null döner (fiyat satırı hiç yazılmasın)', () => {
    expect(fiyatYaz(null)).toBe(null)
    expect(fiyatYaz(0)).toBe(null)
    expect(fiyatYaz(undefined)).toBe(null)
  })
})

describe('mesajOlustur', () => {
  test('tek ürünü selamlama + blok + whatsapp olarak yazar', () => {
    const { metin } = mesajOlustur({ sablonlar: [kase] })
    expect(metin).toContain('Merhaba')
    expect(metin).toContain("Çelik Kase Seti 6'lı")
    expect(metin).toContain('18/10 paslanmaz çelik, iç içe geçen tasarım')
    expect(metin).toContain('1.450 TL')
    expect(metin).toContain('tencerecim.store/celik-kase-seti')
    expect(metin).toContain('0555 123 45 67')
  })

  test('fiyat null ise fiyat satırı yazılmaz ama diğerleri yazılır', () => {
    const { metin } = mesajOlustur({ sablonlar: [{ ...kase, fiyat: null }] })
    expect(metin).not.toContain('TL')
    expect(metin).toContain("Çelik Kase Seti 6'lı")
    expect(metin).toContain('tencerecim.store/celik-kase-seti')
  })

  test('whatsapp AYNI ise mesajda YALNIZCA BİR KEZ görünür', () => {
    const { metin } = mesajOlustur({ sablonlar: [kase, granit] })
    const kac = metin.split('0555 123 45 67').length - 1
    expect(kac).toBe(1)
  })

  test('whatsapp FARKLI ise her ürünün altında ayrı görünür', () => {
    const digerHat = { ...granit, whatsapp: '0555 999 88 77' }
    const { metin } = mesajOlustur({ sablonlar: [kase, digerHat] })
    expect(metin).toContain('0555 123 45 67')
    expect(metin).toContain('0555 999 88 77')
  })

  test('ürünleri verilen sırada yazar', () => {
    const { metin } = mesajOlustur({ sablonlar: [kase, granit] })
    expect(metin.indexOf("Çelik Kase")).toBeLessThan(metin.indexOf('Granit Tencere'))
  })

  test('1000 karakteri aşınca asildi=true döner', () => {
    const uzun = { ...kase, aciklama: 'x'.repeat(400) }
    const { asildi, karakter } = mesajOlustur({ sablonlar: [uzun, uzun, uzun] })
    expect(asildi).toBe(true)
    expect(karakter).toBeGreaterThan(MAKS_KARAKTER)
  })

  test('sınır altında asildi=false', () => {
    const { asildi } = mesajOlustur({ sablonlar: [kase] })
    expect(asildi).toBe(false)
  })

  test('şablon yoksa boş metin döner (otomasyon bunu göndermemeli)', () => {
    const { metin, asildi } = mesajOlustur({ sablonlar: [] })
    expect(metin).toBe('')
    expect(asildi).toBe(false)
  })

  test('metin ASLA kesilmez — asildi bayrağı uyarı içindir, gönderim engellenir', () => {
    const uzun = { ...kase, aciklama: 'x'.repeat(400) }
    const { metin } = mesajOlustur({ sablonlar: [uzun, uzun, uzun] })
    expect(metin).toContain('x'.repeat(400))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run electron/meta/sablon-mesaj.test.js`
Expected: FAIL — `Failed to load ./sablon-mesaj.js` (dosya yok)

- [ ] **Step 3: Write minimal implementation**

```javascript
// electron/meta/sablon-mesaj.js
// Şablonlardan müşteriye gidecek özel mesajı üretir — veritabanından BAĞIMSIZ saf mantık
// (satis-hesapla.js deseni). Kullanıcı mesajın tamamını asla yazmaz; kutuları doldurur,
// burası birleştirir.
//
// Meta kuralı: yorum başına TEK mesaj → bir gönderideki TÜM ürünler bu tek mesajda birleşir.
// Meta sınırı: ~1000 karakter. Aşılırsa METNİ KESMİYORUZ — asildi=true dönüp arayüz uyarıyor,
// çünkü yarısı kesilmiş bir fiyat mesajı müşteriye gitmemeli.

const MAKS_KARAKTER = 1000
const SELAMLAMA = 'Merhaba! 👋'

/**
 * Fiyatı Türkçe biçimde yazar. Fiyat yoksa null → çağıran satırı hiç yazmaz.
 * @param {number|null|undefined} n
 * @returns {string|null}
 */
function fiyatYaz(n) {
  const s = Number(n)
  if (!s || Number.isNaN(s)) return null
  return `${s.toLocaleString('tr-TR')} TL`
}

/**
 * Tek ürünün bloğu.
 * @param {{urun_adi: string, aciklama?: string, fiyat?: number|null, link?: string, whatsapp?: string}} s
 * @param {boolean} whatsappYaz - true ise bu bloğun altına whatsapp yazılır (numaralar farklıysa)
 */
function sablonBloku(s, whatsappYaz) {
  const satirlar = [`🍲 ${s.urun_adi}`]
  if (s.aciklama) satirlar.push(s.aciklama)
  const f = fiyatYaz(s.fiyat)
  if (f) satirlar.push(`💰 ${f}`)
  if (s.link) satirlar.push(`🛒 ${s.link}`)
  if (whatsappYaz && s.whatsapp) satirlar.push(`📱 Sipariş: ${s.whatsapp}`)
  return satirlar.join('\n')
}

/**
 * Şablonlardan tam mesajı üretir.
 * WhatsApp tekilleştirme: numaralar AYNIYSA sonda bir kez (1000 karakteri israf etmemek için),
 * FARKLIYSA her ürünün altında ayrı.
 * @param {{sablonlar: Array, selamlama?: string}} girdi
 * @returns {{metin: string, karakter: number, asildi: boolean}}
 */
function mesajOlustur({ sablonlar, selamlama = SELAMLAMA }) {
  const liste = (sablonlar || []).filter(Boolean)
  if (!liste.length) return { metin: '', karakter: 0, asildi: false }

  const numaralar = [...new Set(liste.map(s => (s.whatsapp || '').trim()).filter(Boolean))]
  const ortakNumara = numaralar.length === 1 ? numaralar[0] : null

  const parcalar = [selamlama, '']
  for (const s of liste) {
    parcalar.push(sablonBloku(s, !ortakNumara))
    parcalar.push('')
  }
  if (ortakNumara) parcalar.push(`📱 Sipariş ve bilgi: ${ortakNumara}`)

  const metin = parcalar.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return { metin, karakter: metin.length, asildi: metin.length > MAKS_KARAKTER }
}

module.exports = { fiyatYaz, sablonBloku, mesajOlustur, MAKS_KARAKTER, SELAMLAMA }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run electron/meta/sablon-mesaj.test.js`
Expected: PASS — 11 tests

- [ ] **Step 5: Commit**

```bash
git add electron/meta/sablon-mesaj.js electron/meta/sablon-mesaj.test.js
git commit -m "feat(sosyal): sablon -> mesaj birlestirme (saf mantik + testler)"
```

---

### Task 2: Veritabanı şeması

**Files:**
- Modify: `electron/db/database.js` (migrate() sonuna, `sosyal_mesajlar` ALTER'larının hemen ardından)

**Interfaces:**
- Consumes: yok
- Produces: `sosyal_sablonlar`, `sosyal_otomasyonlar`, `sosyal_otomasyon_sablonlar` tabloları

- [ ] **Step 1: Şemayı ekle**

`electron/db/database.js` içinde `try { db.exec("ALTER TABLE sosyal_mesajlar ADD COLUMN ozel_mesaj_tarihi TEXT") } catch {}` satırının ALTINA ekle:

```javascript
  // --- Gönderi bazlı otomatik yorum cevabı ---
  // Şablon kütüphanesi otomasyondan AYRI: şablonun ömrü gönderiden uzun (yeni çelik kase
  // gönderisinde aynı şablon tekrar seçilir).
  db.exec(`CREATE TABLE IF NOT EXISTS sosyal_sablonlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL,
    urun_id INTEGER REFERENCES urunler(id),
    urun_adi TEXT NOT NULL,
    aciklama TEXT,
    fiyat REAL,
    link TEXT,
    whatsapp TEXT,
    aktif INTEGER DEFAULT 1,
    olusturma_tarihi TEXT DEFAULT (datetime('now','localtime'))
  );`)
  // fiyat NULL = "ürüne sor" (canlı fiyat), dolu = "bunu yaz" (kampanya/set fiyatı).
  // Ayrı bir fiyat_tipi bayrağı YOK — NULL'ın kendisi anlam taşır, senkron derdi olmaz.

  db.exec(`CREATE TABLE IF NOT EXISTS sosyal_otomasyonlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    konu_id TEXT NOT NULL UNIQUE,
    aktif INTEGER DEFAULT 0,
    acik_yanit_metni TEXT,
    baslangic_tarihi TEXT,
    olusturma_tarihi TEXT DEFAULT (datetime('now','localtime'))
  );`)

  db.exec(`CREATE TABLE IF NOT EXISTS sosyal_otomasyon_sablonlar (
    otomasyon_id INTEGER NOT NULL REFERENCES sosyal_otomasyonlar(id) ON DELETE CASCADE,
    sablon_id INTEGER NOT NULL REFERENCES sosyal_sablonlar(id),
    sira INTEGER DEFAULT 0,
    PRIMARY KEY (otomasyon_id, sablon_id)
  );`)
  db.exec("CREATE INDEX IF NOT EXISTS idx_sosyal_oto_konu ON sosyal_otomasyonlar(konu_id)")
```

- [ ] **Step 2: Tabloların oluştuğunu doğrula**

Run:
```bash
ELECTRON_RUN_AS_NODE=1 ./node_modules/electron/dist/electron.exe -e "
const D=require('./node_modules/better-sqlite3');
const db=new D('C:/Users/Burak/AppData/Roaming/tencerecim/tencerecim.db',{readonly:true});
console.log(db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sosyal%'\").all());
db.close()"
```
Expected: `sosyal_mesajlar`, `sosyal_sablonlar`, `sosyal_otomasyonlar`, `sosyal_otomasyon_sablonlar`

(Not: tablolar uygulama bir kez açılıp `init()` çalıştıktan sonra oluşur. Önce `npm run dev` ile aç, kapat, sonra doğrula.)

- [ ] **Step 3: Commit**

```bash
git add electron/db/database.js
git commit -m "feat(sosyal): otomasyon + sablon tablolari"
```

---

### Task 3: Şablon ve otomasyon CRUD (IPC)

**Files:**
- Create: `electron/db/sosyal-otomasyon.js`
- Modify: `electron/main.js:141-179` (handlerModules dizisine ekle)

**Interfaces:**
- Consumes: Task 2 tabloları
- Produces (IPC kanalları):
  - `'sosyal:sablonlar'` `() → Array<{id, ad, urun_id, urun_adi, aciklama, fiyat, link, whatsapp, aktif, urun_fiyati}>`
  - `'sosyal:sablonKaydet'` `({id?, ad, urun_id, urun_adi, aciklama, fiyat, link, whatsapp}) → {id}`
  - `'sosyal:sablonSil'` `(id) → {ok:true}`
  - `'sosyal:otomasyonGetir'` `({konu_id}) → {id, platform, konu_id, aktif, acik_yanit_metni, sablonlar: Array} | null`
  - `'sosyal:otomasyonKaydet'` `({konu_id, platform, aktif, acik_yanit_metni, sablon_idler: number[]}) → {id}`
  - `'sosyal:otomasyonAdaySayisi'` `({konu_id}) → {sayi: number}`
  - `_adaylar(db, konuId?) → Array<{id, konu_id, gonderen_ad, harici_id, platform}>` (otomasyon.js kullanır)
  - `_sablonlariCoz(db, otomasyonId) → Array<{urun_adi, aciklama, fiyat, link, whatsapp}>` (fiyat çözülmüş)

- [ ] **Step 1: Modülü yaz**

```javascript
// electron/db/sosyal-otomasyon.js
// Gönderi bazlı otomatik yorum cevabı: şablon kütüphanesi + gönderi otomasyonu CRUD.
// Çalıştırıcı ayrı dosyada (electron/meta/otomasyon.js) — burası yalnız veri katmanı.
const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')

const SAYFA_ADI = 'tenceremtava' // kendi yorumlarımızı elemek için (bkz. _adaylar)
const PENCERE_GUN = 7            // Meta: yoruma özel mesaj yalnız 7 gün içinde

// Şablonun fiyatını çözer: sablon.fiyat doluysa o, değilse ürünün canlı satış fiyatı.
// NULL fiyat = "ürüne sor" — zam yapılınca şablon kendiliğinden güncel kalır.
function _sablonlariCoz(db, otomasyonId) {
  return db.prepare(`
    SELECT s.urun_adi, s.aciklama, s.link, s.whatsapp,
           COALESCE(s.fiyat, u.satis_fiyati) AS fiyat
    FROM sosyal_otomasyon_sablonlar os
    JOIN sosyal_sablonlar s ON s.id = os.sablon_id
    LEFT JOIN urunler u ON u.id = s.urun_id
    WHERE os.otomasyon_id = ? AND s.aktif = 1
    ORDER BY os.sira, s.id
  `).all(otomasyonId)
}

// Cevaplanacak yorumlar. konuId verilirse yalnız o gönderi, verilmezse aktif tüm otomasyonlar.
//
// KRİTİK FİLTRELER:
//  - gonderen_ad != SAYFA_ADI : kendi açık yanıtımız sonraki polling turunda yorum olarak
//    geri gelir; bu filtre olmazsa otomasyon kendi yanıtına cevap verir → SONSUZ DÖNGÜ.
//  - NOT EXISTS(...) : kişi başına gönderide TEK DM (aynı kişi 6 yorum atarsa 6 DM gitmesin).
//    Tekilleştirme gonderen_ad ile — IG yorumlarında 'from' istenemez, gonderen_id hep NULL.
function _adaylar(db, konuId = null) {
  const kosul = konuId ? 'o.konu_id = ?' : 'o.aktif = 1'
  const params = konuId ? [konuId] : []
  return db.prepare(`
    SELECT m.id, m.konu_id, m.gonderen_ad, m.harici_id, m.platform, o.id AS otomasyon_id
    FROM sosyal_mesajlar m
    JOIN sosyal_otomasyonlar o ON o.konu_id = m.konu_id
    WHERE ${kosul}
      AND m.tur = 'yorum'
      AND m.yon = 'gelen'
      AND m.gonderen_ad != '${SAYFA_ADI}'
      AND m.ozel_mesaj_tarihi IS NULL
      AND m.mesaj_tarihi >= datetime('now', '-${PENCERE_GUN} days')
      AND NOT EXISTS (
        SELECT 1 FROM sosyal_mesajlar x
        WHERE x.konu_id = m.konu_id AND x.gonderen_ad = m.gonderen_ad
          AND x.ozel_mesaj_tarihi IS NOT NULL
      )
    GROUP BY m.gonderen_ad, m.konu_id
    ORDER BY m.mesaj_tarihi ASC
  `).all(...params)
}

module.exports = {
  _adaylar,
  _sablonlariCoz,

  // Şablon kütüphanesi (ürün bağlıysa canlı fiyatı da döner — arayüz önizlemede kullanır).
  'sosyal:sablonlar': () => getDb().prepare(`
    SELECT s.*, u.satis_fiyati AS urun_fiyati, u.ad AS urun_gercek_adi
    FROM sosyal_sablonlar s LEFT JOIN urunler u ON u.id = s.urun_id
    WHERE s.aktif = 1 ORDER BY s.ad
  `).all(),

  'sosyal:sablonKaydet': ({ id, ad, urun_id, urun_adi, aciklama, fiyat, link, whatsapp }) => {
    yetkiKontrol('sosyal_medya_yonet')
    if (!ad || !ad.trim()) throw new Error('Şablon adı gerekli.')
    if (!urun_adi || !urun_adi.trim()) throw new Error('Ürün adı gerekli.')
    const db = getDb()
    const p = [ad.trim(), urun_id || null, urun_adi.trim(), aciklama || null,
      fiyat === '' || fiyat == null ? null : Number(fiyat), link || null, whatsapp || null]
    if (id) {
      db.prepare(`UPDATE sosyal_sablonlar SET ad=?, urun_id=?, urun_adi=?, aciklama=?,
        fiyat=?, link=?, whatsapp=? WHERE id=?`).run(...p, id)
      return { id }
    }
    const r = db.prepare(`INSERT INTO sosyal_sablonlar
      (ad, urun_id, urun_adi, aciklama, fiyat, link, whatsapp) VALUES (?,?,?,?,?,?,?)`).run(...p)
    return { id: r.lastInsertRowid }
  },

  // Soft delete: geçmiş otomasyonların bağlantısı kırılmasın.
  'sosyal:sablonSil': (id) => {
    yetkiKontrol('sosyal_medya_yonet')
    getDb().prepare('UPDATE sosyal_sablonlar SET aktif = 0 WHERE id = ?').run(id)
    return { ok: true }
  },

  'sosyal:otomasyonGetir': ({ konu_id }) => {
    const db = getDb()
    const o = db.prepare('SELECT * FROM sosyal_otomasyonlar WHERE konu_id = ?').get(konu_id)
    if (!o) return null
    o.sablonlar = db.prepare(`
      SELECT s.*, os.sira FROM sosyal_otomasyon_sablonlar os
      JOIN sosyal_sablonlar s ON s.id = os.sablon_id
      WHERE os.otomasyon_id = ? ORDER BY os.sira, s.id
    `).all(o.id)
    o.bugun_giden = db.prepare(`SELECT COUNT(*) n FROM sosyal_mesajlar
      WHERE konu_id = ? AND date(ozel_mesaj_tarihi) = date('now','localtime')`).get(konu_id).n
    return o
  },

  'sosyal:otomasyonKaydet': ({ konu_id, platform, aktif, acik_yanit_metni, sablon_idler }) => {
    yetkiKontrol('sosyal_medya_yonet')
    const db = getDb()
    const tx = db.transaction(() => {
      let o = db.prepare('SELECT id, aktif FROM sosyal_otomasyonlar WHERE konu_id = ?').get(konu_id)
      if (!o) {
        const r = db.prepare(`INSERT INTO sosyal_otomasyonlar
          (platform, konu_id, aktif, acik_yanit_metni, baslangic_tarihi)
          VALUES (?,?,?,?,?)`).run(platform, konu_id, aktif ? 1 : 0, acik_yanit_metni || null,
            aktif ? new Date().toISOString() : null)
        o = { id: r.lastInsertRowid, aktif: 0 }
      } else {
        // baslangic_tarihi yalnız KAPALI→AÇIK geçişinde tazelenir.
        const acildi = aktif && !o.aktif
        db.prepare(`UPDATE sosyal_otomasyonlar SET aktif=?, acik_yanit_metni=?
          ${acildi ? ", baslangic_tarihi=datetime('now','localtime')" : ''} WHERE id=?`)
          .run(aktif ? 1 : 0, acik_yanit_metni || null, o.id)
      }
      db.prepare('DELETE FROM sosyal_otomasyon_sablonlar WHERE otomasyon_id = ?').run(o.id)
      const ekle = db.prepare(`INSERT INTO sosyal_otomasyon_sablonlar
        (otomasyon_id, sablon_id, sira) VALUES (?,?,?)`)
      ;(sablon_idler || []).forEach((sid, i) => ekle.run(o.id, sid, i))
      return o.id
    })
    return { id: tx() }
  },

  // Açma onayı için: "bu gönderide kaç kişiye mesaj gidecek?"
  // Aday sorgusunun AYNISINI kullanır → gösterilen sayı gerçekte gidecek sayıdır.
  'sosyal:otomasyonAdaySayisi': ({ konu_id }) => ({ sayi: _adaylar(getDb(), konu_id).length }),
}
```

- [ ] **Step 2: main.js'e kaydet**

`electron/main.js` handlerModules dizisinde `require('./db/sosyal-mesajlar'),` satırının ALTINA:

```javascript
  require('./db/sosyal-otomasyon'),
```

- [ ] **Step 3: Sözdizimi doğrula**

Run: `node --check electron/db/sosyal-otomasyon.js && node --check electron/main.js && echo OK`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add electron/db/sosyal-otomasyon.js electron/main.js
git commit -m "feat(sosyal): sablon + otomasyon CRUD (IPC)"
```

---

### Task 4: Otomasyon çalıştırıcı

**Files:**
- Create: `electron/meta/otomasyon.js`
- Modify: `electron/meta/index.js` (`tumunuCek` sonuna otomasyon çağrısı)

**Interfaces:**
- Consumes: `_adaylar`, `_sablonlariCoz` (Task 3), `mesajOlustur` (Task 1), `client.post` / `client._sayfaId()` (mevcut)
- Produces: `_otomasyonCalistir() → {islenen: number, dm: number, yanit: number, hatalar: string[], sinirDoldu: boolean}`

- [ ] **Step 1: Çalıştırıcıyı yaz**

```javascript
// electron/meta/otomasyon.js
// Gönderi bazlı otomatik yorum cevabı ÇALIŞTIRICISI.
// Ayrı dosya: meta/index.js zaten çekme/gönderme ile dolu; bu iş kendi güvenlik kurallarına sahip.
// Polling turunun SONUNDA çalışır (yorumlar çekildikten sonra).
const { getDb } = require('../db/database')
const { _adaylar, _sablonlariCoz } = require('../db/sosyal-otomasyon')
const { mesajOlustur } = require('./sablon-mesaj')
const client = require('./client')

// Meta özel yanıt sınırı: saatte 750 (IG hesabı başına). 500'de tutuyoruz çünkü her yorum
// 2 çağrı harcıyor (DM + açık yanıt) ve polling'in kendi çağrıları da aynı kotayı yiyor.
const SAATLIK_SINIR = 500
const CAGRI_ARASI_MS = 400

// Kayan pencere sayacı (bellekte; uygulama yeniden başlarsa sıfırlanır — kabul edilebilir,
// çünkü Meta'nın sayacı da saatlik kayar ve 500 tavanın altında pay bırakıyor).
let _gonderimZamanlari = []
function _kotaVar() {
  const birSaatOnce = Date.now() - 3600_000
  _gonderimZamanlari = _gonderimZamanlari.filter(t => t > birSaatOnce)
  return _gonderimZamanlari.length < SAATLIK_SINIR
}

const bekle = (ms) => new Promise(r => setTimeout(r, ms))

// Yoruma özel mesaj: POST {PAGE_ID}/messages + recipient.comment_id.
// IG için de SAYFA ID'si kullanılır ({ig_id} DEĞİL) — Meta dokümanı: "the Facebook Page ID,
// not the Instagram User ID". Bkz. docs + meta/index.js yorumdanMesaj.
async function _ozelMesaj(sayfaId, yorumHariciId, metin) {
  return client.post(`${sayfaId}/messages`, {
    recipient: JSON.stringify({ comment_id: yorumHariciId }),
    message: JSON.stringify({ text: metin }),
  })
}

// Herkese açık yanıt. IG'de {comment_id}/replies, FB'de {comment_id}/comments.
async function _acikYanit(platform, yorumHariciId, metin) {
  const yol = platform === 'instagram' ? 'replies' : 'comments'
  return client.post(`${yorumHariciId}/${yol}`, { message: metin })
}

async function otomasyonCalistir() {
  const db = getDb()
  const sonuc = { islenen: 0, dm: 0, yanit: 0, hatalar: [], sinirDoldu: false }
  const sayfaId = client._sayfaId()
  if (!sayfaId) return sonuc

  const adaylar = _adaylar(db)
  if (!adaylar.length) return sonuc

  // Otomasyon başına mesaj metnini BİR KEZ üret (her yorum için yeniden hesaplama).
  const metinOnbellek = new Map()
  const damgala = db.prepare(
    "UPDATE sosyal_mesajlar SET ozel_mesaj_tarihi = datetime('now','localtime') WHERE id = ?"
  )

  for (const a of adaylar) {
    if (!_kotaVar()) { sonuc.sinirDoldu = true; break }

    if (!metinOnbellek.has(a.otomasyon_id)) {
      const sablonlar = _sablonlariCoz(db, a.otomasyon_id)
      const { metin, asildi } = mesajOlustur({ sablonlar })
      // Şablon yoksa veya mesaj 1000'i aşıyorsa GÖNDERME — kesik/boş mesaj müşteriye gitmesin.
      metinOnbellek.set(a.otomasyon_id, (!metin || asildi) ? null : metin)
      if (asildi) sonuc.hatalar.push(`Otomasyon ${a.otomasyon_id}: mesaj 1000 karakteri aşıyor, gönderilmedi`)
    }
    const metin = metinOnbellek.get(a.otomasyon_id)
    if (!metin) continue

    try {
      await _ozelMesaj(sayfaId, a.harici_id, metin)
      _gonderimZamanlari.push(Date.now())
      sonuc.dm++
      // Damgayı DM'den HEMEN sonra yaz: açık yanıt patlarsa bile aynı yoruma ikinci DM gitmesin
      // (Meta zaten yorum başına tek hak veriyor, ikinci deneme hataya düşerdi).
      damgala.run(a.id)

      // Açık yanıt YALNIZ DM başarılıysa — "DM'den bilgi verilmiştir" yalan olmasın.
      const o = db.prepare('SELECT acik_yanit_metni FROM sosyal_otomasyonlar WHERE id = ?').get(a.otomasyon_id)
      if (o?.acik_yanit_metni) {
        try {
          await _acikYanit(a.platform, a.harici_id, o.acik_yanit_metni)
          _gonderimZamanlari.push(Date.now())
          sonuc.yanit++
        } catch (e) {
          sonuc.hatalar.push(`Açık yanıt (${a.gonderen_ad}): ${e.message}`)
        }
      }
    } catch (e) {
      // Tipik: yoruma zaten mesaj gitmiş (tek hak), yorum 7 günden eski.
      sonuc.hatalar.push(`DM (${a.gonderen_ad}): ${e.message}`)
      damgala.run(a.id) // tekrar denemeyelim; her turda aynı hatayı almanın anlamı yok
    }
    sonuc.islenen++
    await bekle(CAGRI_ARASI_MS)
  }
  return sonuc
}

module.exports = { _otomasyonCalistir: otomasyonCalistir }
```

- [ ] **Step 2: Polling turuna bağla**

`electron/meta/index.js` içinde `tumunuCek` fonksiyonunda, `_sonDurum = {...}` ATAMASINDAN ÖNCE ekle:

```javascript
  // Otomasyon: yorumlar çekildikten SONRA çalışır (yeni yorumlar bu turda yakalansın).
  // Hata turu bozmaz — çekme işi otomasyondan bağımsız sürmeli.
  try {
    const { _otomasyonCalistir } = require('./otomasyon')
    sonuc.otomasyon = await _otomasyonCalistir()
  } catch (e) {
    sonuc.hatalar.push(`otomasyon: ${e.message}`)
  }
```

- [ ] **Step 3: Sözdizimi doğrula**

Run: `node --check electron/meta/otomasyon.js && node --check electron/meta/index.js && echo OK`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add electron/meta/otomasyon.js electron/meta/index.js
git commit -m "feat(sosyal): otomasyon calistirici (hiz kisiti + sonsuz dongu korumasi)"
```

---

### Task 5: Renderer API köprüsü

**Files:**
- Modify: `src/api/ipc.js` (`sosyalApi` nesnesine ekle)

**Interfaces:**
- Consumes: Task 3 IPC kanalları
- Produces: `sosyalApi.sablonlar()`, `.sablonKaydet(v)`, `.sablonSil(id)`, `.otomasyonGetir({konu_id})`, `.otomasyonKaydet(v)`, `.otomasyonAdaySayisi({konu_id})`

- [ ] **Step 1: API'leri ekle**

`src/api/ipc.js` içinde `sosyalApi` nesnesinin içine ekle:

```javascript
  sablonlar: () => invoke('sosyal:sablonlar'),
  sablonKaydet: (v) => invoke('sosyal:sablonKaydet', v),
  sablonSil: (id) => invoke('sosyal:sablonSil', id),
  otomasyonGetir: (v) => invoke('sosyal:otomasyonGetir', v),
  otomasyonKaydet: (v) => invoke('sosyal:otomasyonKaydet', v),
  otomasyonAdaySayisi: (v) => invoke('sosyal:otomasyonAdaySayisi', v),
```

- [ ] **Step 2: Derleme doğrula**

Run: `npx vite build 2>&1 | tail -2`
Expected: `✓ built in ...`

- [ ] **Step 3: Commit**

```bash
git add src/api/ipc.js
git commit -m "feat(sosyal): otomasyon API koprusu"
```

---

### Task 6: Şablon formu ve kütüphanesi (arayüz)

**Files:**
- Create: `src/components/SablonFormu.jsx`
- Create: `src/components/SablonKutuphanesi.jsx`

**Interfaces:**
- Consumes:
  - `sosyalApi.sablonlar/sablonKaydet/sablonSil` (Task 5)
  - `urunlerApi.listele({boyut: 0}) → {toplam, urunler: [{id, ad, sku, satis_fiyati, ...}]}` — **dizi DEĞİL**, `boyut:0` sınırsız (`electron/db/urunler.js:60,81`)
  - `<AranabilirSecici secenekler={[{deger, etiket}]} deger onChange placeholder disabled />` — prop `onChange`, `onDegisim` DEĞİL (`src/components/AranabilirSecici.jsx:12-15`)
  - `mesajOlustur` **renderer'da kullanılamaz** (Node/CJS modülü, ana süreçte); önizleme formda yerel yapılır
- Produces:
  - `<SablonFormu sablon={obj|null} onKapat={fn} onKaydet={fn} />`
  - `<SablonKutuphanesi onSec={fn|null} />` — `onSec` verilirse seçici modda çalışır

- [ ] **Step 1: Formu yaz**

```jsx
// src/components/SablonFormu.jsx
// Şablon oluşturma/düzenleme. Kullanıcı KUTULARI doldurur; mesajın tamamını asla yazmaz.
// Mesaj birleştirme electron/meta/sablon-mesaj.js'te (ana süreç) — burada yalnız önizleme.
import { useState, useEffect } from 'react'
import { urunlerApi } from '../api/ipc'
import AranabilirSecici from './AranabilirSecici'

const MAKS_KARAKTER = 1000

// electron/meta/sablon-mesaj.js ile AYNI biçim — önizleme gerçeği yansıtsın.
function onizle({ urun_adi, aciklama, fiyat, link, whatsapp }) {
  const s = ['Merhaba! 👋', '', `🍲 ${urun_adi || '(ürün adı)'}`]
  if (aciklama) s.push(aciklama)
  const f = Number(fiyat)
  if (f) s.push(`💰 ${f.toLocaleString('tr-TR')} TL`)
  if (link) s.push(`🛒 ${link}`)
  s.push('')
  if (whatsapp) s.push(`📱 Sipariş ve bilgi: ${whatsapp}`)
  return s.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export default function SablonFormu({ sablon, onKapat, onKaydet }) {
  const [v, setV] = useState({
    ad: '', urun_id: null, urun_adi: '', aciklama: '', fiyat: '', link: '', whatsapp: '',
    ...(sablon || {}),
  })
  const [urunler, setUrunler] = useState([])
  const [urundenAl, setUrundenAl] = useState(sablon ? sablon.fiyat == null : true)

  // urunler:listele → { toplam, urunler }. boyut:0 = sınırsız (electron/db/urunler.js:60,81).
  useEffect(() => {
    urunlerApi.listele({ boyut: 0 }).then(r => setUrunler(r?.urunler || [])).catch(() => {})
  }, [])

  const secUrun = (id) => {
    const u = urunler.find(x => String(x.id) === String(id))
    setV(o => ({ ...o, urun_id: u ? u.id : null, urun_adi: o.urun_adi || (u?.ad || '') }))
  }
  const secili = urunler.find(u => String(u.id) === String(v.urun_id))
  const etkinFiyat = urundenAl ? (secili?.satis_fiyati ?? '') : v.fiyat
  const metin = onizle({ ...v, fiyat: etkinFiyat })
  const asildi = metin.length > MAKS_KARAKTER

  const kaydet = () => onKaydet({ ...v, fiyat: urundenAl ? null : (v.fiyat || null) })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onKapat}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-auto"
        onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-4">{sablon?.id ? 'Şablonu Düzenle' : 'Yeni Şablon'}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <Alan etiket="Şablon adı" not="listede göreceğin isim">
              <input value={v.ad} onChange={e => setV(o => ({ ...o, ad: e.target.value }))}
                placeholder="Çelik Kase Seti 6'lı" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </Alan>
            <Alan etiket="Ürün" not="bağlarsan fiyat programdan canlı gelir">
              {/* AranabilirSecici prop'u onChange (onDegisim DEĞİL) — bkz. IlIlceSecici.jsx:35 */}
              <AranabilirSecici
                secenekler={urunler.map(u => ({ deger: u.id, etiket: `${u.ad}${u.sku ? ' · ' + u.sku : ''}` }))}
                deger={v.urun_id || ''} onChange={secUrun} placeholder="Ürün ara…" />
            </Alan>
            <Alan etiket="Ürün adı" not="mesajda görünecek ad">
              <input value={v.urun_adi} onChange={e => setV(o => ({ ...o, urun_adi: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </Alan>
            <Alan etiket="Açıklama">
              <textarea value={v.aciklama || ''} onChange={e => setV(o => ({ ...o, aciklama: e.target.value }))}
                rows={2} placeholder="18/10 paslanmaz çelik, iç içe geçen tasarım"
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </Alan>
            <Alan etiket="Fiyat">
              <div className="flex items-center gap-2">
                <input value={urundenAl ? (secili?.satis_fiyati ?? '') : (v.fiyat || '')} disabled={urundenAl}
                  onChange={e => setV(o => ({ ...o, fiyat: e.target.value }))}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100" />
                <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                  <input type="checkbox" checked={urundenAl} disabled={!v.urun_id}
                    onChange={e => setUrundenAl(e.target.checked)} />
                  Üründen al
                </label>
              </div>
              {urundenAl && !v.urun_id && <p className="text-[11px] text-amber-600 mt-1">Önce ürün seç</p>}
            </Alan>
            <Alan etiket="Online sipariş linki">
              <input value={v.link || ''} onChange={e => setV(o => ({ ...o, link: e.target.value }))}
                placeholder="tencerecim.store/celik-kase-seti" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </Alan>
            <Alan etiket="WhatsApp sipariş hattı">
              <input value={v.whatsapp || ''} onChange={e => setV(o => ({ ...o, whatsapp: e.target.value }))}
                placeholder="0555 123 45 67" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </Alan>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Müşteriye gidecek mesaj</p>
            <pre className="bg-gray-50 border rounded-xl p-3 text-sm whitespace-pre-wrap font-sans h-64 overflow-auto">
              {metin}
            </pre>
            <p className={`text-xs mt-2 ${asildi ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
              {metin.length}/{MAKS_KARAKTER} karakter
              {asildi && ' — sınır aşıldı, kısaltın'}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onKapat} className="px-4 py-2 text-sm text-gray-600">İptal</button>
          <button onClick={kaydet} disabled={!v.ad?.trim() || !v.urun_adi?.trim() || asildi}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-40">Kaydet</button>
        </div>
      </div>
    </div>
  )
}

function Alan({ etiket, not, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-600">{etiket}</label>
      {not && <span className="text-[11px] text-gray-400 ml-1">· {not}</span>}
      <div className="mt-1">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: Kütüphaneyi yaz**

```jsx
// src/components/SablonKutuphanesi.jsx
// Şablon listesi. onSec verilirse SEÇİCİ modda çalışır (otomasyon paneli kullanır),
// verilmezse YÖNETİM modunda (düzenle/sil).
import { useState, useEffect } from 'react'
import { sosyalApi } from '../api/ipc'
import SablonFormu from './SablonFormu'
import toast from 'react-hot-toast'

export default function SablonKutuphanesi({ onSec = null, kapat = null }) {
  const [liste, setListe] = useState([])
  const [ara, setAra] = useState('')
  const [formda, setFormda] = useState(null) // null=kapalı, {}=yeni, {id..}=düzenle

  const yukle = () => sosyalApi.sablonlar().then(setListe).catch(e => toast.error(e.message))
  useEffect(() => { yukle() }, [])

  const kaydet = async (v) => {
    try {
      await sosyalApi.sablonKaydet(v)
      toast.success('Şablon kaydedildi'); setFormda(null); yukle()
    } catch (e) { toast.error(e.message) }
  }
  const sil = async (id) => {
    if (!confirm('Şablon silinsin mi?')) return
    try { await sosyalApi.sablonSil(id); yukle() } catch (e) { toast.error(e.message) }
  }

  const suz = liste.filter(s =>
    !ara.trim() || `${s.ad} ${s.urun_adi}`.toLocaleLowerCase('tr').includes(ara.toLocaleLowerCase('tr')))

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input value={ara} onChange={e => setAra(e.target.value)} placeholder="🔍 Şablon ara…"
          className="flex-1 border rounded-lg px-3 py-2 text-sm" />
        <button onClick={() => setFormda({})} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm">
          + Yeni
        </button>
        {kapat && <button onClick={kapat} className="text-gray-400 px-2">✕</button>}
      </div>

      {!suz.length && <p className="text-sm text-gray-400 py-6 text-center">Şablon yok. "+ Yeni" ile ekleyin.</p>}

      <div className="space-y-2">
        {suz.map(s => (
          <div key={s.id} className="border rounded-xl p-3 flex items-center gap-3 hover:bg-gray-50">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm">{s.ad}</div>
              <div className="text-xs text-gray-500 truncate">
                {s.urun_adi}
                {s.fiyat != null
                  ? <span className="text-gray-400"> · {Number(s.fiyat).toLocaleString('tr-TR')} TL (sabit)</span>
                  : s.urun_fiyati != null
                    ? <span className="text-emerald-600"> · {Number(s.urun_fiyati).toLocaleString('tr-TR')} TL (canlı)</span>
                    : <span className="text-amber-600"> · fiyat yok</span>}
              </div>
            </div>
            {onSec
              ? <button onClick={() => onSec(s)} className="text-blue-600 text-sm font-medium">Ekle</button>
              : <>
                  <button onClick={() => setFormda(s)} className="text-gray-500 text-sm">Düzenle</button>
                  <button onClick={() => sil(s.id)} className="text-red-500 text-sm">Sil</button>
                </>}
          </div>
        ))}
      </div>

      {formda && <SablonFormu sablon={formda.id ? formda : null}
        onKapat={() => setFormda(null)} onKaydet={kaydet} />}
    </div>
  )
}
```

- [ ] **Step 3: Derleme doğrula**

Run: `npx vite build 2>&1 | tail -2`
Expected: `✓ built in ...`

- [ ] **Step 4: Commit**

```bash
git add src/components/SablonFormu.jsx src/components/SablonKutuphanesi.jsx
git commit -m "feat(sosyal): sablon formu + kutuphanesi"
```

---

### Task 7: Gönderi otomasyon paneli (arayüz)

**Files:**
- Create: `src/components/OtomasyonPaneli.jsx`
- Modify: `src/pages/SosyalMedya.jsx` (YorumGorunum sağ panele ekle)

**Interfaces:**
- Consumes: `sosyalApi.otomasyonGetir/otomasyonKaydet/otomasyonAdaySayisi` (Task 5), `SablonKutuphanesi` (Task 6)
- Produces: `<OtomasyonPaneli konu={{platform, konu_id}} />`

- [ ] **Step 1: Paneli yaz**

```jsx
// src/components/OtomasyonPaneli.jsx
// Gönderi başına otomatik yorum cevabı paneli. Gönderi detayında görünür.
import { useState, useEffect } from 'react'
import { sosyalApi } from '../api/ipc'
import SablonKutuphanesi from './SablonKutuphanesi'
import toast from 'react-hot-toast'

const VARSAYILAN_YANIT = 'Bizler ile iletişime geçtiğiniz için teşekkür ederiz, DM\'den detaylı bilgi verilmiştir.'

export default function OtomasyonPaneli({ konu }) {
  const [oto, setOto] = useState(null)
  const [sablonlar, setSablonlar] = useState([])
  const [yanit, setYanit] = useState(VARSAYILAN_YANIT)
  const [secici, setSecici] = useState(false)
  const [mesgul, setMesgul] = useState(false)

  useEffect(() => {
    if (!konu?.konu_id) return
    sosyalApi.otomasyonGetir({ konu_id: konu.konu_id }).then(o => {
      setOto(o)
      setSablonlar(o?.sablonlar || [])
      setYanit(o?.acik_yanit_metni ?? VARSAYILAN_YANIT)
    }).catch(() => {})
  }, [konu?.konu_id])

  const kaydet = async (aktif) => {
    // Açarken KAÇ KİŞİYE gideceğini göster — körlemesine tetiklenmesin.
    if (aktif && !oto?.aktif) {
      if (!sablonlar.length) return toast.error('Önce en az bir şablon ekleyin.')
      const { sayi } = await sosyalApi.otomasyonAdaySayisi({ konu_id: konu.konu_id })
      if (sayi > 0 && !confirm(
        `Bu gönderide ${sayi} kişiye mesaj gidecek (son 7 gündeki cevaplanmamış yorumlar).\n\nOnaylıyor musunuz?`
      )) return
    }
    setMesgul(true)
    try {
      await sosyalApi.otomasyonKaydet({
        konu_id: konu.konu_id, platform: konu.platform, aktif,
        acik_yanit_metni: yanit, sablon_idler: sablonlar.map(s => s.id),
      })
      const o = await sosyalApi.otomasyonGetir({ konu_id: konu.konu_id })
      setOto(o)
      toast.success(aktif ? 'Otomasyon açıldı' : 'Otomasyon kapatıldı')
    } catch (e) { toast.error(e.message) }
    finally { setMesgul(false) }
  }

  const ekle = (s) => {
    if (sablonlar.some(x => x.id === s.id)) return toast.error('Bu şablon zaten ekli.')
    setSablonlar(l => [...l, s]); setSecici(false)
  }
  const cikar = (id) => setSablonlar(l => l.filter(s => s.id !== id))
  const acik = !!oto?.aktif

  return (
    <div className="border rounded-xl p-3 bg-gradient-to-br from-violet-50 to-blue-50">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm">⚡ Otomasyon</span>
        <div className="flex items-center gap-2">
          {oto?.bugun_giden > 0 && <span className="text-[11px] text-gray-500">Bugün {oto.bugun_giden} mesaj</span>}
          <button onClick={() => kaydet(!acik)} disabled={mesgul}
            className={`relative w-11 h-6 rounded-full transition ${acik ? 'bg-emerald-500' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${acik ? 'left-5.5' : 'left-0.5'}`} />
          </button>
        </div>
      </div>
      <p className="text-[11px] text-gray-500 mb-2">
        {acik ? 'Bu gönderiye gelen her yoruma otomatik DM + açık yanıt gidiyor.'
              : 'Kapalı. Açınca gelen yorumlara otomatik cevap verilir.'}
      </p>

      <div className="space-y-1 mb-2">
        {sablonlar.map(s => (
          <div key={s.id} className="flex items-center gap-2 bg-white border rounded-lg px-2 py-1.5">
            <span className="text-xs flex-1 truncate">{s.ad}</span>
            <button onClick={() => cikar(s.id)} className="text-gray-400 text-xs hover:text-red-500">✕</button>
          </div>
        ))}
        <button onClick={() => setSecici(true)} className="text-blue-600 text-xs font-medium">+ Şablon ekle</button>
      </div>

      <label className="text-[11px] font-semibold text-gray-600">Açık yanıt</label>
      <textarea value={yanit} onChange={e => setYanit(e.target.value)} rows={2}
        className="w-full border rounded-lg px-2 py-1.5 text-xs mt-1" />

      <button onClick={() => kaydet(acik)} disabled={mesgul}
        className="mt-2 w-full bg-white border text-sm py-1.5 rounded-lg hover:bg-gray-50">
        Değişiklikleri kaydet
      </button>

      {secici && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSecici(false)}>
          <div className="bg-white rounded-2xl p-4 w-full max-w-lg max-h-[80vh] overflow-auto"
            onClick={e => e.stopPropagation()}>
            <h4 className="font-bold mb-3">Şablon Seç</h4>
            <SablonKutuphanesi onSec={ekle} kapat={() => setSecici(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Gönderi detayına bağla**

`src/pages/SosyalMedya.jsx`:
1. Üst kısma import ekle: `import OtomasyonPaneli from '../components/OtomasyonPaneli'`
2. `YorumGorunum` içinde sağ panelde (`{/* SAĞ: gönderi önizleme */}` bölümünde), gönderi görselinin ALTINA:

```jsx
        <div className="p-3">
          <OtomasyonPaneli konu={konu} />
        </div>
```

- [ ] **Step 3: Derleme doğrula**

Run: `npx vite build 2>&1 | tail -2`
Expected: `✓ built in ...`

- [ ] **Step 4: Commit**

```bash
git add src/components/OtomasyonPaneli.jsx src/pages/SosyalMedya.jsx
git commit -m "feat(sosyal): gonderi otomasyon paneli"
```

---

### Task 8: Canlı doğrulama + sürüm

**Files:**
- Modify: `package.json` (sürüm 1.2.108 → 1.2.109)

- [ ] **Step 1: Tüm testleri çalıştır**

Run: `npm test`
Expected: tüm testler PASS (mevcut 3 dosya + yeni `sablon-mesaj.test.js`)

- [ ] **Step 2: Uygulamayı aç ve şablon oluştur**

Run: `npm run dev`
Kontroller:
- Sosyal Medya → Şablonlar → + Yeni → kutuları doldur → önizleme sağda mesajı gösteriyor mu?
- Karakter sayacı çalışıyor mu? Açıklamaya 1000+ karakter yazınca Kaydet kilitleniyor mu?
- Ürün seç → "Üründen al" işaretliyken fiyat kutusu ürünün fiyatını gösteriyor mu?

- [ ] **Step 3: Otomasyonu test hesabıyla dene**

- `burakgulmuyor` hesabından bir gönderiye TAZE yorum at
- O gönderiyi Sosyal Medya'da aç → ⚡ Otomasyon → şablon ekle → Aç
- Onay kutusunda kaç kişiye gideceği yazıyor mu? Sayı makul mü?
- 2 dakika bekle (polling turu) → DM geldi mi? Yorum altında açık yanıt göründü mü?
- Yorumda "💬 Mesaj gönderildi" işareti belirdi mi?

- [ ] **Step 4: Sonsuz döngü kontrolü (KRİTİK)**

- Otomasyon açıkken 2 polling turu bekle (~4 dk)
- Kontrol: bizim yazdığımız açık yanıta otomasyon cevap verdi mi? **VERMEMELİ.**

Run:
```bash
ELECTRON_RUN_AS_NODE=1 ./node_modules/electron/dist/electron.exe -e "
const D=require('./node_modules/better-sqlite3');
const db=new D('C:/Users/Burak/AppData/Roaming/tencerecim/tencerecim.db',{readonly:true});
console.log('Kendi yorumumuza damga (0 OLMALI):',
  db.prepare(\"SELECT COUNT(*) n FROM sosyal_mesajlar WHERE gonderen_ad='tenceremtava' AND ozel_mesaj_tarihi IS NOT NULL\").get().n);
db.close()"
```
Expected: `Kendi yorumumuza damga (0 OLMALI): 0`

- [ ] **Step 5: Sürümü artır ve commit**

`package.json`: `"version": "1.2.109"`

```bash
git add package.json
git commit -m "chore: v1.2.109 - gonderi bazli otomatik yorum cevabi"
```

---

## Self-Review Notları

**Spec kapsamı:** Şablon kütüphanesi (T3/T6) ✓, ürün bağlı canlı fiyat (T3 `_sablonlariCoz`) ✓,
çoklu ürün tek mesaj (T1) ✓, WhatsApp tekilleştirme (T1) ✓, gönderi başına aç/kapa (T7) ✓,
açık yanıt yalnız DM başarılıysa (T4) ✓, kişi başına tek DM (T3 `_adaylar`) ✓, 7 gün penceresi (T3) ✓,
saatte 500 (T4) ✓, açma onayı (T7) ✓, sonsuz döngü koruması (T3 filtre + T8 doğrulama) ✓,
1000 karakter uyarısı (T1 + T6) ✓.

**Bilinen ödünler:**
- Hız sayacı bellekte — uygulama yeniden başlarsa sıfırlanır. 500/750 payı bunu tolere ediyor.
- Önizleme mantığı iki yerde (T1 ana süreç, T6 renderer) — renderer Node modülü çağıramaz.
  Biçim değişirse ikisi de güncellenmeli. Alternatif (IPC ile önizleme) her tuş vuruşunda IPC demek.
