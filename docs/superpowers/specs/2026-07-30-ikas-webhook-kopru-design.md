# ikas Webhook Köprüsü — Tasarım

Tarih: 2026-07-30
Durum: onaylandı, uygulama planı bekliyor
İlgili: `docs/cloudflare-plani.md` §2.A, `docs/ikas-api-reference.md` §4

## Amaç

Online siparişlerin uygulamaya yansıma süresini **90 saniyeden ~5 saniyeye** indirmek ve
ikas Admin API'sine giden yükü ~%94 azaltmak.

Bugün `main.js:144` her 90 saniyede bir `listOrder` sorgusu çalıştırıyor. Bu, PC başına
günde ~1.900 istek demek ve iki mağaza PC'si açıkken iki katına çıkıyor. Gecikme müşteri
telefonla aradığında siparişin henüz ekranda olmamasına yol açıyor.

## Kapsam

Hızlı yola girecek olaylar — dördü de kullanıcı tarafından seçildi:

- Yeni sipariş
- Ödeme durumu değişimi
- İptal / iade talebi
- Sipariş/kargo durum değişimi (ikas tarafındaki fulfillment damgası)

Bu dördü ikas'ta **aynı şeye** indirgenir: siparişin `updatedAt` damgası değişir. Mevcut
`_pullSiparisler()` (`electron/ikas/index.js:130`) zaten `updatedAt gt` imleciyle artımlı
çalıştığı için konu başına ayrı mantık gerekmez.

Kapsam **dışı**: ürün/stok webhook'ları, Meta webhook'u (plandaki 5. adım), gövdedeki
sipariş verisini doğrudan yazma.

## Mimari

Bugün canlıya alınan UPS kargo köprüsüyle (`cloudflare/kargo-worker`) birebir aynı desen.
Aynı Worker'a eklenir; yeni Worker açılmaz.

```
ikas ──webhook──> Worker ──D1 kuyruk──> uygulama (5 sn yoklar) ──> mevcut _pullSiparisler()
```

### Parça 1 — ikas → Worker

`POST /ikas/webhook/<gizli-yol>`

- Gövdeden **yalnız sipariş id'si** ve konu alınır; biçim doğrulanır, gerisi atılır.
- D1'e yazılır, hemen `200` döner. ikas hızlı 200 bekler ve aksi halde 3 denemeden sonra
  o teslimattan vazgeçer (`ikas-api-reference.md:150`).

### Parça 2 — Worker → uygulama

`GET /ikas/olaylar?since=<imleç>` — bearer korumalı, mevcut `/kargo/durumlar` ile aynı
imleç deseni (`>=` karşılaştırması; aynı milisaniyedeki satırlar atlanmasın diye).

### Parça 3 — Uygulama

- 5 saniyede bir Worker'ı yoklar. Olay yoksa cevap birkaç bayt.
- Olay varsa mevcut `_pullSiparisler()` **anında** tetiklenir — o kod değişmez.
- Mevcut 90 sn'lik tur **5 dakikaya** seyreltilir (kaldırılmaz — güvenlik ağı).

## Veri modeli

D1'de yeni tablo:

```sql
CREATE TABLE ikas_olaylar (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  siparis_id   TEXT NOT NULL,
  konu         TEXT NOT NULL,
  alinma_zaman TEXT NOT NULL
);
CREATE INDEX ix_ikas_olaylar_zaman ON ikas_olaylar (alinma_zaman);
```

Uygulama imleci: `yerel_ayarlar.ikas_bulut_imlec` — **PC'ye özel**, senkronlanmaz.

Gerekçe (UPS köprüsünde alınan ders): imleç `ups_ayarlar` gibi senkronlanan bir tabloya
konsaydı, hızlı PC imleci ilerletir ve diğer PC aradaki tüm olayları hiç görmezdi —
sessiz veri kaybı.

## Güvenlik

Webhook ucu **kimlik doğrulayamaz**: ikas bizim bearer'ımızı göndermez ve imza başlığı
belgelenmemiştir (`ikas-api-reference.md:154`). Uç zorunlu olarak açıktır. Üç katman:

1. **Tahmin edilemez yol segmenti** — `PAYLASILAN_ANAHTAR`'dan *farklı* ayrı bir sır
   (`IKAS_WEBHOOK_YOLU`), Cloudflare Secret olarak. Biri sızarsa diğeri sağlam kalır.
2. **Gövde güvenilmez** — yalnız id alınır ve biçimi doğrulanır; yetkili kayıt ikas'tan
   uygulama tarafından çekilir.
3. **Hız sınırı** — dakikada **60 olay** tavanı. Gerçek trafiğin çok üstünde (yoğun günde
   bile saatte birkaç sipariş), yani meşru olay asla sınıra takılmaz. Aşan istekler `200`
   alır ama kuyruğa yazılmaz — ikas'ın yeniden deneme döngüsüne girmemesi için hata
   dönülmez. Düşen olay olursa 5 dk'lık mutabakat turu yakalar.

Yolu ele geçiren biri veri okuyamaz ve yazamaz; yapabileceği en fazla şey gereksiz ikas
çekimi tetiklemektir ve hız sınırı bunu sınırlar.

## Hata durumları

| Senaryo | Davranış |
|---|---|
| Worker erişilemez | Yoklama sessizce başarısız; 5 dk'lık mutabakat turu yakalar |
| ikas 3 denemede vazgeçti | Mutabakat turu yakalar — veri kaybı yok |
| Aynı olay iki kez geldi | Zararsız; `_pullSiparisler()` idempotent |
| İki PC aynı olayı gördü | Bugünkü davranışla aynı (ikisi de zaten çekiyor) |
| Tur ortasında hata | İmleç **en sonda** ilerler; kayıtlar tekrar okunur (kaçırmak telafi edilemez, tekrarlamak zararsız) |

## Geri dönüş

Bulut köprüsü ayarı boşaltılınca hızlı yol devre dışı kalır ve uygulama bugünkü davranışa
döner. Mutabakat aralığı tek satırlık bir sabit (`IKAS_SENK_ARALIGI_MS`), 90 sn'ye geri
alınabilir.

## Doğrulama

- Uygulama tarafındaki dikiş için vitest birim testleri (mevcut 222 testin yanına).
- Canlı: ikas panelinden test siparişi → 5 sn içinde uygulamada görünmeli.
- `listWebhook` ile aboneliğin kayıtlı olduğu doğrulanır (bugün boş olduğu teyit edildi).

## Açık nokta

`saveWebhook` konu adlarının **kesin** dizgeleri belgede yalnız `customer` örnekleriyle
verilmiş; `store/order/created` ve `store/order/updated` desenden çıkarılıyor ve belge
"canlıda doğrula" diye uyarıyor. Uygulama sırasında `saveWebhook` ile denenip `listWebhook`
ile teyit edilecek; tutmazsa `deleteWebhook` ile geri alınacak.
