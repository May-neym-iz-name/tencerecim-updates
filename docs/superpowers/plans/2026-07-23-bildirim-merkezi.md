# Bildirim Merkezi Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** İkas'tan gelen iptal/iade taleplerini (ve ileride başka olayları) toplayan, sol menüde 🔔 rozetle görünen bir Bildirimler sekmesi eklemek.

**Architecture:** İkas tek gerçek kaynak; her PC ikas çekimi sırasında bildirimleri kendi yerel SQLite'ında `INSERT OR IGNORE` ile üretir (bulut senkronu yok). Algılama saf bir karar fonksiyonuna (`_durumdanBildirim`) ayrılır, mevcut `upsertSiparisler` döngüsüne tek noktadan bağlanır. Arayüz, mevcut `sosyalRozet` ve `Sayfalama` desenlerini birebir kullanır.

**Tech Stack:** Electron (CJS main process), better-sqlite3, React 18 + react-router-dom (HashRouter) + Tailwind, Vitest, Supabase (yetki_kodlari).

## Global Constraints

- Electron main process dosyaları **CommonJS** (`require`/`module.exports`); `src/` dosyaları **ESM + JSX**.
- Yeni yetki kodu **üç yerde** tutulmalı: `src/auth/izinler.js`, `electron/yetki.js`, ve Supabase `yetki_kodlari` (SQL ile). Parite testi (`src/auth/yetki-paritesi.test.js`) `TUM_KODLAR` listesini de içerir.
- IPC handler kayıt: modül `module.exports` nesnesi olarak `'kanal:ad': handler` döner; `electron/main.js` `handlerModules` dizisine eklenir. `_` önekli anahtarlar handler olarak kaydedilmez (özel yardımcılar).
- IPC dönüşü main.js tarafından `{ok, data}` sarmalanır; frontend `invoke` helper'ı `.data` döndürür / hata fırlatır.
- Yorumlar Türkçe, mevcut kod stiliyle uyumlu. Dosyalar < 800 satır.
- Sürüm artırma: yayın öncesi `package.json` patch hanesi (bkz. proje memory) — bu plan yayını KAPSAMAZ, sadece implementasyon.

---

### Task 1: `bildirimler` tablosu + CRUD modülü

**Files:**
- Modify: `electron/db/database.js` (yeni CREATE TABLE, `online_siparis_kalemleri` bloğundan sonra ~satır 244)
- Create: `electron/db/bildirimler.js`
- Modify: `electron/main.js:255` (handlerModules dizisine ekle)

**Interfaces:**
- Consumes: `getDb()` from `electron/db/database.js`.
- Produces: IPC kanalları:
  - `bildirim:liste` `({ sayfa=1, boyut=50 }) => { toplam:number, bildirimler:Row[] }`
  - `bildirim:onemliler` `() => Row[]` (onem='yuksek', okunmamış önce, en çok 100)
  - `bildirim:sayac` `() => number` (okunmamış toplam)
  - `bildirim:okundu` `(id:number) => { ok:true }`
  - `bildirim:tumunuOku` `() => { ok:true }`
  - Row şekli: `{ id, tip, baslik, mesaj, onem, ikas_siparis_id, dedup_anahtar, okundu, olusturma_tarihi }`
  - Ayrıca `_ekle(db, kayit)` — Task 2/3'ün kullanacağı `INSERT OR IGNORE` yardımcısı (bkz. Step 4).

- [ ] **Step 1: Tabloyu `database.js`'e ekle**

