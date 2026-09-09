# Kampanya Sekmesi + Hediye Kuponu — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ikas kampanyalarını ve kuponlarını uygulama içinden yönetmek; Sosyal Medya'da temsilcinin tek tıkla müşteriye hediye kuponu göndermesi.

**Architecture:** Yeni bir ikas katmanı (`electron/ikas/kampanya.js`) GraphQL ile kampanya/kupon okur-yazar; saf dönüştürücü (`kampanya-donustur.js`) form durumunu `CampaignInput`'a çevirir. Kupon dağıtımı senkronlanan yerel tablo `kupon_dagitim`'de tutulur; gönderim mevcut `mesajCevapla` / `yorumdanMesaj` yollarını kullanır. Arayüzde yeni tembel sayfa `Kampanyalar.jsx` ve Sosyal Medya'daki `KuponGonder` düğmesi.

**Tech Stack:** Electron 22 (Node 16, `fetch` YOK), better-sqlite3, React + Tailwind, vitest (node:sqlite ile bellek DB), ikas Admin GraphQL.

**Spec:** `docs/superpowers/specs/2026-09-09-kampanya-kupon-design.md`

## Global Constraints

- Paket yöneticisi **npm**; test `npm test` (vitest). Tip denetimi yok (JS). Hook kurma.
- Electron 22 = Node 16: `fetch` yok, `??`/`?.` var. Testlerde better-sqlite3 KULLANILAMAZ; `node:sqlite` adaptörü (bkz. `electron/db/setler.test.js`).
- Commit mesajı sonu:
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Q5zRfaraRFhgkeTF8sZSgh
  ```
- **ikas'a satış fiyatı yazılmaz.** Bu işte fiyat yazan hiçbir çağrı yok; `saveProduct` KULLANILMAZ.
- ikas yazma çağrısından sonra **geri oku ve karşılaştır**; fark varsa kullanıcıya söyle.
- Canlı sapma: ürün süzgeci `type: 'PRODUCT_AND_VARIANT'`, id `'p:' + productId`. Belgeli enum'daki `PRODUCT` KULLANILMAZ.
- Yüzde indirim: `type: 'RATIO'`, değer `fixedDiscount.amount`. Tarihler ms epoch.
- Meta mesaj sınırı 1000 karakter; aşarsa GÖNDERME, uyar.
- Sürüm numarası bu planda ARTIRILMAZ; "yayınla" komutu ayrı iştir.
- Renkler Tailwind `marka-*` / `krem-*` (bkz. `tailwind.config.js`); Sosyal Medya arayüzü beyaz ağırlıklı, lacivert mürekkep + krem vurgu.

---

## Dosya haritası

| Dosya | Sorumluluk |
|---|---|
| `electron/ikas/kampanya-donustur.js` (yeni) | Saf: form durumu ↔ `CampaignInput`; kupon girişi → `AddCouponsInput`; geri okuma farkı |
| `electron/ikas/kampanya-donustur.test.js` (yeni) | Yukarısının testleri |
| `electron/ikas/kampanya.js` (yeni) | GraphQL çağrıları + `kampanya:*` IPC kanalları |
| `electron/db/kupon-havuz.js` (yeni) | Saf seçim mantığı + `kupon_dagitim` yazma/silme |
| `electron/db/kupon-havuz.test.js` (yeni) | Bellek DB ile testler |
| `electron/db/database.js` | `kupon_dagitim` tablosu; varsayılan kupon şablonu |
| `electron/db/senk-sema.js` (+test) | `kupon_dagitim` senkron tanımı |
| `electron/meta/kupon-mesaj.js` (+test, yeni) | Saf: şablon + kampanya + kupon → metin |
| `electron/meta/index.js` | `meta:kuponGonder` |
| `electron/db/sosyal-otomasyon.js` | `sosyal:sablonKaydet` `tur='kupon'` kabul eder; `sosyal:kuponSablonlari` |
| `electron/yetki.js`, `src/auth/izinler.js`, `supabase/09_kampanya_yetkisi.sql` | `kampanya_yonet` |
| `electron/kanal-yetki.js` (+test) | Yeni kanallar |
| `electron/main.js` | `require('./ikas/kampanya')` kaydı |
| `src/api/ipc.js` | `kampanyaApi`, `metaApi.kuponGonder`, `sosyalApi.kuponSablonlari` |
| `src/pages/Kampanyalar.jsx` (yeni) | Sayfa: liste + form + kupon paneli |
| `src/components/kampanya/KampanyaFormu.jsx`, `KuponPaneli.jsx`, `UrunSuzgecSecici.jsx` (yeni) | Form parçaları |
| `src/components/KuponGonder.jsx` (yeni) | Sosyal Medya düğmesi |
| `src/components/HizliUrunler.jsx` | `KuponGonder`'i en alta koyar |
| `src/components/SablonFormu.jsx`, `SablonKutuphanesi.jsx` | `kupon` türü |
| `src/App.jsx` | Sekme |
| `docs/ikas-api-reference.md`, `docs/ikas/01-OPERASYON-KATALOGU.md` | Belge düzeltmeleri |

---

### Task 1: `kampanya_yonet` yetkisi

**Files:**
- Modify: `src/auth/izinler.js` (yorum satırı, PERSONEL_VARSAYILAN değişmez)
- Modify: `electron/yetki.js` (yorum satırı)
- Create: `supabase/09_kampanya_yetkisi.sql`
- Modify: `electron/kanal-yetki.js`
- Modify: `electron/kanal-yetki.test.js`
- Test: `src/auth/yetki-paritesi.test.js` (mevcut; yeni kod eklenir)

**Interfaces:**
- Produces: yetki kodu `'kampanya_yonet'` (personel varsayılanı KAPALI; yönetici/süper otomatik). IPC kanal adları `kampanya:liste`, `kampanya:getir`, `kampanya:kaydet`, `kampanya:sil`, `kampanya:kuponlar`, `kampanya:kuponEkle`, `kampanya:kuponSil`, `kampanya:sozlukler`, `meta:kuponGonder`, `sosyal:kuponSablonlari`, `sosyal:kuponHavuz`.

- [ ] **Step 1: Parite testine yeni kodu ekle (kırmızı olması beklenmez, sabitleme)**

`src/auth/yetki-paritesi.test.js` içindeki kod listesine (dosyada `KODLAR` ya da benzeri bir dizi var; yoksa `describe` altına ekle):

```js
test('kampanya_yonet: personelde kapalı, yöneticide açık, iki taraf aynı', () => {
  const personel = { rol: 'personel', aktif: true }
  const yonetici = { rol: 'yonetici', aktif: true }
  expect(yetkiVar(personel, 'kampanya_yonet')).toBe(false)
  expect(backendYetkiVar(personel, 'kampanya_yonet')).toBe(false)
  expect(yetkiVar(yonetici, 'kampanya_yonet')).toBe(true)
  expect(backendYetkiVar(yonetici, 'kampanya_yonet')).toBe(true)
})
```

- [ ] **Step 2: kanal-yetki testine yeni kanalları ekle**

`electron/kanal-yetki.test.js` sonuna:

```js
describe('kampanya kanalları', () => {
  test('kampanya:* kampanya_yonet ister; kupon gönderme ve havuz sosyal_medya_yonet ister', () => {
    for (const k of ['kampanya:liste', 'kampanya:getir', 'kampanya:kaydet', 'kampanya:sil',
      'kampanya:kuponlar', 'kampanya:kuponEkle', 'kampanya:kuponSil', 'kampanya:sozlukler']) {
      expect(KANAL_YETKI[k], k).toBe('kampanya_yonet')
    }
    for (const k of ['meta:kuponGonder', 'sosyal:kuponSablonlari', 'sosyal:kuponHavuz']) {
      expect(KANAL_YETKI[k], k).toBe('sosyal_medya_yonet')
    }
  })
})
```

- [ ] **Step 3: Testi çalıştır, kırmızı gör**

Run: `npx vitest run electron/kanal-yetki.test.js`
Expected: FAIL — `KANAL_YETKI['kampanya:liste']` undefined.

- [ ] **Step 4: kanal-yetki.js'e ekle**

`electron/kanal-yetki.js` içinde `// Entegrasyon ayarları` bloğundan ÖNCE:

```js
  // Kampanya & kupon (sayfa kapısı: kampanya_yonet). Kupon GÖNDERME temsilcinindir:
  // kampanya düzenleyemez ama havuzdan kupon verebilir → sosyal_medya_yonet.
  'kampanya:liste': 'kampanya_yonet',
  'kampanya:getir': 'kampanya_yonet',
  'kampanya:kaydet': 'kampanya_yonet',
  'kampanya:sil': 'kampanya_yonet',
  'kampanya:kuponlar': 'kampanya_yonet',
  'kampanya:kuponEkle': 'kampanya_yonet',
  'kampanya:kuponSil': 'kampanya_yonet',
  'kampanya:sozlukler': 'kampanya_yonet',
  'meta:kuponGonder': 'sosyal_medya_yonet',
  'sosyal:kuponSablonlari': 'sosyal_medya_yonet',
  'sosyal:kuponHavuz': 'sosyal_medya_yonet',
```

- [ ] **Step 5: Supabase SQL dosyası**

`supabase/09_kampanya_yetkisi.sql`:

```sql
-- v1.2.204: Kampanya sekmesi yetkisi. "Özel" rolde toggle olarak çıkması için Supabase
-- SQL Editor'da bir kez çalıştırın (tekrar çalıştırmak güvenli).
-- Personel varsayılanı KAPALI: kampanya kaydetmek ikas'ta tüm müşterilere etki eder.
-- Kupon GÖNDERMEK ayrı (sosyal_medya_yonet) — temsilci havuzdan kupon verebilir.
insert into public.yetki_kodlari (kod, ad, grup) values
  ('kampanya_yonet','Kampanya ve kupon tanımlama (ikas)','Kampanya')
on conflict (kod) do nothing;
```

- [ ] **Step 6: Yorum satırlarını ekle**

`src/auth/izinler.js` ve `electron/yetki.js`'te `PERSONEL_VARSAYILAN` içinde `'fatura_stok_goruntule'` satırından sonra:

```js
  // 'kampanya_yonet' BİLEREK yok: ikas'ta kampanya kaydetmek tüm müşterilere etki eder;
  // kime açılacağına yönetici karar verir. Kupon GÖNDERME sosyal_medya_yonet ile açık.
```

- [ ] **Step 7: Testleri çalıştır**

