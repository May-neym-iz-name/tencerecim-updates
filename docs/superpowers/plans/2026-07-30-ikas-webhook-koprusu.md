# ikas Webhook Köprüsü — Uygulama Planı

> **Ajan çalışanlar için:** GEREKLİ ALT-BECERİ: Bu planı görev görev uygulamak için
> `superpowers:subagent-driven-development` (önerilen) ya da `superpowers:executing-plans`
> kullan. Adımlar takip için checkbox (`- [ ]`) biçiminde.

**Hedef:** Online sipariş yansıma süresini 90 saniyeden ~5 saniyeye indirmek; ikas Admin
API'sine giden yükü ~%94 azaltmak.

**Mimari:** ikas webhook'u mevcut Cloudflare Worker'a (`cloudflare/kargo-worker`) düşer.
Worker gövdeye güvenmez — yalnız sipariş id'sini D1 kuyruğuna yazar. Uygulama 5 saniyede
bir kuyruğu yoklar ve olay varsa mevcut `_pullSiparisler()`'i tetikler. Bugünkü 90 sn'lik
tur 5 dakikaya seyreltilir ama kaldırılmaz (güvenlik ağı).

**Teknoloji:** Cloudflare Workers + D1, Electron 22 (Node 16), vitest.

Tasarım belgesi: `docs/superpowers/specs/2026-07-30-ikas-webhook-kopru-design.md`

## Global Kısıtlar

- **Worker'da `node:https` YOK** — `fetch` kullanılır. **Electron 22/Node 16'da global
  `fetch` YOK** — `require('https')` kullanılır. İki taraf aynı işi iki farklı API ile
  yapmak zorunda; kod kopyalanmaz.
- Worker ücretsiz planda: çağrı başına **50 dış alt-istek**, **10 ms CPU**. D1 çağrıları
  bu 50'ye saymaz (ayrı 1000 bütçesi var).
- ikas endpoint'i **hızlı 200** bekler; 200 dışında bir şey dönerse 3 denemeden sonra o
  teslimattan tamamen vazgeçer.