`electron/db/database.js` içinde `online_siparis_kalemleri` CREATE TABLE bloğunun hemen ardına (satır 244'ten sonra) ekle:

```javascript
    -- Bildirim merkezi: iptal/iade talepleri ve ileride diğer olaylar.
    -- Her PC ikas çekiminde kendi yerelinde üretir (bulut senkronu yok).
    -- dedup_anahtar UNIQUE: aynı olay her çekimde tekrar bildirilmez.
    CREATE TABLE IF NOT EXISTS bildirimler (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tip TEXT NOT NULL,
      baslik TEXT NOT NULL,
      mesaj TEXT,
      onem TEXT DEFAULT 'normal',
      ikas_siparis_id TEXT,
      dedup_anahtar TEXT UNIQUE,
      okundu INTEGER DEFAULT 0,
      olusturma_tarihi TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_bildirim_okundu ON bildirimler(okundu);
```

- [ ] **Step 2: CRUD modülünü oluştur**

Create `electron/db/bildirimler.js`:

```javascript
// Bildirim merkezi: listeleme, okunmamış sayacı, okundu işaretleme.
// Bildirim ÜRETİMİ ikas çekiminde yapılır (electron/ikas/bildirim-uret.js);
// bu modül yalnızca okuma + okundu durumunu yönetir. _ekle yardımcısı üretici içindir.
const { getDb } = require('./database')

// INSERT OR IGNORE: dedup_anahtar UNIQUE olduğu için aynı olay tekrar eklenmez.
// Döner: eklenen satır sayısı (0 = zaten vardı / eklenmedi).
function _ekle(db, k) {
  const r = db.prepare(`
    INSERT OR IGNORE INTO bildirimler (tip, baslik, mesaj, onem, ikas_siparis_id, dedup_anahtar)
    VALUES (@tip, @baslik, @mesaj, @onem, @ikas_siparis_id, @dedup_anahtar)
  `).run({
    tip: k.tip, baslik: k.baslik, mesaj: k.mesaj || null,
    onem: k.onem || 'normal', ikas_siparis_id: k.ikas_siparis_id || null,
    dedup_anahtar: k.dedup_anahtar,
  })
  return r.changes
}

module.exports = {
  _ekle,

  'bildirim:liste': ({ sayfa = 1, boyut = 50 } = {}) => {
    const db = getDb()
    const toplam = db.prepare('SELECT COUNT(*) n FROM bildirimler').get().n
    const bildirimler = db.prepare(
      `SELECT * FROM bildirimler ORDER BY olusturma_tarihi DESC, id DESC LIMIT ? OFFSET ?`
    ).all(boyut, (sayfa - 1) * boyut)
    return { toplam, bildirimler }
  },

  // Üstte gösterilecek belirgin blok: iptal/iade talepleri. Okunmamışlar önce.
  'bildirim:onemliler': () => {
    const db = getDb()
    return db.prepare(
      `SELECT * FROM bildirimler WHERE onem = 'yuksek'
       ORDER BY okundu ASC, olusturma_tarihi DESC, id DESC LIMIT 100`
    ).all()
  },

  'bildirim:sayac': () => {
    const db = getDb()
    return db.prepare('SELECT COUNT(*) n FROM bildirimler WHERE okundu = 0').get().n
  },

  'bildirim:okundu': (id) => {
    const db = getDb()
    db.prepare('UPDATE bildirimler SET okundu = 1 WHERE id = ?').run(id)
    return { ok: true }
  },

  'bildirim:tumunuOku': () => {
    const db = getDb()
    db.prepare('UPDATE bildirimler SET okundu = 1 WHERE okundu = 0').run()
    return { ok: true }
  },
}
```

- [ ] **Step 3: main.js'e kaydet**

`electron/main.js` içinde `handlerModules` dizisinde `require('./db/online-siparisler'),` satırından (satır 255) hemen sonra ekle:

```javascript
  require('./db/bildirimler'),
```

- [ ] **Step 4: Doğrula — uygulamayı başlat, hata yok**

Run: `npm run build`
Expected: Vite build hatasız tamamlanır (yeni CJS modülü sözdizimi doğru).

> Not: better-sqlite3 Electron ABI'sine bağlı olduğundan bu modülün DB davranışı vitest'te test EDİLMEZ (emsal: `electron/db/raporlar.test.js` başlığındaki not). Doğrulama build + Task 6 sonrası elle deneme ile yapılır.

- [ ] **Step 5: Commit**

```bash
git add electron/db/database.js electron/db/bildirimler.js electron/main.js
git commit -m "feat(bildirim): bildirimler tablosu + CRUD IPC modulu"
```

---

### Task 2: Algılama mantığı (saf fonksiyon + üretici) + test

**Files:**
- Create: `electron/ikas/bildirim-uret.js`
- Create: `electron/ikas/bildirim-uret.test.js`

**Interfaces:**
- Consumes: `_ekle(db, kayit)` from `electron/db/bildirimler.js` (Task 1).
- Produces:
  - `_durumdanBildirim(sip) => { tip, onem, baslik, mesaj, ikas_siparis_id, dedup_anahtar } | null` — SAF, DB'siz. `sip` = ikas sipariş nesnesi (`{ id, orderNumber, status, orderPackageStatus, totalFinalPrice, currencyCode, customer:{firstName,lastName} }`).
  - `bildirimUret(db, sip, ilkKurulum) => number` — `ilkKurulum` true ise 0 döner (üretmez); değilse `_durumdanBildirim` sonucunu `_ekle` ile yazar, eklenen satır sayısını döner.

- [ ] **Step 1: Testi yaz (başarısız olacak)**

Create `electron/ikas/bildirim-uret.test.js`:

```javascript
// Bildirim algılama KARAR mantığı — saf, DB'siz (emsal: kargo-durum.test.js _bildirimKarari).
import { describe, test, expect } from 'vitest'
import uretModul from './bildirim-uret.js'

const { _durumdanBildirim: karar } = uretModul

const sip = (over = {}) => ({
  id: 'ORD1', orderNumber: '1234', status: 'CREATED', orderPackageStatus: null,
  totalFinalPrice: 500, currencyCode: 'TRY',
  customer: { firstName: 'Ayşe', lastName: 'Yılmaz' }, ...over,
})

describe('_durumdanBildirim: talep durumlarını yakalar', () => {
  test('CANCEL_REQUESTED (paket) → iptal_talebi / yuksek', () => {
    const b = karar(sip({ orderPackageStatus: 'CANCEL_REQUESTED' }))
    expect(b).toMatchObject({ tip: 'iptal_talebi', onem: 'yuksek', ikas_siparis_id: 'ORD1' })
    expect(b.dedup_anahtar).toBe('ORD1:iptal_talebi:CANCEL_REQUESTED')
    expect(b.baslik).toContain('1234')
  })

  test('REFUND_REQUESTED (sipariş durumu) → iade_talebi / yuksek', () => {
    const b = karar(sip({ status: 'REFUND_REQUESTED' }))
    expect(b).toMatchObject({ tip: 'iade_talebi', onem: 'yuksek' })
    expect(b.mesaj).toContain('Ayşe')
  })

  test('REFUND_REQUEST_ACCEPTED → iade_kabul / normal', () => {
    const b = karar(sip({ orderPackageStatus: 'REFUND_REQUEST_ACCEPTED' }))
    expect(b).toMatchObject({ tip: 'iade_kabul', onem: 'normal' })
  })

  test('REFUND_REJECTED → iade_red / normal', () => {
    const b = karar(sip({ status: 'REFUND_REJECTED' }))
    expect(b).toMatchObject({ tip: 'iade_red', onem: 'normal' })
  })

  test('CANCEL_REJECTED (paket) → iade_red / normal', () => {
    const b = karar(sip({ orderPackageStatus: 'CANCEL_REJECTED' }))
    expect(b).toMatchObject({ tip: 'iade_red', onem: 'normal' })
  })

  test('sıradan durum (CREATED) → null (bildirim yok)', () => {
    expect(karar(sip())).toBeNull()
  })

  test('teslim/kargo durumu (FULFILLED) → null', () => {
    expect(karar(sip({ status: 'FULFILLED' }))).toBeNull()
  })
})
```

- [ ] **Step 2: Testi çalıştır — başarısız olmalı**

Run: `npx vitest run electron/ikas/bildirim-uret.test.js`
Expected: FAIL — "Cannot find module './bildirim-uret.js'" veya `_durumdanBildirim is not a function`.

- [ ] **Step 3: Üretici modülünü yaz**

Create `electron/ikas/bildirim-uret.js`:

```javascript
// İkas sipariş durumundan bildirim üretir. KARAR (_durumdanBildirim) saf ve DB'siz
// tutulur → mock gerektirmeden test edilir (emsal: ikas/kargo-durum.js _bildirimKarari).
const { _ekle } = require('../db/bildirimler')

// İkas durum kodu → bildirim tipi/önem. Hem sipariş `status` hem paket
// `orderPackageStatus` alanları kontrol edilir; ilki eşleşen kazanır.
const DURUM_HARITASI = {
  CANCEL_REQUESTED: { tip: 'iptal_talebi', onem: 'yuksek', etiket: 'İptal talebi' },
  REFUND_REQUESTED: { tip: 'iade_talebi', onem: 'yuksek', etiket: 'İade talebi' },
  REFUND_REQUEST_ACCEPTED: { tip: 'iade_kabul', onem: 'normal', etiket: 'İade talebi kabul edildi' },
  REFUND_REJECTED: { tip: 'iade_red', onem: 'normal', etiket: 'İade/iptal talebi reddedildi' },
  CANCEL_REJECTED: { tip: 'iade_red', onem: 'normal', etiket: 'İade/iptal talebi reddedildi' },
}

// Döner: bildirim nesnesi ya da null (yakalanacak durum yoksa).
function _durumdanBildirim(sip) {
  // Öncelik sırası sabit: eşleşen ilk durumu al (status → orderPackageStatus).
  const durum = [sip.status, sip.orderPackageStatus].find(d => d && DURUM_HARITASI[d])
  if (!durum) return null
  const { tip, onem, etiket } = DURUM_HARITASI[durum]

  const musteri = `${sip.customer?.firstName || ''} ${sip.customer?.lastName || ''}`.trim()
  const no = sip.orderNumber || sip.id
  const tutar = Number(sip.totalFinalPrice) || 0
  const birim = sip.currencyCode || 'TRY'

  return {
    tip,
    onem,
    ikas_siparis_id: sip.id,
    baslik: `${etiket} — Sipariş #${no}`,
    mesaj: `${musteri || 'Müşteri'} · ${tutar.toLocaleString('tr-TR')} ${birim}`,
    // Aynı sipariş aynı durumda kaldıkça tek bildirim; durum değişince yenisi düşer.
    dedup_anahtar: `${sip.id}:${tip}:${durum}`,
  }
}

