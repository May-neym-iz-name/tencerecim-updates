# İstek Listesi Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stok alanına "İstek Listesi" sekmesi ekleyip; şube + tedarikçi bazlı ürün istek listeleri oluşturma, bulut senkron kaydetme ve logolu PDF (şube adresi + ürün tam adı + adet) alma.

**Architecture:** İki yeni yerel SQLite tablosu mevcut jenerik `senk_kayitlar` mekanizmasına kaydedilir (bulut senkron otomatik). Backend CRUD `mal_kabul_yonet` + `lokasyonKontrol` ile korunur. PDF, gizli `BrowserWindow` + `webContents.printToPDF()` ile yerel üretilir, `dialog.showSaveDialog` ile kaydedilir. Arayüz `MalKabul.jsx` desenini izler.

**Tech Stack:** Electron (CJS main), better-sqlite3, React 18 + Tailwind, Vitest.

## Global Constraints

- Electron main dosyaları **CommonJS**; `src/` **ESM + JSX**.
- IPC: modül `{'kanal:ad': handler}` döner, `electron/main.js` `handlerModules`'a eklenir; `_` önekli anahtarlar handler olarak KAYDEDİLMEZ. Dönüş main.js'te `{ok, data}` sarmalanır; frontend `invoke` `.data` döndürür.
- Yetki: yeni kod YOK; mevcut `mal_kabul_yonet`'e bağlı. Backend `_yetkiKontrol('mal_kabul_yonet')` + `_lokasyonKontrol(lokasyon_id)`.
- Senkron: yeni tablolar `senk-sema.js` `TABLOLAR`'a `sonradanEklendi:true` ile, `SIRA`'ya FK sırasına uygun eklenir; `src/lib/veriSenk.js` `SIRA_YEDEK`'e de eklenir.
- `urun_adi` kalemde anlık kopyalanır (FK yarışına dayanıklı PDF — [[senkron-fk-yarisi]]).
- Yorumlar Türkçe, mevcut stille uyumlu. Dosyalar < 800 satır.
- Yayın bu planın KAPSAMINDA değil (sürüm/publish ayrı, kullanıcı onayıyla).

---

### Task 1: Tablolar + senkron kaydı