- İmleç değerleri **`yerel_ayarlar`** tablosuna yazılır (PC'ye özel, senkronlanmaz).
  `ups_ayarlar`/`ikas_ayarlar`/`uygulama_ayarlar` PC'ler arası senkronlanır — imleç oraya
  konursa sessiz veri kaybı olur.
- Türkçe adlandırma ve yorum dili korunur (mevcut kod tabanının tamamı böyle).
- Yeni ayar alanı **eklenmez**: ikas olayları aynı Worker'da olduğu için mevcut
  `ups_ayarlar.bulut_url` + `bulut_anahtar` yeniden kullanılır.

---

### Görev 1: Worker — olay kuyruğu şeması ve uçları

**Dosyalar:**
- Değiştir: `cloudflare/kargo-worker/schema.sql`
- Değiştir: `cloudflare/kargo-worker/src/index.js` (yönlendirme bloğu, satır ~154-207)
- Değiştir: `cloudflare/kargo-worker/README.md` (kurulum adımlarına yeni secret)

**Arayüzler:**
- Üretir: `POST /ikas/webhook/<gizli-yol>` (kimliksiz, gizli yol ile korunur),
  `GET /ikas/olaylar?since=<ISO>&limit=<n>` (bearer korumalı) →
  `{ kayitlar: [{ id, siparis_id, konu, alinma_zaman }], imlec: string }`
- Tüketir: mevcut `tokenGecerli()`, `json()`, `simdi()` yardımcıları (aynı dosyada).

- [ ] **Adım 1: Şemaya olay tablosunu ekle**

`cloudflare/kargo-worker/schema.sql` sonuna:

```sql
-- ikas webhook olay kuyruğu.
--
-- Bu tablo OTORİTE DEĞİLDİR: yalnız "şu sipariş değişti" tetikleyicisi tutar.
-- Siparişin kendisi ikas'tan uygulama tarafından çekilir (webhook imzası
-- belgelenmemiş — docs/ikas-api-reference.md:154). Kaybolursa 5 dk'lık
-- mutabakat turu aynı işi yapar.
CREATE TABLE IF NOT EXISTS ikas_olaylar (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  siparis_id   TEXT NOT NULL,
  konu         TEXT NOT NULL,
  alinma_zaman TEXT NOT NULL
);

-- Uygulama imleci bu sütun üzerinden okur.
CREATE INDEX IF NOT EXISTS ikas_olaylar_zaman ON ikas_olaylar (alinma_zaman);
```

- [ ] **Adım 2: Şemayı uzak D1'e uygula**

```bash
cd cloudflare/kargo-worker
npx wrangler d1 execute tencerecim-kargo --remote --file=schema.sql
```

Beklenen: hata yok (mevcut tablolar `IF NOT EXISTS` sayesinde dokunulmaz).

- [ ] **Adım 3: Hız sınırı ve id doğrulama yardımcılarını yaz**

`src/index.js` içinde, `json()` yardımcısının hemen altına:

```js
// ikas sipariş id'si UUID benzeri bir dizgedir. Açık uçtan gelen gövdeye
// güvenmiyoruz; yalnız biçimi tutan bir id kabul edilir ve o bile yetkili
// veri sayılmaz — kaydı uygulama ikas'tan kendi çeker.
const ID_DESENI = /^[A-Za-z0-9-]{8,64}$/

// Dakikada en fazla bu kadar olay kuyruğa girer. Gerçek trafiğin çok üstünde
// (yoğun günde bile saatte birkaç sipariş), yani meşru olay sınıra takılmaz.
// Amaç: gizli yolu ele geçiren birinin uygulamayı sonsuz ikas çekimine
// zorlamasını engellemek.
const OLAY_DAKIKA_TAVANI = 60

// Son dakikada kaç olay yazıldı? D1'den sayarız — Worker örnekleri arasında
// paylaşılan tek durum orası (bellekteki sayaç her izolatta ayrı olurdu).
async function olayTavaniAsildiMi(env) {
  const sinir = new Date(Date.now() - 60 * 1000).toISOString()
  const r = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM ikas_olaylar WHERE alinma_zaman > ?1'
  ).bind(sinir).first()
  return (r?.n || 0) >= OLAY_DAKIKA_TAVANI
}
```

- [ ] **Adım 4: Webhook alıcı ucunu ekle**

`src/index.js` içinde, `/saglik` bloğunun **hemen üstüne** (yani `if (!yetkili) return`
satırından önce — bu uç bilerek kimliksizdir):

```js
    // ikas → Worker. KİMLİKSİZ olmak ZORUNDA: ikas bizim bearer'ımızı göndermez ve
    // imza başlığı belgelemez (docs/ikas-api-reference.md:154). Koruma üç katman:
    //   1) tahmin edilemez gizli yol (IKAS_WEBHOOK_YOLU secret'ı)
    //   2) gövdeye güvenilmez — yalnız id alınır, kayıt ikas'tan uygulama çeker
    //   3) dakika tavanı
    // HER DURUMDA 200 DÖNER: ikas 200 dışında bir cevapta 3 denemeden sonra o
    // teslimattan tamamen vazgeçer. Düşen olayı 5 dk'lık mutabakat turu yakalar.
    if (istek.method === 'POST' && url.pathname === `/ikas/webhook/${env.IKAS_WEBHOOK_YOLU}`) {
      let govde = null
      try { govde = await istek.json() } catch {}
      const siparisId = String(govde?.data?.id || govde?.id || '').trim()
      const konu = String(govde?.scope || govde?.topic || 'bilinmeyen').slice(0, 64)
      if (!ID_DESENI.test(siparisId)) return json({ ok: true, atlandi: 'gecersiz-id' })
      if (await olayTavaniAsildiMi(env)) return json({ ok: true, atlandi: 'tavan' })
      await env.DB.prepare(
        'INSERT INTO ikas_olaylar (siparis_id, konu, alinma_zaman) VALUES (?1, ?2, ?3)'
      ).bind(siparisId, konu, simdi()).run()
      return json({ ok: true })
    }
```

- [ ] **Adım 5: Okuma ucunu ekle**

`src/index.js` içinde `/kargo/durumlar` bloğunun hemen altına:

```js
    // Worker → uygulama. '>=' değil '>' kullanılır: imleç son okunan satırın
    // alinma_zaman'ı, aynı satırı tekrar vermek gereksiz. Aynı milisaniyede iki
    // olay yazılırsa id sırası ayırır (kargo/durumlar'dan farklı: orada satır
    // başına tek kayıt var, burada aynı siparişin birden çok olayı olabilir).
    if (url.pathname === '/ikas/olaylar' && istek.method === 'GET') {
      const since = url.searchParams.get('since') || '1970-01-01T00:00:00.000Z'
      const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit')) || 200))
      const { results } = await env.DB.prepare(`
        SELECT id, siparis_id, konu, alinma_zaman FROM ikas_olaylar
        WHERE alinma_zaman > ?1 ORDER BY alinma_zaman ASC, id ASC LIMIT ?2`)
        .bind(since, limit).all()
      return json({
        kayitlar: results,
        imlec: results.length ? results[results.length - 1].alinma_zaman : since,
      })
    }
```

- [ ] **Adım 6: Gece temizliğine olay budamayı ekle**

`src/index.js:138` `temizle()` fonksiyonunda, **`return` satırından ÖNCE** (sonuna
eklersen ölü kod olur — fonksiyon `return { silinenIzlenen... }` ile bitiyor):

```js
  // Olaylar tüketildikten sonra değersizdir; 7 gün fazlasıyla yeterli
  // (en uzun mutabakat penceresi 5 dk). Tablo sınırsız büyümesin.
  await env.DB.prepare(
    'DELETE FROM ikas_olaylar WHERE alinma_zaman < ?1'
  ).bind(new Date(Date.now() - 7 * 86400_000).toISOString()).run()
```

Yani sonuç şöyle olmalı:

```js
async function temizle(env) {
  const sinir = new Date(Date.now() - TTL_GUN * 86400_000).toISOString()
  const sonuc = await env.DB.batch([ /* mevcut iki DELETE */ ])
  await env.DB.prepare(
    'DELETE FROM ikas_olaylar WHERE alinma_zaman < ?1'
  ).bind(new Date(Date.now() - 7 * 86400_000).toISOString()).run()
  return { silinenIzlenen: sonuc[0].meta.changes, silinenDurum: sonuc[1].meta.changes }
}
```

- [ ] **Adım 7: Yerelde çalıştır ve uçları doğrula**

```bash
cd cloudflare/kargo-worker
npx wrangler dev --local
```

Ayrı bir kabukta (yerel D1'e şema uygulanmış olmalı:
`npx wrangler d1 execute tencerecim-kargo --local --file=schema.sql`):

```bash
# gizli yol yerelde .dev.vars'tan gelir; test için IKAS_WEBHOOK_YOLU=test kullan
curl -s -X POST http://localhost:8787/ikas/webhook/test \
  -H 'Content-Type: application/json' \
  -d '{"scope":"store/order/created","data":{"id":"abc12345-0000-1111-2222-333344445555"}}'
```

Beklenen: `{"ok":true}`

```bash
curl -s -X POST http://localhost:8787/ikas/webhook/test \
  -H 'Content-Type: application/json' -d '{"data":{"id":"kısa"}}'
```

Beklenen: `{"ok":true,"atlandi":"gecersiz-id"}` — **200 döndüğünü doğrula**, ikas'ın
vazgeçmemesi buna bağlı.

```bash
curl -s -X POST http://localhost:8787/ikas/webhook/yanlisyol -d '{}'
```

Beklenen: `{"hata":"bulunamadi"}` ve HTTP 404.

```bash
curl -s -H "Authorization: Bearer <yerel-anahtar>" \
  "http://localhost:8787/ikas/olaylar?since=1970-01-01T00:00:00.000Z"
```

Beklenen: bir kayıt ve `imlec` dolu.

- [ ] **Adım 8: Gizli yol secret'ını üret ve yükle**

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Çıkan değeri sakla, sonra:

```bash
cd cloudflare/kargo-worker
npx wrangler secret put IKAS_WEBHOOK_YOLU
```

**Not:** `PAYLASILAN_ANAHTAR`'dan farklı bir değer olmalı — biri sızarsa diğeri sağlam
kalsın.

- [ ] **Adım 9: Deploy et ve canlıda doğrula**

```bash
cd cloudflare/kargo-worker
npx wrangler deploy
curl -s -X POST "https://tencerecim-kargo.tencerecim.workers.dev/ikas/webhook/<gizli-yol>" \
  -H 'Content-Type: application/json' \
  -d '{"scope":"store/order/created","data":{"id":"test0001-0000-1111-2222-333344445555"}}'
```

Beklenen: `{"ok":true}`

- [ ] **Adım 10: README'yi güncelle ve commit et**

`README.md` kurulum bölümüne `IKAS_WEBHOOK_YOLU` secret'ını ve iki yeni ucu ekle.

```bash
git add cloudflare/kargo-worker
git commit -m "feat(ikas): Worker'a webhook olay kuyruğu (D1 + iki uç)"
```

---

### Görev 2: Uygulama — Worker olay istemcisi

**Dosyalar:**
- Oluştur: `electron/ikas/bulut.js`
- Oluştur: `electron/ikas/bulut.test.js`

**Arayüzler:**
- Tüketir: `electron/ups/bulut.js`'teki `_ayar()` (aynı `bulut_url`/`bulut_anahtar`
  ayarını okur — ikas için ayrı ayar YOK).