// İkas çekiminde çağrılır. İlk kurulumda (geçmiş toplu çekim) bildirim ÜRETMEZ.
// Döner: eklenen bildirim sayısı (0 = yok / zaten vardı / ilk kurulum).
function bildirimUret(db, sip, ilkKurulum) {
  if (ilkKurulum) return 0
  const b = _durumdanBildirim(sip)
  if (!b) return 0
  return _ekle(db, b)
}

module.exports = { _durumdanBildirim, bildirimUret }
```

- [ ] **Step 4: Testi çalıştır — geçmeli**

Run: `npx vitest run electron/ikas/bildirim-uret.test.js`
Expected: PASS (7 test).

- [ ] **Step 5: Commit**

```bash
git add electron/ikas/bildirim-uret.js electron/ikas/bildirim-uret.test.js
git commit -m "feat(bildirim): ikas durum -> bildirim algilama (saf fonksiyon + test)"
```

---

### Task 3: Üreticiyi ikas çekimine bağla

**Files:**
- Modify: `electron/ikas/index.js` (`upsertSiparisler` döngüsü, ~satır 260-263)

**Interfaces:**
- Consumes: `bildirimUret(db, sip, ilkKurulum)` from `electron/ikas/bildirim-uret.js` (Task 2). `upsertSiparisler` içindeki mevcut `ilkKurulum` bayrağı ve `partiIsle` transaction'ı içindeki `db` + `sip`.

- [ ] **Step 1: Modülü import et**

`electron/ikas/index.js` dosyasının üst kısmındaki `require` bloğuna ekle (mevcut ikas iç modül require'larının yanına):

```javascript
const { bildirimUret } = require('./bildirim-uret')
```

- [ ] **Step 2: Döngüye tek noktadan bağla**

`upsertSiparisler` içindeki `partiIsle` transaction döngüsünde, satır 262'deki online kanal filtresinden hemen sonra, `const mevcut = mevcutGetir.get(sip.id)` satırından ÖNCE ekle:

Mevcut:
```javascript
        if (sip.salesChannel?.type !== ONLINE_KANAL_TIPI) continue // sadece web sitesi siparişleri

        // Zaten kayıtlı: yeniden ekleme ama durum/ödeme bilgisini ikas'tan tazele.
        const mevcut = mevcutGetir.get(sip.id)