**Files:**
- Modify: `electron/db/database.js` (bildirimler index'inden sonra iki CREATE TABLE)
- Modify: `electron/db/senk-sema.js` (`TABLOLAR` + `SIRA`)
- Modify: `src/lib/veriSenk.js` (`SIRA_YEDEK`)

**Interfaces:**
- Produces: `istek_listeleri(id, lokasyon_id, tedarikci_id, baslik, tarih, olusturma_tarihi, senk_id, senk_guncelleme)` ve `istek_listesi_kalemleri(id, istek_id, urun_id, urun_adi, miktar, senk_id, senk_guncelleme)` tabloları; her ikisi jenerik senkrona kayıtlı.

- [ ] **Step 1: Tabloları `database.js`'e ekle**

`electron/db/database.js` içinde `CREATE INDEX IF NOT EXISTS idx_bildirim_okundu ON bildirimler(okundu);` satırından hemen sonra ekle:

```javascript
    -- İstek listeleri (tedarikçiden tedarik istek listesi): şube + tedarikçi başına.
    -- Bulut senkron: jenerik senk_kayitlar (senk-sema.js). PDF yerel üretilir.
    CREATE TABLE IF NOT EXISTS istek_listeleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lokasyon_id INTEGER,
      tedarikci_id INTEGER REFERENCES tedarikciler(id),
      baslik TEXT,
      tarih TEXT,
      olusturma_tarihi TEXT DEFAULT (datetime('now','localtime'))
    );
    -- urun_adi: anlık kopya (FK yarışına dayanıklı PDF; satis_kalemleri.set_adi emsali).
    CREATE TABLE IF NOT EXISTS istek_listesi_kalemleri (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      istek_id INTEGER NOT NULL REFERENCES istek_listeleri(id),
      urun_id INTEGER REFERENCES urunler(id),
      urun_adi TEXT,
      miktar INTEGER DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_istek_kalem_istek ON istek_listesi_kalemleri(istek_id);
```

- [ ] **Step 2: `senk-sema.js` TABLOLAR'a ekle**

`electron/db/senk-sema.js` içinde `TABLOLAR` nesnesinde `kargolar: { ... }` satırından SONRA (kapanış `}` içinde) ekle:

```javascript
  // İstek listeleri: şube+tedarikçi bazlı tedarik istek listesi. urun_adi anlık kopya.
  // lokasyon_id düz kolon (her PC aynı seed, satislar emsali).
  istek_listeleri: { kolonlar: ['lokasyon_id', 'baslik', 'tarih', 'olusturma_tarihi'],
                     fk: { tedarikci_id: 'tedarikciler' }, dogal: [], sonradanEklendi: true },
  istek_listesi_kalemleri: { kolonlar: ['urun_adi', 'miktar'],
                             fk: { istek_id: 'istek_listeleri', urun_id: 'urunler' },
                             zorunluFk: ['istek_id'], dogal: [], sonradanEklendi: true },
```

- [ ] **Step 3: `senk-sema.js` SIRA'ya ekle**

Aynı dosyada `SIRA` dizisinde `'kargolar',` satırından SONRA ekle (parent kalemden önce):

```javascript
  'istek_listeleri', 'istek_listesi_kalemleri',
```

- [ ] **Step 4: `veriSenk.js` SIRA_YEDEK'e ekle**

`src/lib/veriSenk.js` içinde `SIRA_YEDEK` dizisinde `'kargolar',` satırından SONRA ekle:

```javascript
  'istek_listeleri', 'istek_listesi_kalemleri',
```

- [ ] **Step 5: Sözdizimi doğrula**

Run: `node --check electron/db/database.js && node --check electron/db/senk-sema.js`
Expected: Hatasız (çıktı yok).

- [ ] **Step 6: Commit**

```bash
git add electron/db/database.js electron/db/senk-sema.js src/lib/veriSenk.js
git commit -m "feat(istek): istek listesi tablolari + senkron kaydi"
```

---

### Task 2: Backend CRUD (istek-listesi.js)

**Files:**
- Create: `electron/db/istek-listesi.js`
- Modify: `electron/main.js` (handlerModules'a ekle)

**Interfaces:**
- Consumes: `getDb`; `_yetkiKontrol`, `_lokasyonKontrol` from `../yetki` (emsal: malkabul.js).
- Produces: IPC:
  - `istek:listele` `() => Liste[]` — `{ id, lokasyon_id, lokasyon_adi, tedarikci_id, tedarikci_adi, baslik, tarih, kalem_sayisi }`
  - `istek:getir` `(id) => { ...liste, kalemler:[{ id, urun_id, urun_adi, miktar }] }`
  - `istek:kaydet` `({ id, lokasyon_id, tedarikci_id, baslik, tarih, kalemler:[{urun_id, urun_adi, miktar}] }) => { id }`
  - `istek:sil` `(id) => { ok:true }`

- [ ] **Step 1: CRUD modülünü oluştur**

Create `electron/db/istek-listesi.js`:

```javascript
// İstek listeleri (tedarikçiden tedarik istek listesi) — CRUD.
// Bulut senkron jenerik senk_kayitlar üzerinden (senk-sema.js kaydı yeter).
const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol, _lokasyonKontrol: lokasyonKontrol } = require('../yetki')

module.exports = {
  'istek:listele': () => {
    const db = getDb()
    return db.prepare(`
      SELECT i.id, i.lokasyon_id, i.tedarikci_id, i.baslik, i.tarih,
             l.ad AS lokasyon_adi, t.ad AS tedarikci_adi,
             (SELECT COUNT(*) FROM istek_listesi_kalemleri WHERE istek_id = i.id) AS kalem_sayisi
      FROM istek_listeleri i
      LEFT JOIN lokasyonlar l ON i.lokasyon_id = l.id
      LEFT JOIN tedarikciler t ON i.tedarikci_id = t.id
      ORDER BY i.id DESC
    `).all()
  },

  'istek:getir': (id) => {
    const db = getDb()
    const liste = db.prepare(`
      SELECT i.*, l.ad AS lokasyon_adi, t.ad AS tedarikci_adi
      FROM istek_listeleri i
      LEFT JOIN lokasyonlar l ON i.lokasyon_id = l.id
      LEFT JOIN tedarikciler t ON i.tedarikci_id = t.id
      WHERE i.id = ?
    `).get(id)
    if (!liste) return null
    liste.kalemler = db.prepare(
      'SELECT id, urun_id, urun_adi, miktar FROM istek_listesi_kalemleri WHERE istek_id = ? ORDER BY id'
    ).all(id)
    return liste
  },

  // Yeni liste (id yoksa) ya da mevcut listeyi güncelle (kalemleri sil-yeniden yaz).
  'istek:kaydet': ({ id, lokasyon_id, tedarikci_id, baslik, tarih, kalemler }) => {
    yetkiKontrol('mal_kabul_yonet'); lokasyonKontrol(lokasyon_id)
    const db = getDb()
    if (!lokasyon_id) throw new Error('Şube seçilmedi')
    if (!tedarikci_id) throw new Error('Tedarikçi seçilmedi')
    if (!Array.isArray(kalemler) || kalemler.length === 0) throw new Error('En az bir ürün ekleyin')

    const hazir = kalemler.map(k => {
      const miktar = parseInt(k.miktar, 10)
      if (!Number.isFinite(miktar) || miktar <= 0) throw new Error('Geçersiz miktar')
      return { urun_id: k.urun_id || null, urun_adi: k.urun_adi || '', miktar }
    })

    const tx = db.transaction(() => {
      let istekId = id
      if (istekId) {
        db.prepare('UPDATE istek_listeleri SET lokasyon_id=?, tedarikci_id=?, baslik=?, tarih=? WHERE id=?')
          .run(lokasyon_id, tedarikci_id, baslik || null, tarih || null, istekId)
        db.prepare('DELETE FROM istek_listesi_kalemleri WHERE istek_id = ?').run(istekId)
      } else {
        const r = db.prepare('INSERT INTO istek_listeleri (lokasyon_id, tedarikci_id, baslik, tarih) VALUES (?, ?, ?, ?)')
          .run(lokasyon_id, tedarikci_id, baslik || null, tarih || null)
        istekId = r.lastInsertRowid
      }
      const kalemEkle = db.prepare('INSERT INTO istek_listesi_kalemleri (istek_id, urun_id, urun_adi, miktar) VALUES (?, ?, ?, ?)')
      for (const k of hazir) kalemEkle.run(istekId, k.urun_id, k.urun_adi, k.miktar)
      return istekId
    })
    return { id: tx() }
  },

  'istek:sil': (id) => {
    yetkiKontrol('mal_kabul_yonet')
    const db = getDb()
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM istek_listesi_kalemleri WHERE istek_id = ?').run(id)
      db.prepare('DELETE FROM istek_listeleri WHERE id = ?').run(id)
    })
    tx()
    return { ok: true }
  },
}
```

- [ ] **Step 2: main.js'e kaydet**

`electron/main.js` içinde `require('./db/bildirimler'),` satırından sonra ekle:

```javascript
  require('./db/istek-listesi'),
```

- [ ] **Step 3: Sözdizimi doğrula**

Run: `node --check electron/db/istek-listesi.js && node --check electron/main.js`
Expected: Hatasız.

- [ ] **Step 4: Commit**

```bash
git add electron/db/istek-listesi.js electron/main.js
git commit -m "feat(istek): backend CRUD (listele/getir/kaydet/sil)"
```

---

### Task 3: PDF üretimi (istek-pdf.js) + logo + test

**Files:**
- Create: `electron/assets/istek-logo.png` (logo kopyası)
- Create: `electron/istek-pdf.js`
- Create: `electron/istek-pdf.test.js`
- Modify: `electron/main.js` (handlerModules)

**Interfaces:**
- Consumes: `getDb`; `BrowserWindow`, `dialog` (electron); `htmlYukle` from `./html-yukle`.
- Produces:
  - `_istekHtml(liste, logoDataUri) => string` — SAF. `liste` = `{ lokasyon_adi, lokasyon_adres, tedarikci_adi, tarih, kalemler:[{urun_adi, miktar}] }`.
  - IPC `istek:pdf` `(id) => { kaydedildi:boolean, yol?:string }`

- [ ] **Step 1: Logo dosyasını kopyala**

Run:
```bash
mkdir -p electron/assets && cp src/assets/logo.png electron/assets/istek-logo.png && ls -l electron/assets/istek-logo.png
```
Expected: dosya oluşur (boyut > 0).

- [ ] **Step 2: Testi yaz (başarısız olacak)**

Create `electron/istek-pdf.test.js`:

```javascript
// İstek PDF'inin HTML üreten saf kısmı — DB/electron'suz (emsal: raporlar.test.js).
import { describe, test, expect } from 'vitest'
import istekPdf from './istek-pdf.js'

const { _istekHtml: html } = istekPdf

const liste = (over = {}) => ({
  lokasyon_adi: 'Merkez Şube',
  lokasyon_adres: 'Atatürk Cad. No:1 Karşıyaka/İzmir',
  tedarikci_adi: 'Saflon',
  tarih: '2026-07-23',
  kalemler: [
    { urun_adi: 'Granit Tencere 24cm', miktar: 12 },
    { urun_adi: 'Çelik Kaşık Seti', miktar: 5 },
  ],
  ...over,
})

describe('_istekHtml', () => {
  test('şube adı + adresi + tedarikçi başlıkta geçer', () => {
    const h = html(liste(), '')
    expect(h).toContain('Merkez Şube')
    expect(h).toContain('Karşıyaka')
    expect(h).toContain('Saflon')
  })

  test('tüm kalemlerin tam adı + adedi geçer', () => {
    const h = html(liste(), '')
    expect(h).toContain('Granit Tencere 24cm')
    expect(h).toContain('12')
    expect(h).toContain('Çelik Kaşık Seti')
    expect(h).toContain('5')
  })

  test('logo verilirse <img> gömülür, verilmezse gömülmez', () => {
    expect(html(liste(), 'data:image/png;base64,AAA')).toContain('data:image/png;base64,AAA')
    expect(html(liste(), '')).not.toContain('<img')
  })

  test('HTML kaçış: ürün adındaki < & kaçırılır', () => {
    const h = html(liste({ kalemler: [{ urun_adi: 'A < B & C', miktar: 1 }] }), '')
    expect(h).toContain('A &lt; B &amp; C')
    expect(h).not.toContain('A < B & C')
  })

  test('boş liste patlamaz', () => {
    expect(() => html(liste({ kalemler: [] }), '')).not.toThrow()
  })
})
```

- [ ] **Step 3: Testi çalıştır — başarısız olmalı**

Run: `npx vitest run electron/istek-pdf.test.js`
Expected: FAIL — "Cannot find module './istek-pdf.js'".

- [ ] **Step 4: PDF modülünü yaz**

Create `electron/istek-pdf.js`:

```javascript
// İstek listesi PDF üretimi — gizli BrowserWindow + webContents.printToPDF().
// HTML üreten _istekHtml SAF tutulur (DB/electron'suz test edilir). Logo base64
// gömülür (renderer asset yolu main'den okunamaz; gömülü veri PDF'i kendine yeterli kılar).
const { BrowserWindow, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { getDb } = require('./db/database')
const { htmlYukle } = require('./html-yukle')

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

// Logo bir kez okunur (asar içinden fs.readFileSync çalışır). Yoksa boş string.
let logoCache
function logoDataUri() {
  if (logoCache === undefined) {
    try {
      const buf = fs.readFileSync(path.join(__dirname, 'assets', 'istek-logo.png'))
      logoCache = `data:image/png;base64,${buf.toString('base64')}`
    } catch {
      logoCache = ''
    }
  }
  return logoCache
}

function _istekHtml(liste, logoUri) {
  const satirlar = (liste.kalemler || []).map((k, i) => `
    <tr>
      <td class="no">${i + 1}</td>
      <td class="ad">${esc(k.urun_adi)}</td>
      <td class="adet">${esc(k.miktar)}</td>
    </tr>`).join('')
  const toplamAdet = (liste.kalemler || []).reduce((t, k) => t + (Number(k.miktar) || 0), 0)

  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
  .ust { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
  .ust img { height: 54px; }
  .baslik h1 { font-size: 18px; }
  .baslik .alt { color: #555; font-size: 12px; margin-top: 2px; }
  .bilgi { display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 12px; }
  .bilgi .kutu { max-width: 60%; }
  .bilgi .etiket { color: #888; font-size: 10px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 7px 9px; text-align: left; }
  th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; color: #444; }
  td.no, th.no { width: 40px; text-align: center; }
  td.adet, th.adet { width: 80px; text-align: center; font-weight: bold; }
  tfoot td { font-weight: bold; background: #fafafa; }
  .footer { margin-top: 18px; color: #999; font-size: 10px; text-align: center; }
</style></head><body>
  <div class="ust">
    ${logoUri ? `<img src="${logoUri}" alt="logo">` : ''}
    <div class="baslik">
      <h1>Tedarik İstek Listesi</h1>
      <div class="alt">Tencerecim</div>
    </div>
  </div>
  <div class="bilgi">
    <div class="kutu">
      <div class="etiket">Şube</div>
      <div><strong>${esc(liste.lokasyon_adi || '-')}</strong></div>
      ${liste.lokasyon_adres ? `<div>${esc(liste.lokasyon_adres)}</div>` : ''}
    </div>
    <div>
      <div class="etiket">Tedarikçi</div>
      <div><strong>${esc(liste.tedarikci_adi || '-')}</strong></div>
      <div class="etiket" style="margin-top:6px">Tarih</div>
      <div>${esc(liste.tarih || '-')}</div>
    </div>
  </div>
  <table>
    <thead><tr><th class="no">#</th><th>Ürün</th><th class="adet">Adet</th></tr></thead>
    <tbody>${satirlar}</tbody>
    <tfoot><tr><td colspan="2" style="text-align:right">Toplam Adet</td><td class="adet">${toplamAdet}</td></tr></tfoot>
  </table>
  <div class="footer">Bu belge Tencerecim mağaza programı tarafından oluşturulmuştur.</div>
</body></html>`
}

function pdfVeriGetir(id) {
  const db = getDb()
  const liste = db.prepare(`
    SELECT i.*, l.ad AS lokasyon_adi, COALESCE(g.adres, l.adres) AS lokasyon_adres,
           t.ad AS tedarikci_adi
    FROM istek_listeleri i
    LEFT JOIN lokasyonlar l ON i.lokasyon_id = l.id
    LEFT JOIN lokasyon_gonderici g ON i.lokasyon_id = g.lokasyon_id
    LEFT JOIN tedarikciler t ON i.tedarikci_id = t.id
    WHERE i.id = ?
  `).get(id)
  if (!liste) throw new Error('İstek listesi bulunamadı')
  liste.kalemler = db.prepare(
    'SELECT urun_adi, miktar FROM istek_listesi_kalemleri WHERE istek_id = ? ORDER BY id'
  ).all(id)
  return liste
}

function dosyaAdi(liste) {
  const temiz = (s) => String(s || '').replace(/[^\wğüşöçıİĞÜŞÖÇ ]/gi, '').trim().replace(/\s+/g, '-')
  return `istek-${temiz(liste.lokasyon_adi) || 'sube'}-${temiz(liste.tedarikci_adi) || 'tedarikci'}-${liste.tarih || ''}.pdf`
}

async function istekPdfKaydet(id) {
  const liste = pdfVeriGetir(id)
  const html = _istekHtml(liste, logoDataUri())

  const sonuc = await dialog.showSaveDialog({
    title: 'İstek Listesi PDF Kaydet',
    defaultPath: dosyaAdi(liste),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (sonuc.canceled || !sonuc.filePath) return { kaydedildi: false }

  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: false } })
  try {
    await htmlYukle(win, html)
    const pdf = await win.webContents.printToPDF({ printBackground: true, pageSize: 'A4', margins: { marginType: 'default' } })
    fs.writeFileSync(sonuc.filePath, pdf)
    return { kaydedildi: true, yol: sonuc.filePath }
  } finally {
    if (!win.isDestroyed()) win.close()
  }
}

