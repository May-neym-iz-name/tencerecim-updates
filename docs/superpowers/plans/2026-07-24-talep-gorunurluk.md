# İptal/İade Talebi Görünürlüğü — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** İptal/iade talepleri ana ekranda KPI kartı, Online Siparişler'de dikkat çeken bildirim butonu ile fark edilir olsun; mevcut bekleyen talepler de bildirimlere düşsün.

**Architecture:** Bekleyen talep tanımı tek yerde (`src/utils/talep.js`, saf + testli). Panel sayısı backend'den (`panel.js`), Online Siparişler'in buton sayısı zaten yüklü listeden (ek sorgu yok). Geri-tarama yerel `online_siparisler` tablosundan `senk_durum` bayrağıyla bir kez koşar; dedup mükerreri engeller.

**Tech Stack:** Electron (CJS main), better-sqlite3, React 18 + react-router-dom + Tailwind, Vitest.

## Global Constraints

- Bekleyen talep = `REFUND_REQUESTED` veya `CANCEL_REQUESTED`, `durum` VEYA `kargo_durumu` alanında. Kabul/red DAHİL DEĞİL.
- Electron main **CJS**, `src/` **ESM + JSX**. Frontend sabitleri `src/utils/talep.js`; backend SQL'de aynı iki durum literal olarak yazılır (ESM↔CJS köprüsü yok — emsal: yetki mantığı iki dilde tekrarlanır).
- Bildirim butonu **yalnız sayı > 0 iken** render edilir.
- Yayın bu planın kapsamında DEĞİL.

---

### Task 1: Paylaşılan `bekleyenTalepMi` yardımcısı + test

**Files:**
- Create: `src/utils/talep.js`
- Create: `src/utils/talep.test.js`

**Interfaces:**
- Produces: `BEKLEYEN_TALEP_DURUMLARI: string[]`, `bekleyenTalepMi(siparis) => boolean` — `siparis` = `{ durum, kargo_durumu }`.

- [ ] **Step 1: Testi yaz (başarısız olacak)**

Create `src/utils/talep.test.js`:

```javascript
import { describe, test, expect } from 'vitest'
import { bekleyenTalepMi, BEKLEYEN_TALEP_DURUMLARI } from './talep.js'

describe('bekleyenTalepMi', () => {
  test('sipariş durumunda iade talebi → true', () => {
    expect(bekleyenTalepMi({ durum: 'REFUND_REQUESTED', kargo_durumu: null })).toBe(true)
  })

  test('kargo/paket durumunda iptal talebi → true', () => {
    expect(bekleyenTalepMi({ durum: 'CREATED', kargo_durumu: 'CANCEL_REQUESTED' })).toBe(true)
  })

  test('kabul/red bekleyen talep DEĞİL → false', () => {
    expect(bekleyenTalepMi({ durum: 'REFUND_REJECTED' })).toBe(false)
    expect(bekleyenTalepMi({ kargo_durumu: 'REFUND_REQUEST_ACCEPTED' })).toBe(false)
    expect(bekleyenTalepMi({ durum: 'REFUNDED' })).toBe(false)
  })

  test('sıradan sipariş → false', () => {
    expect(bekleyenTalepMi({ durum: 'CREATED', kargo_durumu: 'FULFILLED' })).toBe(false)
  })

  test('boş/eksik alanlarda patlamaz', () => {
    expect(bekleyenTalepMi({})).toBe(false)
    expect(bekleyenTalepMi(null)).toBe(false)
  })

  test('durum listesi tam olarak iki bekleyen durumdur', () => {
    expect(BEKLEYEN_TALEP_DURUMLARI).toEqual(['REFUND_REQUESTED', 'CANCEL_REQUESTED'])
  })
})
```

- [ ] **Step 2: Testi çalıştır — başarısız olmalı**

Run: `npx vitest run src/utils/talep.test.js`
Expected: FAIL — "Cannot find module './talep.js'".

- [ ] **Step 3: Yardımcıyı yaz**

Create `src/utils/talep.js`:

```javascript
// Bekleyen iptal/iade talebi tanımı — TEK KAYNAK (Panel kartı, Online Siparişler
// bildirim butonu/filtresi ve bildirim geri-taraması aynı tanımı kullanır).
// Yalnız BEKLEYEN talepler: kabul/red (REFUND_REQUEST_ACCEPTED, *_REJECTED) dahil DEĞİL —
// onlar aksiyon gerektirmez, sayıma girerse buton gürültüye döner.
// NOT: backend (electron/db/panel.js SQL, ikas/bildirim-uret.js) aynı iki durumu
// literal olarak tekrarlar; ESM↔CJS köprüsü yok (emsal: yetki mantığı iki dilde).
export const BEKLEYEN_TALEP_DURUMLARI = ['REFUND_REQUESTED', 'CANCEL_REQUESTED']

// Sipariş bekleyen bir iptal/iade talebi taşıyor mu?
// Talep hem sipariş durumunda (status) hem paket durumunda (orderPackageStatus) gelebilir.
export function bekleyenTalepMi(siparis) {
  if (!siparis) return false
  return [siparis.durum, siparis.kargo_durumu]
    .some(d => d && BEKLEYEN_TALEP_DURUMLARI.includes(d))
}
```

- [ ] **Step 4: Testi çalıştır — geçmeli**

Run: `npx vitest run src/utils/talep.test.js`
Expected: PASS (6 test).

- [ ] **Step 5: Commit**

```bash
git add src/utils/talep.js src/utils/talep.test.js
git commit -m "feat(talep): bekleyen iptal/iade talebi yardimcisi + test"
```

---

### Task 2: Ana Ekran KPI kartı

**Files:**
- Modify: `electron/db/panel.js` (`panel:ozet` — yeni sayı)
- Modify: `src/pages/Panel.jsx` (yeni kart)

**Interfaces:**
- Consumes: `panelApi.ozet()`.
- Produces: `panel:ozet` dönüşüne `bekleyenTalepSayisi: number` eklenir.

- [ ] **Step 1: Backend sayımı ekle**

`electron/db/panel.js` içinde `bekleyenOnlineSayisi` sorgusundan SONRA ekle:

```javascript
    // Bekleyen iptal/iade talebi (aksiyon bekleyen). Talep hem sipariş hem paket
    // durumunda gelebilir — ikisine de bakılır. Kabul/red DAHİL DEĞİL.
    const bekleyenTalepSayisi = db.prepare(`
      SELECT COUNT(*) n FROM online_siparisler
      WHERE durum IN ('REFUND_REQUESTED','CANCEL_REQUESTED')
         OR kargo_durumu IN ('REFUND_REQUESTED','CANCEL_REQUESTED')
    `).get().n
```

Ve aynı fonksiyonun `return` satırına ekle:

```javascript
    return { bugun, bugunGenel, kritikStokSayisi, bekleyenOnlineSayisi, bekleyenTalepSayisi, sonSatislar, haftalik }
```

- [ ] **Step 2: KPI kartını ekle**

`src/pages/Panel.jsx` içinde "Mağaza Sayısı" kartından ÖNCE (Bekleyen Online kartından sonra) ekle:

```jsx
        <Kart baslik="İptal/İade Talebi" deger={veri.bekleyenTalepSayisi ?? 0}
          renk={(veri.bekleyenTalepSayisi ?? 0) > 0 ? 'text-red-600' : 'text-gray-800'}
          alt="bekleyen talep" tikla={yetkiVar('online_siparis_goruntule') ? () => navigate('/online-siparisler?talep=1') : null} />
```

- [ ] **Step 3: Doğrula**

Run: `node --check electron/db/panel.js && npx vite build`
Expected: Hatasız.

- [ ] **Step 4: Commit**

```bash
git add electron/db/panel.js src/pages/Panel.jsx
git commit -m "feat(talep): ana ekranda iptal/iade talebi KPI karti"
```

---

### Task 3: Online Siparişler — bildirim butonu + filtre

**Files:**
- Modify: `src/pages/OnlineSiparisler.jsx`

**Interfaces:**
- Consumes: `bekleyenTalepMi` (Task 1); `useSearchParams` (react-router-dom).

- [ ] **Step 1: Import ve state ekle**

`src/pages/OnlineSiparisler.jsx` en üstteki import bloğuna ekle:

```javascript
import { useSearchParams } from 'react-router-dom'
import { bekleyenTalepMi } from '../utils/talep'
```

`kargoFiltre` state satırından SONRA ekle:

```javascript
  // İptal/iade talebi bildirim butonu: açıkken yalnız bekleyen talepli siparişler.
  // URL'de ?talep=1 ile gelinirse (Ana Ekran kartı / bildirim) otomatik açılır.
  const [aramaParams] = useSearchParams()
  const [talepFiltre, setTalepFiltre] = useState(aramaParams.get('talep') === '1')
```

- [ ] **Step 2: Filtre koşulunu ekle**

`filtreliSiparisler` useMemo içinde, `kargoFiltre` kontrolünden SONRA ekle:

```javascript
    if (talepFiltre && !bekleyenTalepMi(s)) return false
```

Ve aynı useMemo'nun bağımlılık dizisine `talepFiltre` ekle:

```javascript
  }), [siparisler, tarihBas, tarihBit, odemeFiltre, durumFiltre, kargoFiltre, talepFiltre])
```

- [ ] **Step 3: Bildirim butonunu ekle**

Sayfa başlığının hemen altına (filtre kutusundan ÖNCE) ekle:

```jsx
      {talepSayisi > 0 && (
        <button
          onClick={() => setTalepFiltre(v => !v)}
          className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors ${
            talepFiltre
              ? 'bg-red-600 border-red-700 text-white'
              : 'bg-red-50 border-red-300 text-red-800 hover:bg-red-100 animate-pulse'
          }`}
        >
          <span className="text-xl">🔔</span>
          <span className="flex-1">
            <span className="font-bold">{talepSayisi} İptal/İade Talebi</span>
            <span className={`block text-xs ${talepFiltre ? 'text-red-100' : 'text-red-600'}`}>
              {talepFiltre ? 'Yalnız talepler gösteriliyor — tümünü görmek için tıklayın' : 'Görüntülemek için tıklayın'}
            </span>
          </span>
        </button>
      )}
```

Ve `talepSayisi`'nı `filtreliSiparisler` useMemo'sundan SONRA hesapla:

```javascript
  // Buton sayısı TÜM yüklü siparişlerden (filtreden bağımsız) — ek sorgu yok.
  const talepSayisi = useMemo(() => siparisler.filter(bekleyenTalepMi).length, [siparisler])
```

- [ ] **Step 4: "Filtreleri temizle" davranışına ekle**

`(tarihBas || tarihBit || odemeFiltre || durumFiltre || kargoFiltre)` koşulunu ve temizleme fonksiyonunu `talepFiltre`'yi de kapsayacak şekilde güncelle: koşula `|| talepFiltre`, temizleme gövdesine `setTalepFiltre(false)` eklenir.

- [ ] **Step 5: Doğrula**

Run: `npx vite build && npx vitest run`
Expected: Build başarılı; tüm testler PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/OnlineSiparisler.jsx
git commit -m "feat(talep): Online Siparislerde dikkat ceken iptal/iade bildirim butonu"
```

---

### Task 4: Bildirimden filtreli geçiş + mevcut taleplerin geri-taranması

**Files:**
- Modify: `src/pages/Bildirimler.jsx`
- Modify: `electron/ikas/bildirim-uret.js`
- Modify: `electron/ikas/index.js`

**Interfaces:**
- Consumes: `_ekle` (bildirimler), `_durumdanBildirim` (mevcut).
- Produces: `mevcutTalepleriBildir(db) => number` — eklenen bildirim sayısı; `senk_durum`'daki `bildirim_talep_backfill` bayrağıyla bir kez koşar.

- [ ] **Step 1: Bildirimden filtreli navigasyon**

`src/pages/Bildirimler.jsx` içinde `bildirimAc` fonksiyonunda navigasyonu güncelle:

```javascript
    if (b.ikas_siparis_id) navigate('/online-siparisler?talep=1')
```

- [ ] **Step 2: Geri-tarama fonksiyonunu yaz**

`electron/ikas/bildirim-uret.js` sonuna, `module.exports`'tan ÖNCE ekle:

```javascript
// Bekleyen talep durumları (frontend karşılığı: src/utils/talep.js).
const BEKLEYEN_TALEP = ['REFUND_REQUESTED', 'CANCEL_REQUESTED']

// TEK SEFERLİK geri-tarama: yerel online_siparisler tablosunda BEKLEYEN talepler
// için bildirim üretir. Gerekçe: ikas çekimi updatedAt imleciyle ARTIMLIDIR —
// bildirim özelliğinden önce talebe geçmiş ve o gün bu yana güncellenmemiş
// siparişler yeniden çekilmez, dolayısıyla hiç bildirim üretmezler.
// senk_durum bayrağıyla bir kez koşar (emsal: kargolar_restamp). Dedup zaten
// mükerreri engeller, tekrar koşsa da zararsızdır.
function mevcutTalepleriBildir(db) {
  const BAYRAK = 'bildirim_talep_backfill'
  try {
    const v = db.prepare('SELECT deger FROM senk_durum WHERE anahtar = ?').get(BAYRAK)
    if (v) return 0

    const yer = BEKLEYEN_TALEP.map(() => '?').join(',')
    const satirlar = db.prepare(`
      SELECT ikas_siparis_id, siparis_no, durum, kargo_durumu, toplam, para_birimi, musteri_ad
      FROM online_siparisler
      WHERE durum IN (${yer}) OR kargo_durumu IN (${yer})
    `).all(...BEKLEYEN_TALEP, ...BEKLEYEN_TALEP)

    let eklenen = 0
    for (const s of satirlar) {
      // _durumdanBildirim ikas sipariş şeklini bekler → yerel satırı ona uyarla.
      const sip = {
        id: s.ikas_siparis_id,
        orderNumber: s.siparis_no,
        status: s.durum,
        orderPackageStatus: s.kargo_durumu,
        totalFinalPrice: s.toplam,
        currencyCode: s.para_birimi,
        customer: { firstName: s.musteri_ad || '', lastName: '' },
      }
      const b = _durumdanBildirim(sip)
      if (b) eklenen += _ekle(db, b)
    }

    db.prepare(
      "INSERT INTO senk_durum (anahtar, deger) VALUES (?, '1') ON CONFLICT(anahtar) DO UPDATE SET deger = '1'"
    ).run(BAYRAK)
    return eklenen
  } catch (e) {
    console.error('Bildirim talep geri-tarama:', e.message)
    return 0
  }
}
```

Ve `module.exports` satırını güncelle:

```javascript
module.exports = { _durumdanBildirim, bildirimUret, mevcutTalepleriBildir }
```

- [ ] **Step 3: Çekim başında çağır**

`electron/ikas/index.js` üstteki import satırını güncelle:

```javascript
const { bildirimUret, mevcutTalepleriBildir } = require('./bildirim-uret')
```

Ve `const gtBaslangic = ilkKurulum ? 0 : sonSenk` satırından SONRA ekle:

```javascript
  // Özellik öncesi oluşmuş, hâlâ BEKLEYEN talepleri bir kez bildirime dönüştür
  // (artımlı çekim onları yeniden getirmez). İlk kurulumda anlamsız — atlanır.
  if (!ilkKurulum) mevcutTalepleriBildir(db)
```

- [ ] **Step 4: Doğrula**

Run: `node --check electron/ikas/bildirim-uret.js && node --check electron/ikas/index.js && npx vite build && npx vitest run`
Expected: Hatasız; tüm testler PASS (mevcut bildirim-uret testleri dahil).

- [ ] **Step 5: Elle doğrulama (electron dev)**

Run: `npm run dev` (kurulu Tencerecim KAPALI)
Expected: Bekleyen talep varsa → Ana Ekran'da "İptal/İade Talebi" kartı kırmızı sayı gösterir; tıklayınca Online Siparişler filtreli açılır; Online Siparişler'de üstte kırmızı nabız atan "🔔 N İptal/İade Talebi" butonu görünür, tıklayınca liste filtrelenir; Bildirimler sekmesinde mevcut talepler de listelenir.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Bildirimler.jsx electron/ikas/bildirim-uret.js electron/ikas/index.js
git commit -m "feat(talep): mevcut talepleri geri-tara + bildirimden filtreli gecis"
```