```

Olacak:
```javascript
        if (sip.salesChannel?.type !== ONLINE_KANAL_TIPI) continue // sadece web sitesi siparişleri

        // Bildirim merkezi: iptal/iade talebi vb. durumları yakala (ilk kurulumda üretmez;
        // dedup_anahtar UNIQUE olduğu için aynı olay tekrar bildirilmez).
        bildirimUret(db, sip, ilkKurulum)

        // Zaten kayıtlı: yeniden ekleme ama durum/ödeme bilgisini ikas'tan tazele.
        const mevcut = mevcutGetir.get(sip.id)
```

- [ ] **Step 3: Doğrula — build ve mevcut testler kırılmadı**

Run: `npm run build && npx vitest run`
Expected: Build başarılı; tüm mevcut testler + Task 2 testleri PASS.

- [ ] **Step 4: Commit**

```bash
git add electron/ikas/index.js
git commit -m "feat(bildirim): ureticiyi ikas cekim dongusune bagla"
```

---

### Task 4: `bildirim_goruntule` yetkisi (üç kaynak + parite testi)

**Files:**
- Modify: `src/auth/izinler.js` (PERSONEL_VARSAYILAN set)
- Modify: `electron/yetki.js` (PERSONEL_VARSAYILAN set)
- Modify: `src/auth/yetki-paritesi.test.js` (TUM_KODLAR + yeni test)
- Create: `supabase/09_bildirim_yetki.sql`

**Interfaces:**
- Produces: `'bildirim_goruntule'` yetki kodu — süper admin/yönetici/personel varsayılan açık; "Özel" rolde Supabase toggle'ı ile.

- [ ] **Step 1: Parite testine yeni kodu + davranış testini ekle (başarısız olacak)**

`src/auth/yetki-paritesi.test.js` içinde `TUM_KODLAR` dizisine `'online_siparis_goruntule'` satırının yanına `'bildirim_goruntule'` ekle:

```javascript
  'kargo_yonet', 'kargo_iptal', 'online_siparis_goruntule', 'bildirim_goruntule',