Run: `npx vitest run electron/kanal-yetki.test.js src/auth/yetki-paritesi.test.js`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add electron/kanal-yetki.js electron/kanal-yetki.test.js electron/yetki.js src/auth/izinler.js src/auth/yetki-paritesi.test.js supabase/09_kampanya_yetkisi.sql
git commit -m "feat(yetki): kampanya_yonet kodu + kampanya/kupon IPC kanal haritası"
```

---

### Task 2: Saf dönüştürücü `kampanya-donustur.js`

**Files:**
- Create: `electron/ikas/kampanya-donustur.js`
- Test: `electron/ikas/kampanya-donustur.test.js`

**Interfaces:**
- Produces:
  - `formdanInput(form) → CampaignInput` (nesne; boş alanlar gönderilmez)
  - `inputtanForm(campaign) → form` (ikas `Campaign` nesnesinden form durumu)
  - `bosForm() → form`
  - `farklar(input, campaign) → string[]` (geri okuma: alan adları)
  - `kuponInput({campaignId, kip:'ozel'|'uret', kod, onEk, adet, toplamLimit, musteriLimit, birlesir}) → AddCouponsInput`
  - `SUZGEC_TURLERI = { urun:'PRODUCT_AND_VARIANT', kategori:'CATEGORY', marka:'PRODUCT_BRAND', etiket:'PRODUCT_TAG' }`

Form durumu şekli (arayüz ve dönüştürücü bunu paylaşır):

```js
{
  id: null, baslik: '', kuponlu: true,
  tur: 'yuzde',              // 'yuzde' | 'sabit' | 'kargo' | 'xaly'
  oran: '',                  // yuzde/sabit: sayı metni
  kargoUcretsiz: false,      // ek indirim
  kosulTum: true, suzgec: { tur: 'urun', idler: [] },   // urun | kategori | marka | etiket
  indirimliDahil: false,
  tutarSinir: { acik: false, min: '', max: '' }, adetSinir: { acik: false, min: '', max: '' },
  toplamLimit: '', musteriLimit: '',
  yalnizHesap: false, birlesir: false,
  satisKanallari: [],        // [] = hepsi
  baslangic: '', bitis: '',  // 'YYYY-MM-DDTHH:mm' (datetime-local) ya da ''
  uygulananFiyat: 'SELL_PRICE',
  xaly: {
    alKip: 'adet',           // 'adet' | 'tutar'
    alMiktar: '', alMaks: '', alSuzgec: { tur: 'urun', idler: [] },
    kazanAdet: '', kazanOran: '100', kazanSuzgec: { tur: 'urun', idler: [] },
    otomatikEkle: false, siparisLimit: '',
  },
}
```

- [ ] **Step 1: Testleri yaz**

`electron/ikas/kampanya-donustur.test.js`:

```js
import { describe, test, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const d = require('./kampanya-donustur.js')

describe('formdanInput', () => {
  test('yüzde indirim: RATIO + fixedDiscount.amount, boş alanlar yok', () => {
    const f = { ...d.bosForm(), baslik: 'Hoş geldin', tur: 'yuzde', oran: '10', kuponlu: true }
    const i = d.formdanInput(f)
    expect(i.type).toBe('RATIO')
    expect(i.fixedDiscount.amount).toBe(10)
    expect(i.hasCoupon).toBe(true)
    expect(i.canCombineWithOtherCampaigns).toBe(false)
    expect(i.applicablePrice).toBe('SELL_PRICE')
    expect(i).not.toHaveProperty('dateRange')
    expect(i).not.toHaveProperty('usageLimit')
    expect(i.fixedDiscount).not.toHaveProperty('filters')
  })

  test('MUTASYON KAPANI: oran alanı amount dışına yazılırsa kırmızı', () => {
    const i = d.formdanInput({ ...d.bosForm(), baslik: 'x', tur: 'sabit', oran: '250' })
    expect(i.type).toBe('FIXED_AMOUNT')
    expect(i.fixedDiscount).toEqual({ amount: 250 })
  })

  test('ürün süzgeci PRODUCT_AND_VARIANT + p: öneki (canlı sapma)', () => {
    const f = { ...d.bosForm(), baslik: 'x', tur: 'yuzde', oran: '5', kosulTum: false,
      suzgec: { tur: 'urun', idler: ['abc', 'p:def'] } }
    expect(d.formdanInput(f).fixedDiscount.filters).toEqual([{ type: 'PRODUCT_AND_VARIANT', idList: ['p:abc', 'p:def'] }])
  })

  test('kategori süzgeci ham id ile CATEGORY', () => {
    const f = { ...d.bosForm(), baslik: 'x', tur: 'yuzde', oran: '5', kosulTum: false,
      suzgec: { tur: 'kategori', idler: ['k1'] } }
    expect(d.formdanInput(f).fixedDiscount.filters).toEqual([{ type: 'CATEGORY', idList: ['k1'] }])
  })

  test('sepet tutarı sınırı priceRange + isApplyByCartAmount; adet sınırı lineItemQuantityRange', () => {
    const f = { ...d.bosForm(), baslik: 'x', tur: 'yuzde', oran: '5',
      tutarSinir: { acik: true, min: '500', max: '' }, adetSinir: { acik: true, min: '2', max: '4' } }
    const fd = d.formdanInput(f).fixedDiscount
    expect(fd.priceRange).toEqual({ min: 500 })
    expect(fd.isApplyByCartAmount).toBe(true)
    expect(fd.lineItemQuantityRange).toEqual({ min: 2, max: 4 })
  })

  test('tarih datetime-local → ms; yalnız bitiş varsa start yok', () => {
    const f = { ...d.bosForm(), baslik: 'x', tur: 'kargo', bitis: '2026-09-30T23:59' }
    const i = d.formdanInput(f)
    expect(i.type).toBe('FREE_SHIPPING')
    expect(i.dateRange).toEqual({ end: new Date('2026-09-30T23:59').getTime() })
  })

  test('limitler, hesap zorunluluğu, satış kanalları', () => {
    const f = { ...d.bosForm(), baslik: 'x', tur: 'yuzde', oran: '5', toplamLimit: '100', musteriLimit: '1',
      yalnizHesap: true, birlesir: true, satisKanallari: ['sk1'] }
    const i = d.formdanInput(f)
    expect(i.usageLimit).toBe(100); expect(i.usageLimitPerCustomer).toBe(1)
    expect(i.onlyUseCustomer).toBe(true); expect(i.canCombineWithOtherCampaigns).toBe(true)
    expect(i.salesChannelIds).toEqual(['sk1'])
  })

  test('X al Y kazan: buyX/getY, adet kipi, ücretsiz = discountRatio 100', () => {
    const f = { ...d.bosForm(), baslik: 'x', tur: 'xaly', xaly: {
      alKip: 'adet', alMiktar: '3', alMaks: '6', alSuzgec: { tur: 'urun', idler: ['a'] },
      kazanAdet: '1', kazanOran: '100', kazanSuzgec: { tur: 'urun', idler: ['b'] },
      otomatikEkle: true, siparisLimit: '2' } }
    const i = d.formdanInput(f)
    expect(i.type).toBe('BUY_X_THEN_GET_Y')
    expect(i).not.toHaveProperty('fixedDiscount')
    expect(i.buyXThenGetY).toEqual({
      maxUsagePerOrder: 2,
      buyX: { amount: 3, applyByQuantity: true, filter: { type: 'PRODUCT_AND_VARIANT', idList: ['p:a'] } },
      getY: { amount: 1, discountRatio: 100, automaticallyAddItemToCart: true, filter: { type: 'PRODUCT_AND_VARIANT', idList: ['p:b'] } },
    })
  })

  test('X al Y kazan tutar kipi applyByQuantity=false', () => {
    const f = { ...d.bosForm(), baslik: 'x', tur: 'xaly', xaly: { ...d.bosForm().xaly, alKip: 'tutar', alMiktar: '1000',
      alSuzgec: { tur: 'kategori', idler: ['k'] }, kazanAdet: '1', kazanOran: '50', kazanSuzgec: { tur: 'urun', idler: ['b'] } } }
    const b = d.formdanInput(f).buyXThenGetY
    expect(b.buyX.applyByQuantity).toBe(false)
    expect(b.getY.discountRatio).toBe(50)
  })

  test('başlık boşsa hata', () => {
    expect(() => d.formdanInput({ ...d.bosForm(), tur: 'kargo' })).toThrow('Başlık')
  })
  test('yüzde/sabit oran boşsa hata; yüzde 100 üstü hata', () => {
    expect(() => d.formdanInput({ ...d.bosForm(), baslik: 'x', tur: 'yuzde', oran: '' })).toThrow('oran')
    expect(() => d.formdanInput({ ...d.bosForm(), baslik: 'x', tur: 'yuzde', oran: '150' })).toThrow('100')
  })
  test('belirli ürünler seçili ama liste boşsa hata', () => {
    expect(() => d.formdanInput({ ...d.bosForm(), baslik: 'x', tur: 'yuzde', oran: '5', kosulTum: false }))
      .toThrow('en az bir')
  })
})

describe('inputtanForm (ikas Campaign → form)', () => {
  const canli = { id: 'c1', title: 'Maxx Doria İndirim Kuponu ', type: 'RATIO', hasCoupon: true,
    usageLimit: null, usageLimitPerCustomer: null, canCombineWithOtherCampaigns: false,
    applicablePrice: 'SELL_PRICE', isFreeShipping: null, onlyUseCustomer: null, includeDiscountedProducts: null,
    salesChannelIds: null, dateRange: { start: null, end: 1788987600000 },
    fixedDiscount: { amount: 20, isApplyByCartAmount: null, priceRange: null,
      lineItemQuantityRange: { min: null, max: null },
      filters: [{ type: 'PRODUCT_AND_VARIANT', idList: ['p:b13c', 'p:df9f'] }] }, buyXThenGetY: null }
  test('yüzde kampanya forma döner, p: öneki soyulur, tarih datetime-local olur', () => {
    const f = d.inputtanForm(canli)
    expect(f.id).toBe('c1'); expect(f.baslik).toBe('Maxx Doria İndirim Kuponu')
    expect(f.tur).toBe('yuzde'); expect(f.oran).toBe('20'); expect(f.kuponlu).toBe(true)
    expect(f.kosulTum).toBe(false); expect(f.suzgec).toEqual({ tur: 'urun', idler: ['b13c', 'df9f'] })
    expect(f.baslangic).toBe(''); expect(f.bitis).toMatch(/^2026-09-\d{2}T\d{2}:\d{2}$/)
    expect(f.adetSinir.acik).toBe(false)
  })
  test('gidiş-dönüş: formdanInput(inputtanForm(x)) canlı alanları korur', () => {
    const i = d.formdanInput(d.inputtanForm(canli))
    expect(i.fixedDiscount.filters).toEqual(canli.fixedDiscount.filters)
    expect(i.fixedDiscount.amount).toBe(20)
    expect(i.dateRange.end).toBe(canli.dateRange.end)
    expect(i.id).toBe('c1')
  })
})

describe('farklar', () => {
  test('gönderilen ile okunan aynıysa boş; amount farklıysa alan adı döner', () => {
    const i = { title: 'x', type: 'RATIO', hasCoupon: true, canCombineWithOtherCampaigns: false,
      applicablePrice: 'SELL_PRICE', fixedDiscount: { amount: 10 } }
    expect(d.farklar(i, { ...i, id: 'c', usageCount: 0, dateRange: null })).toEqual([])
    expect(d.farklar(i, { ...i, fixedDiscount: { amount: 15 } })).toEqual(['fixedDiscount.amount'])
  })
})

describe('kuponInput', () => {
  test('özel kod', () => {
    expect(d.kuponInput({ campaignId: 'c', kip: 'ozel', kod: ' HOSGELDIN ', toplamLimit: '1', musteriLimit: '', birlesir: false }))
      .toEqual({ campaignId: 'c', coupons: [{ code: 'HOSGELDIN', usageLimit: 1, canCombineWithOtherCampaigns: false }] })
  })
  test('otomatik üret', () => {
    expect(d.kuponInput({ campaignId: 'c', kip: 'uret', onEk: 'tnc', adet: '20', toplamLimit: '1', musteriLimit: '1', birlesir: false }))
      .toEqual({ campaignId: 'c', generateCoupons: { prefix: 'tnc', quantity: 20, usageLimit: 1, usageLimitPerCustomer: 1, canCombineWithOtherCampaigns: false } })
  })
  test('özel kodda kod boşsa, üretimde adet 0 ise hata', () => {
    expect(() => d.kuponInput({ campaignId: 'c', kip: 'ozel', kod: '' })).toThrow('Kod')
    expect(() => d.kuponInput({ campaignId: 'c', kip: 'uret', onEk: 'a', adet: '0' })).toThrow('Adet')
  })
})
```

- [ ] **Step 2: Kırmızı gör**

Run: `npx vitest run electron/ikas/kampanya-donustur.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Uygulamayı yaz**

`electron/ikas/kampanya-donustur.js`:

```js
// Kampanya formu ↔ ikas CampaignInput — DB'siz, ağsız SAF dönüşüm (satis-hesapla.js deseni).
//
// Canlı şema sapmaları (09.09.2026 ölçüldü, docs/superpowers/specs/2026-09-09-kampanya-kupon-design.md):
//   - Ürün süzgeci type 'PRODUCT_AND_VARIANT', id 'p:<productId>' (belgeli enum'da YOK).
//   - Yüzde indirim type 'RATIO' + fixedDiscount.amount (ayrı "ratio" alanı YOK).
//   - dateRange.start/end milisaniye epoch.
// Kural: boş/ilgisiz alan GÖNDERİLMEZ — ikas null'ı "temizle" diye yorumlayabilir.

const SUZGEC_TURLERI = Object.freeze({
  urun: 'PRODUCT_AND_VARIANT', kategori: 'CATEGORY', marka: 'PRODUCT_BRAND', etiket: 'PRODUCT_TAG',
})
const TUR_IKAS = Object.freeze({ yuzde: 'RATIO', sabit: 'FIXED_AMOUNT', kargo: 'FREE_SHIPPING', xaly: 'BUY_X_THEN_GET_Y' })
const TUR_FORM = Object.freeze({ RATIO: 'yuzde', FIXED_AMOUNT: 'sabit', FREE_SHIPPING: 'kargo', BUY_X_THEN_GET_Y: 'xaly' })
const URUN_ONEK = 'p:'

function bosSuzgec() { return { tur: 'urun', idler: [] } }

function bosForm() {
  return {
    id: null, baslik: '', kuponlu: true, tur: 'yuzde', oran: '', kargoUcretsiz: false,
    kosulTum: true, suzgec: bosSuzgec(), indirimliDahil: false,
    tutarSinir: { acik: false, min: '', max: '' }, adetSinir: { acik: false, min: '', max: '' },
    toplamLimit: '', musteriLimit: '', yalnizHesap: false, birlesir: false,
    satisKanallari: [], baslangic: '', bitis: '', uygulananFiyat: 'SELL_PRICE',
    xaly: {
      alKip: 'adet', alMiktar: '', alMaks: '', alSuzgec: bosSuzgec(),
      kazanAdet: '', kazanOran: '100', kazanSuzgec: bosSuzgec(), otomatikEkle: false, siparisLimit: '',
    },
  }
}

const sayi = (v) => (v === '' || v === null || v === undefined) ? null : Number(v)
const tamSayi = (v) => { const n = sayi(v); return n === null ? null : Math.trunc(n) }

// datetime-local ('YYYY-MM-DDTHH:mm', yerel saat) → ms. Boşsa null.
function tarihMs(v) { return v ? new Date(v).getTime() : null }
// ms → datetime-local. ikas null/0 döndürürse ''.
function msTarih(ms) {
  if (!ms) return ''
  const d = new Date(ms); const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function suzgecInput(s, etiket) {
  const idler = (s && s.idler || []).map(x => String(x).trim()).filter(Boolean)
  if (!idler.length) throw new Error(`${etiket}: en az bir ürün/kategori/marka seçin.`)
  const tur = SUZGEC_TURLERI[s.tur]
  if (!tur) throw new Error(`${etiket}: bilinmeyen süzgeç türü "${s.tur}".`)
  const idList = tur === SUZGEC_TURLERI.urun ? idler.map(x => x.startsWith(URUN_ONEK) ? x : URUN_ONEK + x) : idler
  return { type: tur, idList }
}

function suzgecForm(f) {
  if (!f) return bosSuzgec()
  const tur = Object.keys(SUZGEC_TURLERI).find(k => SUZGEC_TURLERI[k] === f.type) || 'urun'
  const idler = (f.idList || []).map(x => (tur === 'urun' && String(x).startsWith(URUN_ONEK)) ? String(x).slice(URUN_ONEK.length) : String(x))
  return { tur, idler }
}

function aralik(sinir) {
  if (!sinir || !sinir.acik) return null
  const r = {}
  if (sayi(sinir.min) !== null) r.min = sayi(sinir.min)
  if (sayi(sinir.max) !== null) r.max = sayi(sinir.max)
  return Object.keys(r).length ? r : null
}

function formdanInput(f) {
  const baslik = (f.baslik || '').trim()
  if (!baslik) throw new Error('Başlık gerekli.')
  const type = TUR_IKAS[f.tur]
  if (!type) throw new Error(`Bilinmeyen kampanya türü "${f.tur}".`)

  const i = {
    title: baslik, type, hasCoupon: !!f.kuponlu,
    canCombineWithOtherCampaigns: !!f.birlesir,
    applicablePrice: f.uygulananFiyat === 'DISCOUNT_PRICE' ? 'DISCOUNT_PRICE' : 'SELL_PRICE',
  }
  if (f.id) i.id = f.id
  if (f.kargoUcretsiz && f.tur !== 'kargo') i.isFreeShipping = true
  if (f.indirimliDahil) i.includeDiscountedProducts = true
  if (f.yalnizHesap) i.onlyUseCustomer = true
  if (tamSayi(f.toplamLimit) !== null) i.usageLimit = tamSayi(f.toplamLimit)
  if (tamSayi(f.musteriLimit) !== null) i.usageLimitPerCustomer = tamSayi(f.musteriLimit)
  if (Array.isArray(f.satisKanallari) && f.satisKanallari.length) i.salesChannelIds = [...f.satisKanallari]
  const start = tarihMs(f.baslangic), end = tarihMs(f.bitis)
  if (start || end) { i.dateRange = {}; if (start) i.dateRange.start = start; if (end) i.dateRange.end = end }

  if (f.tur === 'xaly') {
    const x = f.xaly || {}
    const alMiktar = sayi(x.alMiktar)
    if (alMiktar === null || alMiktar <= 0) throw new Error('"Müşterinin aldıkları" miktarı gerekli.')
    const kazanAdet = sayi(x.kazanAdet)
    if (kazanAdet === null || kazanAdet <= 0) throw new Error('"Müşterinin kazandıkları" adedi gerekli.')
    const oran = sayi(x.kazanOran)
    if (oran === null || oran <= 0 || oran > 100) throw new Error('Kazanılan indirim oranı 1-100 arası olmalı.')
    const buyX = { amount: alMiktar, applyByQuantity: x.alKip !== 'tutar', filter: suzgecInput(x.alSuzgec, 'Müşterinin aldıkları') }
    const getY = { amount: kazanAdet, discountRatio: oran, filter: suzgecInput(x.kazanSuzgec, 'Müşterinin kazandıkları') }
    if (x.otomatikEkle) getY.automaticallyAddItemToCart = true
    i.buyXThenGetY = { buyX, getY }
    if (tamSayi(x.siparisLimit) !== null) i.buyXThenGetY.maxUsagePerOrder = tamSayi(x.siparisLimit)
    return i
  }

  const fd = {}
  if (f.tur === 'yuzde' || f.tur === 'sabit') {
    const oran = sayi(f.oran)
    if (oran === null || oran <= 0) throw new Error('İndirim oranı/tutarı gerekli.')
    if (f.tur === 'yuzde' && oran > 100) throw new Error('Yüzde indirim 100 üstü olamaz.')
    fd.amount = oran
  }
  if (!f.kosulTum) fd.filters = [suzgecInput(f.suzgec, 'Koşullar')]
  const pr = aralik(f.tutarSinir); if (pr) { fd.priceRange = pr; fd.isApplyByCartAmount = true }
  const qr = aralik(f.adetSinir); if (qr) fd.lineItemQuantityRange = qr
  if (Object.keys(fd).length) i.fixedDiscount = fd
  return i
}

function inputtanForm(c) {
  const f = bosForm()
  if (!c) return f
  f.id = c.id || null
  f.baslik = (c.title || '').trim()
  f.kuponlu = !!c.hasCoupon
  f.tur = TUR_FORM[c.type] || 'yuzde'
  f.kargoUcretsiz = !!c.isFreeShipping
  f.indirimliDahil = !!c.includeDiscountedProducts
  f.yalnizHesap = !!c.onlyUseCustomer
  f.birlesir = !!c.canCombineWithOtherCampaigns
  f.uygulananFiyat = c.applicablePrice === 'DISCOUNT_PRICE' ? 'DISCOUNT_PRICE' : 'SELL_PRICE'
  f.toplamLimit = c.usageLimit == null ? '' : String(c.usageLimit)
  f.musteriLimit = c.usageLimitPerCustomer == null ? '' : String(c.usageLimitPerCustomer)
  f.satisKanallari = Array.isArray(c.salesChannelIds) ? [...c.salesChannelIds] : []
  f.baslangic = msTarih(c.dateRange && c.dateRange.start)
  f.bitis = msTarih(c.dateRange && c.dateRange.end)
  const fd = c.fixedDiscount || {}
  if (f.tur === 'yuzde' || f.tur === 'sabit') f.oran = fd.amount == null ? '' : String(fd.amount)
  const filt = Array.isArray(fd.filters) && fd.filters[0]
  if (filt && Array.isArray(filt.idList) && filt.idList.length) { f.kosulTum = false; f.suzgec = suzgecForm(filt) }
  const pr = fd.priceRange || {}, qr = fd.lineItemQuantityRange || {}
  if (pr.min != null || pr.max != null) f.tutarSinir = { acik: true, min: pr.min ?? '', max: pr.max ?? '' }
  if (qr.min != null || qr.max != null) f.adetSinir = { acik: true, min: qr.min ?? '', max: qr.max ?? '' }
  const b = c.buyXThenGetY
  if (b) {
    f.xaly = {
      alKip: b.buyX && b.buyX.applyByQuantity === false ? 'tutar' : 'adet',
      alMiktar: b.buyX && b.buyX.amount != null ? String(b.buyX.amount) : '', alMaks: '',
      alSuzgec: suzgecForm(b.buyX && b.buyX.filter),
      kazanAdet: b.getY && b.getY.amount != null ? String(b.getY.amount) : '',
      kazanOran: b.getY && b.getY.discountRatio != null ? String(b.getY.discountRatio) : '100',
      kazanSuzgec: suzgecForm(b.getY && b.getY.filter),
      otomatikEkle: !!(b.getY && b.getY.automaticallyAddItemToCart),
      siparisLimit: b.maxUsagePerOrder == null ? '' : String(b.maxUsagePerOrder),
    }
  }
  return f
}

// Geri okuma karşılaştırması: input'ta GÖNDERİLEN her alan okunan nesnede aynı mı?
// Okunanda fazladan alan olması fark değildir (usageCount, id vb.).
function farklar(input, okunan, yol = '') {
  const out = []
  for (const [k, v] of Object.entries(input || {})) {
    if (k === 'id') continue
    const o = okunan ? okunan[k] : undefined
    const p = yol ? `${yol}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) { out.push(...farklar(v, o || {}, p)); continue }
    if (JSON.stringify(v) !== JSON.stringify(o)) out.push(p)
  }
  return out
}

