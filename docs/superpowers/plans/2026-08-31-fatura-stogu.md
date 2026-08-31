# Fatura Stoğu Implementation Plan (Faz 1/4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fatura stoğunu şirket geneli tek havuz olarak Supabase'de kurmak, tedarikçi alış faturalarıyla doldurmak ve Stok Yönetimi'ne "🧾 Fatura Stoğu" sekmesi olarak göstermek.

**Architecture:** Fatura verisinin ASIL nüshası Supabase (Postgres). Yerel SQLite yalnız-çekme aynası tutar (listeler hızlı açılsın). Tüm yazmalar doğrudan Supabase REST ile yapılır — senkron kuyruğu üzerinden DEĞİL, çünkü mevcut motor son-yazan-kazanır ve bayat kopya doğru bakiyeyi ezebilir.

**Tech Stack:** Electron 22 (CommonJS), better-sqlite3, React + Vite, Tailwind, Vitest, Supabase REST (`fetch`).

**Spec:** `docs/superpowers/specs/2026-08-31-fatura-entegrasyonu-design.md`

## Global Constraints

- Sürüm artırma: her yayında `package.json` patch hanesi artar (1.2.182 → 1.2.183).
- Tüm kullanıcıya görünen metinler **Türkçe**.
- Dosya sınırı: 800 satır. `FaturaStogu.jsx` bunu aşarsa görünümler ayrı bileşenlere bölünür.
- Yetki kontrolü **her yazma handler'ında** `yetkiKontrol('kod')` ile yapılır.
- Yeni yetki kodu **üç yere birden** eklenir: `electron/yetki.js`, `src/auth/izinler.js`, Supabase `yetki_kodlari`.
- Test komutu: `npm test` (vitest run). Testler kodun yanına `*.test.js` olarak konur.
- Para hesapları `electron/db/satis-hesapla.js`'teki `yuvarla()` ile 2 basamağa yuvarlanır; yeni hesaplayıcı YAZILMAZ.
- Fiyatlar **KDV dahil**tir (`kdv = tutar × oran / (100 + oran)`).
- Commit mesajları: `<tip>: <açıklama>` (feat/fix/docs/test/refactor), Türkçe, attribution satırı YOK.

---

### Task 1: Supabase şeması ve RPC iskeleti

**Files:**
- Create: `supabase/12_fatura_semasi.sql`

**Interfaces:**
- Produces: `fatura_stok`, `fatura_stok_hareketler`, `alis_faturalari`, `alis_fatura_kalemleri`, `kesilen_faturalar`, `kesilen_fatura_kalemleri` tabloları; `alis_faturasi_kaydet(...)` RPC.

- [ ] **Step 1: Migration dosyasını yaz**

`supabase/12_fatura_semasi.sql`:

```sql
-- Fatura alt sistemi. ASIL nüsha burada; yerel SQLite yalnız-çekme aynasıdır.
-- Gerekçe: docs/superpowers/specs/2026-08-31-fatura-entegrasyonu-design.md

create table if not exists fatura_stok (
  senk_id uuid primary key default gen_random_uuid(),
  urun_senk_id uuid not null unique,
  miktar integer not null default 0,
  senk_guncelleme timestamptz not null default now()
);

create table if not exists fatura_stok_hareketler (
  senk_id uuid primary key default gen_random_uuid(),
  urun_senk_id uuid not null,
  miktar integer not null,                    -- + giriş, − çıkış
  kaynak_tip text not null check (kaynak_tip in
    ('alis_faturasi','satis_faturasi','duzeltme','iade','telafi')),
  kaynak_senk_id uuid,
  aciklama text,
  kullanici text,
  senk_guncelleme timestamptz not null default now()
);
create index if not exists idx_fatura_hareket_urun on fatura_stok_hareketler(urun_senk_id);

create table if not exists alis_faturalari (
  senk_id uuid primary key default gen_random_uuid(),
  tedarikci_senk_id uuid,
  fatura_no text not null,
  fatura_tarihi date not null,
  ara_toplam numeric(14,2) not null default 0,
  kdv_toplam numeric(14,2) not null default 0,
  genel_toplam numeric(14,2) not null default 0,
  mal_kabul_senk_id uuid,                     -- NULL olabilir: mal/fatura ayrı gelebilir
  notlar text,
  kullanici text,
  senk_guncelleme timestamptz not null default now(),
  unique (tedarikci_senk_id, fatura_no)
);

create table if not exists alis_fatura_kalemleri (
  senk_id uuid primary key default gen_random_uuid(),
  alis_fatura_senk_id uuid not null references alis_faturalari(senk_id) on delete cascade,
  urun_senk_id uuid not null,
  urun_adi text,
  miktar integer not null,
  birim_fiyat numeric(14,2) not null,
  kdv_orani integer not null default 20,
  satir_toplam numeric(14,2) not null,
  senk_guncelleme timestamptz not null default now()
);

create table if not exists kesilen_faturalar (
  senk_id uuid primary key default gen_random_uuid(),
  kanal text not null,
  kanal_siparis_id text not null,
  belge_tipi text,
  belge_tipi_kaynak text default 'tahmin',
  saglayici text not null default 'bizimhesap',
  saglayici_guid text,
  saglayici_url text,
  fatura_no text,
  toplam numeric(14,2),
  durum text not null default 'kuyrukta',
  hata_mesaji text,
  tarih timestamptz not null default now(),
  senk_guncelleme timestamptz not null default now(),
  unique (kanal, kanal_siparis_id)            -- MÜKERRER FATURA ENGELİ
);

create table if not exists kesilen_fatura_kalemleri (
  senk_id uuid primary key default gen_random_uuid(),
  kesilen_fatura_senk_id uuid not null references kesilen_faturalar(senk_id) on delete cascade,
  urun_senk_id uuid not null,
  urun_adi text,
  miktar integer not null,
  birim_fiyat numeric(14,2) not null,
  kdv_orani integer not null default 20,
  satir_toplam numeric(14,2) not null,
  set_senk_id uuid,
  senk_guncelleme timestamptz not null default now()
);
```

- [ ] **Step 2: Alış faturası RPC'sini aynı dosyaya ekle**

Fatura, kalemler, stok artışı ve hareket kayıtları **tek transaction** olmalı;
yarım kalmış fatura fatura stoğunu bozar.