```

Ve `describe('sosyal medya yetkileri', ...)` bloğundan önce yeni bir test bloğu ekle:

```javascript
describe('bildirim yetkisi', () => {
  test('personel bildirimleri varsayılan görebilir', () => {
    const p = { rol: 'personel', aktif: true, izinler: {} }
    expect(yetkiVar(p, 'bildirim_goruntule')).toBe(true)
  })

  test('özel rol yalnızca override ile görür', () => {
    expect(yetkiVar({ rol: 'ozel', aktif: true, izinler: {} }, 'bildirim_goruntule')).toBe(false)
    expect(yetkiVar({ rol: 'ozel', aktif: true, izinler: { bildirim_goruntule: true } }, 'bildirim_goruntule')).toBe(true)
  })
})
```

- [ ] **Step 2: Testi çalıştır — başarısız olmalı**

Run: `npx vitest run src/auth/yetki-paritesi.test.js`
Expected: FAIL — personel için `bildirim_goruntule` iki tarafta da `false` (henüz eklenmedi); parite testi `TUM_KODLAR`'da farklılık göstermez ama yeni davranış testi patlar.

- [ ] **Step 3: İki tarafa da yetkiyi ekle**

`src/auth/izinler.js` içindeki `PERSONEL_VARSAYILAN` set'ine `'online_siparis_goruntule',` satırından sonra ekle:

```javascript
  'online_siparis_goruntule',
  'bildirim_goruntule',