- Üretir: `_olaylariCek(since) → Promise<{kayitlar, imlec}>`,
  `_yeniImlec(kayitlar, mevcutImlec) → string` (saf fonksiyon, test edilebilir).

- [ ] **Adım 1: Başarısız testi yaz**

`electron/ikas/bulut.test.js`:

```js
// İmleç ilerletme KARARI. Ağdan ayrı tutuldu ki mock'suz test edilebilsin
// (emsal: ikas/kargo-durum.test.js).
import { describe, test, expect } from 'vitest'
import bulut from './bulut.js'

const { _yeniImlec: imlec } = bulut

describe('imleç ilerletme', () => {
  test('kayıt yoksa imleç OLDUĞU YERDE kalır', () => {
    // Boş turda imleci "şimdi"ye çekmek, tam o anda yazılmakta olan bir olayı
    // sonsuza dek atlamak demekti.
    expect(imlec([], '2026-07-30T10:00:00.000Z')).toBe('2026-07-30T10:00:00.000Z')
  })

  test('son kaydın damgasına ilerler', () => {
    const kayitlar = [
      { id: 1, alinma_zaman: '2026-07-30T10:00:01.000Z' },
      { id: 2, alinma_zaman: '2026-07-30T10:00:02.000Z' },
    ]
    expect(imlec(kayitlar, '2026-07-30T10:00:00.000Z')).toBe('2026-07-30T10:00:02.000Z')
  })

  test('geriye GİTMEZ', () => {
    // Worker sıralı döndürüyor ama bir gün bozulursa imleci geri almak
    // aynı olayları sonsuz döngüde yeniden işlemek olurdu.
    const kayitlar = [{ id: 1, alinma_zaman: '2026-07-30T09:00:00.000Z' }]
    expect(imlec(kayitlar, '2026-07-30T10:00:00.000Z')).toBe('2026-07-30T10:00:00.000Z')
  })
})
```

