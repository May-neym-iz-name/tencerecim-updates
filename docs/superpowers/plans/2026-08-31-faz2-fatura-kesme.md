# Faz 2 — ikas Siparişlerine Fatura Kesme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ikas siparişlerine uygulamadan e-fatura/e-arşiv kestirmek — Bizimhesap üzerinden, fatura stoğu kontrolüyle, mükerrer fatura veritabanı seviyesinde imkânsız olacak şekilde.

**Architecture:** Faz 1'in kurduğu fatura stoğu altyapısı üzerine kanal-bağımsız bir fatura çekirdeği + Bizimhesap sağlayıcı adaptörü + ikas kanal adaptörü. Sahiplenme ve stok düşümü tek bir Postgres RPC'sinde atomik. Sağlayıcı adaptör arkasında: ileride Mikro ERP veya başka entegratöre geçilirse yalnız o dosya değişir.

**Tech Stack:** Electron 22 (CommonJS, **Node 16.17 — `fetch` YOK**), better-sqlite3, React + Vite, Tailwind, Vitest, Supabase REST/RPC (`https.request`).

**Spec:** `docs/superpowers/specs/2026-08-31-fatura-entegrasyonu-design.md`

**Önceki faz:** `docs/superpowers/plans/2026-08-31-fatura-stogu.md` (tamamlandı, dal `fatura-stogu`)

## Global Constraints

- 🔴 **`fetch` KULLANMA.** Electron 22 ana süreci Node 16.17 çalıştırır, global `fetch` yoktur. HTTP için `require('https')` + `https.request` — model: `electron/oturum-canli.js` ve `electron/fatura/bulut.js`.
- 🔴 **Electron ana sürecine kod yazarken "bu hangi Node'da çalışacak?" diye sor.** Şüpheli API'yi şununla doğrula:
  `ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron -e "..."` (düz `electron -e` ÇALIŞMAZ).
- `electron/` CommonJS (`require`/`module.exports`), `src/` ESM. Karıştırmak Electron'da çalışma zamanı hatası verir.
- Kullanıcıya görünen tüm metinler **Türkçe** (hata mesajları dahil).
- Para hesapları `electron/db/satis-hesapla.js`'teki `yuvarla()` ile; **fiyatlar KDV DAHİL** (`kdv = tutar × oran / (100 + oran)`).
- 🔴 **Yuvarlama sırası:** önce `birim_fiyat` yuvarla, sonra `satir_toplam = yuvarla(miktar × yuvarlanmış_fiyat)`. Sunucu bunu yeniden doğruluyor; sıra farklı olursa geçerli fatura reddedilir.
- Yeni yetki kodu **üç yere birden**: `electron/yetki.js`, `src/auth/izinler.js`, Supabase `yetki_kodlari`. Riskli yetkiler `PERSONEL_VARSAYILAN`'a **konmaz** (`on_siparis_yap` emsali).
- JWT renderer'dan **alınmaz**; `electron/db/fatura-stok.js`'teki `jwtAl()` deseni kullanılır.
- Test: `npm test` (vitest). Şu an **631 test geçiyor**, hiçbiri kırılmayacak.
- CommonJS modülü testte taklit etmek için `require.cache` ön-kurulumu (örnek: `electron/fatura/okuma.test.js`) veya `vi.spyOn` (örnek: `electron/fatura/bulut.test.js`).
- Commit: `<tip>: <açıklama>` (feat/fix/docs/test/refactor), Türkçe, attribution satırı YOK.
- 🔴 **Canlı Supabase'e migration UYGULAMA** — SQL dosyasını yaz, kontrolör uygular.
- 🔴 **Bizimhesap'a GERÇEK fatura gönderme.** `firmId` henüz elimizde yok; tüm Bizimhesap çağrıları testte taklit edilecek.

## Bilinen boşluklar (bu planın kapatması gerekenler)

Faz 1'in bütün-dal incelemesinden devredilen borçlar:

1. `electron/main.js:507-514` IPC sarmalayıcısı renderer'a yalnız `err.message` geçiriyor; `FaturaHatasi.kod` sınırı geçmiyor. **Faz 2'nin telafi mantığı buna bağlı** → Task 1.
2. `electron/fatura/okuma.js` `db-max-rows` kırpmasını sessizce yutabiliyor (`Content-Range` okunmuyor).
3. `alis-fatura:kaydet`'in `yetkiKontrol` çağrısı test edilmiyor.
4. `sec()` null dönerse `satirlar.length` çöker.

---

### Task 1: Hata kodunu IPC sınırından geçir + devredilen borçları kapat

**Files:**
- Modify: `electron/main.js` (IPC sarmalayıcısı, ~507-514)
- Modify: `src/api/ipc.js` (`invoke` sarmalayıcısı)
- Modify: `electron/fatura/okuma.js`
- Modify: `electron/db/fatura-stok.js`
- Test: `electron/db/fatura-stok-kaydet.test.js` (mevcut dosyaya ekle)