```sql
-- Alış faturasını kalemleriyle birlikte kaydeder ve fatura stoğunu ARTIRIR.
-- kalemler: [{urun_senk_id, urun_adi, miktar, birim_fiyat, kdv_orani, satir_toplam}]
create or replace function alis_faturasi_kaydet(
  p_tedarikci_senk_id uuid,
  p_fatura_no text,
  p_fatura_tarihi date,
  p_mal_kabul_senk_id uuid,
  p_notlar text,
  p_kullanici text,
  p_kalemler jsonb
) returns uuid
language plpgsql
as $$
declare
  v_fatura_id uuid;
  v_kalem jsonb;
  v_ara numeric(14,2) := 0;
  v_kdv numeric(14,2) := 0;
  v_genel numeric(14,2) := 0;
  v_satir_kdv numeric(14,2);
begin
  insert into alis_faturalari
    (tedarikci_senk_id, fatura_no, fatura_tarihi, mal_kabul_senk_id, notlar, kullanici)
  values
    (p_tedarikci_senk_id, p_fatura_no, p_fatura_tarihi, p_mal_kabul_senk_id, p_notlar, p_kullanici)
  returning senk_id into v_fatura_id;

  for v_kalem in select * from jsonb_array_elements(p_kalemler) loop
    insert into alis_fatura_kalemleri
      (alis_fatura_senk_id, urun_senk_id, urun_adi, miktar, birim_fiyat, kdv_orani, satir_toplam)
    values (
      v_fatura_id,
      (v_kalem->>'urun_senk_id')::uuid,
      v_kalem->>'urun_adi',
      (v_kalem->>'miktar')::int,
      (v_kalem->>'birim_fiyat')::numeric,
      (v_kalem->>'kdv_orani')::int,
      (v_kalem->>'satir_toplam')::numeric
    );

    -- Fatura stoğunu artır (yoksa oluştur)
    insert into fatura_stok (urun_senk_id, miktar)
    values ((v_kalem->>'urun_senk_id')::uuid, (v_kalem->>'miktar')::int)
    on conflict (urun_senk_id) do update
      set miktar = fatura_stok.miktar + excluded.miktar,
          senk_guncelleme = now();

    insert into fatura_stok_hareketler
      (urun_senk_id, miktar, kaynak_tip, kaynak_senk_id, aciklama, kullanici)
    values (
      (v_kalem->>'urun_senk_id')::uuid,
      (v_kalem->>'miktar')::int,
      'alis_faturasi',
      v_fatura_id,
      'Alış faturası ' || p_fatura_no,
      p_kullanici
    );

    -- KDV dahil fiyattan iç yüzdeyle ayrıştır (satis-hesapla.js ile aynı formül)
    v_satir_kdv := round(
      (v_kalem->>'satir_toplam')::numeric
      * (v_kalem->>'kdv_orani')::numeric
      / (100 + (v_kalem->>'kdv_orani')::numeric), 2);
    v_kdv   := v_kdv + v_satir_kdv;
    v_genel := v_genel + (v_kalem->>'satir_toplam')::numeric;
  end loop;

  v_ara := v_genel - v_kdv;
  update alis_faturalari
     set ara_toplam = v_ara, kdv_toplam = v_kdv, genel_toplam = v_genel
   where senk_id = v_fatura_id;

  return v_fatura_id;
end;
$$;
```

- [ ] **Step 3: RLS politikalarını ekle**

Mevcut `11_aktif_personel_kisiti.sql` deseniyle aynı — aktif personel şartı:

```sql
alter table fatura_stok             enable row level security;
alter table fatura_stok_hareketler  enable row level security;
alter table alis_faturalari         enable row level security;
alter table alis_fatura_kalemleri   enable row level security;
alter table kesilen_faturalar       enable row level security;
alter table kesilen_fatura_kalemleri enable row level security;

do $$
declare t text;
begin
  foreach t in array array['fatura_stok','fatura_stok_hareketler','alis_faturalari',
                           'alis_fatura_kalemleri','kesilen_faturalar','kesilen_fatura_kalemleri']
  loop
    execute format(
      'create policy %I_aktif_personel on %I for all to authenticated
       using (aktif_personel_mi()) with check (aktif_personel_mi())', t, t);
  end loop;
end $$;
```

> Uygulamadan önce `supabase/11_aktif_personel_kisiti.sql` açılıp yardımcı fonksiyonun
> gerçek adı doğrulanmalı; `aktif_personel_mi()` varsayımdır. Ad farklıysa bu blokta
> düzeltilir.

- [ ] **Step 4: Migration'ı Supabase'de çalıştır**

Supabase SQL Editor'de `supabase/12_fatura_semasi.sql` içeriğini çalıştır.
Beklenen: hata yok, 6 tablo + 1 fonksiyon oluştu.

Doğrulama sorgusu:

```sql
select table_name from information_schema.tables
 where table_schema = 'public' and table_name like '%fatura%'
 order by table_name;
```

Beklenen 6 satır: `alis_fatura_kalemleri`, `alis_faturalari`, `fatura_stok`,
`fatura_stok_hareketler`, `kesilen_fatura_kalemleri`, `kesilen_faturalar`.

- [ ] **Step 5: Commit**

```bash
git add supabase/12_fatura_semasi.sql
git commit -m "feat: fatura alt sistemi supabase semasi ve alis faturasi RPC"
```

---

### Task 2: Yetki kodları

**Files:**
- Modify: `electron/yetki.js`
- Modify: `src/auth/izinler.js`
- Create: `supabase/13_fatura_yetkileri.sql`

**Interfaces:**
- Produces: `fatura_stok_goruntule`, `fatura_stok_duzenle`, `fatura_kes` yetki kodları.

- [ ] **Step 1: Mevcut yetki listelerini oku**

```bash
grep -n "stok_sayim\|mal_kabul_yonet" electron/yetki.js src/auth/izinler.js
```

Çıktıdaki listelere yeni kodlar aynı biçimde eklenecek. Biçimi buradan öğren —
kör ekleme yapma.

- [ ] **Step 2: Üç dosyaya da kodları ekle**

`electron/yetki.js` ve `src/auth/izinler.js` içindeki yetki kodu listelerine,
mevcut satırların biçimini birebir izleyerek şu üçünü ekle:

- `fatura_stok_goruntule` — "Fatura stoğunu görüntüle"
- `fatura_stok_duzenle` — "Alış faturası gir / fatura stoğu düzelt"
- `fatura_kes` — "Siparişe fatura kes"

`supabase/13_fatura_yetkileri.sql`:

```sql
insert into yetki_kodlari (kod, aciklama) values
  ('fatura_stok_goruntule', 'Fatura stoğunu görüntüle'),
  ('fatura_stok_duzenle',   'Alış faturası gir / fatura stoğu düzelt'),
  ('fatura_kes',            'Siparişe fatura kes')
on conflict (kod) do nothing;
```

> `yetki_kodlari` tablosunun gerçek kolon adları `supabase/05_yeni_yetkiler.sql`
> dosyasından doğrulanmalı; farklıysa bu ekleme ona uydurulur.

- [ ] **Step 3: Migration'ı çalıştır ve doğrula**

Supabase SQL Editor'de `13_fatura_yetkileri.sql` çalıştır.

```sql
select kod from yetki_kodlari where kod like 'fatura%' order by kod;
```

Beklenen 3 satır.

- [ ] **Step 4: Commit**

```bash
git add electron/yetki.js src/auth/izinler.js supabase/13_fatura_yetkileri.sql
git commit -m "feat: fatura yetki kodlari"
```

---

### Task 3: Yerel ayna tabloları ve yalnız-çekme senkron bayrağı

**Files:**
- Modify: `electron/db/database.js` (tablo tanımlarının olduğu `init()` bloğu)
- Modify: `electron/db/senk-sema.js`
- Modify: `electron/db/senk-veri.js`
- Test: `electron/db/senk-sema.test.js` (mevcut dosyaya test ekle)

**Interfaces:**
- Consumes: Task 1'in Supabase tabloları.
- Produces: Yerel `fatura_stok`, `fatura_stok_hareketler`, `alis_faturalari`, `alis_fatura_kalemleri` tabloları; `TABLOLAR[x].yalnizCekme === true` bayrağı; `pushEdilecekTablolar()` fonksiyonu.