- [ ] **Adım 2: Testin başarısız olduğunu gör**

```bash
npx vitest run electron/ikas/bulut.test.js
```

Beklenen: FAIL — `Cannot find module './bulut.js'`

- [ ] **Adım 3: Modülü yaz**

`electron/ikas/bulut.js`:

```js
// ikas olay kuyruğu istemcisi — uygulama ↔ Cloudflare köprüsü.
//
// NE İŞE YARAR: ikas webhook'u Worker'a düşer, Worker "şu sipariş değişti" bilgisini
// D1'e yazar. Bu modül o kuyruğu okur. Siparişin KENDİSİ buradan gelmez — yetkili
// kaydı mevcut _pullSiparisler() ikas'tan çeker (webhook imzası belgelenmemiş).
//
// AYRI AYAR YOK: ikas olayları UPS kargo köprüsüyle aynı Worker'da, o yüzden aynı
// bulut_url/bulut_anahtar kullanılır.
//
// NOT: Electron 22 = Node 16 → global fetch YOK.
const https = require('https')
const upsBulut = require('../ups/bulut')

const ZAMAN_ASIMI_MS = 15000

/**
 * Yeni imleç. Saf fonksiyon — ağdan ayrı tutuldu ki test edilebilsin.
 * Boş turda ve geriye gidişte imleç KORUNUR (ikisi de veri kaybı/sonsuz döngü riski).
 */
function yeniImlec(kayitlar, mevcut) {
  if (!kayitlar || !kayitlar.length) return mevcut
  const son = kayitlar[kayitlar.length - 1].alinma_zaman
  return son > mevcut ? son : mevcut
}

function istek(url, anahtar) {
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: { Authorization: 'Bearer ' + anahtar },
      timeout: ZAMAN_ASIMI_MS,
    }, (res) => {
      let metin = ''
      res.setEncoding('utf8')
      res.on('data', (c) => { metin += c })
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(metin) } catch {}
        resolve({ status: res.statusCode, json })
      })
    })
    // timeout tek başına isteği KESMEZ — destroy şart (ups/bulut.js:45 ile aynı gerekçe).
    req.on('timeout', () => req.destroy(new Error(`zaman aşımı (${ZAMAN_ASIMI_MS / 1000}s)`)))
    req.on('error', reject)
    req.end()
  })
}

async function olaylariCek(since) {
  const { url, anahtar, acik } = upsBulut._ayar()
  if (!acik) throw new Error('Bulut köprüsü kurulu değil')
  const q = encodeURIComponent(since || '1970-01-01T00:00:00.000Z')
  const { status, json } = await istek(`${url}/ikas/olaylar?since=${q}&limit=200`, anahtar)
  if (status !== 200) throw new Error(`Worker ${status}`)
  return { kayitlar: json?.kayitlar || [], imlec: json?.imlec || since }
}

module.exports = { _olaylariCek: olaylariCek, _yeniImlec: yeniImlec }
```