**Interfaces:**
- Produces: IPC hata nesnesi artık `{ ok: false, error, kod }` taşır; renderer tarafında fırlatılan `Error` nesnesinin `kod` alanı dolu olur.

- [x] **Step 1: Önce başarısız testi yaz**

`electron/db/fatura-stok-kaydet.test.js` sonuna ekle:

```js
describe('yetki kontrolü', () => {
  test('alis-fatura:kaydet fatura_stok_duzenle yetkisi ister', async () => {
    // yetkiKontrol mock'u çağrıldı mı — güvenlik kontrolünün silinmesi regresyonu yakalanmalı
    await handlers['alis-fatura:kaydet'](gecerliVeri()).catch(() => {})
    expect(sahteYetkiKontrol).toHaveBeenCalledWith('fatura_stok_duzenle')
  })
})
```

(`gecerliVeri()` ve `sahteYetkiKontrol` dosyanın mevcut kurulumundan gelir — dosyayı açıp gerçek adlarına uydur.)

- [x] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npm test -- fatura-stok-kaydet`
Expected: FAIL (yetkiKontrol mock'u henüz iddia edilmiyor ya da adı farklı)

- [x] **Step 3: IPC sarmalayıcısını `kod` taşıyacak şekilde değiştir**

`electron/main.js`:

```js
      } catch (err) {
        console.error(`[IPC Error] ${channel}:`, err.message)
        // kod: FaturaHatasi gibi sınıflandırılmış hatalarda renderer'ın karar
        // verebilmesi için ('ag' => telafi YAPMA, insan kontrolü iste).
        return { ok: false, error: err.message, kod: err.kod || null }
      }
```

`src/api/ipc.js`'teki `invoke` sarmalayıcısını aç ve hatayı fırlatırken `kod`'u da taşı:

```js
  if (!sonuc.ok) {
    const hata = new Error(sonuc.error)
    hata.kod = sonuc.kod || null
    throw hata
  }
```

(Gerçek değişken adlarını dosyadan al; yapıyı bozma.)

- [x] **Step 4: Devredilen üç borcu kapat**

`electron/fatura/okuma.js`:
- `sec()` null dönebildiği için `faturaStokGetir` sonucunu `|| []` ile koru.
- Kırpma tespitini `Content-Range` başlığından yap. `bulut.js`'in `sec()`'i şu an yalnız gövde döndürüyor — **`sec()`'e ikinci bir dönüş yolu ekleme**; bunun yerine `bulut.js`'e `secBasliklarla(tablo, sorgu, jwt)` diye ikinci bir fonksiyon ekle: `{ satirlar, toplam }` döndürsün (`Content-Range: 0-24/573` → `toplam=573`). `faturaStokGetir` bunu kullansın; `satirlar.length < toplam` ise `console.warn` ile uyarsın.

`electron/db/fatura-stok.js`: `alis-fatura:kaydet`'in `yetkiKontrol('fatura_stok_duzenle')` çağrısı zaten var — testin onu doğruladığından emin ol.

- [x] **Step 5: Testleri çalıştır**

Run: `npm test`
Expected: tümü PASS (631 + yeniler)

- [x] **Step 6: Commit**

```bash
git add electron/main.js src/api/ipc.js electron/fatura/okuma.js electron/fatura/bulut.js electron/db/fatura-stok-kaydet.test.js electron/fatura/bulut.test.js
git commit -m "feat: IPC hata kodu renderer'a tasiniyor + devredilen borclar kapatildi"
```

---

### Task 2: `fatura_kes_basla` RPC — atomik sahiplenme + stok düşümü

**Files:**
- Create: `supabase/15_fatura_kes_rpc.sql`

**Interfaces:**
- Produces: `fatura_kes_basla(p_kanal text, p_kanal_siparis_id text, p_kalemler jsonb, p_kullanici text) returns uuid`

Bu, spec §⑤'in kalbi: mükerrer faturayı **veritabanı kısıtıyla** imkânsız kılar ve stoğu tüm PC'lerde aynı anda düşürür.

- [x] **Step 1: Migration'ı yaz**

```sql
-- Faz 2: fatura kesme sahiplenmesi + fatura stoğu düşümü, TEK transaction.
-- Gerekçe: docs/superpowers/specs/2026-08-31-fatura-entegrasyonu-design.md §⑤
-- Mükerrer fatura uygulama kontrolüyle DEĞİL, UNIQUE kısıtıyla engellenir.

create or replace function fatura_kes_basla(
  p_kanal text,
  p_kanal_siparis_id text,
  p_kalemler jsonb,   -- [{urun_senk_id, urun_adi, miktar, birim_fiyat, kdv_orani, satir_toplam, set_senk_id}]
  p_kullanici text
) returns uuid
language plpgsql
as $$
declare
  v_fatura_id uuid;
  v_kalem jsonb;
  v_etkilenen int;
  v_toplam numeric(14,2) := 0;