function kuponInput({ campaignId, kip, kod, onEk, adet, toplamLimit, musteriLimit, birlesir }) {
  if (!campaignId) throw new Error('Kampanya seçilmedi.')
  const ortak = { canCombineWithOtherCampaigns: !!birlesir }
  if (tamSayi(toplamLimit) !== null) ortak.usageLimit = tamSayi(toplamLimit)
  if (tamSayi(musteriLimit) !== null) ortak.usageLimitPerCustomer = tamSayi(musteriLimit)
  if (kip === 'uret') {
    const q = tamSayi(adet)
    if (!(onEk || '').trim()) throw new Error('Kod ön eki gerekli.')
    if (!q || q <= 0) throw new Error('Adet 1 veya daha büyük olmalı.')
    return { campaignId, generateCoupons: { prefix: onEk.trim(), quantity: q, ...ortak } }
  }
  const code = (kod || '').trim()
  if (!code) throw new Error('Kod gerekli.')
  return { campaignId, coupons: [{ code, ...ortak }] }
}

module.exports = { SUZGEC_TURLERI, URUN_ONEK, bosForm, formdanInput, inputtanForm, farklar, kuponInput, _msTarih: msTarih }
```

- [ ] **Step 4: Yeşil gör**

Run: `npx vitest run electron/ikas/kampanya-donustur.test.js`
Expected: PASS (17 test). Not: `kuponInput` özel kod testi `usageLimitPerCustomer` beklemiyor; `musteriLimit: ''` → alan yok, `toEqual` tam eşleşir.

- [ ] **Step 5: Mutasyon kontrolü (elle, 1 dk)**

`fd.amount = oran` satırını geçici olarak `fd.amount = 0` yap, testi çalıştır: "MUTASYON KAPANI" testi KIRMIZI olmalı. Geri al.

- [ ] **Step 6: Commit**

```bash
git add electron/ikas/kampanya-donustur.js electron/ikas/kampanya-donustur.test.js
git commit -m "feat(ikas): kampanya formu ↔ CampaignInput saf dönüştürücü (canlı sapmalar dahil)"
```

---

### Task 3: ikas kampanya katmanı + IPC + `kampanyaApi`

**Files:**
- Create: `electron/ikas/kampanya.js`
- Modify: `electron/main.js` (handlerModules: `require('./ikas/ekstra')` satırından sonra)
- Modify: `src/api/ipc.js`

**Interfaces:**
- Consumes: `require('./client').graphql(query, variables)`, Task 2 dönüştürücü, `require('../yetki')._yetkiKontrol`.
- Produces IPC: 
  - `kampanya:liste` → `[{id,title,type,hasCoupon,usageCount,usageLimit,dateRange,…}]` (tam Campaign alanları)
  - `kampanya:getir(id)` → `{ form, kampanya }` 
  - `kampanya:kaydet(form)` → `{ id, farklar: string[] }`
  - `kampanya:sil(id)` → `true`
  - `kampanya:kuponlar(campaignId)` → `[Coupon]`
  - `kampanya:kuponEkle(kuponFormu)` → `[Coupon]`
  - `kampanya:kuponSil(idList)` → `true`
  - `kampanya:sozlukler` → `{ kategoriler:[{id,name}], markalar:[{id,name}], etiketler:[{id,name}], satisKanallari:[{id,name,type}] }`
  - Dahili: `_kampanyalariListele()`, `_kuponlariListele(campaignId)` (Task 4/6 kullanır)

- [ ] **Step 1: Modülü yaz**

`electron/ikas/kampanya.js`:

```js
// ikas kampanya & kupon katmanı (09.09.2026). Yerel tablo YOK — her açılışta ikas'tan okunur;
// tek doğruluk kaynağı ikas. Kupon DAĞITIMI (kime verildi) yerelde tutulur: db/kupon-havuz.js.
//
// Yazma sonrası GERİ OKUMA zorunlu (api-verification kuralı): saveCampaign "success" dönse de
// ikas alanı sessizce yorumlayabilir; fark listesi arayüze döner.
const { graphql } = require('./client')
const { formdanInput, inputtanForm, farklar, kuponInput } = require('./kampanya-donustur')
const { _yetkiKontrol: yetkiKontrol } = require('../yetki')

const KAMPANYA_ALANLARI = `
  id title type hasCoupon usageCount usageLimit usageLimitPerCustomer canCombineWithOtherCampaigns
  applicablePrice isFreeShipping onlyUseCustomer includeDiscountedProducts salesChannelIds
  dateRange { start end }
  fixedDiscount { amount isApplyByCartAmount priceRange { min max } lineItemQuantityRange { min max } filters { type idList } }
  buyXThenGetY { maxUsagePerOrder
    buyX { amount applyByQuantity filter { type idList } }
    getY { amount discountRatio automaticallyAddItemToCart filter { type idList } } }`
const KUPON_ALANLARI = `id campaignId code usageCount usageLimit usageLimitPerCustomer canCombineWithOtherCampaigns`
const SAYFA = 100

async function kampanyalariListele() {
  const out = []
  for (let page = 1; ; page++) {
    const d = await graphql(`query($p:Int!){ listCampaign(pagination:{page:$p,limit:${SAYFA}}) { count data { ${KAMPANYA_ALANLARI} } } }`, { p: page })
    const veri = d.listCampaign && d.listCampaign.data || []
    out.push(...veri)
    if (veri.length < SAYFA) break
  }
  return out
}

async function kampanyaGetir(id) {
  const d = await graphql(`query($id:String!){ listCampaign(id:{eq:$id}) { data { ${KAMPANYA_ALANLARI} } } }`, { id })
  const k = d.listCampaign && d.listCampaign.data && d.listCampaign.data[0]
  if (!k) throw new Error('Kampanya ikas\'ta bulunamadı (silinmiş olabilir).')
  return k
}

async function kampanyaKaydet(form) {
  const input = formdanInput(form)
  const d = await graphql(`mutation($i:CampaignInput!){ saveCampaign(input:$i) { id } }`, { i: input })
  const id = d.saveCampaign && d.saveCampaign.id
  if (!id) throw new Error('ikas kampanya id döndürmedi.')
  const okunan = await kampanyaGetir(id)
  return { id, farklar: farklar(input, okunan) }
}

async function kampanyaSil(id) {
  const d = await graphql(`mutation($ids:[String!]!){ deleteCampaignList(idList:$ids) }`, { ids: [id] })
  if (d.deleteCampaignList !== true) throw new Error('ikas kampanyayı silemedi.')
  return true
}

async function kuponlariListele(campaignId) {
  const out = []
  for (let page = 1; ; page++) {
    const d = await graphql(`query($c:String!,$p:Int!){ listCoupon(campaignId:{eq:$c}, pagination:{page:$p,limit:${SAYFA}}) { data { ${KUPON_ALANLARI} } } }`, { c: campaignId, p: page })
    const veri = d.listCoupon && d.listCoupon.data || []
    out.push(...veri)
    if (veri.length < SAYFA) break
  }
  return out
}

async function kuponEkle(kuponFormu) {
  const input = kuponInput(kuponFormu)
  const d = await graphql(`mutation($i:AddCouponsInput!){ campaignAddCoupons(input:$i) { ${KUPON_ALANLARI} } }`, { i: input })
  const eklenen = d.campaignAddCoupons || []
  const beklenen = input.coupons ? input.coupons.length : input.generateCoupons.quantity
  if (eklenen.length !== beklenen) throw new Error(`ikas ${beklenen} kupon yerine ${eklenen.length} döndürdü.`)
  return eklenen
}

async function kuponSil(idList) {
  const d = await graphql(`mutation($ids:[String!]!){ deleteCouponList(idList:$ids) }`, { ids: idList })
  if (d.deleteCouponList !== true) throw new Error('ikas kuponları silemedi.')
  return true
}

// Formdaki seçiciler için ikas sözlükleri (kategori/marka/etiket/satış kanalı). Ürünler
// YEREL urunler tablosundan gelir (ikas_urun_id dolu olanlar) — Kampanyalar.jsx urunlerApi ile arar.
async function sozlukler() {
  const d = await graphql(`{
    listCategory { id name }
    listProductBrand { id name }
    listProductTag { id name }
    listSalesChannel { id name type }
  }`)
  return {
    kategoriler: d.listCategory || [], markalar: d.listProductBrand || [],
    etiketler: d.listProductTag || [], satisKanallari: d.listSalesChannel || [],
  }
}

module.exports = {
  _kampanyalariListele: kampanyalariListele,
  _kuponlariListele: kuponlariListele,

  'kampanya:liste': () => { yetkiKontrol('kampanya_yonet'); return kampanyalariListele() },
  'kampanya:getir': async (id) => { yetkiKontrol('kampanya_yonet'); const k = await kampanyaGetir(id); return { form: inputtanForm(k), kampanya: k } },
  'kampanya:kaydet': (form) => { yetkiKontrol('kampanya_yonet'); return kampanyaKaydet(form) },
  'kampanya:sil': (id) => { yetkiKontrol('kampanya_yonet'); return kampanyaSil(id) },
  'kampanya:kuponlar': (campaignId) => { yetkiKontrol('kampanya_yonet'); return kuponlariListele(campaignId) },
  'kampanya:kuponEkle': (kf) => { yetkiKontrol('kampanya_yonet'); return kuponEkle(kf) },
  'kampanya:kuponSil': (idList) => { yetkiKontrol('kampanya_yonet'); return kuponSil(idList) },
  'kampanya:sozlukler': () => { yetkiKontrol('kampanya_yonet'); return sozlukler() },
}
```

- [ ] **Step 2: main.js'e kaydet**

`electron/main.js` `handlerModules` dizisinde `require('./ikas/ekstra'),` satırının altına:

```js
  require('./ikas/kampanya'),