- [ ] **Adım 4: Testin geçtiğini gör**

```bash
npx vitest run electron/ikas/bulut.test.js
```

Beklenen: PASS (3 test)

- [ ] **Adım 5: `_ayar()`'ın dışa açık olduğunu doğrula**

`electron/ups/bulut.js:118` satırında `_ayar: ayar,` zaten var (doğrulandı 2026-07-30).
Değişiklik gerekmiyor; sadece teyit et:

```bash
grep -n "_ayar: ayar" electron/ups/bulut.js
```

Beklenen: `118:  _ayar: ayar,`

- [ ] **Adım 6: Tüm testleri çalıştır ve commit et**

```bash
npx vitest run
```

Beklenen: 225 test geçer (mevcut 222 + 3).

```bash
git add electron/ikas/bulut.js electron/ikas/bulut.test.js
git commit -m "feat(ikas): Worker olay kuyruğu istemcisi"
```

---

### Görev 3: Uygulama — hızlı yoklayıcı ve mutabakat seyreltmesi

**Dosyalar:**
- Değiştir: `electron/main.js:139-166` (ikas senkron bloğu)

**Arayüzler:**
- Tüketir: `electron/ikas/bulut.js`'ten `_olaylariCek`, `_yeniImlec`;
  `electron/db/yerel-ayarlar.js`'ten `_getir`, `_yaz`; mevcut `_pullSiparisler`,
  `siparisDegisti`.
- Üretir: yok (main.js uçtur).

- [ ] **Adım 1: Mutabakat aralığını 5 dakikaya çek**

`electron/main.js:144` satırını değiştir:

```js
// 90 sn → 5 dk: artık sipariş webhook ile ~5 saniyede geliyor (ikas/bulut.js).
// Bu tur MUTABAKAT için kaldı — webhook sessizce bozulursa ya da ikas 3 denemede
// vazgeçtiyse (docs/ikas-api-reference.md:150) kaçan siparişi bu yakalar.
// Bulut köprüsü kapalıyken tek çalışan yol budur; o yüzden kaldırılmadı.
const IKAS_SENK_ARALIGI_MS = 5 * 60 * 1000
```

Ayrıca 139-143 satırlarındaki "Webhook yerine sık polling: masaüstü uygulama public
endpoint alamadığı için" yorumunu güncelle — bu kısıt artık geçerli değil.

- [ ] **Adım 2: Hızlı yoklayıcıyı ekle**

`ikasSiparisSenkBaslat()` fonksiyonunun **hemen altına**:

```js
// ikas olay yoklayıcısı: Worker'daki webhook kuyruğunu 5 saniyede bir kontrol eder.
// Olay yoksa cevap birkaç bayt — ikas'a değil KENDİ Worker'ımıza gidiyoruz, bu yüzden
// sık yoklamak ucuz (ikas'ı 5 sn'de bir yoklamak hız sınırına takılırdı).
//
// İMLEÇ EN SONDA İLERLER: tur ortasında hata olursa aynı olaylar tekrar okunur.
// _pullSiparisler idempotent olduğu için tekrar zararsız; kaçırmak telafi edilemez.
const IKAS_OLAY_ARALIGI_MS = 5 * 1000
const IKAS_OLAY_IMLECI = 'ikas_bulut_imlec'
function ikasOlayYoklayiciBaslat() {
  const { _pullSiparisler } = require('./ikas')
  const { _ayarlariGetir } = require('./db/ikas-ayarlar')
  const { _olaylariCek, _yeniImlec } = require('./ikas/bulut')
  const upsBulut = require('./ups/bulut')
  const yerelAyar = require('./db/yerel-ayarlar')
  let calisiyor = false
  const calistir = async () => {
    if (calisiyor) return
    try {
      if (!upsBulut._ayar().acik) return          // köprü kapalı → eski davranış
      if (!_ayarlariGetir().otomatik_senk) return
      calisiyor = true
      const imlec = yerelAyar._getir(IKAS_OLAY_IMLECI, '1970-01-01T00:00:00.000Z')
      const { kayitlar } = await _olaylariCek(imlec)
      if (!kayitlar.length) return
      const r = await _pullSiparisler()
      if (r?.kaydedilen || r?.guncellenen) siparisDegisti(r)
      yerelAyar._yaz(IKAS_OLAY_IMLECI, _yeniImlec(kayitlar, imlec))
    } catch (err) {
      // Sessiz: Worker erişilemezse 5 dk'lık mutabakat turu zaten yakalar.
      // Her 5 saniyede bir konsolu doldurmanın anlamı yok.
      if (!ikasOlayYoklayiciBaslat._sustur) {
        console.error('[ikas] olay yoklama hatası:', err.message)
        ikasOlayYoklayiciBaslat._sustur = true
        setTimeout(() => { ikasOlayYoklayiciBaslat._sustur = false }, 5 * 60 * 1000)
      }
    } finally {
      calisiyor = false
    }
  }
  setTimeout(calistir, 15 * 1000)
  setInterval(calistir, IKAS_OLAY_ARALIGI_MS)
}
```

- [ ] **Adım 3: Yoklayıcıyı başlat**

`ikasSiparisSenkBaslat()` çağrısının yapıldığı yeri bul (`grep -n
"ikasSiparisSenkBaslat()" electron/main.js`) ve hemen ardına
`ikasOlayYoklayiciBaslat()` ekle.

- [ ] **Adım 4: Testleri çalıştır**

```bash
npx vitest run
```

Beklenen: 225 test geçer (main.js test edilmiyor, kırılma olmamalı).

- [ ] **Adım 5: Derlemeyi doğrula**

```bash
npx vite build
```

Beklenen: hata yok.

- [ ] **Adım 6: Commit**

```bash
git add electron/main.js
git commit -m "feat(ikas): 5 sn olay yoklayıcısı, mutabakat turu 90 sn → 5 dk"
```

---

### Görev 4: ikas'ta webhook aboneliğini kaydet