begin
  -- 1) Sahiplen. UNIQUE(kanal, kanal_siparis_id) ihlali => 23505 => çağıran 'cakisma' görür.
  insert into kesilen_faturalar (kanal, kanal_siparis_id, durum, kullanici)
  values (p_kanal, p_kanal_siparis_id, 'kuyrukta', p_kullanici)
  returning senk_id into v_fatura_id;

  for v_kalem in select * from jsonb_array_elements(p_kalemler) loop
    -- 2) Koşullu düşüm: kontrol ve düşüm TEK ifadede.
    --    Ayrı SELECT + UPDATE yazılmaz — araya başka işlem girebilir.
    update fatura_stok
       set miktar = miktar - (v_kalem->>'miktar')::int,
           senk_guncelleme = now()
     where urun_senk_id = (v_kalem->>'urun_senk_id')::uuid
       and miktar >= (v_kalem->>'miktar')::int;

    get diagnostics v_etkilenen = row_count;
    if v_etkilenen = 0 then
      raise exception 'YETERSIZ_STOK: % (gereken %)',
        coalesce(v_kalem->>'urun_adi', v_kalem->>'urun_senk_id'), v_kalem->>'miktar';
    end if;

    insert into kesilen_fatura_kalemleri
      (kesilen_fatura_senk_id, urun_senk_id, urun_adi, miktar, birim_fiyat, kdv_orani, satir_toplam, set_senk_id)
    values (
      v_fatura_id,
      (v_kalem->>'urun_senk_id')::uuid,
      v_kalem->>'urun_adi',
      (v_kalem->>'miktar')::int,
      (v_kalem->>'birim_fiyat')::numeric,
      (v_kalem->>'kdv_orani')::int,
      (v_kalem->>'satir_toplam')::numeric,
      nullif(v_kalem->>'set_senk_id','')::uuid
    );

    insert into fatura_stok_hareketler
      (urun_senk_id, miktar, kaynak_tip, kaynak_senk_id, aciklama, kullanici)
    values (
      (v_kalem->>'urun_senk_id')::uuid,
      -((v_kalem->>'miktar')::int),
      'satis_faturasi',
      v_fatura_id,
      'Fatura ' || p_kanal || '/' || p_kanal_siparis_id,
      p_kullanici
    );

    v_toplam := v_toplam + (v_kalem->>'satir_toplam')::numeric;
  end loop;

  update kesilen_faturalar set toplam = v_toplam where senk_id = v_fatura_id;
  return v_fatura_id;
end;
$$;

revoke execute on function fatura_kes_basla(text, text, jsonb, text) from anon, public;
grant execute on function fatura_kes_basla(text, text, jsonb, text) to authenticated;
```

- [x] **Step 2: Telafi (geri alma) fonksiyonunu aynı dosyaya ekle**

İş hatasında stoğu iade etmek için. **Ağ hatasında ÇAĞRILMAZ** (sonuç belirsiz).

```sql
-- Fatura sağlayıcıda oluşmadığı KESİN olduğunda stoğu iade eder.
create or replace function fatura_kes_telafi(p_fatura_senk_id uuid, p_hata text)
returns void
language plpgsql
as $$
declare v_kalem record;
begin
  for v_kalem in
    select urun_senk_id, miktar from kesilen_fatura_kalemleri
     where kesilen_fatura_senk_id = p_fatura_senk_id
  loop
    update fatura_stok set miktar = miktar + v_kalem.miktar, senk_guncelleme = now()
     where urun_senk_id = v_kalem.urun_senk_id;

    insert into fatura_stok_hareketler
      (urun_senk_id, miktar, kaynak_tip, kaynak_senk_id, aciklama)
    values (v_kalem.urun_senk_id, v_kalem.miktar, 'telafi', p_fatura_senk_id,
            'Fatura başarısız, stok iade edildi');
  end loop;

  update kesilen_faturalar
     set durum = 'hata', hata_mesaji = p_hata
   where senk_id = p_fatura_senk_id;
end;
$$;

revoke execute on function fatura_kes_telafi(uuid, text) from anon, public;
grant execute on function fatura_kes_telafi(uuid, text) to authenticated;
```

- [x] **Step 3: `durum` için CHECK kısıtı ekle**

Faz 1'de bilerek ertelenmişti (durum makinesi bu fazda netleşiyor):

```sql
alter table kesilen_faturalar drop constraint if exists kesilen_faturalar_durum_gecerli;
alter table kesilen_faturalar add constraint kesilen_faturalar_durum_gecerli
  check (durum in ('kuyrukta','saglayici_ok','pdf_alindi','pazaryeri_yuklendi','tamam','hata','belirsiz'));