module.exports = {
  _istekHtml,
  'istek:pdf': (id) => istekPdfKaydet(id),
}
```

- [ ] **Step 5: Testi çalıştır — geçmeli**

Run: `npx vitest run electron/istek-pdf.test.js`
Expected: PASS (5 test).

- [ ] **Step 6: main.js'e PDF handler'ını kaydet**

`electron/main.js` içinde `require('./db/istek-listesi'),` satırından sonra ekle:

```javascript
  require('./istek-pdf'),
```

- [ ] **Step 7: Sözdizimi doğrula**

Run: `node --check electron/istek-pdf.js && node --check electron/main.js`
Expected: Hatasız.

- [ ] **Step 8: Commit**

```bash
git add electron/assets/istek-logo.png electron/istek-pdf.js electron/istek-pdf.test.js electron/main.js
git commit -m "feat(istek): logolu PDF uretimi (printToPDF) + test"
```

---

### Task 4: Frontend IPC API

**Files:**
- Modify: `src/api/ipc.js` (`bildirimApi` bloğundan sonra)

**Interfaces:**
- Produces: `istekApi` — `IstekListesi.jsx` kullanır.

- [ ] **Step 1: API bloğunu ekle**

`src/api/ipc.js` içinde `bildirimApi` export'unun kapanış `}` satırından sonra ekle:

```javascript
export const istekApi = {
  listele: () => invoke('istek:listele'),
  getir: (id) => invoke('istek:getir', id),
  kaydet: (veri) => invoke('istek:kaydet', veri),
  sil: (id) => invoke('istek:sil', id),
  pdf: (id) => invoke('istek:pdf', id),
}
```

- [ ] **Step 2: Doğrula**

Run: `npx vite build`
Expected: Hatasız.

- [ ] **Step 3: Commit**

```bash
git add src/api/ipc.js
git commit -m "feat(istek): frontend IPC api (istekApi)"
```

---

### Task 5: İstek Listesi sayfası + sekme

**Files:**
- Create: `src/pages/IstekListesi.jsx`
- Modify: `src/pages/StokYonetim.jsx` (yeni sekme)

**Interfaces:**
- Consumes: `istekApi` (Task 4); `lokasyonApi`, `tedarikciApi`, `urunlerApi`; `useAuth().erisilebilirLokasyonlar`; `AranabilirSecici`.

- [ ] **Step 1: Sayfayı oluştur**

Create `src/pages/IstekListesi.jsx`:

```jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { istekApi, lokasyonApi, tedarikciApi, urunlerApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'
import AranabilirSecici from '../components/AranabilirSecici'

const bugun = () => new Date().toISOString().slice(0, 10)

export default function IstekListesi() {
  const { erisilebilirLokasyonlar } = useAuth()
  const [lokasyonlar, setLokasyonlar] = useState([])
  const [tedarikciler, setTedarikciler] = useState([])
  const [listeler, setListeler] = useState([])
  const [duzenleme, setDuzenleme] = useState(null) // null=liste görünümü; obje=düzenleme

  useEffect(() => {
    lokasyonApi.listele().then(l => setLokasyonlar(erisilebilirLokasyonlar(l))).catch(() => {})
    tedarikciApi.listele().then(setTedarikciler).catch(() => {})
  }, [])

  const listeleriYukle = useCallback(async () => {
    try { setListeler(await istekApi.listele()) } catch (e) { toast.error(e.message) }
  }, [])
  useEffect(() => { listeleriYukle() }, [listeleriYukle])

  const yeni = () => setDuzenleme({
    id: null, lokasyon_id: lokasyonlar[0]?.id || null, tedarikci_id: '', tarih: bugun(), kalemler: [],
  })

  const ac = async (id) => {
    try {
      const l = await istekApi.getir(id)
      setDuzenleme({
        id: l.id, lokasyon_id: l.lokasyon_id, tedarikci_id: l.tedarikci_id || '', tarih: l.tarih || bugun(),
        kalemler: l.kalemler.map(k => ({ urun_id: k.urun_id, ad: k.urun_adi, miktar: k.miktar })),
      })
    } catch (e) { toast.error(e.message) }
  }

  const sil = async (id) => {
    if (!window.confirm('Bu istek listesi silinsin mi?')) return
    try { await istekApi.sil(id); toast.success('Silindi'); listeleriYukle() } catch (e) { toast.error(e.message) }
  }

  const pdf = async (id) => {
    try {
      const r = await istekApi.pdf(id)
      if (r.kaydedildi) toast.success('PDF kaydedildi')
    } catch (e) { toast.error(e.message) }
  }

  if (duzenleme) {
    return <Duzenle
      taslak={duzenleme} lokasyonlar={lokasyonlar} tedarikciler={tedarikciler}
      onKapat={() => setDuzenleme(null)}
      onKaydedildi={(id) => { setDuzenleme(null); listeleriYukle(); pdf(id) }}
    />
  }

  const tedAd = (id) => tedarikciler.find(t => t.id === id)?.ad || '—'
  const lokAd = (id) => lokasyonlar.find(l => l.id === id)?.ad || listeler.find(x => x.lokasyon_id === id)?.lokasyon_adi || '—'

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">📝 İstek Listeleri</h2>
        <button onClick={yeni} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          + Yeni İstek Listesi
        </button>
      </div>

      <div className="bg-white rounded-2xl border p-4">
        {listeler.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">Henüz istek listesi yok.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Şube</th>
                <th className="text-left px-3 py-2 font-medium">Tedarikçi</th>
                <th className="text-left px-3 py-2 font-medium">Tarih</th>
                <th className="text-center px-3 py-2 font-medium">Kalem</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {listeler.map(l => (
                <tr key={l.id} className="border-t">
                  <td className="px-3 py-2">{l.lokasyon_adi || lokAd(l.lokasyon_id)}</td>
                  <td className="px-3 py-2">{l.tedarikci_adi || tedAd(l.tedarikci_id)}</td>
                  <td className="px-3 py-2 text-gray-500">{l.tarih || '—'}</td>
                  <td className="px-3 py-2 text-center">{l.kalem_sayisi}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button onClick={() => ac(l.id)} className="text-blue-600 hover:underline mr-3">Aç</button>
                    <button onClick={() => pdf(l.id)} className="text-emerald-600 hover:underline mr-3">PDF</button>
                    <button onClick={() => sil(l.id)} className="text-red-500 hover:underline">Sil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// Düzenleme görünümü (MalKabul deseni; fiyatsız + kaydet/PDF).
function Duzenle({ taslak, lokasyonlar, tedarikciler, onKapat, onKaydedildi }) {
  const [lokId, setLokId] = useState(taslak.lokasyon_id)
  const [tedarikciId, setTedarikciId] = useState(taslak.tedarikci_id)
  const [tarih, setTarih] = useState(taslak.tarih)
  const [kalemler, setKalemler] = useState(taslak.kalemler)
  const [arama, setArama] = useState('')
  const [sonuc, setSonuc] = useState([])
  const [mesgul, setMesgul] = useState(false)
  const aramaRef = useRef()

  const araFn = useCallback(async (deger) => {
    setArama(deger)
    if (deger.length < 2) { setSonuc([]); return }
    try { const r = await urunlerApi.listele({ arama: deger, boyut: 8 }); setSonuc(r.urunler) } catch {}
  }, [])

  function kalemEkle(urun) {
    setKalemler(prev => prev.some(k => k.urun_id === urun.id) ? prev : [...prev, { urun_id: urun.id, ad: urun.ad, miktar: 1 }])
    setArama(''); setSonuc([]); aramaRef.current?.focus()
  }
  const kalemGuncelle = (urun_id, miktar) => setKalemler(prev => prev.map(k => k.urun_id === urun_id ? { ...k, miktar } : k))
  const kalemSil = (urun_id) => setKalemler(prev => prev.filter(k => k.urun_id !== urun_id))

  async function kaydet() {
    if (!lokId) { toast.error('Şube seçin'); return }
    if (!tedarikciId) { toast.error('Tedarikçi seçin'); return }
    if (!kalemler.length) { toast.error('En az bir ürün ekleyin'); return }
    setMesgul(true)
    try {
      const r = await istekApi.kaydet({
        id: taslak.id, lokasyon_id: lokId, tedarikci_id: tedarikciId, tarih,
        baslik: null,
        kalemler: kalemler.map(k => ({ urun_id: k.urun_id, urun_adi: k.ad, miktar: parseInt(k.miktar, 10) || 0 })),
      })
      toast.success('İstek listesi kaydedildi')
      onKaydedildi(r.id)
    } catch (e) { toast.error(e.message) }
    setMesgul(false)
  }

  const toplamAdet = kalemler.reduce((t, k) => t + (parseInt(k.miktar, 10) || 0), 0)

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onKapat} className="text-sm text-gray-500 hover:text-gray-800">← Geri</button>
        <h2 className="text-2xl font-bold text-gray-800">{taslak.id ? 'İstek Listesi Düzenle' : 'Yeni İstek Listesi'}</h2>
      </div>

      <div className="bg-white rounded-2xl border p-4 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Şube *</label>
            <select value={lokId || ''} onChange={e => setLokId(Number(e.target.value))}
              className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white">
              {lokasyonlar.map(l => <option key={l.id} value={l.id}>{l.ad}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tedarikçi *</label>
            <AranabilirSecici secenekler={tedarikciler.map(t => ({ deger: t.id, etiket: t.ad }))}
              deger={tedarikciId} onChange={v => setTedarikciId(v)} placeholder="Tedarikçi ara / seç" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tarih</label>
            <input type="date" value={tarih} onChange={e => setTarih(e.target.value)}
              className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </div>
        </div>

        <div className="relative">
          <input ref={aramaRef} value={arama} onChange={e => araFn(e.target.value)}
            placeholder="🔍 Ürün adı ile ara, eklemek için tıkla..."
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          {sonuc.length > 0 && (
            <div className="absolute z-20 left-0 right-0 bg-white border rounded-lg shadow-xl mt-1 max-h-56 overflow-auto">
              {sonuc.map(u => (
                <button key={u.id} onClick={() => kalemEkle(u)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b last:border-0 flex justify-between">
                  <span>{u.ad}</span>
                  <span className="text-gray-400 text-xs">{u.barkod || ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {kalemler.length > 0 && (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Ürün</th>
                  <th className="text-center px-3 py-2 font-medium w-28">Adet</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {kalemler.map(k => (
                  <tr key={k.urun_id} className="border-t">
                    <td className="px-3 py-1.5">{k.ad}</td>
                    <td className="px-3 py-1.5 text-center">
                      <input type="number" min="1" value={k.miktar}
                        onChange={e => kalemGuncelle(k.urun_id, e.target.value)}
                        className="w-20 border rounded px-2 py-1 text-sm text-center" />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <button onClick={() => kalemSil(k.urun_id)} className="text-gray-300 hover:text-red-500">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-gray-50">
                  <td className="px-3 py-2 text-right font-semibold text-gray-600">Toplam Adet</td>
                  <td className="px-3 py-2 text-center font-bold text-gray-800">{toplamAdet}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={kaydet} disabled={mesgul || !kalemler.length}
            className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
            {mesgul ? 'Kaydediliyor…' : '✓ Kaydet & PDF Al'}
          </button>
          <button onClick={onKapat} className="px-5 py-2 rounded-lg text-sm border hover:bg-gray-50">İptal</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Stok sekmesine ekle**

`src/pages/StokYonetim.jsx`'i güncelle:

```jsx
import Sekmeler from '../components/Sekmeler'
import { useAuth } from '../auth/AuthContext'
import Stok from './Stok.jsx'
import MalKabul from './MalKabul.jsx'
import IstekListesi from './IstekListesi.jsx'

// Stok + Mal Kabul + İstek Listesi tek sayfada sekmeli.
export default function StokYonetim() {
  const { yetkiVar } = useAuth()
  const sekmeler = [
    yetkiVar('stok_goruntule') && { kod: 'stok', ad: '📊 Stok', el: <Stok /> },
    yetkiVar('mal_kabul_yonet') && { kod: 'mal-kabul', ad: '📥 Mal Kabul', el: <MalKabul /> },
    yetkiVar('mal_kabul_yonet') && { kod: 'istek-listesi', ad: '📝 İstek Listesi', el: <IstekListesi /> },
  ].filter(Boolean)
  return <Sekmeler sekmeler={sekmeler} />
}
```

- [ ] **Step 3: Build + tüm testler**

Run: `npx vite build && npx vitest run`
Expected: Build başarılı; tüm testler PASS (istek-pdf dahil).

- [ ] **Step 4: Elle doğrulama (electron dev)**

Run: `npm run dev` (kurulu Tencerecim KAPALI olmalı — [[dev-baslatma-tuzaklari]])
Expected: Stok → "📝 İstek Listesi" sekmesi açılır; yeni liste oluşturulup ürün eklenip kaydedilebilir; "PDF Al" kaydet diyaloğu açar; üretilen PDF'te logo + şube adresi + ürün tam adları + adetler görünür.

- [ ] **Step 5: Commit**

```bash
git add src/pages/IstekListesi.jsx src/pages/StokYonetim.jsx
git commit -m "feat(istek): Istek Listesi sayfasi + Stok sekmesi"
```

---

## Self-Review Notu

- Bespoke `IstekListesiKalemleri.jsx` bileşeni tasarımda ayrı önerilmişti; planda düzenleme görünümü `Duzenle` alt-bileşeni olarak aynı dosyada tutuldu (dosya < 800 satır, MalKabul emsali tek dosya). Ayrı dosya gerekmiyor → YAGNI.
- Yayın (sürüm artır + publish) bu planın dışında; kullanıcı "yayınla" derse ayrı çalıştırılır.
