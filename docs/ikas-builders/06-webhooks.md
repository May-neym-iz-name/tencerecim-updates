# 06 — Webhook'lar

> Kaynak: `/docs/app-development/ikas-sdk/webhooks`
> Kanıt seviyesi: **Belgeli**

Webhook, sürekli sorgulama (polling) yerine **gerçek zamanlı olay bildirimi** sağlar.
Backend'iniz bir aboneye dönüşür; değişiklik olduğunda anında tetiklenir.

---

## Desteklenen 9 webhook scope'u

| Scope | Ne zaman tetiklenir |
|---|---|
| `store/order/created` | Yeni sipariş |
| `store/order/updated` | Sipariş güncellendi |
| `store/product/created` | Yeni ürün |
| `store/product/updated` | Ürün güncellendi |
| `store/customer/created` | Yeni müşteri |
| `store/customer/updated` | Müşteri güncellendi |
| `store/customer/statusUpdated` | Müşteri durumu değişti |
| `store/stock/created` | Yeni stok kaydı |
| `store/stock/updated` | Stok güncellendi |

**Ayrıca plan/abonelik tarafında (bkz. `07-planlar-ve-yayinlama.md`):**
- `store/app/payment` — uygulama planı satın alındı
- `store/app/deleted` — abonelik silindi / uygulama kaldırıldı

> ⚠️ Bizim `docs/ikas/00-INDEX.md` dosyasındaki webhook konu listesiyle karşılaştırın —
> sapma varsa canlı `listWebhook` sorgusu hakemdir.

---

## Kayıt süreci

Webhook'lar **GraphQL mutation** ile kaydedilir (`saveWebhook`). Üç adım:

1. Mutation tanımını `graphql-requests.ts`'e ekle
2. `pnpm codegen` çalıştır
3. Endpoint ve scope seçimleriyle çalıştır

> Belge, mutation parametrelerini doğrulamak için **Playground'un Schema sekmesini**
> incelemeyi öneriyor.

---

## Güvenlik

`@ikas/admin-api-client` paketi ile doğrulama yapılır.

- 🔴 **Her zaman webhook imzasını (signature) doğrulayın**
- Client secret'ı **environment variable**'da tutun
- **Rate limiting** uygulayın
- **Idempotency** kontrolü ekleyin — aynı olayın iki kez işlenmesini önleyin

---

## Yeniden deneme (retry) politikası

- Başarısız teslimat **en fazla 3 kez** yeniden denenir
- 3 deneme tükendikten sonra **gönderim durur**; elle yeniden kaydetmek gerekir

🔴 **Webhook engelleme kuralları** ayrıca vardır — bkz. `08-rate-limit-ve-engelleme.md`.
Hata oranı yüksek webhook'lar **kalıcı olarak** engellenebilir.

---

## 🔴 Tencerecim notu

Hafızadaki **[ikas Webhook Köprüsü]** kaydı: gelen gövdede `data` alanı bir
**JSON metnidir**, nesne değildir — `JSON.parse` edilmelidir. Bu, belgede açıkça
yazmıyor, **ölçülmüş** bir bulgudur.