- [ ] **Step 1: Önce başarısız testi yaz**

`electron/db/senk-sema.test.js` dosyasının sonuna ekle:

```js
describe('yalnizCekme bayrağı', () => {
  test('fatura tabloları push listesinde YER ALMAZ', () => {
    const { pushEdilecekTablolar } = require('./senk-sema')
    const liste = pushEdilecekTablolar()
    expect(liste).not.toContain('fatura_stok')
    expect(liste).not.toContain('alis_faturalari')
  })

  test('normal tablolar push listesinde yer alır', () => {
    const { pushEdilecekTablolar } = require('./senk-sema')
    expect(pushEdilecekTablolar()).toContain('urunler')
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npm test -- senk-sema`
Expected: FAIL — `pushEdilecekTablolar is not a function`

- [ ] **Step 3: senk-sema.js'e tabloları ve fonksiyonu ekle**

`TABLOLAR` nesnesine ekle (mevcut girdilerin biçimini izleyerek):

```js
  // --- Fatura alt sistemi: YALNIZ ÇEKME ---
  // Asıl nüsha Supabase'de. Yerelden push edilirse son-yazan-kazanır upsert
  // bayat bakiyeyi buluta yazar ve mükerrer fatura engelinin altını oyar.
  fatura_stok:            { kolonlar: ['miktar'], fk: { urun_id: 'urunler' },
                            zorunluFk: ['urun_id'], dogal: [], yalnizCekme: true },
  fatura_stok_hareketler: { kolonlar: ['miktar', 'kaynak_tip', 'kaynak_id', 'aciklama', 'kullanici'],
                            fk: { urun_id: 'urunler' }, zorunluFk: ['urun_id'],
                            dogal: [], yalnizCekme: true },
  alis_faturalari:        { kolonlar: ['fatura_no', 'fatura_tarihi', 'ara_toplam', 'kdv_toplam',
                                       'genel_toplam', 'notlar', 'kullanici'],
                            fk: { tedarikci_id: 'tedarikciler' }, dogal: [], yalnizCekme: true },
  alis_fatura_kalemleri:  { kolonlar: ['urun_adi', 'miktar', 'birim_fiyat', 'kdv_orani', 'satir_toplam'],
                            fk: { alis_fatura_id: 'alis_faturalari', urun_id: 'urunler' },
                            zorunluFk: ['alis_fatura_id'], dogal: [], yalnizCekme: true },
```

Dosyanın export satırına `pushEdilecekTablolar` ekle ve fonksiyonu tanımla:

```js
// Push (yerel → bulut) toplamasına girecek tablolar. yalnizCekme olanlar HARİÇ.
function pushEdilecekTablolar() {
  return Object.keys(TABLOLAR).filter(t => !TABLOLAR[t].yalnizCekme)
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `npm test -- senk-sema`
Expected: PASS

- [ ] **Step 5: senk-veri.js'i push listesini kullanacak şekilde değiştir**

`senk-veri.js` içinde `veri-senk:degisenler` handler'ı tabloları dolaşırken
`SIRA` veya `Object.keys(TABLOLAR)` yerine `pushEdilecekTablolar()` kullanmalı.
Import satırını güncelle:

```js
const { TABLOLAR, SIRA, pushEdilecekTablolar } = require('./senk-sema')
```

ve push döngüsünün kaynağını `pushEdilecekTablolar()` yap. Pull (uygula) tarafı
DEĞİŞMEZ — yalnız-çekme tabloları çekilmeye devam etmeli.

- [ ] **Step 6: Yerel ayna tablolarını database.js'e ekle**

`init()` içindeki `db.exec(...)` bloğuna, mevcut tabloların yanına:

```sql
CREATE TABLE IF NOT EXISTS fatura_stok (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  urun_id INTEGER NOT NULL UNIQUE REFERENCES urunler(id),
  miktar INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS fatura_stok_hareketler (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  urun_id INTEGER NOT NULL REFERENCES urunler(id),
  miktar INTEGER NOT NULL,
  kaynak_tip TEXT NOT NULL,
  kaynak_id INTEGER,
  aciklama TEXT,
  kullanici TEXT,
  tarih TEXT DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_fatura_hareket_urun ON fatura_stok_hareketler(urun_id);

CREATE TABLE IF NOT EXISTS alis_faturalari (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tedarikci_id INTEGER REFERENCES tedarikciler(id),
  fatura_no TEXT NOT NULL,
  fatura_tarihi TEXT NOT NULL,
  ara_toplam REAL DEFAULT 0,
  kdv_toplam REAL DEFAULT 0,
  genel_toplam REAL DEFAULT 0,
  mal_kabul_id INTEGER REFERENCES mal_kabuller(id),
  notlar TEXT,
  kullanici TEXT,
  olusturma_tarihi TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(tedarikci_id, fatura_no)
);

CREATE TABLE IF NOT EXISTS alis_fatura_kalemleri (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alis_fatura_id INTEGER NOT NULL REFERENCES alis_faturalari(id),
  urun_id INTEGER NOT NULL REFERENCES urunler(id),
  urun_adi TEXT,
  miktar INTEGER NOT NULL,
  birim_fiyat REAL NOT NULL,
  kdv_orani INTEGER DEFAULT 20,
  satir_toplam REAL NOT NULL
);
```

- [ ] **Step 7: Uygulamayı açıp tabloların oluştuğunu doğrula**

Run: `npm run dev`
Uygulama açıldıktan sonra kapat. Hata çıkmamalı.

> `npm run dev` iki sessiz sebeple ölebilir (Vite'ın `dist-electron` izlemesi +
> tek-örnek kilidi). Açılmazsa çalışan Electron süreçlerini kapatıp yeniden dene.

- [ ] **Step 8: Commit**

```bash
git add electron/db/database.js electron/db/senk-sema.js electron/db/senk-veri.js electron/db/senk-sema.test.js
git commit -m "feat: fatura stogu yerel ayna tablolari + yalniz-cekme senkron bayragi"
```

---

### Task 4: Supabase yazma istemcisi

**Files:**
- Create: `electron/fatura/bulut.js`
- Test: `electron/fatura/bulut.test.js`

**Interfaces:**
- Consumes: `electron/oturum-canli.js`'ten `SUPABASE_URL`, `SUPABASE_KEY`.
- Produces:
  - `rpc(ad, govde, jwt)` → `Promise<any>` — Supabase RPC çağrısı
  - `sec(tablo, sorgu, jwt)` → `Promise<Array>` — REST select
  - `FaturaHatasi` sınıfı; `kod` alanı `'cakisma' | 'yetersiz_stok' | 'ag' | 'bilinmeyen'`

- [ ] **Step 1: Başarısız testi yaz**

`electron/fatura/bulut.test.js`:

```js
import { describe, test, expect, vi, beforeEach } from 'vitest'
const { rpc, FaturaHatasi } = require('./bulut')

beforeEach(() => { global.fetch = vi.fn() })

describe('rpc', () => {
  test('başarılı yanıtta gövdeyi döndürür', async () => {
    global.fetch.mockResolvedValue({
      ok: true, status: 200, json: async () => ({ id: 'abc' }),
    })
    await expect(rpc('deneme', {}, 'jwt')).resolves.toEqual({ id: 'abc' })
  })

  test('23505 (unique ihlali) kodunu cakisma olarak sınıflar', async () => {
    global.fetch.mockResolvedValue({
      ok: false, status: 409,
      json: async () => ({ code: '23505', message: 'duplicate key' }),
    })
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'cakisma' })
  })

  test('ağ hatasını ag olarak sınıflar', async () => {
    global.fetch.mockRejectedValue(new Error('fetch failed'))
    await expect(rpc('deneme', {}, 'jwt')).rejects.toMatchObject({ kod: 'ag' })
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npm test -- fatura/bulut`
Expected: FAIL — modül bulunamadı

- [ ] **Step 3: bulut.js'i yaz**

```js
// Fatura alt sisteminin Supabase yazma yolu.
// NEDEN AYRI: fatura tabloları senkron motoruna GİRMEZ (son-yazan-kazanır bayat
// bakiyeyi buluta yazardı). Bu modül doğrudan REST/RPC konuşur.
const { SUPABASE_URL, SUPABASE_KEY } = require('../oturum-canli')

class FaturaHatasi extends Error {
  constructor(mesaj, kod, ayrinti) {
    super(mesaj)
    this.name = 'FaturaHatasi'
    this.kod = kod            // 'cakisma' | 'yetersiz_stok' | 'ag' | 'bilinmeyen'
    this.ayrinti = ayrinti
  }
}

function basliklar(jwt) {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${jwt || SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
}

// Postgres hata kodunu bizim sınıfımıza çevirir.
function hataSinifla(govde) {
  if (govde?.code === '23505') return 'cakisma'
  if (typeof govde?.message === 'string' && govde.message.includes('YETERSIZ_STOK')) {
    return 'yetersiz_stok'
  }
  return 'bilinmeyen'
}

async function rpc(ad, govde, jwt) {
  let yanit
  try {
    yanit = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${ad}`, {
      method: 'POST', headers: basliklar(jwt), body: JSON.stringify(govde || {}),
    })
  } catch (e) {
    throw new FaturaHatasi('Sunucuya ulaşılamadı: ' + e.message, 'ag', e)
  }
  const veri = await yanit.json().catch(() => null)
  if (!yanit.ok) throw new FaturaHatasi(veri?.message || 'Sunucu hatası', hataSinifla(veri), veri)
  return veri
}

async function sec(tablo, sorgu, jwt) {
  let yanit
  try {
    yanit = await fetch(`${SUPABASE_URL}/rest/v1/${tablo}?${sorgu}`, { headers: basliklar(jwt) })
  } catch (e) {
    throw new FaturaHatasi('Sunucuya ulaşılamadı: ' + e.message, 'ag', e)
  }
  const veri = await yanit.json().catch(() => null)
  if (!yanit.ok) throw new FaturaHatasi(veri?.message || 'Sunucu hatası', hataSinifla(veri), veri)
  return veri
}

module.exports = { rpc, sec, FaturaHatasi }
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `npm test -- fatura/bulut`
Expected: PASS (3 test)

- [ ] **Step 5: Commit**

```bash
git add electron/fatura/bulut.js electron/fatura/bulut.test.js
git commit -m "feat: fatura supabase yazma istemcisi"
```

---

### Task 5: Fatura stoğu okuma katmanı (durum listesi)

**Files:**
- Create: `electron/db/fatura-stok.js`
- Test: `electron/db/fatura-stok.test.js`
- Modify: `electron/main.js:456` civarındaki handler modül listesi

**Interfaces:**
- Consumes: `getDb()` (`./database`), `yetkiKontrol` (`../yetki`).
- Produces: IPC kanalları `fatura-stok:durum`, `fatura-stok:hareketler`, `alis-fatura:listele`.
  `fatura-stok:durum` şu şekilli satırlar döndürür:
  `{ urun_id, urun_adi, sku, barkod, fatura_miktar, gercek_miktar, fark }`

- [ ] **Step 1: Başarısız testi yaz**

`electron/db/fatura-stok.test.js`:

```js
import { describe, test, expect, beforeEach } from 'vitest'
const Database = require('better-sqlite3')

// Test için bellek içi DB kurup modüle enjekte ediyoruz.
let db
const handlers = require('./fatura-stok')

beforeEach(() => {
  db = new Database(':memory:')
  db.exec(`
    CREATE TABLE urunler (id INTEGER PRIMARY KEY, ad TEXT, sku TEXT, barkod TEXT, aktif INTEGER DEFAULT 1);
    CREATE TABLE urun_stoklar (id INTEGER PRIMARY KEY, urun_id INTEGER, lokasyon_id INTEGER, miktar INTEGER);
    CREATE TABLE fatura_stok (id INTEGER PRIMARY KEY, urun_id INTEGER UNIQUE, miktar INTEGER DEFAULT 0);
  `)
  db.prepare("INSERT INTO urunler (id, ad, sku) VALUES (1, 'Tencere', 'TNC.LAV.00001')").run()
  db.prepare("INSERT INTO urunler (id, ad, sku) VALUES (2, 'Tava', 'TNC.LAV.00002')").run()
  // Tencere: fatura 12, gerçek 9 → fark +3
  db.prepare('INSERT INTO fatura_stok (urun_id, miktar) VALUES (1, 12)').run()
  db.prepare('INSERT INTO urun_stoklar (urun_id, lokasyon_id, miktar) VALUES (1, 1, 5)').run()
  db.prepare('INSERT INTO urun_stoklar (urun_id, lokasyon_id, miktar) VALUES (1, 2, 4)').run()
  // Tava: fatura stoğu YOK, gerçek 4 → fark −4
  db.prepare('INSERT INTO urun_stoklar (urun_id, lokasyon_id, miktar) VALUES (2, 1, 4)').run()
  handlers._dbAyarla(db)
})

describe('fatura-stok:durum', () => {
  test('fatura stoğu ile gerçek stoğu yan yana verir ve farkı hesaplar', () => {
    const satirlar = handlers['fatura-stok:durum']({})
    const tencere = satirlar.find(s => s.urun_id === 1)
    expect(tencere.fatura_miktar).toBe(12)
    expect(tencere.gercek_miktar).toBe(9)   // iki lokasyon toplamı
    expect(tencere.fark).toBe(3)
  })

  test('fatura stoğu hiç olmayan ürünü 0 sayar ve negatif fark verir', () => {
    const satirlar = handlers['fatura-stok:durum']({})
    const tava = satirlar.find(s => s.urun_id === 2)
    expect(tava.fatura_miktar).toBe(0)
    expect(tava.fark).toBe(-4)
  })

  test('sadece_eksik filtresi yalnız negatif farkları döndürür', () => {
    const satirlar = handlers['fatura-stok:durum']({ sadece_eksik: true })
    expect(satirlar.map(s => s.urun_id)).toEqual([2])
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npm test -- fatura-stok`
Expected: FAIL — modül bulunamadı

- [ ] **Step 3: fatura-stok.js'i yaz**

```js
const { getDb } = require('./database')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')

// Test enjeksiyonu: node:sqlite/better-sqlite3 bellek içi DB ile çalışabilmek için.
let _testDb = null
function db() { return _testDb || getDb() }

module.exports = {
  _dbAyarla: (d) => { _testDb = d },

  // Ürün bazında fatura stoğu vs gerçek stok. Gerçek stok TÜM lokasyonların toplamı,
  // çünkü fatura stoğu tek havuzdur (lokasyon bazlı değil).
  'fatura-stok:durum': ({ arama, sadece_eksik } = {}) => {
    const satirlar = db().prepare(`
      SELECT u.id AS urun_id, u.ad AS urun_adi, u.sku, u.barkod,
             COALESCE(fs.miktar, 0) AS fatura_miktar,
             COALESCE((SELECT SUM(us.miktar) FROM urun_stoklar us WHERE us.urun_id = u.id), 0)
               AS gercek_miktar
        FROM urunler u
        LEFT JOIN fatura_stok fs ON fs.urun_id = u.id
       WHERE u.aktif = 1
       ORDER BY u.ad
    `).all()

    return satirlar
      .map(s => ({ ...s, fark: s.fatura_miktar - s.gercek_miktar }))
      .filter(s => !sadece_eksik || s.fark < 0)
      .filter(s => !arama || [s.urun_adi, s.sku, s.barkod]
        .filter(Boolean).join(' ').toLocaleLowerCase('tr').includes(arama.toLocaleLowerCase('tr')))
  },

  'fatura-stok:hareketler': ({ urun_id, limit = 200 } = {}) => {
    yetkiKontrol('fatura_stok_goruntule')
    const kosul = urun_id ? 'WHERE h.urun_id = ?' : ''
    const params = urun_id ? [urun_id, limit] : [limit]
    return db().prepare(`
      SELECT h.*, u.ad AS urun_adi, u.sku
        FROM fatura_stok_hareketler h
        JOIN urunler u ON u.id = h.urun_id
        ${kosul}
       ORDER BY h.tarih DESC, h.id DESC
       LIMIT ?
    `).all(...params)
  },

  'alis-fatura:listele': ({ tedarikci_id } = {}) => {
    yetkiKontrol('fatura_stok_goruntule')
    const kosul = tedarikci_id ? 'WHERE f.tedarikci_id = ?' : ''
    const params = tedarikci_id ? [tedarikci_id] : []
    return db().prepare(`
      SELECT f.*, t.ad AS tedarikci_adi
        FROM alis_faturalari f
        LEFT JOIN tedarikciler t ON t.id = f.tedarikci_id
        ${kosul}
       ORDER BY f.fatura_tarihi DESC, f.id DESC
    `).all(...params)
  },

  'alis-fatura:kalemler': (alis_fatura_id) => {
    yetkiKontrol('fatura_stok_goruntule')
    return db().prepare(`
      SELECT k.*, u.sku FROM alis_fatura_kalemleri k
        LEFT JOIN urunler u ON u.id = k.urun_id
       WHERE k.alis_fatura_id = ? ORDER BY k.id
    `).all(alis_fatura_id)
  },
}
```

> `fatura-stok:durum` bilerek yetki kontrolü yapmaz — Trendyol/ikas sipariş
> ekranındaki kilit rozeti bu veriyi okur ve `fatura_stok_goruntule` yetkisi
> olmayan kasiyer de kilidin sebebini görebilmeli.

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `npm test -- fatura-stok`
Expected: PASS (3 test)

- [ ] **Step 5: Modülü main.js'e kaydet**

`electron/main.js` içinde `require('./db/stok'),` satırının hemen altına ekle:

```js
  require('./db/fatura-stok'),
```

- [ ] **Step 6: Commit**

```bash
git add electron/db/fatura-stok.js electron/db/fatura-stok.test.js electron/main.js
git commit -m "feat: fatura stogu okuma katmani (durum, hareketler, alis faturalari)"
```

---

### Task 6: Alış faturası yazma

**Files:**
- Create: `electron/fatura/alis.js`
- Test: `electron/fatura/alis.test.js`
- Modify: `electron/db/fatura-stok.js` (yeni kanalı ekle)

**Interfaces:**
- Consumes: `rpc` ve `FaturaHatasi` (`./bulut`), `satis-hesapla.js`'ten `yuvarla`.
- Produces:
  - `kalemleriHesapla(kalemler)` → `{ kalemler, araToplam, kdvToplam, genelToplam }`
  - IPC kanalı `alis-fatura:kaydet`

- [ ] **Step 1: Başarısız testi yaz**

`electron/fatura/alis.test.js`:

```js
import { describe, test, expect } from 'vitest'
const { kalemleriHesapla } = require('./alis')

describe('kalemleriHesapla', () => {
  test('KDV dahil fiyattan satır toplamı ve KDV ayrıştırır', () => {
    const s = kalemleriHesapla([
      { urun_id: 1, urun_adi: 'Tencere', miktar: 2, birim_fiyat: 120, kdv_orani: 20 },
    ])
    expect(s.kalemler[0].satir_toplam).toBe(240)
    expect(s.kdvToplam).toBe(40)      // 240 × 20/120
    expect(s.araToplam).toBe(200)
    expect(s.genelToplam).toBe(240)
  })

  test('farklı KDV oranlarını satır bazında ayrı hesaplar', () => {
    const s = kalemleriHesapla([
      { urun_id: 1, urun_adi: 'A', miktar: 1, birim_fiyat: 120, kdv_orani: 20 },
      { urun_id: 2, urun_adi: 'B', miktar: 1, birim_fiyat: 110, kdv_orani: 10 },
    ])
    expect(s.kdvToplam).toBe(30)      // 20 + 10
    expect(s.genelToplam).toBe(230)
  })

  test('boş kalem listesinde sıfır döndürür', () => {
    const s = kalemleriHesapla([])
    expect(s.genelToplam).toBe(0)
    expect(s.kalemler).toEqual([])
  })
})
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npm test -- fatura/alis`
Expected: FAIL — modül bulunamadı

- [ ] **Step 3: alis.js'i yaz**

```js
// Tedarikçi (alış) faturası: yerel hesap + Supabase'e yazma.
// Fatura stoğunu ARTIRAN tek yol budur.
const { rpc } = require('./bulut')
const { yuvarla } = require('../db/satis-hesapla')

// Fiyatlar KDV DAHİL. KDV iç yüzdeyle ayrıştırılır (satis-hesapla ile aynı formül).
function kalemleriHesapla(girdiler) {
  let kdvToplam = 0, genelToplam = 0
  const kalemler = (girdiler || []).map(k => {
    const satirToplam = yuvarla(Number(k.miktar) * Number(k.birim_fiyat))
    const oran = Number(k.kdv_orani)
    const kdv = yuvarla(satirToplam * oran / (100 + oran))
    kdvToplam += kdv
    genelToplam += satirToplam
    return {
      urun_id: k.urun_id,
      urun_adi: k.urun_adi,
      miktar: Number(k.miktar),
      birim_fiyat: yuvarla(Number(k.birim_fiyat)),
      kdv_orani: oran,
      satir_toplam: satirToplam,
    }
  })
  kdvToplam = yuvarla(kdvToplam)
  genelToplam = yuvarla(genelToplam)
  return { kalemler, araToplam: yuvarla(genelToplam - kdvToplam), kdvToplam, genelToplam }
}

// Supabase'e yazar. Fatura + kalemler + stok artışı TEK transaction (RPC içinde).
async function kaydet({ tedarikci_senk_id, fatura_no, fatura_tarihi, mal_kabul_senk_id,
                        notlar, kullanici, kalemler, urunSenkIdler }, jwt) {
  const hesap = kalemleriHesapla(kalemler)
  const yuk = hesap.kalemler.map(k => ({
    urun_senk_id: urunSenkIdler[k.urun_id],
    urun_adi: k.urun_adi,
    miktar: k.miktar,
    birim_fiyat: k.birim_fiyat,
    kdv_orani: k.kdv_orani,
    satir_toplam: k.satir_toplam,
  }))
  return rpc('alis_faturasi_kaydet', {
    p_tedarikci_senk_id: tedarikci_senk_id,
    p_fatura_no: fatura_no,
    p_fatura_tarihi: fatura_tarihi,
    p_mal_kabul_senk_id: mal_kabul_senk_id || null,
    p_notlar: notlar || null,
    p_kullanici: kullanici || null,
    p_kalemler: yuk,
  }, jwt)
}

module.exports = { kalemleriHesapla, kaydet }
```

- [ ] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `npm test -- fatura/alis`
Expected: PASS (3 test)

- [ ] **Step 5: IPC kanalını ekle**

`electron/db/fatura-stok.js` içindeki export nesnesine ekle:

```js
  'alis-fatura:kaydet': async (veri) => {
    yetkiKontrol('fatura_stok_duzenle')
    const alis = require('../fatura/alis')
    // urun_id → senk_id eşlemesi (bulut tarafı senk_id ile çalışır)
    const idler = {}
    for (const k of veri.kalemler) {
      const r = db().prepare('SELECT senk_id FROM urunler WHERE id = ?').get(k.urun_id)
      if (!r?.senk_id) throw new Error(`Ürün buluta henüz eşitlenmemiş: ${k.urun_adi}`)
      idler[k.urun_id] = r.senk_id
    }
    const ted = veri.tedarikci_id
      ? db().prepare('SELECT senk_id FROM tedarikciler WHERE id = ?').get(veri.tedarikci_id)
      : null
    // JWT renderer'dan ALINMAZ — ana süreçteki aktif oturumdan okunur.
    const jwt = require('../oturum-canli').aktifJwt?.() || null
    return alis.kaydet({ ...veri, tedarikci_senk_id: ted?.senk_id || null, urunSenkIdler: idler },
                       jwt)
  },
```

> **Güvenlik:** JWT'yi renderer'dan parametre olarak almak, uzlaşılmış bir
> renderer'ın istediği kimliği taklit etmesine izin verir — `guvenlik-mimarisi`
> notundaki "main, renderer'ın beyanına güvenmemeli" kuralının ta kendisi.
> `oturum-canli.js`'te aktif oturum token'ını döndüren bir yardımcı yoksa
> **bu adımda eklenir**; dosyayı açıp mevcut oturum saklama biçimini gör ve
> `aktifJwt()` adında bir dışa aktarım ekle.

- [ ] **Step 6: Testlerin tamamını çalıştır**

Run: `npm test`
Expected: Tüm testler PASS (mevcut testler dahil, hiçbiri kırılmamalı)

- [ ] **Step 7: Commit**

```bash
git add electron/fatura/alis.js electron/fatura/alis.test.js electron/db/fatura-stok.js
git commit -m "feat: alis faturasi kaydetme ve fatura stogu artisi"
```

---

### Task 7: Fatura Stoğu sekmesi (arayüz)

**Files:**
- Create: `src/pages/FaturaStogu.jsx`
- Modify: `src/pages/StokYonetim.jsx`
- Modify: `src/api/ipc.js`

**Interfaces:**
- Consumes: Task 5 ve 6'nın IPC kanalları.
- Produces: `faturaStokApi` (`src/api/ipc.js`); `FaturaStogu` bileşeni.

- [ ] **Step 1: API sarmalayıcısını ekle**

`src/api/ipc.js` içine, `stokApi` tanımının altına:

```js
export const faturaStokApi = {
  durum: (params) => invoke('fatura-stok:durum', params),
  hareketler: (params) => invoke('fatura-stok:hareketler', params),
  alisListele: (params) => invoke('alis-fatura:listele', params),
  alisKalemler: (id) => invoke('alis-fatura:kalemler', id),
  alisKaydet: (veri) => invoke('alis-fatura:kaydet', veri),
}
```

- [ ] **Step 2: FaturaStogu.jsx'i yaz**

`Stok.jsx`'in alt sekme desenini birebir izler; arama ve sekme durumu
`usePersistentState` ile cihaza özel kalıcıdır.

```jsx
import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { faturaStokApi } from '../api/ipc'
import { useAuth } from '../auth/AuthContext'
import Sayfalama from '../components/Sayfalama'
import { useSayfalama } from '../hooks/useSayfalama'
import { usePersistentState } from '../hooks/usePersistentState'

// Fatura stoğu: muhasebesel stok (tek havuz, lokasyon YOK). Gerçek stoktan
// AYRIDIR ve ayrı olması normaldir — mal irsaliyeyle gelir, faturası sonra gelir.
// Tasarım: docs/superpowers/specs/2026-08-31-fatura-entegrasyonu-design.md
export default function FaturaStogu() {
  const { yetkiVar } = useAuth()
  const [sekme, setSekme] = usePersistentState('fatura_stok_sekme', 'durum')
  const [arama, setArama] = usePersistentState('fatura_stok_arama', '')
  const [sadeceEksik, setSadeceEksik] = usePersistentState('fatura_stok_eksik', true)
  const [satirlar, setSatirlar] = useState([])

  const yukle = useCallback(async () => {
    try {
      if (sekme === 'durum') setSatirlar(await faturaStokApi.durum({ arama, sadece_eksik: sadeceEksik }))
      else if (sekme === 'alis') setSatirlar(await faturaStokApi.alisListele({}))
      else setSatirlar(await faturaStokApi.hareketler({}))
    } catch (e) { toast.error(e.message) }
  }, [sekme, arama, sadeceEksik])

  useEffect(() => { yukle() }, [yukle])

  const { sayfaVerisi, ...sayfalama } = useSayfalama(satirlar)

  return (
    <div>
      <div className="flex gap-1 mb-4 border-b">
        {[['durum', '📊 Durum'], ['alis', '📥 Alış Faturaları'], ['hareket', '🔀 Hareketler']]
          .map(([k, l]) => (
            <button key={k} onClick={() => setSekme(k)}
              className={`px-4 py-2 ${sekme === k ? 'border-b-2 border-blue-600 font-semibold' : 'text-gray-500'}`}>
              {l}
            </button>
          ))}
      </div>

      {sekme === 'durum' && (
        <>
          <div className="flex gap-3 items-center mb-3">
            <input value={arama} onChange={e => setArama(e.target.value)}
              placeholder="Ürün, SKU veya barkod ara" className="border rounded px-3 py-2 flex-1" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={sadeceEksik}
                onChange={e => setSadeceEksik(e.target.checked)} />
              Yalnız faturası eksik olanlar
            </label>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-left border-b">
              <th className="py-2">Ürün</th><th>SKU</th>
              <th className="text-right">Fatura Stoğu</th>
              <th className="text-right">Gerçek Stok</th>
              <th className="text-right">Fark</th>
            </tr></thead>
            <tbody>
              {sayfaVerisi.map(s => (
                <tr key={s.urun_id} className="border-b">
                  <td className="py-2">{s.urun_adi}</td>
                  <td className="text-gray-500">{s.sku || '—'}</td>
                  <td className="text-right">{s.fatura_miktar}</td>
                  <td className="text-right">{s.gercek_miktar}</td>
                  <td className={`text-right font-semibold ${s.fark < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                    {s.fark > 0 ? `+${s.fark}` : s.fark}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sayfaVerisi.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              Faturası eksik ürün yok — tüm siparişlere fatura kesilebilir.
            </p>
          )}
          <Sayfalama {...sayfalama} />
        </>
      )}

      {sekme !== 'durum' && (
        <p className="text-gray-500 py-4">Bu görünüm sonraki adımda doldurulacak.</p>
      )}
    </div>
  )
}
```

> `useSayfalama`'nın gerçek dönüş imzası `src/hooks/useSayfalama.js`'ten
> doğrulanmalı; `Stok.jsx`'teki kullanımı örnek alınmalı.

- [ ] **Step 3: Sekmeyi StokYonetim.jsx'e ekle**

`src/pages/StokYonetim.jsx` içinde import ekle ve sekme dizisine son eleman olarak:

```jsx
import FaturaStogu from './FaturaStogu.jsx'
// ...
    yetkiVar('fatura_stok_goruntule') && { kod: 'fatura-stok', ad: '🧾 Fatura Stoğu', el: <FaturaStogu /> },
```

- [ ] **Step 4: Uygulamayı açıp sekmeyi gör**

Run: `npm run dev`
Beklenen: Stok Yönetimi'nde 4. sekme görünür, Durum tablosu açılır (veri boşsa
"Faturası eksik ürün yok" mesajı çıkar).

- [ ] **Step 5: Commit**

```bash
git add src/pages/FaturaStogu.jsx src/pages/StokYonetim.jsx src/api/ipc.js
git commit -m "feat: fatura stogu sekmesi ve durum gorunumu"
```

---

### Task 8: Alış faturası giriş formu ve listesi

**Files:**
- Create: `src/components/AlisFaturaFormu.jsx`
- Modify: `src/pages/FaturaStogu.jsx` (`alis` sekmesinin gövdesi)

**Interfaces:**
- Consumes: `faturaStokApi.alisListele`, `alisKalemler`, `alisKaydet`; `urunApi.listele`; `tedarikciApi.listele`.
- Produces: `AlisFaturaFormu` bileşeni — props: `{ acik, kapat, kaydedildi, baslangic }`.
  `baslangic` isteğe bağlı `{ tedarikci_id, fatura_no, kalemler[] }` — Task 9 mal
  kabulden devralırken bunu doldurur.

- [ ] **Step 1: Formu yaz**

`src/components/AlisFaturaFormu.jsx`:

```jsx
import { useState } from 'react'
import toast from 'react-hot-toast'
import { faturaStokApi } from '../api/ipc'
import AranabilirSecici from './AranabilirSecici'

// Tedarikçi alış faturası girişi. Fatura stoğunu ARTIRAN tek yol budur.
// Fiyatlar KDV DAHİL girilir (uygulamanın her yerinde olduğu gibi).
export default function AlisFaturaFormu({ acik, kapat, kaydedildi, baslangic, urunler, tedarikciler }) {
  const [tedarikciId, setTedarikciId] = useState(baslangic?.tedarikci_id || '')
  const [faturaNo, setFaturaNo] = useState(baslangic?.fatura_no || '')
  const [tarih, setTarih] = useState(new Date().toISOString().slice(0, 10))
  const [kalemler, setKalemler] = useState(baslangic?.kalemler || [])
  const [kaydediliyor, setKaydediliyor] = useState(false)

  if (!acik) return null

  function kalemEkle(urunId) {
    const u = urunler.find(x => x.id === Number(urunId))
    if (!u) return
    if (kalemler.some(k => k.urun_id === u.id)) return toast.error('Bu ürün zaten listede')
    setKalemler([...kalemler, {
      urun_id: u.id, urun_adi: u.ad, miktar: 1,
      birim_fiyat: u.alis_fiyati || 0, kdv_orani: u.kdv_orani || 20,
    }])
  }

  function kalemGuncelle(urunId, alan, deger) {
    setKalemler(kalemler.map(k => k.urun_id === urunId ? { ...k, [alan]: deger } : k))
  }

  const genelToplam = kalemler.reduce((t, k) => t + Number(k.miktar) * Number(k.birim_fiyat), 0)

  async function gonder(e) {
    e.preventDefault()
    if (!faturaNo.trim()) return toast.error('Fatura numarası zorunlu')
    if (kalemler.length === 0) return toast.error('En az bir kalem eklemelisiniz')
    setKaydediliyor(true)
    try {
      await faturaStokApi.alisKaydet({
        tedarikci_id: tedarikciId ? Number(tedarikciId) : null,
        fatura_no: faturaNo.trim(),
        fatura_tarihi: tarih,
        mal_kabul_id: baslangic?.mal_kabul_id || null,
        kalemler,
      })
      toast.success('Alış faturası kaydedildi, fatura stoğu güncellendi')
      kaydedildi?.()
      kapat()
    } catch (e) {
      // Aynı tedarikçi + fatura no ikinci kez girilemez (UNIQUE kısıtı).
      toast.error(String(e.message).includes('23505')
        ? 'Bu fatura numarası bu tedarikçi için zaten girilmiş'
        : e.message)
    } finally { setKaydediliyor(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form onSubmit={gonder} className="bg-white rounded-lg p-6 w-[720px] max-h-[90vh] overflow-auto">
        <h2 className="text-lg font-semibold mb-4">Alış Faturası Gir</h2>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <select value={tedarikciId} onChange={e => setTedarikciId(e.target.value)}
                  className="border rounded px-3 py-2">
            <option value="">Tedarikçi seç</option>
            {tedarikciler.map(t => <option key={t.id} value={t.id}>{t.ad}</option>)}
          </select>
          <input value={faturaNo} onChange={e => setFaturaNo(e.target.value)}
                 placeholder="Fatura no" className="border rounded px-3 py-2" />
          <input type="date" value={tarih} onChange={e => setTarih(e.target.value)}
                 className="border rounded px-3 py-2" />
        </div>

        <AranabilirSecici secenekler={urunler.map(u => ({ deger: u.id, etiket: `${u.ad} (${u.sku || '—'})` }))}
                          deger="" degistir={kalemEkle} yerTutucu="Ürün ekle…" />

        <table className="w-full text-sm mt-4">
          <thead><tr className="text-left border-b">
            <th className="py-1">Ürün</th><th className="w-20">Miktar</th>
            <th className="w-28">Birim Fiyat</th><th className="w-20">KDV %</th>
            <th className="w-28 text-right">Toplam</th><th className="w-8"></th>
          </tr></thead>
          <tbody>
            {kalemler.map(k => (
              <tr key={k.urun_id} className="border-b">
                <td className="py-1">{k.urun_adi}</td>
                <td><input type="number" min="1" value={k.miktar} className="border rounded w-16 px-1"
                     onChange={e => kalemGuncelle(k.urun_id, 'miktar', Number(e.target.value))} /></td>
                <td><input type="number" step="0.01" value={k.birim_fiyat} className="border rounded w-24 px-1"
                     onChange={e => kalemGuncelle(k.urun_id, 'birim_fiyat', Number(e.target.value))} /></td>
                <td><input type="number" value={k.kdv_orani} className="border rounded w-16 px-1"
                     onChange={e => kalemGuncelle(k.urun_id, 'kdv_orani', Number(e.target.value))} /></td>
                <td className="text-right">{(k.miktar * k.birim_fiyat).toFixed(2)}</td>
                <td><button type="button" className="text-red-600"
                     onClick={() => setKalemler(kalemler.filter(x => x.urun_id !== k.urun_id))}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right mt-3 font-semibold">
          Genel Toplam (KDV dahil): {genelToplam.toFixed(2)} TL
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={kapat} className="px-4 py-2 border rounded">Vazgeç</button>
          <button type="submit" disabled={kaydediliyor}
                  className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
            {kaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
}
```

> `AranabilirSecici`'nin gerçek prop adları `src/components/AranabilirSecici.jsx`'ten
> doğrulanmalı; yukarıdaki adlar (`secenekler`/`deger`/`degistir`/`yerTutucu`)
> varsayımdır ve dosyadaki gerçek imzaya uydurulur.

- [ ] **Step 2: `alis` sekmesini FaturaStogu.jsx'te doldur**

`sekme === 'alis'` bloğu: üstte "➕ Alış Faturası Gir" düğmesi (yalnız
`yetkiVar('fatura_stok_duzenle')` ise), altta fatura listesi; satıra tıklayınca
`faturaStokApi.alisKalemler(id)` ile kalemler açılır. Task 7'deki
"sonraki adımda doldurulacak" yer tutucusunu KALDIR.

- [ ] **Step 3: Elle test — fatura gir**

Run: `npm run dev`
1. Fatura Stoğu → Alış Faturaları → Alış Faturası Gir
2. Tedarikçi seç, fatura no `TEST-001`, bir ürün ekle, miktar 5
3. Kaydet → "fatura stoğu güncellendi" mesajı
4. Durum sekmesine geç → o ürünün fatura stoğu 5 artmış olmalı
5. Aynı faturayı tekrar girmeyi dene → "zaten girilmiş" hatası gelmeli

- [ ] **Step 4: Commit**

```bash
git add src/components/AlisFaturaFormu.jsx src/pages/FaturaStogu.jsx
git commit -m "feat: alis faturasi giris formu ve listesi"
```

---

### Task 9: Hareketler görünümü ve mal kabulden devralma

**Files:**
- Modify: `src/pages/FaturaStogu.jsx` (`hareket` sekmesi)
- Modify: `src/pages/MalKabul.jsx`

**Interfaces:**
- Consumes: `faturaStokApi.hareketler`; Task 8'in `AlisFaturaFormu` (`baslangic` prop'u).

- [ ] **Step 1: Hareketler tablosunu yaz**

`sekme === 'hareket'` bloğuna, Task 7'deki yer tutucunun yerine:

```jsx
<table className="w-full text-sm">
  <thead><tr className="text-left border-b">
    <th className="py-2">Tarih</th><th>Ürün</th><th>Kaynak</th>
    <th className="text-right">Miktar</th><th>Açıklama</th><th>Kullanıcı</th>
  </tr></thead>
  <tbody>
    {sayfaVerisi.map(h => (
      <tr key={h.id} className="border-b">
        <td className="py-2">{h.tarih}</td>
        <td>{h.urun_adi}</td>
        <td>{{
          alis_faturasi: 'Alış faturası', satis_faturasi: 'Satış faturası',
          duzeltme: 'Düzeltme', iade: 'İade', telafi: 'Telafi',
        }[h.kaynak_tip] || h.kaynak_tip}</td>
        <td className={`text-right font-semibold ${h.miktar < 0 ? 'text-red-600' : 'text-green-700'}`}>
          {h.miktar > 0 ? `+${h.miktar}` : h.miktar}
        </td>
        <td className="text-gray-600">{h.aciklama}</td>
        <td className="text-gray-500">{h.kullanici || '—'}</td>
      </tr>
    ))}
  </tbody>
</table>
```

- [ ] **Step 2: Mal kabul kaydına devralma düğmesi ekle**

`src/pages/MalKabul.jsx`'te kayıtlı mal kabul satırına
**"🧾 Alış Faturası Oluştur"** düğmesi ekle. Tıklanınca `AlisFaturaFormu`'nu
`baslangic` ile açar:

```jsx
baslangic={{
  tedarikci_id: malKabul.tedarikci_id,
  fatura_no: malKabul.fatura_no || '',
  mal_kabul_id: malKabul.id,
  kalemler: malKabulKalemleri.map(k => ({
    urun_id: k.urun_id, urun_adi: k.urun_adi,
    miktar: k.miktar, birim_fiyat: k.birim_maliyet || 0, kdv_orani: 20,
  })),
}}
```

> `mal_kabul_kalemleri`'nin gerçek kolon adları (`birim_maliyet` vs `birim_fiyat`)
> `electron/db/database.js`'teki tablo tanımından doğrulanmalı.

- [ ] **Step 3: Elle test — devralma**

Run: `npm run dev`
1. Mal Kabul'de kayıtlı bir mal kabul aç → "Alış Faturası Oluştur"
2. Form kalemler dolu açılmalı, tedarikçi ve fatura no önceden gelmiş olmalı
3. Kaydet → Fatura Stoğu → Hareketler'de `+` hareketler görünmeli

- [ ] **Step 4: Tüm testleri çalıştır**

Run: `npm test`
Expected: Tüm testler PASS

- [ ] **Step 5: Sürümü artır ve commit**

`package.json` patch hanesini artır (örn. 1.2.182 → 1.2.183).

```bash
git add src/pages/FaturaStogu.jsx src/pages/MalKabul.jsx package.json
git commit -m "feat: fatura stogu hareketleri ve mal kabulden alis faturasi devralma"
```

---

## Sonraki planlar (bu planın kapsamı dışında)

- **Faz 2 — ikas fatura kesme:** fatura çekirdeği, Bizimhesap adaptörü,
  `fatura_kes_basla` RPC, ikas sipariş satırına buton ve filtreler.
  **Ön koşul:** Bizimhesap `addinvoice`'un GİB'e gönderdiğini doğrulayan 1 TL'lik
  deneme faturası.
- **Faz 3 — Trendyol siparişleri:** API istemcisi, sekme, rozet, webhook köprüsü.
- **Faz 4 — Trendyol fatura + kargo etiketi.**
  **Ön koşul:** kargo etiketi açık maddesinin karara bağlanması.

Faz 1 dokuz görevle tamamlanır: şema, yetkiler, yerel ayna, bulut istemcisi,
okuma katmanı, alış faturası yazma, üç görünümlü sekme ve mal kabulden devralma.
Task 7 yalnız Durum görünümünü canlıya alır (fark tablosu erken kullanılabilsin),
diğer iki görünüm Task 8 ve 9'da doldurulur.