```

- [x] **Step 4: SQL sözdizimini gözle doğrula, ÇALIŞTIRMA**

Migration'ı kontrolör uygulayacak. Raporunda "uygulanmadı, kontrolör bekliyor" yaz.

- [x] **Step 5: Commit**

```bash
git add supabase/15_fatura_kes_rpc.sql
git commit -m "feat: fatura kesme RPC - atomik sahiplenme, stok dusumu ve telafi"
```

---

### Task 3: Bizimhesap sağlayıcı adaptörü

**Files:**
- Create: `electron/fatura/saglayici/bizimhesap.js`
- Test: `electron/fatura/saglayici/bizimhesap.test.js`

**Interfaces:**
- Consumes: `electron/db/satis-hesapla.js`'ten `yuvarla`.
- Produces:
  - `faturaGonder(fatura, ayarlar)` → `Promise<{ guid, url, hamYanit }>`
  - `SaglayiciHatasi` — `kod`: `'is_hatasi' | 'ag' | 'yapilandirma'`

`fatura` şekli: `{ musteri: {id, unvan, vergi_no, vergi_dairesi, tc, eposta, telefon, adres}, kalemler: [{sku, ad, barkod, miktar, birim_fiyat, kdv_orani}], fatura_no, tarih, not }`
`ayarlar` şekli: `{ firmId }`

- [x] **Step 1: Başarısız testi yaz**

`electron/fatura/saglayici/bizimhesap.test.js`:

```js
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
const https = require('https')
const { faturaGonder, SaglayiciHatasi, _yukOlustur } = require('./bizimhesap')

describe('_yukOlustur', () => {
  test('KDV dahil fiyattan satır ve toplamları arka uçla aynı sırayla hesaplar', () => {
    const y = _yukOlustur({
      musteri: { id: 7, unvan: 'Deneme Ltd', adres: 'X Mah.' },
      kalemler: [{ sku: 'TNC.LAV.00001', ad: 'Tencere', miktar: 7, birim_fiyat: 10.005, kdv_orani: 20 }],
      fatura_no: 'A1', tarih: '2026-08-31',
    }, { firmId: 'FIRM' })
    // Önce birim fiyat yuvarlanır (10.01), sonra çarpılır → 70.07
    expect(y.details[0].unitPrice).toBe(10.01)
    expect(y.details[0].total).toBe(70.07)
    expect(y.amounts.total).toBe(70.07)
    expect(y.invoiceType).toBe(3)          // 3 = Satış
    expect(y.firmId).toBe('FIRM')
  })

  test('productId alanına SKU yazar (mükerrer ürün açılmasını önler)', () => {
    const y = _yukOlustur({
      musteri: { id: 1, unvan: 'A', adres: 'B' },
      kalemler: [{ sku: 'TNC.SFR.00063', ad: 'Çaydanlık', barkod: '869', miktar: 1, birim_fiyat: 100, kdv_orani: 10 }],
      fatura_no: 'A2', tarih: '2026-08-31',
    }, { firmId: 'F' })
    expect(y.details[0].productId).toBe('TNC.SFR.00063')
    expect(y.details[0].barcode).toBe('869')
  })

  test('SKU boş kalemde hata atar', () => {
    expect(() => _yukOlustur({
      musteri: { id: 1, unvan: 'A', adres: 'B' },
      kalemler: [{ sku: '', ad: 'X', miktar: 1, birim_fiyat: 10, kdv_orani: 20 }],
      fatura_no: 'A3', tarih: '2026-08-31',
    }, { firmId: 'F' })).toThrow(/SKU/)
  })

  test('firmId yoksa yapilandirma hatası', () => {
    expect(() => _yukOlustur({ musteri: {}, kalemler: [], fatura_no: 'A', tarih: 'x' }, {}))
      .toThrow(/firmId/i)
  })
})
```

- [x] **Step 2: Testi çalıştır, başarısız olduğunu gör**

Run: `npm test -- saglayici/bizimhesap`
Expected: FAIL — modül yok

- [x] **Step 3: Adaptörü yaz**

🔴 `fetch` KULLANMA — `https.request`. `electron/fatura/bulut.js`'i model al (aynı desen, farklı sunucu).

```js
// Bizimhesap sağlayıcı adaptörü. Fatura belgesini oluşturan taraf burasıdır.
// Sağlayıcı DEĞİŞİRSE yalnız bu dosya değişir (spec: sağlayıcı adaptör arkasında).
// Uç nokta ve alan adları: docs/bizimhesap-api-reference.md
const https = require('https')
const { yuvarla } = require('../../db/satis-hesapla')

const HOST = 'bizimhesap.com'
const YOL = '/api/b2b/addinvoice'
const ZAMAN_ASIMI_MS = 30000

class SaglayiciHatasi extends Error {
  constructor(mesaj, kod, ayrinti) {
    super(mesaj); this.name = 'SaglayiciHatasi'; this.kod = kod; this.ayrinti = ayrinti
  }
}