```

`electron/yetki.js` içindeki `PERSONEL_VARSAYILAN` set'ine aynı şekilde ekle:

```javascript
  'online_siparis_goruntule',
  'bildirim_goruntule',
```

- [ ] **Step 4: Testi çalıştır — geçmeli**

Run: `npx vitest run src/auth/yetki-paritesi.test.js`
Expected: PASS (parite + yeni bildirim testleri).

- [ ] **Step 5: Supabase SQL dosyasını oluştur**

Create `supabase/09_bildirim_yetki.sql`:

```sql
-- Bildirim merkezi yetkisi: "Özel" rolde toggle görünmesi için yetki_kodlari'na eklenir.
-- Kurulum: Supabase SQL editöründe çalıştır (bkz. supabase/KURULUM.md).
-- Not: kategori/ad kolonlarını mevcut satırlara bakarak uyarlayın; aşağıdaki
-- INSERT var olan şemadaki kolon adlarıyla eşleşmelidir.
insert into yetki_kodlari (kod, ad, kategori)
values ('bildirim_goruntule', 'Bildirimleri Görüntüle', 'Siparişler')
on conflict (kod) do nothing;
```

> **Uygulayıcı notu:** `yetki_kodlari` gerçek kolon adlarını çalıştırmadan önce doğrula (`select * from yetki_kodlari limit 1`). Kolon adları farklıysa (`ad`/`isim`, `kategori`/`grup`) INSERT'i ona göre düzelt. Bu SQL **yayından önce** Supabase'de çalıştırılmalı, yoksa "Özel" rolde toggle çıkmaz (kod yine de super_admin/yönetici/personel'de çalışır).

- [ ] **Step 6: Commit**

```bash
git add src/auth/izinler.js electron/yetki.js src/auth/yetki-paritesi.test.js supabase/09_bildirim_yetki.sql
git commit -m "feat(bildirim): bildirim_goruntule yetkisi (izinler + yetki + parite + supabase)"
```

---

### Task 5: Frontend IPC API

**Files:**
- Modify: `src/api/ipc.js` (`onlineSiparisApi` bloğundan sonra, ~satır 210)

**Interfaces:**
- Consumes: Task 1 IPC kanalları.
- Produces: `bildirimApi` — `src/pages/Bildirimler.jsx` ve `src/App.jsx` kullanır:
  - `liste({ sayfa, boyut }) => Promise<{ toplam, bildirimler }>`
  - `onemliler() => Promise<Row[]>`
  - `sayac() => Promise<number>`
  - `okundu(id) => Promise<{ ok }>`
  - `tumunuOku() => Promise<{ ok }>`

- [ ] **Step 1: API bloğunu ekle**

`src/api/ipc.js` içinde `onlineSiparisApi` export'unun kapanış `}` satırından sonra ekle:

```javascript
export const bildirimApi = {
  liste: (params) => invoke('bildirim:liste', params),
  onemliler: () => invoke('bildirim:onemliler'),
  sayac: () => invoke('bildirim:sayac'),
  okundu: (id) => invoke('bildirim:okundu', id),
  tumunuOku: () => invoke('bildirim:tumunuOku'),
}
```

- [ ] **Step 2: Doğrula — build**

Run: `npm run build`
Expected: Hatasız (import edilmemiş olsa da geçerli export).

- [ ] **Step 3: Commit**

```bash
git add src/api/ipc.js
git commit -m "feat(bildirim): frontend IPC api (bildirimApi)"
```

---

### Task 6: Bildirimler sayfası + kart bileşeni + menü/rozet

**Files:**
- Create: `src/components/BildirimKarti.jsx`
- Create: `src/pages/Bildirimler.jsx`
- Modify: `src/App.jsx` (import, navItems, rozet effect + badge render)

**Interfaces:**
- Consumes: `bildirimApi` (Task 5); `useSayfalama` from `src/hooks/useSayfalama`; `Sayfalama` from `src/components/Sayfalama`; `useNavigate` (react-router-dom).

- [ ] **Step 1: Kart bileşenini oluştur (saf sunum)**

Create `src/components/BildirimKarti.jsx`:

```jsx
// Tek bir bildirim satırı/kartı — saf sunum. onem='yuksek' kırmızı/turuncu vurgulu,
// okunmamışlar koyu; tıklanınca onTikla(bildirim) çağrılır (okundu + siparişe git).
const ONEM_STIL = {
  yuksek: 'border-red-300 bg-red-50',
  normal: 'border-gray-200 bg-white',
}