**Dosyalar:**
- Oluştur: `scripts/ikas-webhook-kaydet.js`

**Arayüzler:**
- Tüketir: `ikas_ayarlar` tablosundaki `store_name`/`client_id`/`client_secret`.
- Üretir: ikas tarafında kayıtlı webhook aboneliği (kod arayüzü değil, yan etki).

**Neden ayrı script:** Bu tek seferlik bir kurulum işi. Uygulamaya buton koymak, yanlışlıkla
yeniden çalıştırıldığında aboneliği bozma riski getirirdi. Konu adları belgede kesin
verilmediği için (`ikas-api-reference.md` "canlıda doğrula" diyor) deneme-yanılma gerekir.

- [ ] **Adım 1: Kayıt scriptini yaz**

`scripts/ikas-webhook-kaydet.js`:

```js
// ikas webhook aboneliğini kaydeder ve doğrular. TEK SEFERLİK kurulum aracı.
//
// Kullanım:
//   node scripts/ikas-webhook-kaydet.js <worker-adresi> <gizli-yol>
//   node scripts/ikas-webhook-kaydet.js --listele
//   node scripts/ikas-webhook-kaydet.js --sil
//
// Node 18+ ile çalıştırılır (global fetch gerekir) — uygulamanın içinden DEĞİL.
const { DatabaseSync } = require('node:sqlite')

const KONULAR = ['store/order/created', 'store/order/updated']

function ayarlar() {
  const db = new DatabaseSync(process.env.APPDATA + '/tencerecim/tencerecim.db', { readOnly: true })
  const satirlar = db.prepare('SELECT anahtar, deger FROM ikas_ayarlar').all()
  return Object.fromEntries(satirlar.map(r => [r.anahtar, r.deger]))
}

async function token(a) {
  const r = await fetch(`https://${a.store_name}.myikas.com/api/admin/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials', client_id: a.client_id, client_secret: a.client_secret,
    }),
  })
  const j = await r.json()
  if (!j.access_token) throw new Error('token alınamadı: ' + JSON.stringify(j).slice(0, 200))
  return j.access_token
}

async function gql(t, query) {
  const r = await fetch('https://api.myikas.com/api/v1/admin/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
    body: JSON.stringify({ query }),
  })
  return r.json()
}

;(async () => {
  const a = ayarlar()
  const t = await token(a)
  const [arg1, arg2] = process.argv.slice(2)

  if (arg1 === '--listele') {
    console.log(JSON.stringify(await gql(t, '{ listWebhook { id scope endpoint } }'), null, 1))
    return
  }
  if (arg1 === '--sil') {
    const s = KONULAR.map(k => `"${k}"`).join(',')
    console.log(JSON.stringify(await gql(t, `mutation { deleteWebhook(scopes: [${s}]) }`), null, 1))
    return
  }
  if (!arg1 || !arg2) {
    console.error('Kullanım: node scripts/ikas-webhook-kaydet.js <worker-adresi> <gizli-yol>')
    process.exit(1)
  }

  const uc = `${arg1.replace(/\/+$/, '')}/ikas/webhook/${arg2}`
  const s = KONULAR.map(k => `"${k}"`).join(',')
  console.log('kaydediliyor:', uc)
  console.log(JSON.stringify(
    await gql(t, `mutation { saveWebhook(input: { scopes: [${s}], endpoint: "${uc}" }) { id endpoint scope } }`),
    null, 1))
  console.log('--- doğrulama ---')
  console.log(JSON.stringify(await gql(t, '{ listWebhook { id scope endpoint } }'), null, 1))
})().catch(e => { console.error(e.message); process.exit(1) })
```

- [ ] **Adım 2: Mevcut abonelikleri listele (temiz başlangıç doğrulaması)**

```bash
node scripts/ikas-webhook-kaydet.js --listele
```

Beklenen: `{"data":{"listWebhook":[]}}` (2026-07-30'da boş olduğu teyit edildi).

- [ ] **Adım 3: Aboneliği kaydet**

```bash
node scripts/ikas-webhook-kaydet.js https://tencerecim-kargo.tencerecim.workers.dev <gizli-yol>
```

Beklenen: `saveWebhook` hata döndürmez ve doğrulama listesinde iki konu görünür.

**Konu adı tutmazsa:** hata mesajı geçersiz scope diyecektir. O durumda ikas GraphQL
Playground'da geçerli scope listesini bul, `KONULAR` dizisini düzelt, `--sil` ile temizle
ve tekrar çalıştır.

- [ ] **Adım 4: Canlı uçtan uca doğrula**

ikas panelinden bir test siparişi oluştur (ya da mevcut bir siparişin bir alanını
değiştir). Sonra:

```bash
curl -s -H "Authorization: Bearer <paylasilan-anahtar>" \
  "https://tencerecim-kargo.tencerecim.workers.dev/ikas/olaylar?since=1970-01-01T00:00:00.000Z"
