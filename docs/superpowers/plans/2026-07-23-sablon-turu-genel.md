# Şablon Türü (Ürün/Genel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sosyal medya otomasyon şablonlarına ikinci bir tür (`📝 Genel`) eklemek: kullanıcının yazdığı serbest metin, ürün/fiyat biçimi hiç uygulanmadan aynen müşteriye gider.

**Architecture:** `sosyal_sablonlar` tablosuna `tur` + `serbest_metin` kolonları eklenir. Mesaj üreten saf mantık (`sablon-mesaj.js`) "hepsi genel mi?" testine göre dallanır. UI (form, kütüphane, otomasyon paneli) türe göre görünüm ve tek-tür kuralı uygular. Backend hem kayıt hem otomasyon bağlamada karışık türü reddeder.

**Tech Stack:** Electron (main = CJS `electron/`), React + Vite (renderer = `src/`), better-sqlite3, vitest.

## Global Constraints

- Sürüm: yeni yayında patch artır (1.2.127 → 1.2.128). Bu özellik + önceki "+ buton" düzeltmesi tek sürümde.
- Meta mesaj sınırı: 1000 karakter (`MAKS_KARAKTER`). Aşımda metin KESİLMEZ, `asildi=true` döner.
- Genel şablon SAF metin: link/WhatsApp/fiyat/yer-tutucu YOK.
- Tek-tür kuralı: bir otomasyona ya birden çok ürün şablonu YA DA tek bir genel şablon.
- `tur` değerleri birebir: `'urun'` | `'genel'`. Varsayılan `'urun'`.
- Yeni DB kolonları senkron şemasına (`senk-sema.js`) EKLENMELİ, yoksa çok-PC'de kaybolur.
- Türkçe UI metinleri; ekran adları: `💰 Ürün şablonu`, `📝 Genel şablon`.
- Test komutu: `npx vitest run <dosya>`.

---

### Task 1: DB şeması + migration + senkron kolonları

**Files:**
- Modify: `electron/db/database.js:566-600` (sosyal_sablonlar tablosu + ALTER migration bölgesi)
- Modify: `electron/db/senk-sema.js:34` (sosyal_sablonlar.kolonlar)

**Interfaces:**
- Produces: `sosyal_sablonlar` tablosunda `tur TEXT NOT NULL DEFAULT 'urun'` ve `serbest_metin TEXT` kolonları; senkron bunları taşır.

- [ ] **Step 1: Tablo tanımına kolonları ekle (yeni kurulumlar için)**

`electron/db/database.js` içindeki `CREATE TABLE IF NOT EXISTS sosyal_sablonlar (...)` bloğunda `whatsapp TEXT,` satırından sonra iki kolon ekle:

```js
    whatsapp TEXT,
    tur TEXT NOT NULL DEFAULT 'urun',
    serbest_metin TEXT,
    aktif INTEGER DEFAULT 1,
```

- [ ] **Step 2: Mevcut DB'ler için ALTER migration ekle**

`set_id` ALTER'ının (database.js:600 civarı `ALTER TABLE sosyal_sablonlar ADD COLUMN set_id ...`) hemen ardına ekle:

```js
  // Şablon türü: 'urun' (fiyat odaklı, mevcut) | 'genel' (serbest metin aynen gider).
  // Mevcut satırlar 'urun' varsayılır — geriye dönük uyumlu.
  try { db.exec("ALTER TABLE sosyal_sablonlar ADD COLUMN tur TEXT NOT NULL DEFAULT 'urun'") } catch {}
  try { db.exec("ALTER TABLE sosyal_sablonlar ADD COLUMN serbest_metin TEXT") } catch {}
```

- [ ] **Step 3: Senkron şemasına kolonları ekle**

`electron/db/senk-sema.js:34` — `sosyal_sablonlar` satırındaki `kolonlar` dizisine `'tur'` ve `'serbest_metin'` ekle:

```js
  sosyal_sablonlar: { kolonlar: ['ad', 'urun_adi', 'aciklama', 'fiyat', 'link', 'whatsapp', 'tur', 'serbest_metin', 'aktif'],
```

- [ ] **Step 4: Uygulamayı bir kez açıp migration'ı doğrula**

Run: `ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron -e "const {getDb,initDb}=require('./electron/db/database'); initDb&&initDb(); const db=getDb(); console.log(db.prepare('PRAGMA table_info(sosyal_sablonlar)').all().map(c=>c.name).join(','))"`

Expected: çıktı `tur` ve `serbest_metin` içerir. (initDb adı farklıysa uygulamayı `npm run dev` ile bir kez aç; migration açılışta çalışır.)

- [ ] **Step 5: Commit**

```bash
git add electron/db/database.js electron/db/senk-sema.js
git commit -m "feat(sablon): sosyal_sablonlar tur+serbest_metin kolonlari + senkron"
```

---

### Task 2: `mesajOlustur` genel dallanması (saf mantık, TDD)

**Files:**
- Modify: `electron/meta/sablon-mesaj.js:52-68` (mesajOlustur)
- Test: `electron/meta/sablon-mesaj.test.js`

**Interfaces:**
- Consumes: `mesajOlustur({ sablonlar })` — her şablon objesi artık `tur` ve `serbest_metin` de içerebilir.
- Produces: Liste tümüyle `tur==='genel'` ise çıktı = `serbest_metin`'lerin boş satırla birleşimi, aynen (selamlama/fiyat/whatsapp yok).

- [ ] **Step 1: Başarısız testleri yaz**

`electron/meta/sablon-mesaj.test.js` sonuna yeni describe ekle:

```js
describe('genel (serbest metin) şablonlar', () => {
  const genel = { tur: 'genel', serbest_metin: "Bu tarifin malzemeleri için DM'den 'TARİF' yazın 👇" }

  test('tek genel şablon metni AYNEN gider (selamlama/fiyat yok)', () => {
    const { metin } = mesajOlustur({ sablonlar: [genel] })
    expect(metin).toBe("Bu tarifin malzemeleri için DM'den 'TARİF' yazın 👇")
    expect(metin.startsWith('Merhaba')).toBe(false)
    expect(metin).not.toContain('Fiyat:')
  })

  test('birden çok genel boş satırla alt alta birleşir', () => {
    const g2 = { tur: 'genel', serbest_metin: 'İkinci metin' }
    const { metin } = mesajOlustur({ sablonlar: [genel, g2] })
    expect(metin).toBe(genel.serbest_metin + '\n\n' + 'İkinci metin')
  })

  test('genel metin 1000 karakteri aşınca asildi=true, metin kesilmez', () => {
    const uzun = { tur: 'genel', serbest_metin: 'y'.repeat(1200) }
    const { metin, asildi, karakter } = mesajOlustur({ sablonlar: [uzun] })
    expect(asildi).toBe(true)
    expect(karakter).toBeGreaterThan(MAKS_KARAKTER)
    expect(metin).toContain('y'.repeat(1200))
  })

  test('genel şablonlarda ürün biçim etiketleri hiç yazılmaz', () => {
    const { metin } = mesajOlustur({ sablonlar: [genel] })
    expect(metin).not.toContain('Whatsapp Sipariş Hattı:')
    expect(metin).not.toContain('Online Sipariş Hattı:')
  })
})
```

- [ ] **Step 2: Testleri çalıştır — başarısız olmalı**

Run: `npx vitest run electron/meta/sablon-mesaj.test.js`
Expected: FAIL — genel testleri düşer (çünkü çıktı hâlâ "Merhaba," ile başlıyor).

- [ ] **Step 3: `mesajOlustur`'a genel dalını ekle**

`electron/meta/sablon-mesaj.js` içinde, boş-liste kontrolünden (`if (!liste.length) return ...`) HEMEN SONRA ekle:

```js
  // Genel (serbest) şablon: metin AYNEN gider — ürün/fiyat biçimi uygulanmaz.
  // Tek-tür kuralı gereği liste ya tümüyle genel ya tümüyle ürün olur; defansif olarak
  // "hepsi genel mi?" testine bakıyoruz.
  if (liste.every(s => s && s.tur === 'genel')) {
    const metin = liste
      .map(s => (s.serbest_metin || '').trim())
      .filter(Boolean)
      .join('\n\n')
      .trim()
    return { metin, karakter: metin.length, asildi: metin.length > MAKS_KARAKTER }
  }
```

- [ ] **Step 4: Testleri çalıştır — hepsi geçmeli**

Run: `npx vitest run electron/meta/sablon-mesaj.test.js`
Expected: PASS (genel testleri + mevcut ürün regresyon testleri).

- [ ] **Step 5: Commit**

```bash
git add electron/meta/sablon-mesaj.js electron/meta/sablon-mesaj.test.js
git commit -m "feat(sablon): mesajOlustur genel serbest metin dali + testler"
```

---

### Task 3: Backend — kayıt doğrulama, çözümleme, otomasyon tek-tür reddi

**Files:**
- Modify: `electron/db/sosyal-otomasyon.js:14-25` (_sablonlariCoz SELECT)
- Modify: `electron/db/sosyal-otomasyon.js:88-104` (sosyal:sablonKaydet)
- Modify: `electron/db/sosyal-otomasyon.js:127-152` (sosyal:otomasyonKaydet)

**Interfaces:**
- Consumes: `tur` + `serbest_metin` kolonları (Task 1).
- Produces: `sosyal:sablonKaydet({ id, ad, tur, serbest_metin, urun_id, set_id, urun_adi, aciklama, fiyat, link, whatsapp })` genel/ürün ayrımıyla kaydeder; `_sablonlariCoz` sonucu her satırda `tur`, `serbest_metin` içerir; `sosyal:otomasyonKaydet` karışık/çok-genel `sablon_idler`'i reddeder.

- [ ] **Step 1: `_sablonlariCoz` SELECT'ine kolonları ekle**

`electron/db/sosyal-otomasyon.js:16` — SELECT alan listesini güncelle:

```js
    SELECT s.urun_adi, s.aciklama, s.link, s.whatsapp, s.tur, s.serbest_metin,
           COALESCE(s.fiyat, u.satis_fiyati, st.fiyat) AS fiyat
```

- [ ] **Step 2: `sosyal:sablonKaydet`'i tür ayrımıyla değiştir**

`electron/db/sosyal-otomasyon.js:88-104` bloğunu şununla değiştir:

```js
  'sosyal:sablonKaydet': ({ id, ad, tur, serbest_metin, urun_id, set_id, urun_adi, aciklama, fiyat, link, whatsapp }) => {
    yetkiKontrol('sosyal_otomasyon_yonet')
    if (!ad || !ad.trim()) throw new Error('Şablon adı gerekli.')
    const t = tur === 'genel' ? 'genel' : 'urun'
    const db = getDb()
    let p
    if (t === 'genel') {
      const sm = (serbest_metin || '').trim()
      if (!sm) throw new Error('Genel şablonda mesaj metni gerekli.')
      if (sm.length > 1000) throw new Error('Mesaj metni 1000 karakteri aşamaz.')
      // Genel türde ürün alanları anlamsız → boşaltılır. urun_adi NOT NULL olduğu için ''.
      p = [ad.trim(), null, null, '', null, null, null, null, 'genel', sm]
    } else {
      if (!urun_adi || !urun_adi.trim()) throw new Error('Ürün adı gerekli.')
      if (urun_id && set_id) throw new Error('Şablon ya ürüne ya sete bağlanabilir, ikisine birden değil.')
      p = [ad.trim(), urun_id || null, set_id || null, urun_adi.trim(), aciklama || null,
        fiyat === '' || fiyat == null ? null : Number(fiyat), link || null, whatsapp || null, 'urun', null]
    }
    if (id) {
      db.prepare(`UPDATE sosyal_sablonlar SET ad=?, urun_id=?, set_id=?, urun_adi=?, aciklama=?,
        fiyat=?, link=?, whatsapp=?, tur=?, serbest_metin=? WHERE id=?`).run(...p, id)
      return { id }
    }
    const r = db.prepare(`INSERT INTO sosyal_sablonlar
      (ad, urun_id, set_id, urun_adi, aciklama, fiyat, link, whatsapp, tur, serbest_metin)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(...p)
    return { id: r.lastInsertRowid }
  },