```

- [ ] **Step 3: `src/api/ipc.js`'e ekle** (dosya sonuna)

```js
export const kampanyaApi = {
  liste: () => invoke('kampanya:liste'),
  getir: (id) => invoke('kampanya:getir', id),
  kaydet: (form) => invoke('kampanya:kaydet', form),
  sil: (id) => invoke('kampanya:sil', id),
  kuponlar: (campaignId) => invoke('kampanya:kuponlar', campaignId),
  kuponEkle: (kf) => invoke('kampanya:kuponEkle', kf),
  kuponSil: (idList) => invoke('kampanya:kuponSil', idList),
  sozlukler: () => invoke('kampanya:sozlukler'),
}
```

- [ ] **Step 4: Sözlük sorgusunun şema adlarını doğrula**

Run: `grep -n "listProductTag\|listProductBrand\|listSalesChannel\|listCategory" docs/ikas/01-OPERASYON-KATALOGU.md`
Expected: dördü de listede. Değilse `docs/ikas/sema/queries/` altındaki dosya adına göre düzelt.

- [ ] **Step 5: Tüm testler yeşil (regresyon)**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add electron/ikas/kampanya.js electron/main.js src/api/ipc.js
git commit -m "feat(ikas): kampanya/kupon GraphQL katmanı + kampanya:* IPC + kampanyaApi"
```

---

### Task 4: `kupon_dagitim` tablosu, senkron, havuz mantığı

**Files:**
- Modify: `electron/db/database.js` (sosyal_otomasyon_numaralar tablosundan sonra)
- Modify: `electron/db/senk-sema.js` (TABLOLAR + SIRA)
- Modify: `electron/db/senk-sema.test.js`
- Create: `electron/db/kupon-havuz.js`
- Test: `electron/db/kupon-havuz.test.js`

**Interfaces:**
- Produces:
  - `havuzdanSec(kuponlar, verilmisKodlar) → Coupon|null` (saf)
  - `havuzDurumu(kuponlar, verilmisKodlar) → { toplam, kullanilmis, verilmis, bos }` (saf)
  - `verilmisKodlar(db, kampanyaId) → string[]`
  - `dagitimYaz(db, {kupon_id, kupon_kodu, kampanya_id, platform, konu_id, alici_id, gonderen_kullanici}) → id`
  - `dagitimSil(db, id)`
  - `dagitimlar(db, kampanyaId) → rows` (kod → kime/ne zaman)

- [ ] **Step 1: senk-sema testine ekle**

`electron/db/senk-sema.test.js` sonuna:

```js
describe('kupon_dagitim senkronu', () => {
  test('listede, doğal anahtar kupon_kodu, FK yok', () => {
    expect(TABLOLAR.kupon_dagitim).toBeDefined()
    expect(SIRA).toContain('kupon_dagitim')
    expect(TABLOLAR.kupon_dagitim.dogal).toEqual(['kupon_kodu'])
    expect(TABLOLAR.kupon_dagitim.fk).toEqual({})
    expect(TABLOLAR.kupon_dagitim.sonradanEklendi).toBe(true)
  })
})
```

- [ ] **Step 2: kupon-havuz testini yaz**

`electron/db/kupon-havuz.test.js`:

```js
// Kupon havuzu: ikas'tan gelen kupon listesi + yerel dağıtım kaydı → verilecek kod.
// better-sqlite3 burada KULLANILAMAZ (Electron ABI); node:sqlite adaptörü (setler.test.js kalıbı).
import { describe, test, expect, beforeEach } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const h = require('./kupon-havuz.js')

const K = (code, usageCount = 0) => ({ id: 'id_' + code, campaignId: 'c1', code, usageCount, usageLimit: 1, usageLimitPerCustomer: 1 })

describe('havuzdanSec (saf)', () => {
  test('kullanılmamış ve verilmemiş ilk kod seçilir', () => {
    expect(h.havuzdanSec([K('a', 1), K('b'), K('c')], ['b']).code).toBe('c')
  })
  test('hepsi kullanılmış/verilmişse null', () => {
    expect(h.havuzdanSec([K('a', 1), K('b')], ['b'])).toBeNull()
    expect(h.havuzdanSec([], [])).toBeNull()
  })
  test('havuzDurumu sayar', () => {
    expect(h.havuzDurumu([K('a', 1), K('b'), K('c'), K('d')], ['b', 'c']))
      .toEqual({ toplam: 4, kullanilmis: 1, verilmis: 2, bos: 1 })
  })
  test('MUTASYON KAPANI: verilmiş kod asla seçilmez', () => {
    for (let i = 0; i < 20; i++) expect(h.havuzdanSec([K('x')], ['x'])).toBeNull()
  })
})

function bellekDb() {
  const d = new DatabaseSync(':memory:')
  d.exec(h._SEMA)
  return { exec: (s) => d.exec(s), prepare: (s) => { const p = d.prepare(s); return { get: (...a) => p.get(...a), all: (...a) => p.all(...a), run: (...a) => p.run(...a) } } }
}

describe('dağıtım kaydı (DB)', () => {
  let db
  beforeEach(() => { db = bellekDb() })
  test('yaz → verilmisKodlar görür → sil → görmez', () => {
    const id = h.dagitimYaz(db, { kupon_id: 'k1', kupon_kodu: 'ABC', kampanya_id: 'c1', platform: 'instagram', konu_id: 'konu1', alici_id: 'u1', gonderen_kullanici: 'burak' })
    expect(h.verilmisKodlar(db, 'c1')).toEqual(['ABC'])
    expect(h.verilmisKodlar(db, 'c2')).toEqual([])
    expect(h.dagitimlar(db, 'c1')[0]).toMatchObject({ kupon_kodu: 'ABC', gonderen_kullanici: 'burak' })
    h.dagitimSil(db, id)
    expect(h.verilmisKodlar(db, 'c1')).toEqual([])
  })
  test('aynı kod ikinci kez yazılamaz (UNIQUE) — iki PC yarışının yerel kapısı', () => {
    h.dagitimYaz(db, { kupon_id: 'k1', kupon_kodu: 'ABC', kampanya_id: 'c1', platform: 'instagram', konu_id: 'a', alici_id: 'u', gonderen_kullanici: 'x' })
    expect(() => h.dagitimYaz(db, { kupon_id: 'k1', kupon_kodu: 'ABC', kampanya_id: 'c1', platform: 'instagram', konu_id: 'b', alici_id: 'v', gonderen_kullanici: 'y' }))
      .toThrow()
  })
})
```

- [ ] **Step 3: Kırmızı gör**

Run: `npx vitest run electron/db/kupon-havuz.test.js electron/db/senk-sema.test.js`
Expected: FAIL (modül yok; TABLOLAR.kupon_dagitim undefined).

- [ ] **Step 4: `kupon-havuz.js`**

```js
// Kupon havuzu: ikas'taki kuponlar (tek doğruluk kaynağı) + yerel "kime verildi" kaydı.
//
// NEDEN yerel kayıt: ikas yalnız usageCount bilir. "Verildi ama henüz kullanılmadı" ayrımı
// olmadan aynı kod iki müşteriye gider. Kayıt senkronlanır (senk-sema.js) → iki PC aynı
// kodu veremez; yarış penceresi senkron gecikmesi kadardır, UNIQUE(kupon_kodu) ikinci yazanı durdurur.
//
// ŞEMA burada da tutulur: test node:sqlite ile bu metni çalıştırır (database.js aynı metni exec eder).
const SEMA = `CREATE TABLE IF NOT EXISTS kupon_dagitim (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kupon_id TEXT,
  kupon_kodu TEXT NOT NULL UNIQUE,
  kampanya_id TEXT NOT NULL,
  platform TEXT,
  konu_id TEXT,
  alici_id TEXT,
  gonderen_kullanici TEXT,
  tarih TEXT DEFAULT (datetime('now','localtime'))
);
CREATE INDEX IF NOT EXISTS idx_kupon_dagitim_kampanya ON kupon_dagitim(kampanya_id);`

function havuzdanSec(kuponlar, verilmisKodlar) {
  const verilmis = new Set(verilmisKodlar || [])
  return (kuponlar || []).find(k => !(k.usageCount > 0) && !verilmis.has(k.code)) || null
}

function havuzDurumu(kuponlar, verilmisKodlar) {
  const verilmis = new Set(verilmisKodlar || [])
  let kullanilmis = 0, verilmisSayi = 0, bos = 0
  for (const k of kuponlar || []) {
    if (k.usageCount > 0) kullanilmis++
    else if (verilmis.has(k.code)) verilmisSayi++
    else bos++
  }
  return { toplam: (kuponlar || []).length, kullanilmis, verilmis: verilmisSayi, bos }
}

function verilmisKodlar(db, kampanyaId) {
  return db.prepare('SELECT kupon_kodu FROM kupon_dagitim WHERE kampanya_id = ?').all(kampanyaId).map(r => r.kupon_kodu)
}

function dagitimYaz(db, d) {
  const r = db.prepare(`INSERT INTO kupon_dagitim (kupon_id, kupon_kodu, kampanya_id, platform, konu_id, alici_id, gonderen_kullanici)
    VALUES (?,?,?,?,?,?,?)`).run(d.kupon_id || null, d.kupon_kodu, d.kampanya_id, d.platform || null, d.konu_id || null, d.alici_id || null, d.gonderen_kullanici || null)
  return Number(r.lastInsertRowid)
}

function dagitimSil(db, id) { db.prepare('DELETE FROM kupon_dagitim WHERE id = ?').run(id) }

function dagitimlar(db, kampanyaId) {
  return db.prepare('SELECT * FROM kupon_dagitim WHERE kampanya_id = ? ORDER BY tarih DESC').all(kampanyaId)
}

module.exports = { _SEMA: SEMA, havuzdanSec, havuzDurumu, verilmisKodlar, dagitimYaz, dagitimSil, dagitimlar }
```

- [ ] **Step 5: database.js'e tablo**

`electron/db/database.js` içinde `idx_sosyal_oto_numara` indeks satırından sonra:

```js
  // Hediye kuponu dağıtım kaydı (v1.2.204) — şema metni db/kupon-havuz.js'te (test de onu kullanır).
  db.exec(require('./kupon-havuz')._SEMA)
```

- [ ] **Step 6: senk-sema.js**

`TABLOLAR` içinde `sosyal_otomasyon_numaralar` tanımından sonra:

```js
  // Hediye kuponu dağıtımı (v1.2.204). SENKRONLANMALI: iki PC aynı havuzdan kupon verir;
  // kayıt yayılmazsa aynı kod iki müşteriye gider. Doğal anahtar kupon_kodu (ikas'ta da tekil).
  kupon_dagitim: { kolonlar: ['kupon_id', 'kupon_kodu', 'kampanya_id', 'platform', 'konu_id', 'alici_id', 'gonderen_kullanici', 'tarih'],
                   fk: {}, dogal: ['kupon_kodu'], sonradanEklendi: true },
```

`SIRA` dizisinde `'sosyal_otomasyon_urunler',` satırından sonra `'kupon_dagitim',` ekle.

- [ ] **Step 7: Yeşil gör**