// Bizimhesap yükü. Yuvarlama sırası arka uçla AYNI olmalı: önce birim fiyat.
function _yukOlustur(fatura, ayarlar) {
  if (!ayarlar || !ayarlar.firmId) {
    throw new SaglayiciHatasi('Bizimhesap firmId tanımlı değil (Ayarlar > Fatura)', 'yapilandirma')
  }
  let kdvToplam = 0, genelToplam = 0
  const details = (fatura.kalemler || []).map(k => {
    if (!k.sku) {
      throw new SaglayiciHatasi(`Ürünün SKU'su yok, faturaya yazılamaz: ${k.ad}`, 'is_hatasi')
    }
    const birimFiyat = yuvarla(Number(k.birim_fiyat))
    const satirToplam = yuvarla(Number(k.miktar) * birimFiyat)
    const oran = Number(k.kdv_orani)
    const kdv = yuvarla(satirToplam * oran / (100 + oran))
    kdvToplam += kdv; genelToplam += satirToplam
    return {
      productId: k.sku,            // ← mükerrer ürün açılmasını önleyen alan
      productName: k.ad,
      barcode: k.barkod || '',
      taxRate: oran,
      quantity: Number(k.miktar),
      unitPrice: birimFiyat,
      grossPrice: satirToplam,
      discount: 0,
      net: yuvarla(satirToplam - kdv),
      tax: kdv,
      total: satirToplam,
    }
  })
  kdvToplam = yuvarla(kdvToplam); genelToplam = yuvarla(genelToplam)
  const m = fatura.musteri || {}
  return {
    firmId: ayarlar.firmId,
    invoiceNo: fatura.fatura_no || '',
    invoiceType: 3,                 // 3 = Satış
    note: fatura.not || '',
    dates: { invoiceDate: fatura.tarih, dueDate: fatura.tarih },
    customer: {
      customerId: m.id, title: m.unvan, taxOffice: m.vergi_dairesi || '',
      taxNo: m.vergi_no || m.tc || '', email: m.eposta || '', phone: m.telefon || '',
      address: m.adres || '',
    },
    amounts: {
      currency: 'TL', gross: genelToplam, discount: 0,
      net: yuvarla(genelToplam - kdvToplam), tax: kdvToplam, total: genelToplam,
    },
    details,
  }
}

function _istek(yuk) {
  return new Promise((cozumle, reddet) => {
    const govde = JSON.stringify(yuk)
    const req = https.request(
      { hostname: HOST, path: YOL, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(govde) },
        timeout: ZAMAN_ASIMI_MS },
      (res) => {
        let ham = ''
        res.on('data', p => { ham += p })
        res.on('end', () => cozumle({ status: res.statusCode, ham }))
      }
    )
    req.on('timeout', () => { req.destroy(new Error('zaman asimi')) })
    req.on('error', (e) => reddet(new SaglayiciHatasi(
      'Bizimhesap sunucusuna ulaşılamadı, işlemin sonucu doğrulanamadı: ' + e.message, 'ag', e)))
    req.write(govde); req.end()
  })
}

async function faturaGonder(fatura, ayarlar) {
  const yuk = _yukOlustur(fatura, ayarlar)
  const { status, ham } = await _istek(yuk)
  let veri = null
  try { veri = ham ? JSON.parse(ham) : null } catch { veri = null }

  // Bizimhesap 200 döndürüp gövdede error alanıyla iş hatası bildirir.
  if (status >= 500 || veri == null) {
    throw new SaglayiciHatasi(
      'Bizimhesap yanıtı okunamadı, işlemin sonucu doğrulanamadı', 'ag', { status, ham })
  }
  if (veri.error) {
    throw new SaglayiciHatasi('Bizimhesap faturayı reddetti: ' + veri.error, 'is_hatasi', veri)
  }
  return { guid: veri.guid, url: veri.url, hamYanit: veri }
}