export default function BildirimKarti({ bildirim, onTikla }) {
  const b = bildirim
  const vurgu = ONEM_STIL[b.onem] || ONEM_STIL.normal
  const okunmadi = !b.okundu

  return (
    <button
      type="button"
      onClick={() => onTikla(b)}
      className={`w-full text-left border rounded-xl px-4 py-3 transition-colors hover:brightness-95 ${vurgu} ${okunmadi ? 'ring-1 ring-inset ring-red-200' : 'opacity-70'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-sm ${okunmadi ? 'font-semibold text-gray-900' : 'font-medium text-gray-600'}`}>
            {b.onem === 'yuksek' && <span className="mr-1">⚠️</span>}
            {b.baslik}
          </p>
          {b.mesaj && <p className="text-xs text-gray-500 mt-0.5 truncate">{b.mesaj}</p>}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {okunmadi && <span className="w-2 h-2 rounded-full bg-red-600" title="Okunmadı" />}
          <span className="text-[11px] text-gray-400">{(b.olusturma_tarihi || '').slice(0, 16)}</span>
        </div>
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Sayfayı oluştur (container)**

Create `src/pages/Bildirimler.jsx`:

```jsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { bildirimApi } from '../api/ipc'
import { useSayfalama } from '../hooks/useSayfalama'
import Sayfalama from '../components/Sayfalama'
import BildirimKarti from '../components/BildirimKarti'

export default function Bildirimler() {
  const navigate = useNavigate()
  const [onemliler, setOnemliler] = useState([])
  const [tumu, setTumu] = useState([])

  const yukle = useCallback(async () => {
    try {
      const [ol, liste] = await Promise.all([
        bildirimApi.onemliler(),
        bildirimApi.liste({ sayfa: 1, boyut: 500 }), // istemci tarafı sayfalama (emsal: diğer listeler)
      ])
      setOnemliler(ol)
      setTumu(liste.bildirimler)
    } catch (e) {
      toast.error(e.message)
    }
  }, [])

  useEffect(() => { yukle() }, [yukle])

  const bildirimAc = async (b) => {
    try {
      if (!b.okundu) await bildirimApi.okundu(b.id)
    } catch { /* okundu yazımı kritik değil */ }
    if (b.ikas_siparis_id) navigate('/online-siparisler')
    else yukle()
  }

  const tumunuOku = async () => {
    try {
      await bildirimApi.tumunuOku()
      toast.success('Tüm bildirimler okundu işaretlendi')
      yukle()
    } catch (e) {
      toast.error(e.message)
    }
  }

  const { dilim, sayfa, setSayfa, boyut, setBoyut, toplam, toplamSayfa } = useSayfalama(tumu, 50)
  const okunmamisOnemli = onemliler.filter(b => !b.okundu)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">🔔 Bildirimler</h1>
        <button onClick={tumunuOku} className="text-sm text-blue-600 hover:underline">
          Tümünü okundu işaretle
        </button>
      </div>

      <section className="mb-6">
        <h2 className="text-sm font-semibold text-red-700 mb-2">
          ⚠️ İptal / İade Talepleri {okunmamisOnemli.length > 0 && `(${okunmamisOnemli.length} yeni)`}
        </h2>
        {onemliler.length === 0 ? (
          <p className="text-sm text-gray-400 border rounded-xl px-4 py-6 text-center">
            Bekleyen iptal/iade talebi yok.
          </p>
        ) : (
          <div className="space-y-2">
            {onemliler.map(b => <BildirimKarti key={b.id} bildirim={b} onTikla={bildirimAc} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-600 mb-2">Tüm Bildirimler</h2>
        {toplam === 0 ? (
          <p className="text-sm text-gray-400 border rounded-xl px-4 py-6 text-center">Bildirim yok.</p>
        ) : (
          <>
            <div className="space-y-2">
              {dilim.map(b => <BildirimKarti key={b.id} bildirim={b} onTikla={bildirimAc} />)}
            </div>
            <Sayfalama
              sayfa={sayfa} toplamSayfa={toplamSayfa} boyut={boyut}
              setSayfa={setSayfa} setBoyut={setBoyut} toplam={toplam}
            />
          </>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 3: App.jsx — import + nav öğesi ekle**

`src/App.jsx` üstteki sayfa import'ları arasına (OnlineSiparisler'in yanına) ekle:

```javascript
import Bildirimler from './pages/Bildirimler.jsx'
```

`navItems` dizisinde Online Siparişler satırından hemen sonra ekle:

```javascript
  { to: '/bildirimler', label: '🔔 Bildirimler', yetki: 'bildirim_goruntule', el: <Bildirimler /> },
```

- [ ] **Step 4: App.jsx — rozet effect'i ekle (sosyalRozet emsali)**

`src/App.jsx` içinde `bildirimApi`'yi import satırına ekle (mevcut `import { uygulamaApi, sosyalApi } from './api/ipc'` → ):

```javascript
import { uygulamaApi, sosyalApi, bildirimApi } from './api/ipc'
```

`sosyalRozet` effect'inin hemen ardına yeni effect ekle:

```javascript
  // Bildirim okunmamış rozeti: yetki varsa 30 sn'de bir okunmamış sayısını çeker.
  const [bildirimRozet, setBildirimRozet] = useState(0)
  useEffect(() => {
    if (!yetkiVar('bildirim_goruntule')) return
    const yukle = () => bildirimApi.sayac().then(setBildirimRozet).catch(() => {})
    yukle()
    const i = setInterval(yukle, 30 * 1000)
    return () => clearInterval(i)
  }, [yetkiVar])
```

- [ ] **Step 5: App.jsx — badge render'ı ekle**

`src/App.jsx` NavLink içindeki sosyal medya rozet bloğunun (`{item.to === '/sosyal-medya' && ...}`) hemen ardına ekle:

```jsx
                {item.to === '/bildirimler' && bildirimRozet > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center flex-shrink-0">
                    {bildirimRozet > 99 ? '99+' : bildirimRozet}
                  </span>
                )}
```

- [ ] **Step 6: Doğrula — build ve testler**

Run: `npm run build && npx vitest run`
Expected: Build başarılı; tüm testler PASS.

- [ ] **Step 7: Elle doğrulama (electron dev)**

Run: `npm run dev`
Expected: Uygulama açılır; sol menüde "🔔 Bildirimler" görünür. (İptal/iade verisi ikas çekimiyle geleceğinden, dev ortamında canlı talep yoksa liste boş görünür — sekmenin açılması ve boş-durum metinlerinin doğru render olması yeterli doğrulamadır.)

> Not (memory [[dev-baslatma-tuzaklari]]): kurulu uygulama açıksa `npm run dev` tek-örnek kilidi nedeniyle sessizce kod 0 ile çıkabilir — dev denemesinden önce kurulu Tencerecim'i kapat.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Bildirimler.jsx src/components/BildirimKarti.jsx src/App.jsx
git commit -m "feat(bildirim): Bildirimler sekmesi + kart + menu rozeti"
```

---

## Yayın Öncesi Hatırlatma (implementasyon sonrası, ayrı adım)

1. `supabase/09_bildirim_yetki.sql` **Supabase SQL editöründe çalıştırılmalı** (yoksa "Özel" rolde toggle çıkmaz).
2. Sürüm artırma + "yayınla" zinciri (bkz. memory [[yayinla-komutu]] / [[surum-artirma]]) — kullanıcı onayıyla.