Run: `npx vitest run electron/db/kupon-havuz.test.js electron/db/senk-sema.test.js`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add electron/db/kupon-havuz.js electron/db/kupon-havuz.test.js electron/db/database.js electron/db/senk-sema.js electron/db/senk-sema.test.js
git commit -m "feat(db): kupon_dagitim tablosu (senkronlu) + havuzdan seçim mantığı"
```

---

### Task 5: Kupon mesajı üretici + `kupon` şablon türü

**Files:**
- Create: `electron/meta/kupon-mesaj.js`, `electron/meta/kupon-mesaj.test.js`
- Modify: `electron/db/sosyal-otomasyon.js` (`sosyal:sablonKaydet` + yeni `sosyal:kuponSablonlari`)
- Modify: `electron/db/database.js` (varsayılan şablon)
- Modify: `src/components/SablonFormu.jsx`, `src/components/SablonKutuphanesi.jsx`
- Modify: `src/api/ipc.js` (`sosyalApi.kuponSablonlari`)

**Interfaces:**
- Produces: `kuponMesaji({ sablonMetni, kampanya, kupon, site }) → { metin, asildi }`.
  Yer tutucular: `{kod}`, `{indirim}` ("%15" / "250 TL" / "Ücretsiz kargo" / "X al Y kazan"), `{bitis}` ("30.09.2026"), `{min_tutar}` ("500 TL"), `{site}`. `{bitis}` ya da `{min_tutar}` boşsa **o satır tümüyle atılır**.
- IPC `sosyal:kuponSablonlari` → `[{id, ad, serbest_metin}]` (`tur='kupon'`, aktif).

- [ ] **Step 1: Test**

`electron/meta/kupon-mesaj.test.js`:

```js
import { describe, test, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { kuponMesaji, indirimMetni, VARSAYILAN_SABLON } = require('./kupon-mesaj.js')

const S = 'Merhaba! Size özel hediye kuponunuz: {kod}\nİndirim: {indirim}\nSon kullanım: {bitis}\nMin. sepet: {min_tutar}\nSipariş: {site}'
const K = { title: 'Hoş geldin', type: 'RATIO', fixedDiscount: { amount: 15, priceRange: { min: 500 } }, dateRange: { end: new Date('2026-09-30T23:59').getTime() } }

describe('indirimMetni', () => {
  test('türlere göre', () => {
    expect(indirimMetni({ type: 'RATIO', fixedDiscount: { amount: 15 } })).toBe('%15')
    expect(indirimMetni({ type: 'FIXED_AMOUNT', fixedDiscount: { amount: 250 } })).toBe('250 TL')
    expect(indirimMetni({ type: 'FREE_SHIPPING' })).toBe('Ücretsiz kargo')
    expect(indirimMetni({ type: 'BUY_X_THEN_GET_Y', buyXThenGetY: { buyX: { amount: 3 }, getY: { amount: 1, discountRatio: 100 } } })).toBe('3 al 1 bedava')
    expect(indirimMetni({ type: 'BUY_X_THEN_GET_Y', buyXThenGetY: { buyX: { amount: 2 }, getY: { amount: 1, discountRatio: 50 } } })).toBe('2 al 1 tanesi %50 indirimli')
  })
})

describe('kuponMesaji', () => {
  test('tüm yer tutucular dolar', () => {
    const { metin, asildi } = kuponMesaji({ sablonMetni: S, kampanya: K, kupon: { code: 'TNC123' }, site: 'tencerecim.store' })
    expect(metin).toBe('Merhaba! Size özel hediye kuponunuz: TNC123\nİndirim: %15\nSon kullanım: 30.09.2026\nMin. sepet: 500 TL\nSipariş: tencerecim.store')
    expect(asildi).toBe(false)
  })
  test('bitiş ve min tutar yoksa o SATIRLAR atılır', () => {
    const { metin } = kuponMesaji({ sablonMetni: S, kampanya: { type: 'RATIO', fixedDiscount: { amount: 10 } }, kupon: { code: 'X' }, site: 's' })
    expect(metin).toBe('Merhaba! Size özel hediye kuponunuz: X\nİndirim: %10\nSipariş: s')
  })
  test('MUTASYON KAPANI: kod yazılmazsa kırmızı', () => {
    expect(kuponMesaji({ sablonMetni: 'Kod: {kod}', kampanya: K, kupon: { code: 'ZZ' } }).metin).toBe('Kod: ZZ')
  })
  test('1000 karakter aşımı asildi=true, metin KESİLMEZ', () => {
    const r = kuponMesaji({ sablonMetni: 'a'.repeat(1001), kampanya: K, kupon: { code: 'X' } })
    expect(r.asildi).toBe(true); expect(r.metin.length).toBe(1001)
  })
  test('varsayılan şablon {kod} içerir ve 1000 altındadır', () => {
    expect(VARSAYILAN_SABLON).toContain('{kod}')
    expect(VARSAYILAN_SABLON.length).toBeLessThan(1000)
  })
})
```

- [ ] **Step 2: Kırmızı gör**

Run: `npx vitest run electron/meta/kupon-mesaj.test.js`
Expected: FAIL.

- [ ] **Step 3: Uygulama**

`electron/meta/kupon-mesaj.js`:

```js
// Hediye kuponu mesajı — şablon + ikas kampanyası + kupon → metin. SAF (sablon-mesaj.js deseni).
// Sınır 1000 karakter: aşarsa KESMİYORUZ, asildi=true (yarım kupon mesajı gitmesin).
const MAKS_KARAKTER = 1000

const VARSAYILAN_SABLON = [
  'Merhaba! 🎁 Size özel hediye kuponunuz hazır.',
  '',
  'Kupon kodu: {kod}',
  'İndirim: {indirim}',
  'Son kullanım: {bitis}',
  'Minimum sepet tutarı: {min_tutar}',
  '',
  'Nasıl kullanılır?',
  '1) {site} adresine girin, ürünlerinizi sepete ekleyin.',
  '2) Ödeme sayfasında "İndirim kodu" kutusuna kodu yazıp "Uygula"ya basın.',
  '3) İndirim sepet toplamından düşer.',
  '',
  'Kod tek kullanımlıktır. Sorunuz olursa buradan yazabilirsiniz.',
].join('\n')

const tl = (n) => `${Number(n).toLocaleString('tr-TR')} TL`

function indirimMetni(k) {
  if (!k) return ''
  const fd = k.fixedDiscount || {}
  switch (k.type) {
    case 'RATIO': return fd.amount != null ? `%${Number(fd.amount).toLocaleString('tr-TR')}` : 'İndirim'
    case 'FIXED_AMOUNT': return fd.amount != null ? tl(fd.amount) : 'İndirim'
    case 'FREE_SHIPPING': return 'Ücretsiz kargo'
    case 'BUY_X_THEN_GET_Y': {
      const b = k.buyXThenGetY || {}; const x = b.buyX || {}; const y = b.getY || {}
      if (Number(y.discountRatio) === 100) return `${x.amount} al ${y.amount} bedava`
      return `${x.amount} al ${y.amount} tanesi %${y.discountRatio} indirimli`
    }
    default: return k.title || 'İndirim'
  }
}

function tarihTr(ms) {
  if (!ms) return ''
  const d = new Date(ms); const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`
}

function kuponMesaji({ sablonMetni, kampanya, kupon, site }) {
  const fd = (kampanya && kampanya.fixedDiscount) || {}
  const degerler = {
    kod: (kupon && kupon.code) || '',
    indirim: indirimMetni(kampanya),
    bitis: tarihTr(kampanya && kampanya.dateRange && kampanya.dateRange.end),
    min_tutar: fd.priceRange && fd.priceRange.min != null ? tl(fd.priceRange.min) : '',
    site: site || '',
  }
  const satirlar = String(sablonMetni || '').split('\n').filter(satir => {
    // Satırdaki yer tutuculardan biri boş değer alıyorsa satırı at (bitişsiz kampanyada "Son kullanım:" kalmasın).
    const bosVar = ['bitis', 'min_tutar'].some(k => satir.includes(`{${k}}`) && !degerler[k])
    return !bosVar
  })
  const metin = satirlar.join('\n').replace(/\{(kod|indirim|bitis|min_tutar|site)\}/g, (_, k) => degerler[k])
  return { metin, asildi: metin.length > MAKS_KARAKTER }
}

module.exports = { MAKS_KARAKTER, VARSAYILAN_SABLON, indirimMetni, kuponMesaji }
```

- [ ] **Step 4: Yeşil gör**

Run: `npx vitest run electron/meta/kupon-mesaj.test.js`
Expected: PASS.

- [ ] **Step 5: `sosyal:sablonKaydet` kupon türü + `sosyal:kuponSablonlari`**

`electron/db/sosyal-otomasyon.js` içinde `'sosyal:sablonKaydet'`:
- `const t = tur === 'genel' ? 'genel' : 'urun'` satırını şununla değiştir:
  ```js
  const t = tur === 'genel' || tur === 'kupon' ? tur : 'urun'
  ```
- `if (t === 'genel') {` → `if (t === 'genel' || t === 'kupon') {` ve o blokta `'genel'` sabitini `t` yap:
  ```js
      if (!sm) throw new Error(t === 'kupon' ? 'Kupon şablonunda mesaj metni gerekli.' : 'Genel şablonda mesaj metni gerekli.')
      if (t === 'kupon' && !sm.includes('{kod}')) throw new Error('Kupon şablonu {kod} yer tutucusunu içermeli.')
      if (sm.length > 1000) throw new Error('Mesaj metni 1000 karakteri aşamaz.')
      p = [ad.trim(), null, null, '', null, null, null, null, t, sm]
  ```
- `module.exports` içine ekle:
  ```js
  // Kupon şablonları (tur='kupon'). Yetki: temsilci kupon gönderirken okur.
  'sosyal:kuponSablonlari': () => getDb().prepare(
    "SELECT id, ad, serbest_metin FROM sosyal_sablonlar WHERE aktif = 1 AND tur = 'kupon' ORDER BY ad").all(),
  ```

- [ ] **Step 6: Varsayılan şablon migration**

`electron/db/database.js`, `kupon_dagitim` exec satırından sonra:

```js
  // Varsayılan "nasıl kullanılır" kupon şablonu — bir kez, ad ile dedup (senkronda dogal=['ad']).
  {
    const { VARSAYILAN_SABLON } = require('../meta/kupon-mesaj')
    db.prepare(`INSERT INTO sosyal_sablonlar (ad, urun_adi, tur, serbest_metin)
      SELECT 'Hediye kuponu — nasıl kullanılır', '', 'kupon', ?
      WHERE NOT EXISTS (SELECT 1 FROM sosyal_sablonlar WHERE tur = 'kupon')`).run(VARSAYILAN_SABLON)
  }
```

- [ ] **Step 7: `src/api/ipc.js`** `sosyalApi` içine: `kuponSablonlari: () => invoke('sosyal:kuponSablonlari'),`

- [ ] **Step 8: SablonKutuphanesi menüsü + liste satırı**

`src/components/SablonKutuphanesi.jsx`:
- "+ Yeni ▾" menüsünde Genel şablon düğmesinden sonra:
  ```jsx
                <button onClick={() => { setFormda({ tur: 'kupon' }); setMenuAcik(false) }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50">🎁 Kupon şablonu</button>
  ```
- Liste satırında `{s.tur === 'genel' ? (` dalından ÖNCE:
  ```jsx
                {s.tur === 'kupon' ? (
                  <><span className="text-amber-600">🎁 Kupon</span>
                    <span className="text-gray-400"> · {(s.serbest_metin || '').split('\n')[0].slice(0, 60)}</span></>
                ) : s.tur === 'genel' ? (
  ```

- [ ] **Step 9: SablonFormu kupon türü**

`src/components/SablonFormu.jsx`:
- `const genelMi = v.tur === 'genel'` → `const genelMi = v.tur === 'genel' || v.tur === 'kupon'` ve altına `const kuponMu = v.tur === 'kupon'`.
- Başlık: `(genelMi ? 'Yeni Genel Şablon' : …)` → `(kuponMu ? 'Yeni Kupon Şablonu' : genelMi ? 'Yeni Genel Şablon' : 'Yeni Ürün Şablonu')`.
- Genel dalındaki "Mesaj metni" `Alan`'ının `not` özniteliğini: `not={kuponMu ? 'yer tutucular: {kod} {indirim} {bitis} {min_tutar} {site} — boş kalan satır atılır' : 'müşteriye AYNEN bu gider'}`.
- `kaydet`: `onKaydet({ id: v.id, ad: v.ad, tur: 'genel', … })` → `tur: v.tur`.
- Kaydet düğmesi `disabled` genel dalına ekle: `|| (kuponMu && !(v.serbest_metin || '').includes('{kod}'))`.

- [ ] **Step 10: Regresyon**

Run: `npm test`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add electron/meta/kupon-mesaj.js electron/meta/kupon-mesaj.test.js electron/db/sosyal-otomasyon.js electron/db/database.js src/api/ipc.js src/components/SablonFormu.jsx src/components/SablonKutuphanesi.jsx
git commit -m "feat(sosyal): kupon şablon türü + hediye kuponu mesaj üretici + varsayılan şablon"
```

---

### Task 6: `meta:kuponGonder` + `sosyal:kuponHavuz`

**Files:**
- Modify: `electron/meta/index.js`
- Modify: `src/api/ipc.js`

**Interfaces:**
- Consumes: `mesajCevapla({id, metin, kullanici})`, `yorumdanMesaj({id, metin, kullanici})` (aynı dosyada), `require('../ikas/kampanya')._kampanyalariListele/_kuponlariListele`, `require('../db/kupon-havuz')`, `require('../meta/kupon-mesaj')`, `require('../ikas')._WEB_SITESI`.
- Produces:
  - `sosyal:kuponHavuz` → `[{ id, title, indirim, bitis, havuz: {toplam,kullanilmis,verilmis,bos} }]` (yalnız `hasCoupon` kampanyalar)
  - `meta:kuponGonder({ hedef:{tur:'dm'|'yorum', id}, kampanyaId, sablonId?, kullanici })` → `{ ok, kod }`

- [ ] **Step 1: Fonksiyonları ekle** (`electron/meta/index.js`, `yorumdanMesaj` fonksiyonundan sonra)

```js
// --- Hediye kuponu (v1.2.204) ---
// Havuz görünümü: kuponlu kampanyalar + kaç kod boşta. ikas'tan canlı okur (yerel kupon tablosu yok).
async function kuponHavuz() {
  const kampanya = require('../ikas/kampanya')
  const havuz = require('../db/kupon-havuz')
  const { indirimMetni } = require('./kupon-mesaj')
  const db = getDb()
  const liste = (await kampanya._kampanyalariListele()).filter(k => k.hasCoupon)
  const out = []
  for (const k of liste) {
    const kuponlar = await kampanya._kuponlariListele(k.id)
    out.push({ id: k.id, title: k.title.trim(), indirim: indirimMetni(k),
      bitis: k.dateRange && k.dateRange.end || null,
      havuz: havuz.havuzDurumu(kuponlar, havuz.verilmisKodlar(db, k.id)) })
  }
  return out
}

// Sıra: ÖNCE dağıtım kaydı (yarışı kaybeden PC UNIQUE'e takılır, mesaj gitmez) → SONRA gönderim →
// gönderim düşerse kayıt silinir (kod havuza döner). kartGonder ile aynı hedef sözleşmesi.
async function kuponGonder({ hedef, kampanyaId, sablonId, kullanici }) {
  if (!hedef || !hedef.id) throw new Error('Hedef gerekli (bir konuşma ya da yorum seçin).')
  if (!kampanyaId) throw new Error('Kampanya seçilmedi.')
  const db = getDb()
  const row = db.prepare('SELECT * FROM sosyal_mesajlar WHERE id = ?').get(hedef.id)
  if (!row) throw new Error('Mesaj bulunamadı.')

  const sablon = sablonId
    ? db.prepare("SELECT serbest_metin FROM sosyal_sablonlar WHERE id = ? AND tur = 'kupon' AND aktif = 1").get(sablonId)
    : db.prepare("SELECT serbest_metin FROM sosyal_sablonlar WHERE tur = 'kupon' AND aktif = 1 ORDER BY id LIMIT 1").get()
  if (!sablon) throw new Error('Kupon şablonu yok. Şablon Kütüphanesi > Yeni > Kupon şablonu.')

  const kampanya = require('../ikas/kampanya')
  const havuz = require('../db/kupon-havuz')
  const k = (await kampanya._kampanyalariListele()).find(x => x.id === kampanyaId)
  if (!k) throw new Error('Kampanya ikas\'ta bulunamadı.')
  const kupon = havuz.havuzdanSec(await kampanya._kuponlariListele(kampanyaId), havuz.verilmisKodlar(db, kampanyaId))
  if (!kupon) throw new Error('Havuz boş — Kampanya sekmesinden yeni kupon üretin.')

  const { kuponMesaji } = require('./kupon-mesaj')
  const { metin, asildi } = kuponMesaji({ sablonMetni: sablon.serbest_metin, kampanya: k, kupon, site: require('../ikas')._WEB_SITESI })
  if (asildi) throw new Error('Kupon mesajı 1000 karakteri aşıyor; şablonu kısaltın.')

  const dagitimId = havuz.dagitimYaz(db, {
    kupon_id: kupon.id, kupon_kodu: kupon.code, kampanya_id: kampanyaId, platform: row.platform,
    konu_id: row.konu_id, alici_id: row.gonderen_id || null, gonderen_kullanici: kullanici || null,
  })
  try {
    if (hedef.tur === 'yorum') await yorumdanMesaj({ id: hedef.id, metin, kullanici })
    else await mesajCevapla({ id: hedef.id, metin, kullanici })
  } catch (e) {
    havuz.dagitimSil(db, dagitimId) // kod havuza döner
    throw e
  }
  return { ok: true, kod: kupon.code }
}
```

- [ ] **Step 2: Kanalları kaydet** — `module.exports`'ta `'meta:kartGonder'` satırından sonra:

```js
  'meta:kuponGonder': (arg) => { yetkiKontrol('sosyal_medya_yonet'); return kuponGonder(arg) },
  'sosyal:kuponHavuz': () => { yetkiKontrol('sosyal_medya_yonet'); return kuponHavuz() },
```

- [ ] **Step 3: `_WEB_SITESI` var mı doğrula**

Run: `grep -n "_WEB_SITESI\|const WEB_SITESI" electron/ikas/index.js`
Expected: iki satır. Yoksa `require('../ikas')._WEB_SITESI` yerine `'tencerecim.store'` sabitini `kupon-mesaj.js`'e `VARSAYILAN_SITE` olarak koy.

- [ ] **Step 4: `src/api/ipc.js`**

`metaApi` içine: `kuponGonder: (veri) => invoke('meta:kuponGonder', veri),`
`sosyalApi` içine: `kuponHavuz: () => invoke('sosyal:kuponHavuz'),`

- [ ] **Step 5: Regresyon + yükleme kontrolü**

Run: `npm test && node -e "require('./electron/meta/kupon-mesaj'); console.log('ok')"`
Expected: PASS, `ok`.

- [ ] **Step 6: Commit**

```bash
git add electron/meta/index.js src/api/ipc.js
git commit -m "feat(meta): hediye kuponu gönderimi (havuzdan çek → dağıtım kaydı → DM/yorumdan mesaj)"
```

---

### Task 7: Kampanyalar sayfası (liste + form + kupon paneli)

**Files:**
- Create: `src/pages/Kampanyalar.jsx`
- Create: `src/components/kampanya/UrunSuzgecSecici.jsx`
- Create: `src/components/kampanya/KampanyaFormu.jsx`
- Create: `src/components/kampanya/KuponPaneli.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `kampanyaApi` (Task 3), `urunlerApi.listele({arama, boyut})` (mevcut; döner `{urunler:[{id, ad, sku, ikas_urun_id}]}`), form şekli (Task 2 `bosForm`), `sosyalApi.kuponHavuz` (Task 6).
- `bosForm` renderer'da `createRequire` ile ALINAMAZ → aynı nesneyi `KampanyaFormu.jsx` içinde `BOS_FORM()` olarak tekrar tanımla (Task 2'deki şekille birebir; alan ekleyince iki yeri de güncelle — dosya başına yorum).

- [ ] **Step 1: `UrunSuzgecSecici.jsx`**

```jsx
// Kampanya süzgeci: tür (ürün/kategori/marka/etiket) + çoklu seçim. Ürünler yerel tablodan
// (ikas_urun_id dolu olanlar; süzgece ikas id yazılır), diğerleri ikas sözlüğünden (props.sozlukler).
import { useEffect, useState } from 'react'
import { urunlerApi } from '../../api/ipc'

const TURLER = [['urun', 'Ürünler'], ['kategori', 'Kategoriler'], ['marka', 'Markalar'], ['etiket', 'Etiketler']]
const ARAMA_GECIKME_MS = 250

export default function UrunSuzgecSecici({ deger, onChange, sozlukler, etiket }) {
  const [arama, setArama] = useState('')
  const [urunler, setUrunler] = useState([])
  const [adlar, setAdlar] = useState({}) // id → ad (seçili ürünlerin adı için)
  const tur = deger?.tur || 'urun'
  const idler = deger?.idler || []

  useEffect(() => {
    if (tur !== 'urun' || !arama.trim()) { setUrunler([]); return }
    const t = setTimeout(() => {
      urunlerApi.listele({ arama: arama.trim(), boyut: 15 })
        .then(r => setUrunler((r?.urunler || []).filter(u => u.ikas_urun_id)))
        .catch(() => setUrunler([]))
    }, ARAMA_GECIKME_MS)
    return () => clearTimeout(t)
  }, [arama, tur])

  const sozluk = tur === 'kategori' ? sozlukler?.kategoriler : tur === 'marka' ? sozlukler?.markalar : tur === 'etiket' ? sozlukler?.etiketler : null
  const adBul = (id) => adlar[id] || (sozluk || []).find(x => x.id === id)?.name || id
  const ekle = (id, ad) => { if (!idler.includes(id)) onChange({ tur, idler: [...idler, id] }); if (ad) setAdlar(a => ({ ...a, [id]: ad })) }
  const cikar = (id) => onChange({ tur, idler: idler.filter(x => x !== id) })

  const adaylar = tur === 'urun'
    ? urunler.map(u => ({ id: u.ikas_urun_id, ad: `${u.ad}${u.sku ? ' · ' + u.sku : ''}` }))
    : (sozluk || []).filter(x => !arama.trim() || x.name.toLocaleLowerCase('tr').includes(arama.trim().toLocaleLowerCase('tr'))).slice(0, 15).map(x => ({ id: x.id, ad: x.name }))

  return (
    <div className="space-y-2">
      {etiket && <div className="text-xs font-semibold text-gray-600">{etiket}</div>}
      <div className="flex gap-2">
        <select value={tur} onChange={e => { onChange({ tur: e.target.value, idler: [] }); setArama('') }}
          className="border rounded-lg px-2 py-1.5 text-sm">
          {TURLER.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input value={arama} onChange={e => setArama(e.target.value)} placeholder="Ara…"
          className="flex-1 border rounded-lg px-3 py-1.5 text-sm" />
      </div>
      {arama.trim() && adaylar.length > 0 && (
        <div className="border rounded-lg max-h-40 overflow-auto bg-white">
          {adaylar.map(a => (
            <button key={a.id} type="button" onClick={() => { ekle(a.id, a.ad); setArama('') }}
              className="block w-full text-left px-3 py-1.5 text-sm hover:bg-marka-50">{a.ad}</button>
          ))}
        </div>
      )}
      {arama.trim() && adaylar.length === 0 && <div className="text-xs text-gray-400">Sonuç yok{tur === 'urun' ? ' (yalnız ikas\'a bağlı ürünler)' : ''}.</div>}
      <div className="flex flex-wrap gap-1">
        {idler.map(id => (
          <span key={id} className="inline-flex items-center gap-1 bg-krem-200 text-marka-900 rounded-full px-2 py-0.5 text-xs">
            {adBul(id)}<button type="button" onClick={() => cikar(id)} className="text-marka-400 hover:text-red-600">✕</button>
          </span>
        ))}
        {!idler.length && <span className="text-xs text-gray-400">Seçim yok.</span>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `KampanyaFormu.jsx`**

```jsx
// ikas panelindeki "İndirim Kodu Ekle" formunun bölüm sırası (09.09.2026 panel ölçümü):
// Başlık · İndirim Türü · İndirim Oranı · Koşullar · Gereksinimler · Kullanım Limitleri ·
// Müşteriler · Ayarlar · Aktif Tarihler. X Al Y Kazan'da Koşullar+Gereksinimler yerine
// "Müşterinin Aldıkları" / "Müşterinin Kazandıkları". Kuponlar ayrı panelde (KuponPaneli).
//
// BOS_FORM electron/ikas/kampanya-donustur.js bosForm() ile BİREBİR aynı olmalı
// (renderer main modülünü import edemez). Alan eklerken ikisini de güncelle.
import { useState } from 'react'
import UrunSuzgecSecici from './UrunSuzgecSecici'

export const BOS_FORM = () => ({
  id: null, baslik: '', kuponlu: true, tur: 'yuzde', oran: '', kargoUcretsiz: false,
  kosulTum: true, suzgec: { tur: 'urun', idler: [] }, indirimliDahil: false,
  tutarSinir: { acik: false, min: '', max: '' }, adetSinir: { acik: false, min: '', max: '' },
  toplamLimit: '', musteriLimit: '', yalnizHesap: false, birlesir: false,
  satisKanallari: [], baslangic: '', bitis: '', uygulananFiyat: 'SELL_PRICE',
  xaly: { alKip: 'adet', alMiktar: '', alMaks: '', alSuzgec: { tur: 'urun', idler: [] },
    kazanAdet: '', kazanOran: '100', kazanSuzgec: { tur: 'urun', idler: [] }, otomatikEkle: false, siparisLimit: '' },
})

const TURLER = [['yuzde', '％ Yüzdelik'], ['sabit', '₺ Sabit Tutar'], ['kargo', '🚚 Ücretsiz Kargo'], ['xaly', '🎁 X Al Y Kazan']]

function Bolum({ baslik, not, children }) {
  return (
    <section className="bg-white border rounded-2xl p-4 space-y-3">
      <div><h3 className="font-bold text-marka-900">{baslik}</h3>{not && <p className="text-xs text-gray-500">{not}</p>}</div>
      {children}
    </section>
  )
}
const Kutucuk = ({ checked, onChange, children }) => (
  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />{children}</label>
)
const Sayi = ({ value, onChange, placeholder, className = '' }) => (
  <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className={`border rounded-lg px-3 py-1.5 text-sm w-28 ${className}`} />
)
function Aralik({ sinir, onChange, etiket, not }) {
  return (
    <div>
      <Kutucuk checked={sinir.acik} onChange={acik => onChange({ ...sinir, acik })}><span className="font-medium">{etiket}</span></Kutucuk>
      <p className="text-xs text-gray-500 ml-6">{not}</p>
      {sinir.acik && (
        <div className="flex gap-2 ml-6 mt-1 items-center text-sm">
          Min <Sayi value={sinir.min} onChange={min => onChange({ ...sinir, min })} />
          Maks <Sayi value={sinir.max} onChange={max => onChange({ ...sinir, max })} placeholder="sınırsız" />
        </div>
      )}
    </div>
  )
}

export default function KampanyaFormu({ form, setForm, sozlukler }) {
  const f = form
  const set = (k, v) => setForm(o => ({ ...o, [k]: v }))
  const setX = (k, v) => setForm(o => ({ ...o, xaly: { ...o.xaly, [k]: v } }))
  const xaly = f.tur === 'xaly'

  return (
    <div className="space-y-4">
      <Bolum baslik="Başlık" not="Müşteriler bu başlığı sepette ve ödeme sırasında görür.">
        <input value={f.baslik} onChange={e => set('baslik', e.target.value)} placeholder="ör. Hoş geldin indirimi"
          className="w-full border rounded-lg px-3 py-2 text-sm" />
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1"><input type="radio" checked={f.kuponlu} onChange={() => set('kuponlu', true)} /> İndirim kodu (kuponla)</label>
          <label className="flex items-center gap-1"><input type="radio" checked={!f.kuponlu} onChange={() => set('kuponlu', false)} /> Otomatik indirim (sepette kendiliğinden)</label>
        </div>
      </Bolum>

      <Bolum baslik="İndirim Türü">
        <div className="grid grid-cols-4 gap-2">
          {TURLER.map(([k, l]) => (
            <button key={k} type="button" onClick={() => set('tur', k)}
              className={`border rounded-xl px-3 py-3 text-sm text-left ${f.tur === k ? 'border-marka-900 bg-krem-200 font-semibold' : 'hover:bg-gray-50'}`}>{l}</button>
          ))}
        </div>
      </Bolum>

      {!xaly && f.tur !== 'kargo' && (
        <Bolum baslik={f.tur === 'yuzde' ? 'İndirim Oranı' : 'İndirim Tutarı'}>
          <div className="flex items-center gap-2 text-sm">
            <Sayi value={f.oran} onChange={v => set('oran', v)} placeholder={f.tur === 'yuzde' ? '15' : '250'} /> {f.tur === 'yuzde' ? '%' : 'TL'}
          </div>
          <Kutucuk checked={f.kargoUcretsiz} onChange={v => set('kargoUcretsiz', v)}>Kargo ücretsiz olsun (ek indirim)</Kutucuk>
        </Bolum>
      )}

      {!xaly ? (<>
        <Bolum baslik="Koşullar">
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1"><input type="radio" checked={f.kosulTum} onChange={() => set('kosulTum', true)} /> Tüm ürünler</label>
            <label className="flex items-center gap-1"><input type="radio" checked={!f.kosulTum} onChange={() => set('kosulTum', false)} /> Belirli ürünler</label>
          </div>
          {!f.kosulTum && <UrunSuzgecSecici deger={f.suzgec} onChange={v => set('suzgec', v)} sozlukler={sozlukler} />}
          <Kutucuk checked={f.indirimliDahil} onChange={v => set('indirimliDahil', v)}>İndirimli ürünleri kampanyaya dahil et</Kutucuk>
        </Bolum>
        <Bolum baslik="Gereksinimler" not="Kampanya, sepet aşağıdaki şartları sağlarsa uygulanır.">
          <Aralik sinir={f.tutarSinir} onChange={v => set('tutarSinir', v)} etiket="Satın alma tutarını sınırla" not="Sepet toplamına uygulanacak sınır (TL)." />
          <Aralik sinir={f.adetSinir} onChange={v => set('adetSinir', v)} etiket="Ürün adetini sınırla" not="Sepetteki toplam ürün adedine uygulanacak sınır." />
        </Bolum>
      </>) : (<>
        <Bolum baslik="Müşterinin Aldıkları" not="Kampanya, sepet aşağıdaki şartı sağlayınca geçerli olur.">
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1"><input type="radio" checked={f.xaly.alKip === 'adet'} onChange={() => setX('alKip', 'adet')} /> Minimum ürün adedi</label>
            <label className="flex items-center gap-1"><input type="radio" checked={f.xaly.alKip === 'tutar'} onChange={() => setX('alKip', 'tutar')} /> Minimum satın alma tutarı</label>
          </div>
          <div className="flex items-center gap-2 text-sm">{f.xaly.alKip === 'adet' ? 'Adet' : 'Tutar (TL)'} <Sayi value={f.xaly.alMiktar} onChange={v => setX('alMiktar', v)} /></div>
          <UrunSuzgecSecici deger={f.xaly.alSuzgec} onChange={v => setX('alSuzgec', v)} sozlukler={sozlukler} etiket="Hangi ürünlerden" />
          <Kutucuk checked={f.indirimliDahil} onChange={v => set('indirimliDahil', v)}>İndirimli ürünleri kampanyaya dahil et</Kutucuk>
        </Bolum>
        <Bolum baslik="Müşterinin Kazandıkları" not="Şart sağlanınca kazanılacaklar.">
          <div className="flex items-center gap-2 text-sm">Adet <Sayi value={f.xaly.kazanAdet} onChange={v => setX('kazanAdet', v)} /></div>
          <UrunSuzgecSecici deger={f.xaly.kazanSuzgec} onChange={v => setX('kazanSuzgec', v)} sozlukler={sozlukler} etiket="Hangi ürünler" />
          <div className="flex gap-4 text-sm items-center">
            <label className="flex items-center gap-1"><input type="radio" checked={f.xaly.kazanOran === '100'} onChange={() => setX('kazanOran', '100')} /> Ücretsiz</label>
            <label className="flex items-center gap-1"><input type="radio" checked={f.xaly.kazanOran !== '100'} onChange={() => setX('kazanOran', '50')} /> Yüzdelik indirim</label>
            {f.xaly.kazanOran !== '100' && <><Sayi value={f.xaly.kazanOran} onChange={v => setX('kazanOran', v)} /> %</>}
          </div>
          <Kutucuk checked={f.xaly.otomatikEkle} onChange={v => setX('otomatikEkle', v)}>Şartlar sağlanırsa ürünü otomatik olarak sepete ekle</Kutucuk>
        </Bolum>
      </>)}

      <Bolum baslik="Kullanım Limitleri">
        <div className="flex items-center gap-2 text-sm">Toplam kullanım limiti <Sayi value={f.toplamLimit} onChange={v => set('toplamLimit', v)} placeholder="sınırsız" /></div>
        <div className="flex items-center gap-2 text-sm">Kullanıcı başına limit <Sayi value={f.musteriLimit} onChange={v => set('musteriLimit', v)} placeholder="sınırsız" /></div>
        {xaly && <div className="flex items-center gap-2 text-sm">Sipariş başına limit <Sayi value={f.xaly.siparisLimit} onChange={v => setX('siparisLimit', v)} placeholder="sınırsız" /></div>}
      </Bolum>

      <Bolum baslik="Müşteriler">
        <Kutucuk checked={f.yalnizHesap} onChange={v => set('yalnizHesap', v)}>Kampanyadan sadece müşteri hesabı olanlar yararlanabilsin</Kutucuk>
        <p className="text-xs text-gray-400">Müşteri grubu / spesifik müşteri seçimi ikas panelinden yapılır (API'de grup listesi yok).</p>
      </Bolum>

      <Bolum baslik="Ayarlar">
        <Kutucuk checked={f.birlesir} onChange={v => set('birlesir', v)}>Diğer kampanyalarla birleştirilsin</Kutucuk>
        <div className="flex items-center gap-2 text-sm">İndirim şu fiyata uygulanır
          <select value={f.uygulananFiyat} onChange={e => set('uygulananFiyat', e.target.value)} className="border rounded-lg px-2 py-1 text-sm">
            <option value="SELL_PRICE">Satış fiyatı</option><option value="DISCOUNT_PRICE">İndirimli fiyat</option>
          </select>
        </div>
        <div className="text-sm">
          <div className="font-medium mb-1">Satış kanalları <span className="text-xs text-gray-400">(hiçbiri seçili değilse hepsi)</span></div>
          <div className="flex flex-wrap gap-3">
            {(sozlukler?.satisKanallari || []).map(sk => (
              <Kutucuk key={sk.id} checked={f.satisKanallari.includes(sk.id)}
                onChange={v => set('satisKanallari', v ? [...f.satisKanallari, sk.id] : f.satisKanallari.filter(x => x !== sk.id))}>{sk.name}</Kutucuk>
            ))}
          </div>
        </div>
      </Bolum>

      <Bolum baslik="Aktif Tarihler">
        <div className="flex gap-4 text-sm items-center">
          Başlangıç <input type="datetime-local" value={f.baslangic} onChange={e => set('baslangic', e.target.value)} className="border rounded-lg px-2 py-1" />
          Bitiş <input type="datetime-local" value={f.bitis} onChange={e => set('bitis', e.target.value)} className="border rounded-lg px-2 py-1" />
        </div>
      </Bolum>
    </div>
  )
}
```

- [ ] **Step 3: `KuponPaneli.jsx`**

```jsx
// Kampanyanın kuponları: liste (kod, kullanılan, limitler, kime verildi) + ekle (özel / otomatik üret) + sil.
// ikas panel diyaloğunun aynısı: Özel Kupon (kod) | Otomatik Kod Üret (ön ek + adet); limitler ikisinde de.
import { useEffect, useState } from 'react'
import { kampanyaApi } from '../../api/ipc'
import toast from 'react-hot-toast'

export default function KuponPaneli({ kampanyaId, dagitimlar = [] }) {
  const [kuponlar, setKuponlar] = useState([])
  const [secili, setSecili] = useState([])
  const [acik, setAcik] = useState(false)
  const [kf, setKf] = useState({ kip: 'uret', kod: '', onEk: 'tencerecim', adet: '10', toplamLimit: '1', musteriLimit: '1', birlesir: false })
  const [mesgul, setMesgul] = useState(false)
  const verilen = new Map(dagitimlar.map(d => [d.kupon_kodu, d]))

  const yukle = () => kampanyaApi.kuponlar(kampanyaId).then(setKuponlar).catch(e => toast.error(e.message))
  useEffect(() => { if (kampanyaId) yukle() }, [kampanyaId])

  async function ekle() {
    setMesgul(true)
    try {
      const r = await kampanyaApi.kuponEkle({ ...kf, campaignId: kampanyaId })
      toast.success(`${r.length} kupon eklendi`); setAcik(false); yukle()
    } catch (e) { toast.error(e.message) } finally { setMesgul(false) }
  }
  async function sil() {
    if (!secili.length) return
    setMesgul(true)
    try { await kampanyaApi.kuponSil(secili); toast.success('Silindi'); setSecili([]); yukle() }
    catch (e) { toast.error(e.message) } finally { setMesgul(false) }
  }

  const bos = kuponlar.filter(k => !(k.usageCount > 0) && !verilen.has(k.code)).length
  return (
    <section className="bg-white border rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-bold text-marka-900">Kuponlar</h3>
        <span className="text-xs text-gray-500">{kuponlar.length} kupon · {bos} boşta · {kuponlar.length - bos} verildi/kullanıldı</span>
        <div className="ml-auto flex gap-2">
          {secili.length > 0 && <button onClick={sil} disabled={mesgul} className="text-sm text-red-600 px-3 py-1.5 border border-red-200 rounded-lg">Sil ({secili.length})</button>}
          <button onClick={() => setAcik(true)} className="bg-marka-900 text-white px-3 py-1.5 rounded-lg text-sm">Kupon Ekle</button>
        </div>
      </div>
      {!kuponlar.length && <p className="text-sm text-gray-400 py-4 text-center">Henüz kupon eklemediniz.</p>}
      {kuponlar.length > 0 && (
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500"><tr><th></th><th className="text-left">Kod</th><th>Kullanılan</th><th>Toplam limit</th><th>Müşteri limiti</th><th className="text-left">Verildi</th></tr></thead>
          <tbody>
            {kuponlar.map(k => { const v = verilen.get(k.code); return (
              <tr key={k.id} className="border-t">
                <td><input type="checkbox" checked={secili.includes(k.id)} onChange={e => setSecili(s => e.target.checked ? [...s, k.id] : s.filter(x => x !== k.id))} /></td>
                <td className="font-mono">{k.code}</td>
                <td className="text-center">{k.usageCount}</td>
                <td className="text-center">{k.usageLimit ?? '∞'}</td>
                <td className="text-center">{k.usageLimitPerCustomer ?? '∞'}</td>
                <td className="text-xs text-gray-500">{v ? `${v.gonderen_kullanici || '?'} · ${v.platform || ''} · ${v.tarih}` : (k.usageCount > 0 ? 'kullanıldı' : '—')}</td>
              </tr>) })}
          </tbody>
        </table>
      )}
      {acik && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setAcik(false)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-md space-y-3" onClick={e => e.stopPropagation()}>
            <h4 className="font-bold">Kupon Ekle</h4>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1"><input type="radio" checked={kf.kip === 'ozel'} onChange={() => setKf(o => ({ ...o, kip: 'ozel' }))} /> Özel Kupon</label>
              <label className="flex items-center gap-1"><input type="radio" checked={kf.kip === 'uret'} onChange={() => setKf(o => ({ ...o, kip: 'uret' }))} /> Otomatik Kod Üret</label>
            </div>
            {kf.kip === 'ozel'
              ? <input value={kf.kod} onChange={e => setKf(o => ({ ...o, kod: e.target.value }))} placeholder="Kod (ör. HOSGELDIN10)" className="w-full border rounded-lg px-3 py-2 text-sm" />
              : <div className="flex gap-2">
                  <input value={kf.onEk} onChange={e => setKf(o => ({ ...o, onEk: e.target.value }))} placeholder="Kod ön eki" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                  <input type="number" value={kf.adet} onChange={e => setKf(o => ({ ...o, adet: e.target.value }))} placeholder="Adet" className="w-24 border rounded-lg px-3 py-2 text-sm" />
                </div>}
            <div className="text-sm space-y-1">
              <div className="font-medium">Limitler</div>
              <div className="flex items-center gap-2">Toplam kullanım <input type="number" value={kf.toplamLimit} onChange={e => setKf(o => ({ ...o, toplamLimit: e.target.value }))} placeholder="sınırsız" className="w-24 border rounded-lg px-2 py-1" /></div>
              <div className="flex items-center gap-2">Müşteri başına <input type="number" value={kf.musteriLimit} onChange={e => setKf(o => ({ ...o, musteriLimit: e.target.value }))} placeholder="sınırsız" className="w-24 border rounded-lg px-2 py-1" /></div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={kf.birlesir} onChange={e => setKf(o => ({ ...o, birlesir: e.target.checked }))} /> Diğer kampanyalarla birleşsin</label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAcik(false)} className="px-4 py-2 text-sm text-gray-600">İptal</button>
              <button onClick={ekle} disabled={mesgul} className="bg-marka-900 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-40">Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 4: `Kampanyalar.jsx`**

Dağıtım kayıtları için IPC: `kampanya:dagitimlar(kampanyaId)` gerekiyor. `electron/ikas/kampanya.js` exports'una ekle (ve `kanal-yetki.js` + testine `'kampanya:dagitimlar': 'kampanya_yonet'`):

```js
  'kampanya:dagitimlar': (kampanyaId) => { yetkiKontrol('kampanya_yonet'); return require('../db/kupon-havuz').dagitimlar(require('../db/database').getDb(), kampanyaId) },
```
`src/api/ipc.js` `kampanyaApi`: `dagitimlar: (id) => invoke('kampanya:dagitimlar', id),`

```jsx
// Kampanya sekmesi (v1.2.204): ikas kampanyaları + kuponları. Yerel tablo yok, her açılışta ikas'tan.
// Sol: liste. Sağ: form (ikas panel bölüm sırası) + kupon paneli (yalnız kaydedilmiş kuponlu kampanyada).
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { kampanyaApi } from '../api/ipc'
import KampanyaFormu, { BOS_FORM } from '../components/kampanya/KampanyaFormu'
import KuponPaneli from '../components/kampanya/KuponPaneli'

const TUR_SIMGE = { RATIO: '％', FIXED_AMOUNT: '₺', FREE_SHIPPING: '🚚', BUY_X_THEN_GET_Y: '🎁' }
const tarih = (ms) => ms ? new Date(ms).toLocaleDateString('tr-TR') : ''

export default function Kampanyalar() {
  const [liste, setListe] = useState([])
  const [ara, setAra] = useState('')
  const [sozlukler, setSozlukler] = useState(null)
  const [form, setForm] = useState(null)
  const [dagitimlar, setDagitimlar] = useState([])
  const [mesgul, setMesgul] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(true)

  const listeYukle = () => kampanyaApi.liste().then(setListe).catch(e => toast.error(e.message)).finally(() => setYukleniyor(false))
  useEffect(() => { listeYukle(); kampanyaApi.sozlukler().then(setSozlukler).catch(e => toast.error('Sözlükler alınamadı: ' + e.message)) }, [])

  async function ac(k) {
    try {
      const r = await kampanyaApi.getir(k.id)
      setForm(r.form)
      setDagitimlar(k.hasCoupon ? await kampanyaApi.dagitimlar(k.id) : [])
    } catch (e) { toast.error(e.message) }
  }
  async function kaydet() {
    setMesgul(true)
    try {
      const r = await kampanyaApi.kaydet(form)
      if (r.farklar.length) toast(`Kaydedildi ama ikas şu alanları farklı okudu: ${r.farklar.join(', ')}`, { icon: '⚠️', duration: 8000 })
      else toast.success('Kampanya kaydedildi ve doğrulandı')
      await listeYukle()
      const r2 = await kampanyaApi.getir(r.id); setForm(r2.form)
    } catch (e) { toast.error(e.message) } finally { setMesgul(false) }
  }
  async function sil() {
    if (!form?.id || !window.confirm(`"${form.baslik}" kampanyası ikas'tan silinsin mi? Kuponları da silinir.`)) return
    setMesgul(true)
    try { await kampanyaApi.sil(form.id); toast.success('Silindi'); setForm(null); listeYukle() }
    catch (e) { toast.error(e.message) } finally { setMesgul(false) }
  }

  const suz = liste.filter(k => !ara.trim() || k.title.toLocaleLowerCase('tr').includes(ara.trim().toLocaleLowerCase('tr')))

  return (
    <div className="flex h-full">
      <aside className="w-80 border-r bg-white flex flex-col">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-marka-900 flex-1">🎯 Kampanyalar</h2>
            <button onClick={() => { setForm(BOS_FORM()); setDagitimlar([]) }} className="bg-marka-900 text-white px-3 py-1.5 rounded-lg text-sm">+ Ekle</button>
          </div>
          <input value={ara} onChange={e => setAra(e.target.value)} placeholder="🔍 Kampanya ara…" className="w-full border rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <div className="flex-1 overflow-auto">
          {yukleniyor && <p className="text-sm text-gray-400 p-4">ikas'tan okunuyor…</p>}
          {!yukleniyor && !suz.length && <p className="text-sm text-gray-400 p-4">Kampanya yok.</p>}
          {suz.map(k => (
            <button key={k.id} onClick={() => ac(k)}
              className={`w-full text-left px-3 py-2.5 border-b hover:bg-krem-100 ${form?.id === k.id ? 'bg-krem-200' : ''}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg w-6 text-center">{TUR_SIMGE[k.type] || '•'}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{k.title.trim()}</div>
                  <div className="text-xs text-gray-500">{k.hasCoupon ? '🎟 kuponlu' : 'otomatik'} · kullanılan {k.usageCount}{k.dateRange?.end ? ` · bitiş ${tarih(k.dateRange.end)}` : ''}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-gray-50 p-4">
        {!form ? (
          <div className="text-gray-400 text-sm p-8 text-center">Soldan bir kampanya seçin ya da "+ Ekle" ile yeni oluşturun.</div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center gap-2 sticky top-0 bg-gray-50 py-2 z-10">
              <h2 className="font-bold text-lg text-marka-900 flex-1">{form.id ? 'Kampanyayı Düzenle' : 'Yeni Kampanya'}</h2>
              {form.id && <button onClick={sil} disabled={mesgul} className="text-sm text-red-600 px-3 py-2">Sil</button>}
              <button onClick={() => setForm(null)} className="text-sm text-gray-600 px-3 py-2">Kapat</button>
              <button onClick={kaydet} disabled={mesgul} className="bg-marka-900 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-40">{mesgul ? 'Kaydediliyor…' : 'Kaydet'}</button>
            </div>
            <KampanyaFormu form={form} setForm={setForm} sozlukler={sozlukler} />
            {form.id && form.kuponlu && <KuponPaneli kampanyaId={form.id} dagitimlar={dagitimlar} />}
            {!form.id && form.kuponlu && <p className="text-xs text-gray-500">Kuponlar kampanya kaydedildikten sonra eklenir.</p>}
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 5: `App.jsx` sekme**

Tembel sayfa tanımlarına: `const Kampanyalar = lazy(() => import('./pages/Kampanyalar.jsx'))   // ikas kampanya/kupon; yalnız yönetici`
`navItems`'a Sosyal Medya satırından sonra:
```js
  { to: '/kampanyalar', label: '🎯 Kampanyalar', yetki: 'kampanya_yonet', el: <Kampanyalar /> },
```

- [ ] **Step 6: Derleme + testler**

Run: `npx vite build && npm test`
Expected: build hatasız, testler PASS (kanal-yetki testi `kampanya:dagitimlar` için güncellendiğinden emin ol).

- [ ] **Step 7: Seyirci kipinde gözle doğrula** (bkz. hafıza `seyirci-kipi-arayuz-dogrulama`: `TNC_SEYIRCI=1` + CDP 9333). Kampanyalar sekmesini aç, mevcut 3 kampanya listelenmeli, "Maxx Doria İndirim Kuponu" açılınca form dolu ve Kuponlar panelinde 5 kupon görünmeli. Ekran görüntüsünü kullanıcıya ilet.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Kampanyalar.jsx src/components/kampanya src/App.jsx src/api/ipc.js electron/ikas/kampanya.js electron/kanal-yetki.js electron/kanal-yetki.test.js
git commit -m "feat(ui): Kampanyalar sekmesi — ikas kampanya formu (4 tür) + kupon paneli"
```

---

### Task 8: Sosyal Medya "Hediye kuponu gönder" düğmesi

**Files:**
- Create: `src/components/KuponGonder.jsx`
- Modify: `src/components/HizliUrunler.jsx`

**Interfaces:**
- Consumes: `sosyalApi.kuponHavuz()`, `sosyalApi.kuponSablonlari()`, `metaApi.kuponGonder({hedef, kampanyaId, sablonId, kullanici})`, `hedef` sözleşmesi (`{tur, id}` ya da null).

- [ ] **Step 1: `KuponGonder.jsx`**

```jsx
// Hızlı Ürünler panelinin altı: temsilci havuzdan hediye kuponu gönderir (09.09.2026).
// Tık → kuponlu kampanyalar (boşta kaç kod) → seçim → tek mesaj (kupon + nasıl kullanılır şablonu).
// Gönderim geri alınamaz; kod dağıtım kaydına yazılır. Son seçilen kampanya localStorage'da.
import { useEffect, useState } from 'react'
import { sosyalApi, metaApi } from '../api/ipc'
import toast from 'react-hot-toast'

const SON_KAMPANYA_KEY = 'kupon_son_kampanya'
const GERI_BILDIRIM_MS = 1500

export default function KuponGonder({ hedef, kullanici, onGonderildi }) {
  const [acik, setAcik] = useState(false)
  const [havuz, setHavuz] = useState(null)
  const [sablonlar, setSablonlar] = useState([])
  const [sablonId, setSablonId] = useState(null)
  const [mesgul, setMesgul] = useState(false)
  const [gitti, setGitti] = useState(null)

  useEffect(() => {
    if (!acik) return
    setHavuz(null)
    sosyalApi.kuponHavuz().then(setHavuz).catch(e => { toast.error(e.message); setHavuz([]) })
    sosyalApi.kuponSablonlari().then(s => { setSablonlar(s); if (s.length && !sablonId) setSablonId(s[0].id) }).catch(() => {})
  }, [acik])

  async function gonder(k) {
    if (!hedef?.id || mesgul) return
    setMesgul(true)
    try {
      const r = await metaApi.kuponGonder({ hedef, kampanyaId: k.id, sablonId, kullanici })
      try { localStorage.setItem(SON_KAMPANYA_KEY, k.id) } catch {}
      setGitti(r.kod); setTimeout(() => { setGitti(null); setAcik(false) }, GERI_BILDIRIM_MS)
      onGonderildi?.()
    } catch (e) { toast.error(e.message) } finally { setMesgul(false) }
  }

  let son = null; try { son = localStorage.getItem(SON_KAMPANYA_KEY) } catch {}
  const sirali = havuz ? [...havuz].sort((a, b) => (a.id === son ? -1 : b.id === son ? 1 : 0)) : []

  return (
    <div className="mt-auto pt-2 border-t border-marka-100">
      <button type="button" onClick={() => setAcik(a => !a)} disabled={!hedef?.id}
        title={hedef?.id ? 'Havuzdan hediye kuponu gönder' : 'Önce bir konuşma ya da yorum seçin'}
        className={`w-full rounded-lg px-2 py-1.5 text-[12px] font-semibold border ${acik ? 'bg-marka-900 text-white border-marka-900' : 'bg-krem-200 text-marka-900 border-krem-400 hover:bg-krem-100'} disabled:opacity-50`}>
        🎁 Hediye kuponu gönder
      </button>
      {acik && (
        <div className="mt-2 space-y-1.5">
          {havuz === null && <div className="text-[11px] text-gray-400">ikas'tan okunuyor…</div>}
          {havuz && !havuz.length && <div className="text-[11px] text-gray-400">Kuponlu kampanya yok. Kampanyalar sekmesinden oluşturun.</div>}
          {sablonlar.length > 1 && (
            <select value={sablonId || ''} onChange={e => setSablonId(Number(e.target.value))} className="w-full border rounded-md px-1.5 py-1 text-[11px]">
              {sablonlar.map(s => <option key={s.id} value={s.id}>{s.ad}</option>)}
            </select>
          )}
          {sirali.map(k => (
            <button key={k.id} type="button" onClick={() => gonder(k)} disabled={mesgul || !k.havuz.bos}
              title={k.havuz.bos ? 'Tıklayınca kupon hemen gider' : 'Havuz boş — Kampanya sekmesinden kupon üretin'}
              className="w-full text-left rounded-lg border border-marka-100 p-1.5 hover:bg-marka-50 disabled:opacity-50">
              <div className="text-[12px] font-bold text-marka-900 truncate">{k.title}</div>
              <div className="text-[11px] text-marka-400">{k.indirim} · boşta {k.havuz.bos}{k.bitis ? ` · ${new Date(k.bitis).toLocaleDateString('tr-TR')}` : ''}</div>
              {gitti && <div className="text-[11px] text-emerald-600 font-semibold">Gönderildi ✓ {gitti}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: HizliUrunler'e ekle**

`src/components/HizliUrunler.jsx`: `import KuponGonder from './KuponGonder'`; dönen `<div className="w-[200px] …">` içinde en sona (son gönderilenler bloğundan sonra):

```jsx
      <KuponGonder hedef={hedef} kullanici={kullanici} onGonderildi={onGonderildi} />
```

- [ ] **Step 3: Derleme + seyirci kipi doğrulama**

Run: `npx vite build`
Seyirci kipinde Sosyal Medya'da bir DM aç, düğme görünür ve tıklayınca "Maxx Doria İndirim Kuponu · %20 · boşta 5" listelenmeli. **GÖNDERME**; ekran görüntüsünü ilet.

- [ ] **Step 4: Commit**

```bash
git add src/components/KuponGonder.jsx src/components/HizliUrunler.jsx
git commit -m "feat(sosyal): Hızlı ürünler altına 'Hediye kuponu gönder' düğmesi (havuz + şablon seçimi)"
```

---

### Task 9: Belge düzeltmeleri + canlı doğrulama

**Files:**
- Modify: `docs/ikas-api-reference.md` (§9)
- Modify: `docs/ikas/01-OPERASYON-KATALOGU.md` (sapmalar bölümü, dosya sonu)
- Modify: `YAPILANLAR.md`? HAYIR — arşivdir (CLAUDE.md). Dokunma.

- [ ] **Step 1: `docs/ikas-api-reference.md` §9** — "Discounts / Campaigns / Gift Cards: **not exposed**…" maddesini şununla değiştir:

```markdown
- **Discounts / Campaigns / Coupons:** Admin API'de VAR — `listCampaign`, `saveCampaign`,
  `deleteCampaignList`, `listCoupon`, `campaignAddCoupons`, `deleteCouponList`. Eski not
  ("not exposed") YANLIŞTI. Kullanım ve canlı sapmalar: `docs/ikas/01-OPERASYON-KATALOGU.md`
  (Kampanya bölümü + sapmalar) ve `electron/ikas/kampanya.js`. Gift card hâlâ yok.
```

- [ ] **Step 2: Katalog sapmalar bölümüne ekle** (dosya sonundaki bilinen sapmalar listesine)

```markdown
- **Kampanya süzgeci (09.09.2026 ölçüldü):** `fixedDiscount.filters[].type` canlıda
  `PRODUCT_AND_VARIANT` döner ve `idList` öğeleri `p:<productId>` biçimindedir. Belgeli
  `CampaignFilterTypeEnum` (CATEGORY, PRODUCT, PRODUCT_BRAND, PRODUCT_TAG, VARIANT) bunu
  içermez. Yazarken de aynı biçim kullanılır (`electron/ikas/kampanya-donustur.js`).
- **Yüzde indirim:** `type: RATIO` + `fixedDiscount.amount = 15` (%15). Ayrı oran alanı yok.
- **Tarihler:** `dateRange.start/end` milisaniye epoch; `start` null olabilir.
- **Panelde var, API'de yok:** Katlı indirim, dönem bazlı kullanım limiti (müşteri başına/dönem),
  müşteri grubu listesi (grup id'si yalnız panelden alınır).
```

- [ ] **Step 3: Canlı yazma doğrulaması (kullanıcı gözünün önünde)**

Uygulamada Kampanyalar sekmesinden: Başlık "DENEME-KUPON-SIL", Yüzdelik %5, İndirim kodu, Bitiş yarın, Kullanıcı başına 1 → Kaydet. Beklenen: "Kaydedildi ve doğrulandı" (fark yoksa). Ardından Kupon Ekle → Otomatik, ön ek `deneme`, adet 1 → 1 kupon listelenir. Sonra kampanyayı Sil → ikas panelinde kalmadığını kullanıcı doğrular.
Yazma yetkisi hatası gelirse: mesajı olduğu gibi kullanıcıya ilet, ikas panel > Ayarlar > Uygulamalar > private app kapsamına campaign yazma eklenmesini iste; **bu plan burada durur**, kapsam eklenince Step 3 tekrarlanır.

- [ ] **Step 4: Regresyon + commit**

```bash
npm test
git add docs/ikas-api-reference.md docs/ikas/01-OPERASYON-KATALOGU.md
git commit -m "docs(ikas): kampanya API'si var — eski 'not exposed' notu düzeltildi; canlı sapmalar kataloga"
```

- [ ] **Step 5: Hafıza güncelle** — `kampanya-kupon-projesi.md` description + ilk paragraf: "✅ KODA GİRDİ (yayınlanmadı), canlı yazma doğrulandı/doğrulanmadı" + MEMORY.md satırı.

---

## Self-review notları

- **Spec kapsamı:** Mimari 1 → Task 3; 2 → Task 1; 3 → Task 7; 4 → Task 4; 5 → Task 6+8; 6 → Task 5; hata yönetimi → Task 3 (farklar), 6 (iade), 8 (havuz boş); testler → Task 2/4/5 + kanal-yetki/senk-sema/parite; belge düzeltmeleri → Task 9; canlı deneme → Task 9.
- **Spec'ten sapma (bilinçli):** `applicableCustomerGroupIds` / `applicableCustomerIds` arayüzde YOK — ikas Admin API'de müşteri grubu listeleme sorgusu bulunmadı (`docs/ikas/sema/queries` tarandı). Form bu alanları göndermez; panelden yapılmış grup kısıtı `inputtanForm` ile forma taşınmadığı için **düzenlemede sessizce silinebilir**. Task 3'te `kampanyaKaydet` kaydetmeden önce `kampanyaGetir` ile mevcut `applicableCustomerGroupIds`/`applicableCustomerIds`'i okuyup input'a AYNEN kopyalamalı (id varsa). Task 3 Step 1 kodunda `kampanyaKaydet` başına ekle:
  ```js
  if (input.id) {
    const mevcut = await kampanyaGetir(input.id)
    if (mevcut.applicableCustomerGroupIds && mevcut.applicableCustomerGroupIds.length) input.applicableCustomerGroupIds = mevcut.applicableCustomerGroupIds
    if (mevcut.applicableCustomerIds && mevcut.applicableCustomerIds.length) input.applicableCustomerIds = mevcut.applicableCustomerIds
    if (mevcut.currencyCodes && mevcut.currencyCodes.length) input.currencyCodes = mevcut.currencyCodes
  }
  ```
  ve `KAMPANYA_ALANLARI`'na `applicableCustomerGroupIds applicableCustomerIds currencyCodes` ekle.
- **Ad tutarlılığı:** `_kampanyalariListele`, `_kuponlariListele` (Task 3 → 6); `havuzdanSec/havuzDurumu/verilmisKodlar/dagitimYaz/dagitimSil/dagitimlar` (Task 4 → 6, 7); `kuponMesaji/indirimMetni/VARSAYILAN_SABLON` (Task 5 → 6); `kampanya:dagitimlar` kanalı Task 7'de eklenir ve kanal-yetki testine girer.