```

- [ ] **Step 3: `sosyal:sablonlar` SELECT'ine tür/metin ekle (liste rozeti için)**

`electron/db/sosyal-otomasyon.js:72` — `SELECT s.*, ...` zaten `s.*` ile `tur` ve `serbest_metin`'i getirir; ek değişiklik gerekmez. (Doğrula: `s.*` kullanılıyor.)

- [ ] **Step 4: `sosyal:otomasyonKaydet`'e tek-tür reddi ekle**

`electron/db/sosyal-otomasyon.js` — `sosyal:otomasyonKaydet` içinde, `const tx = db.transaction(() => {` satırından ÖNCE ekle:

```js
    const idler = sablon_idler || []
    if (idler.length) {
      const turler = db.prepare(
        `SELECT tur, COUNT(*) n FROM sosyal_sablonlar WHERE id IN (${idler.map(() => '?').join(',')}) GROUP BY tur`
      ).all(...idler)
      const genelSayi = turler.find(x => x.tur === 'genel')?.n || 0
      const urunSayi = turler.find(x => x.tur !== 'genel')?.n || 0
      if (genelSayi && urunSayi) throw new Error('Bir otomasyonda ürün ve genel şablon karıştırılamaz.')
      if (genelSayi > 1) throw new Error('Bir otomasyona yalnız tek genel şablon bağlanabilir.')
    }
```

Not: `db` bu bölgede `const db = getDb()` ile zaten tanımlı (fonksiyon başında). Değilse ekle.

- [ ] **Step 5: Doğrulama testini elle çalıştır (hızlı akıl kontrolü)**

Run: `ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron -e "const h=require('./electron/db/sosyal-otomasyon'); try{h['sosyal:sablonKaydet']({ad:'X',tur:'genel',serbest_metin:''})}catch(e){console.log('OK boş metin reddedildi:',e.message)}"`
Expected: "OK boş metin reddedildi: Genel şablonda mesaj metni gerekli." (yetkiKontrol hata verirse yetki mock'u gerekir — o durumda bu adımı atla, Task 7 tam testte doğrulanır.)

- [ ] **Step 6: Commit**

```bash
git add electron/db/sosyal-otomasyon.js
git commit -m "feat(sablon): backend genel tur kaydi + otomasyon tek-tur reddi"
```

---

### Task 4: SablonFormu — genel mod

**Files:**
- Modify: `src/components/SablonFormu.jsx`

**Interfaces:**
- Consumes: `sablon` prop artık `tur` içerebilir; yeni-oluşturmada `SablonKutuphanesi` `tur`'u geçirir (Task 5).
- Produces: `onKaydet(v)` çağrısı genel modda `{ ad, tur:'genel', serbest_metin }`, ürün modda mevcut alanlar + `tur:'urun'`.

- [ ] **Step 1: Başlangıç state'ine tur/serbest_metin ekle**

`useState` başlangıç objesine ekle (satır 34-37):

```js
  const [v, setV] = useState({
    ad: '', tur: 'urun', serbest_metin: '',
    urun_id: null, set_id: null, urun_adi: '', aciklama: '', fiyat: '', link: '', whatsapp: '',
    ...(sablon || {}),
  })
  const genelMi = v.tur === 'genel'
```

- [ ] **Step 2: `kaydet`'i türe göre dallandır**

Mevcut `const kaydet = () => onKaydet({ ...v, fiyat: urundenAlEtkin ? null : (v.fiyat || null) })` satırını değiştir:

```js
  const kaydet = () => genelMi
    ? onKaydet({ id: v.id, ad: v.ad, tur: 'genel', serbest_metin: v.serbest_metin })
    : onKaydet({ ...v, tur: 'urun', fiyat: urundenAlEtkin ? null : (v.fiyat || null) })
```

- [ ] **Step 3: Genel modda ayrı gövde render et**

`return (...)` içindeki `<div className="grid grid-cols-2 gap-5">` bloğunu koşullu yap. Genel modda yalnız ad + metin + önizleme:

```jsx
        {genelMi ? (
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-3">
              <Alan etiket="Şablon adı" not="listede göreceğin isim">
                <input value={v.ad} onChange={e => setV(o => ({ ...o, ad: e.target.value }))}
                  placeholder="Tarif çağrısı" className="w-full border rounded-lg px-3 py-2 text-sm" />
              </Alan>
              <Alan etiket="Mesaj metni" not="müşteriye AYNEN bu gider">
                <textarea value={v.serbest_metin || ''} onChange={e => setV(o => ({ ...o, serbest_metin: e.target.value }))}
                  rows={10} placeholder={"Bu tarifin malzeme listesi için\nDM'den 'TARİF' yazın 👇"}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </Alan>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1">Müşteriye gidecek mesaj</p>
              <pre className="bg-gray-50 border rounded-xl p-3 text-sm whitespace-pre-wrap font-sans h-80 overflow-auto">
                {(v.serbest_metin || '').trim()}
              </pre>
              <p className={`text-xs mt-2 ${(v.serbest_metin || '').length > MAKS_KARAKTER ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
                {(v.serbest_metin || '').length}/{MAKS_KARAKTER} karakter
                {(v.serbest_metin || '').length > MAKS_KARAKTER && ' — sınır aşıldı, kısaltın'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5">
            {/* MEVCUT ürün formu bloğu buraya olduğu gibi taşınır */}
          </div>
        )}
```

Mevcut ürün formu (`<div className="space-y-3">...</div>` + önizleme) bu ternary'nin `else` dalına taşınır — içerik AYNEN korunur.

- [ ] **Step 4: Başlık ve Kaydet kilidini türe göre ayarla**

Başlık (satır 94): `{sablon?.id ? 'Şablonu Düzenle' : (genelMi ? 'Yeni Genel Şablon' : 'Yeni Ürün Şablonu')}`

Kaydet butonu `disabled` koşulunu güncelle:

```jsx
          <button onClick={kaydet}
            disabled={genelMi
              ? (!v.ad?.trim() || !(v.serbest_metin || '').trim() || (v.serbest_metin || '').length > MAKS_KARAKTER)
              : (!v.ad?.trim() || !v.urun_adi?.trim() || asildi)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-40">Kaydet</button>
```

- [ ] **Step 5: Elle doğrula (dev)**

Run: `npm run dev` (ayrı çalıştır) → Ürünler değil, sosyal medya gönderi detayında değil; en hızlısı: uygulamada Şablon Kütüphanesi'ni açıp (Task 5 sonrası) genel formu dene. Bu adımda sadece derleme hatası olmadığını doğrula: `npx vite build` çalışır.

Run: `npx vite build`
Expected: hatasız build (uyarılar olabilir).

- [ ] **Step 6: Commit**

```bash
git add src/components/SablonFormu.jsx
git commit -m "feat(sablon): SablonFormu genel (serbest metin) modu"
```

---

### Task 5: SablonKutuphanesi — "+ Yeni" tür menüsü + liste rozeti

**Files:**
- Modify: `src/components/SablonKutuphanesi.jsx`

**Interfaces:**
- Consumes: `setFormda({ tur })` ile SablonFormu'na tür geçer (Task 4).
- Produces: Yeni-oluşturmada seçilen tür forma iletilir; genel şablonlar listede `📝 Genel` rozetiyle görünür.

- [ ] **Step 1: "+ Yeni" tek butonu iki seçenekli menüye çevir**

`formda` state'i zaten var. `+ Yeni` butonunu (satır 58-62) küçük bir açılır menüyle değiştir. Basit yaklaşım: bir `menuAcik` state'i + iki buton.

`const [formda, setFormda] = useState(null)` altına ekle: `const [menuAcik, setMenuAcik] = useState(false)`

Butonu değiştir:

```jsx
        {yonetebilir && (
          <div className="relative">
            <button onClick={() => setMenuAcik(m => !m)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap">+ Yeni ▾</button>
            {menuAcik && (
              <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 w-44 overflow-hidden">
                <button onClick={() => { setFormda({ tur: 'urun' }); setMenuAcik(false) }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50">💰 Ürün şablonu</button>
                <button onClick={() => { setFormda({ tur: 'genel' }); setMenuAcik(false) }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50">📝 Genel şablon</button>
              </div>
            )}
          </div>
        )}
```

- [ ] **Step 2: Yeni-oluşturmada tür'ü forma geçir**

`SablonFormu` render'ı (satır 100-101) `sablon={formda.id ? formda : null}` kullanıyor; bu yeni-oluşturmada tür'ü düşürür. Değiştir:

```jsx
      {formda && <SablonFormu sablon={formda.id ? formda : { tur: formda.tur || 'urun' }}
        onKapat={() => setFormda(null)} onKaydet={kaydet} />}
```

- [ ] **Step 3: Liste satırında genel rozeti + metin önizleme**

Satır 77-85'teki alt-bilgi bloğunu türe göre dallandır:

```jsx
              <div className="text-xs text-gray-500 truncate">
                {s.tur === 'genel' ? (
                  <><span className="text-violet-600">📝 Genel</span>
                    <span className="text-gray-400"> · {(s.serbest_metin || '').split('\n')[0].slice(0, 60)}</span></>
                ) : (<>
                  {s.kaynak_tipi === 'set' && <span title="Set">📦 </span>}
                  {s.urun_adi}
                  {s.fiyat != null
                    ? <span className="text-gray-400"> · {Number(s.fiyat).toLocaleString('tr-TR')} TL (sabit)</span>
                    : s.kaynak_fiyati != null
                      ? <span className="text-emerald-600"> · {Number(s.kaynak_fiyati).toLocaleString('tr-TR')} TL (canlı)</span>
                      : <span className="text-amber-600"> · fiyat yok</span>}
                </>)}
              </div>
```

- [ ] **Step 4: Arama alanını genel metni de kapsayacak şekilde genişlet (opsiyonel, küçük)**

Satır 51'i güncelle:

```js
  const suz = liste.filter(s => eslesirMi(`${s.ad} ${s.urun_adi || ''} ${s.serbest_metin || ''}`, ara))
```

- [ ] **Step 5: Build doğrula**

Run: `npx vite build`
Expected: hatasız build.

- [ ] **Step 6: Commit**

```bash
git add src/components/SablonKutuphanesi.jsx
git commit -m "feat(sablon): + Yeni tur menusu + liste genel rozeti"
```

---

### Task 6: OtomasyonPaneli — tek-tür kuralı (UI)

**Files:**
- Modify: `src/components/OtomasyonPaneli.jsx:61-64` (ekle fonksiyonu) ve satır 105-112 (ekli satır etiketi)

**Interfaces:**
- Consumes: seçilen şablon `s.tur` içerir (Task 3 `sosyal:sablonlar` `s.*` döner).
- Produces: karışık/çok-genel bağlamayı engeller; backend (Task 3) ikinci savunma katmanı.

- [ ] **Step 1: `ekle`'ye tek-tür kontrolü ekle**

`const ekle = (s) => {...}` (satır 61-64) bloğunu değiştir:

```js
  const ekle = (s) => {
    if (sablonlar.some(x => x.id === s.id)) return toast.error('Bu şablon zaten ekli.')
    const eklininGenel = s.tur === 'genel'
    const vardirGenel = sablonlar.some(x => x.tur === 'genel')
    const vardirUrun = sablonlar.some(x => x.tur !== 'genel')
    if (eklininGenel && sablonlar.length) return toast.error('Genel şablon tek başına bağlanır — önce diğerlerini çıkarın.')
    if (!eklininGenel && vardirGenel) return toast.error('Bu otomasyonda genel şablon var; ürün şablonu ile karıştırılamaz.')
    setSablonlar(l => [...l, s]); setSecici(false)
  }
```

(`vardirUrun` kullanılmıyorsa kaldır — lint temiz kalsın. Yukarıdaki iki koşul yeterli.)

- [ ] **Step 2: Ekli satırda genel etiketi göster**

Satır 105-112'deki ekli şablon satırına küçük rozet ekle:

```jsx
        {sablonlar.map(s => (
          <div key={s.id} className="flex items-center gap-2 bg-white border rounded-lg px-2 py-1.5">
            {s.tur === 'genel' && <span className="text-[10px] text-violet-600">📝</span>}
            <span className="text-xs flex-1 truncate">{s.ad}</span>
            {yonetebilir && (
              <button onClick={() => cikar(s.id)} className="text-gray-400 text-xs hover:text-red-500">✕</button>
            )}
          </div>
        ))}
```

- [ ] **Step 3: Build doğrula**

Run: `npx vite build`
Expected: hatasız build.

- [ ] **Step 4: Commit**

```bash
git add src/components/OtomasyonPaneli.jsx
git commit -m "feat(sablon): otomasyon panelinde tek-tur kurali"
```

---

### Task 7: Tam test, sürüm artırımı, yayına hazırlık

**Files:**
- Modify: `package.json` (version)

**Interfaces:**
- Consumes: Task 1-6.
- Produces: yeşil test paketi + v1.2.128 sürümü; ardından kullanıcı "yayınla" zincirini başlatır.

- [ ] **Step 1: Tüm testleri çalıştır**

Run: `npx vitest run`
Expected: PASS (özellikle sablon-mesaj + senk-sema testleri).

- [ ] **Step 2: Üretim build'i doğrula**

Run: `npx vite build`
Expected: hatasız.

- [ ] **Step 3: Elle akış doğrulaması (dev)**

`npm run dev` ile: (a) Ürünler > ürün ekle > Marka/Kategori/Tedarikçi + butonu artık ekliyor (önceki düzeltme). (b) Sosyal medya gönderi detayı > Şablon > + Yeni > 📝 Genel şablon > metin yaz > kaydet > listede 📝 Genel rozeti. (c) Otomasyon paneli > genel şablonu ekle, sonra ürün eklemeyi dene → uyarı.

- [ ] **Step 4: Sürümü artır**

`package.json` içinde `"version": "1.2.127"` → `"version": "1.2.128"`.

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "chore: v1.2.128"
```

- [ ] **Step 6: Yayın**

Kullanıcının "yayınla" komutu zinciri (bkz. hafıza: yayin-akisi) — vite build + electron-builder --publish always, DRAFT → draft:false → ayrı PATCH ile make_latest='true', GH_TOKEN .env inline. Bu adım kullanıcı onayıyla ayrı yürütülür.

---

## Notlar

- Önceki "+ buton (iç içe form)" düzeltmesi `src/pages/Urunler.jsx`'te commit edilmemiş durumda; Task 7 öncesi ayrı commit'lenmeli veya v1.2.128'e dahil edilmeli:
  ```bash
  git add src/pages/Urunler.jsx
  git commit -m "fix(urunler): ic ice form yuzunden + butonu marka/kategori/tedarikci eklemiyordu"
  ```
- `initDb` fonksiyon adı Task 1 Step 4'te varsayımsal; gerçek ad `electron/db/database.js`'ten teyit edilmeli (muhtemelen açılışta otomatik). Şüphedeyse migration'ı `npm run dev` bir kez açarak tetikle.