module.exports = { faturaGonder, SaglayiciHatasi, _yukOlustur }
```

- [x] **Step 4: Testi çalıştır, geçtiğini gör**

Run: `npm test -- saglayici/bizimhesap`
Expected: PASS (4 test)

- [x] **Step 5: `https.request` yolunu da test et**

`vi.spyOn(https, 'request')` ile (`bulut.test.js` deseni) en az 3 test ekle:
- başarılı yanıt (`{error:'', guid:'G', url:'U'}`) → `{guid:'G', url:'U'}`
- `{error:'Hatalı para birimi'}` → `SaglayiciHatasi` `kod:'is_hatasi'`
- ağ hatası → `kod:'ag'`, mesajda "doğrulanamadı" geçmeli (kesinlik iddia etmemeli)

- [x] **Step 6: Electron'un Node'unda yüklendiğini kanıtla**

```
ELECTRON_RUN_AS_NODE=1 ./node_modules/.bin/electron -e "const s=require('./electron/fatura/saglayici/bizimhesap.js'); console.log('node:', process.version, '| yuklendi:', Object.keys(s))"
```

Çıktıyı rapora yaz. `node:` v16.x olmalı.

- [x] **Step 7: Commit**

```bash
git add electron/fatura/saglayici/bizimhesap.js electron/fatura/saglayici/bizimhesap.test.js
git commit -m "feat: bizimhesap saglayici adaptoru"
```

---

## İkinci tur — Task 4-9 (01.09.2026'da yazıldı)

Task 1-3 tamamlandıktan sonra keşifte **iki boşluk** çıktı; Task 4 ve 5 bunları kapatmakla başlıyor:

1. 🔴 `kesilen_faturalar` durum makinesinde `tamam`/`belirsiz`e geçiren **sunucu fonksiyonu yok**.
   Elde yalnız `fatura_kes_basla` (→`kuyrukta`) ve `fatura_kes_telafi` (→`hata`) var. Sağlayıcı
   `guid` döndürdükten sonra satır sonsuza dek `kuyrukta` kalır. → Task 4A.
2. 🔴 `setler` tablosunda **`ikas_varyant_id` yok**. Sipariş kalemi ürüne yalnız
   `urunler.ikas_varyant_id` ile bağlanıyor (`electron/ikas/index.js:267`), dolayısıyla ikas'ta
   satılan bir SET kaleminin `urun_id`'si NULL kalır ve bileşenlere çözülemez. → Task 5A.

---

### Task 4A: `fatura_kes_bitir` RPC — sonucu durum makinesine yaz

**Files:** Create: `supabase/16_fatura_kes_bitir.sql`

**Interfaces:** Produces `fatura_kes_bitir(p_fatura_senk_id uuid, p_durum text, p_guid text, p_url text, p_fatura_no text, p_belge_tipi text, p_belge_tipi_kaynak text) returns boolean`

- [x] **Step 1:** Migration'ı yaz. Kurallar (Task 2'nin öğrendikleri, aynen geçerli):
  - `exception when` bloğu **EKLEME** (savepoint yutması → yetim `kuyrukta` satırı).
  - `security invoker` (varsayılan) — RLS devrede kalsın.
  - `set search_path = 'public'`.
  - Durum geçişi **compare-and-swap**: `update ... where senk_id = p and durum in ('kuyrukta','saglayici_ok')`.
    0 satır etkilenirse `false` dön (idempotent; ikinci PC'nin geç kalan çağrısı sessizce yutulur).
  - `p_durum` yalnız `'tamam'` veya `'belirsiz'` olabilir; başka değer → `raise exception 'GECERSIZ_DURUM'`.
  - `'belirsiz'`de `saglayici_guid` NULL kalır ama `hata_mesaji` doldurulur; **stok İADE EDİLMEZ** (spec §⑤).
  - `belge_tipi_kaynak` varsayılan `'tahmin'` — tahmini kesin bilgi gibi yazma.
- [x] **Step 2:** ✔ **CANLIYA UYGULANDI (01.09)** — kullanıcı planın "canlıya uygulama" frenini kaldırdı; Dashboard SQL Editor üzerinden çalıştırıldı. Doğrulama: 3 fonksiyon da INVOKER, anon=false/authenticated=true, kısmi indeks + durum kısıtı var, olmayan faturaya `false` (CAS), guid'siz `tamam` → `GUID_YOK` hatası (gövde sonuna kadar derleniyor).
- [x] **Step 3:** Commit: `feat: fatura_kes_bitir rpc`

---

### Task 4B: Fatura çekirdeği — set çözme, guard, durum akışı

**Files:**
- Create: `electron/fatura/set-coz.js` + `electron/fatura/set-coz.test.js`
- Create: `electron/fatura/cekirdek.js` + `electron/fatura/cekirdek.test.js`

**Interfaces:**
- `setCoz(setKalemi, bilesenler)` → bileşen kalemleri (ağırlıklı fiyat dağıtımı, kuruş farkı SON satıra)
- `faturaKes(girdi, bagimliliklar)` → `{ durum, guid, url, senk_id }`
  `bagimliliklar = { saglayici, rpc, jwtAl }` — **sağlayıcı ENJEKTE edilir**, `require` ile içeriden
  bağlanmaz. Gerekçe: Bizimhesap adaptörü hâlâ inceleme altında; ayrıca Mikro'ya geçiş tek satır olur.

- [x] **Step 1:** `set-coz` için başarısız testleri yaz. Vakalar:
  - farklı KDV oranlı iki bileşen → ağırlıklı dağıtım (eşit bölme YANLIŞ sonuç verir, test bunu yakalasın)
  - kuruş farkı: `100,00 TL` set, 3 eşit bileşen → `33,33 + 33,33 + 33,34` (son satır düzeltir)
  - set adedi > 1
  - bileşen fiyatlarının toplamı 0 → sıfıra bölme YOK, Türkçe hata
- [x] **Step 2:** `setCoz`'u yaz. Formül spec §③'ten; `yuvarla` **satis-hesapla.js'ten** alınır, yeni hesaplayıcı yazılmaz.
- [x] **Step 3:** `cekirdek` testleri — üç sonuç sınıfı ayrı ayrı:
  - sağlayıcı `is_hatasi` → `fatura_kes_telafi` ÇAĞRILIR (stok iade)
  - sağlayıcı `ag` → telafi **ÇAĞRILMAZ**, `fatura_kes_bitir(..., 'belirsiz', ...)` çağrılır
  - başarı → `fatura_kes_bitir(..., 'tamam', guid, url, ...)`
  - guard: SKU'su boş kalem → ağa **hiç çıkılmaz**, hangi ürün olduğu mesajda geçer
  - guard: fatura stoğu yetersiz → mesaj **hangi üründen ne kadar eksik** olduğunu taşır
- [x] **Step 4:** Çekirdeği yaz. Sıra: guard → `fatura_kes_basla` (sahiplen + stok düş) → sağlayıcıya gönder → `fatura_kes_bitir` / `fatura_kes_telafi`.
- [x] **Step 5:** `npm test` — hepsi geçmeli. Commit: `feat: fatura cekirdegi (set cozme + durum akisi)`

---

### Task 5A: `setler.ikas_varyant_id` — ikas'ta satılan seti tanı

**Files:** Modify `electron/db/database.js` (ALTER), `electron/ikas/index.js` (doldurma) + test.

- [x] **Step 1:** `try { db.exec("ALTER TABLE setler ADD COLUMN ikas_varyant_id TEXT") } catch {}` — dosyadaki mevcut ALTER deseniyle aynı yerde.
- [x] **Step 2:** ✔ Doldurma `urunEsle`'ye eklendi (ekstra.js — aynı çekimden SKU→varyant haritası; ikinci ikas çağrısı yok). Ayrıca `setler.ikas_varyant_id` senkron kolonlarına eklendi (bulut migration'ı gerekmedi: senk_kayitlar jsonb). Doldurma: ikas ürün çekiminde SKU→varyant kimliği haritası kurulur (`web-link` aynı listeyi çekiyor). `setler.sku` ile eşleşen varyantın kimliği yazılır.
  🔴 Ad ile eşleştirme **birincil yol DEĞİL** — yalnız SKU. SKU'su boş set = kullanıcıya rapor.
- [x] **Step 3:** Sipariş kalemi eşleştirmesine set yolunu ekle: `urun_id` NULL ise `setler.ikas_varyant_id` denenir.
- [x] **Step 4:** Test + commit: `feat: setler ikas varyant kimligi`

---

### Task 5B: ikas kanal adaptörü

**Files:** Create `electron/fatura/kanal/ikas.js` + testi.

- [x] **Step 1:** `siparisiFaturayaCevir(siparisId)` → `{ musteri, kalemler, fatura_no, tarih }`.
  - Müşteri: `fatura_unvan` / `fatura_vergi_no` / `fatura_vergi_dairesi` / `fatura_tc` **sipariş satırından**; boşsa `musteri_ad` + teslimat adresi yedek.
  - Kalemler: `urun_id` doluysa doğrudan; set ise `setCoz`; ikisi de değilse **guard hatası** (ürün adıyla — kullanıcı ikas'ta düzeltebilsin).
  - KDV oranı sipariş kaleminde YOK → `urunler.kdv_orani` / `setler.kdv_orani`'ndan alınır.
  - `iade_miktar` düşülür: iade edilmiş adede fatura kesilmez.
- [x] **Step 2:** Testler: iadeli sipariş, setli sipariş, vergi kimliği eksik sipariş, SKU'suz ürün.
- [x] **Step 3:** Commit: `feat: ikas kanal adaptoru`

---

### Task 6: Fatura ayarları (firmId + Token) — ✔ TAMAM (01.09, commit 8b09b90)

**Files:** `electron/db/fatura-ayarlar.js` (+test), `database.js` (tablo), `gizli-alan.js`, `ayar-senk.js`, `main.js`, `src/api/ipc.js`, `src/pages/Ayarlar.jsx`

- [x] Ayarlar > 🧾 Fatura sekmesi: `firm_id` + `token` girişi.
- [x] 🔴 **PLAN DÜZELTİLDİ:** "DPAPI ile şifrele + Supabase'de sakla" YANLIŞTI — DPAPI anahtarı
  makineye bağlı, şifreli değer buluta giderse 2. PC onu ASLA çözemez ve fatura kesme orada
  sessizce ölür (bu tuzak `gizli-alan.js` başlığında zaten yazılıymış). Doğrusu: **şifreleme
  yalnız diskte**, buluta düz metin (RLS korur), okuma yolları `coz()`'den geçer.
- [x] Renderer'a MASKELİ döner; maskeli değer geri gelirse kayıtlı anahtar KORUNUR.
- [x] "Bağlantıyı Sına": SALT OKUNUR `products` ucu (`Key` sabit + `Token` başlığı), fatura kesmez.
      `firmId`'yi bu uç doğrulamaz → girilmemişse ayrıca uyarılır.
- [x] Yetki: `fatura_stok_duzenle`. Commit: `feat: fatura ayarlari (Bizimhesap firmId + token)`

**Panelde yeri (01.09'da bulundu):** Bizimhesap → E-Ticaret → Ayarlar → üstteki
"E-ticaret Uygulamaları" süzgeci → herhangi bir uygulama (Entegra, Sopyo…) → **API Key**.
Değer FİRMA düzeyinde (iki farklı uygulamada aynı çıktı), 32 haneli büyük onaltılık —
dokümandaki `firmId` biçimiyle birebir aynı.

---

### Task 7: ikas arayüzü — Fatura Kes düğmesi

**Files:** `src/components/OnlineSiparisler.jsx`

- [ ] Satır sonunda üç durumlu düğme: `🧾 Fatura Kes` / `✓ Faturalı` (tıklayınca `saglayici_url` açılır) / `🔒 Fatura Stoğu Yok`
- [ ] Filtre çipleri: `Tümü · Faturasız · Faturalı · Fatura Stoğu Yok`
- [ ] Toplu seçim + toplu kesme; her satırın sonucu ayrı raporlanır (biri patlayınca diğerleri durmaz).
- [ ] Yetki: `fatura_kes` yoksa düğme görünmez.
- [ ] Commit: `feat: online siparislerde fatura kesme arayuzu`

---

### Task 8: "Kontrol Bekliyor" listesi

- [ ] Fatura Stoğu sekmesine dördüncü görünüm: `durum = 'belirsiz'` satırları.
- [ ] Her satırda "Bizimhesap'ta kesilmiş" / "kesilmemiş" düğmeleri. "kesilmemiş" → `fatura_kes_telafi` (stok iade); "kesilmiş" → `fatura_kes_bitir(..., 'tamam', ...)` kullanıcının girdiği guid/fatura no ile.
- [ ] 🔴 Liste boş DEĞİLSE görünür uyarı — sessiz birikirse mükerrer fatura riski doğar.
- [ ] Commit: `feat: kontrol bekliyor listesi`

---

### Task 9: Bizimhesap'tan fatura stoğu tohumlama

**Ön koşul:** Token. Bu yapılmadan Faz 2 CANLIYA ALINAMAZ (yoksa açıldığı gün her ürün "fatura stoğu yok" der).

- [ ] `inventory` ucundan depo stoğu okunur, `fatura_stok`a açılış bakiyesi olarak yazılır.
- [ ] Tek seferlik ve **idempotent** (ikinci çalıştırma bakiyeyi ikiye katlamaz — `yerel_onarimlar` deseni).
- [ ] Fark raporu: uygulama stoğu ile Bizimhesap stoğu tutmayan ürünler listelenir, körlemesine yazılmaz.
- [ ] Commit: `feat: bizimhesap fatura stogu tohumlama`

---

## Sonraki görevler (bu dosyanın ikinci turunda yazılacak)

Task 1-3 tamamlanıp incelendikten sonra, öğrenilenlere göre şu görevler eklenecek:

- **Task 4 — Fatura çekirdeği:** set çözme (bileşenlere fiyat dağıtımı, kuruş farkı son satıra), fatura stoğu guard'ı, durum makinesi, telafi kararı (`'ag'` → telafi YOK).
- **Task 5 — ikas kanal adaptörü:** `online_siparisler` + kalemleri → fatura girdisi; müşteri/vergi kimliği eşlemesi.
- **Task 6 — Fatura ayarları:** `firmId` girişi (Ayarlar > Fatura), Supabase `uygulama_ayarlar`'da saklama.
- **Task 7 — ikas arayüzü:** satırda "Fatura Kes" düğmesi (üç durumlu: kesilebilir / faturalı / stok yok), `Tümü · Faturasız · Faturalı · Fatura Stoğu Yok` filtreleri, toplu seçim.
- **Task 8 — "Kontrol Bekliyor" listesi:** `durum = 'belirsiz'` satırları; kullanıcı "kesilmiş"/"kesilmemiş" diyerek kapatır.
- **Task 9 — Bizimhesap'tan fatura stoğu tohumlama:** `inventory` ucundan açılış bakiyesi (token gerekir).

**Ön koşul (kullanıcıdan):** Bizimhesap `firmId` ve `Token`. Bunlar gelmeden Task 3'ün canlı doğrulaması ve Task 9 yapılamaz; kod yazılabilir ve birim testleriyle doğrulanabilir.