```

Beklenen: siparişin id'siyle bir kayıt görünür (webhook'un ikas'tan gerçekten geldiğinin
kanıtı — bu ana kadar her şey bizim ürettiğimiz sahte olaylardı).

- [ ] **Adım 5: Commit**

```bash
git add scripts/ikas-webhook-kaydet.js
git commit -m "chore(ikas): webhook abonelik kurulum scripti"
```

---

### Görev 5: Ayar etiketini güncelle ve yayınla

**Dosyalar:**
- Değiştir: `src/pages/Ayarlar.jsx:457` (bölüm başlığı ve açıklama)
- Değiştir: `package.json` (sürüm)

**Arayüzler:** yok (yalnız metin ve sürüm).

- [ ] **Adım 1: Başlığı kapsamı yansıtacak şekilde değiştir**

`src/pages/Ayarlar.jsx:457` satırındaki `☁️ Bulut Takip Köprüsü` metnini
`☁️ Bulut Köprüsü` yap ve altına açıklama ekle:

```jsx
          <p className="text-xs text-gray-500 mb-2">
            UPS kargo takibi ve ikas sipariş bildirimleri bu köprüden geçer.
            Boş bırakılırsa uygulama eski yönteme (doğrudan sorgulama) döner.
          </p>
```

- [ ] **Adım 2: Sürümü artır**

`package.json` içinde `"version": "1.2.145"` → `"version": "1.2.146"`.

- [ ] **Adım 3: Doğrula**

```bash
npx vitest run && npx vite build
```

Beklenen: 225 test geçer, derleme hatasız.

- [ ] **Adım 4: Commit ve yayınla**

```bash
git add src/pages/Ayarlar.jsx package.json
git commit -m "feat(ikas): webhook köprüsü (v1.2.146) — sipariş yansıması 90 sn → ~5 sn"
git push origin main
npx vite build
GH_TOKEN=$(gh auth token) npx electron-builder --win --publish always
```

Sonra release'i yayına al (**iki AYRI PATCH** — birleştirmek çalışmıyor):

```bash
ID=$(gh api repos/May-neym-iz-name/tencerecim-updates/releases --jq '.[0].id')
gh api -X PATCH repos/May-neym-iz-name/tencerecim-updates/releases/$ID -f draft=false
gh api -X PATCH repos/May-neym-iz-name/tencerecim-updates/releases/$ID -f make_latest='true'
gh api repos/May-neym-iz-name/tencerecim-updates/releases/latest --jq .tag_name
```

Beklenen: son komut `v1.2.146` yazar.

---

## Geri Dönüş

Sorun çıkarsa sırayla:

1. **Hızlı yolu kapat:** Ayarlar → Bulut Köprüsü alanlarını boşalt. Uygulama anında eski
   davranışa döner (UPS köprüsü de kapanır — ikisi aynı ayarı paylaşıyor).
2. **Yalnız ikas'ı kapat:** `IKAS_OLAY_ARALIGI_MS` yoklayıcısını başlatan satırı kaldır.
3. **Mutabakatı geri al:** `IKAS_SENK_ARALIGI_MS` değerini `90 * 1000` yap.
4. **Aboneliği kaldır:** `node scripts/ikas-webhook-kaydet.js --sil`
