# 40 — ikas Admin API: v1 vs v2 (ÖLÇÜLDÜ)

> **Kanıt seviyesi: ÖLÇÜLDÜ** — 14.09.2026, her iki uç noktaya canlı introspection
> sorgusu atılarak şemalar karşılaştırıldı. Doküman okunarak değil, **API'ye sorularak**.
>
> Yöntem: `POST /api/{v1,v2}/admin/graphql` → `{__schema{queryType{fields{name}} mutationType{fields{name}} types{name kind}}}`
> Ham çıktı: `$CLAUDE_JOB_DIR/tmp/schema-v1.json`, `schema-v2.json` (geçici)

---

## 🔴 KARAR: v2'ye GEÇİLMEYECEK

v2 bir **üst sürüm değil, farklı ve daha dar bir API yüzeyidir.**
Geçmek kazanç değil **kayıp** olur.

---

## Ölçülen sayılar

| | v1 | v2 |
|---|---:|---:|
| Query | **63** | 48 |
| Mutation | 69 | **76** |
| **Toplam operasyon** | **132** | 124 |
| Tip | **650** | 581 |

## Ölçülen davranış

| Test | v1 | v2 |
|---|---|---|
| Auth'suz `{__typename}` | ✅ `{"data":{"__typename":"Query"}}` | ✅ aynı |
| Auth'suz introspection | ✅ tam şema döndü | ✅ tam şema döndü |
| **Sessiz sürüm düşürme** | ❌ **YOK** | ❌ **YOK** |

🟢 **Önemli bulgu:** ECC kuralı (`api-verification.md` §4) *"çoğu sağlayıcı süresi
dolmuş sürümü reddetmez, sessizce başka bir sürüme düşürür"* diyor.
**Bu burada OLMUYOR.** v1 kendi şemasını sunuyor, v2'ye düşmüyor. İki ayrı API.

---

## Bizim kullandığımız 32 operasyon

Kod tabanında (`electron/`, `scripts/`, `cloudflare/`, `src/` — 237 dosya, 2 MB)
geçen v1 operasyonları:

```
approvePendingOrderTransactions   listOrder
cancelFulfillment                 listOrderTransactions
cancelOrderLine                   listPriceList
campaignAddCoupons           🔴   listProduct
deleteCampaignList                listProductBrand
deleteCouponList                  listProductTag
deleteWebhook                     listSalesChannel
fulfillOrder                      listStockLocation
getMerchant                       listStorefront
listCampaign                      listWebhook
listCategory                      me
listCoupon                        refundOrderLine
listCustomer                      saveCampaign              🔴
saveProduct                  🔴   saveProductStockLocations 🔴
saveVariantPrices            🔴   saveWebhook               🔴
updateOrderAddresses              updateOrderPackageStatus
```

🔴 = v2'de **yok** (6 tane)

---

## v2'ye geçiş maliyeti — kırıcı değişiklikler

v2, `save*` kalıbını bırakıp **`create*` / `update*`** ayrımına geçmiş:

| v1 (kullandığımız) | v2 karşılığı | Not |
|---|---|---|
| `saveProduct` | `createProduct` **+** `updateProduct` | Tek çağrı **ikiye ayrılıyor** |
| `saveVariantPrices` | `updateVariantPrices` | |
| `saveProductStockLocations` | `saveVariantStocks` | Ad **ve** kavram değişmiş |
| `saveWebhook` | `saveWebhooks` | Tekil → **çoğul** |
| `saveCampaign` | `createCampaign` + `updateCampaign` | |
| `campaignAddCoupons` | `addCouponsToCampaign` | |

🔴 **Sadece isim değişmiyor — input tipleri de değişiyor:**
`ProductInput` → `CreateProductInput` / `UpdateProductInput`.
Yani her çağrının gövdesi yeniden yazılır.

Ayrıca `saveCustomer` → `createCustomer`+`updateCustomer`,
`saveCategory` → `createCategory`+`updateCategory`,
`saveOrderTag` → `createOrderTag`+`updateOrderTag`,
`getOrderInvoicePdfUrl` → `downloadOrderInvoice`,
`listMerchantSettings` → `getMerchantSettings` (aynı desen, biz kullanmıyoruz).

---

## 🔴 v2'de HİÇ OLMAYAN v1 yetenekleri

Bunların v2'de **karşılığı yok** — geçersek bu yetenekleri kaybederiz:

| Alan | v1'de var, v2'de yok |
|---|---|
| **Medya yükleme** | `getImageUploadUrl`, `getVideoUploadUrl` |
| **Arama** | `searchProducts` |
| **ikas Wallet** | `getIkasWalletWithBalance`, `listIkasWallet`, `listIkasWalletTransaction`, `createWalletTransaction` |
| **Tedarikçi** | `listVendor`, `saveVendor` |
| **Ürün ek yapıları** | `listProductUnit`, `listProductVolumeDiscount`, `listProductOptionSet`, `listProductOrder` (+ save/delete eşleri) |
| **Vitrin** | `listStorefrontJSScript`, `listStorefrontPolicy`, `saveStorefrontPolicy` |
| **Sipariş** | `updateOrderLine`, `generateOrderPaymentLink`, `changeStockLocation` |
| **Diğer** | `listLanguage`, `getLastImportJobData`, `getTimelineEntry`, `updateCustomerB2BStatus` |

⚠️ **`getImageUploadUrl` kaybı özellikle ciddi** — ürün görseli yükleme akışımız
buna dayanıyor (bkz. `docs/ikas-api-reference.md:409`, REST upload ucu).

### v2'de yeni olanlar (v1'de yok)
`createPriceList` / `updatePriceList` / `deletePriceListList` (fiyat listesi yönetimi),
`addVariantToProduct`, `removeVariantFromProduct`,
`updateProductAndVariantAttributes`, `updateCustomerAndAddressAttributes`,
`createStorefrontJSScript` / `updateStorefrontJSScript`,
`addCustomerTimelineEntry`, `addOrderTimelineEntry`.

---

## 🔴🔴 MCP TUZAĞI — bunu atlamayın

**ikas MCP sunucusu v2 üzerinde çalışıyor:** `https://api.myikas.com/api/v2/admin/mcp`

Yani:

> **MCP'den öğrendiğiniz şema, uygulamanın kullandığı şema DEĞİLDİR.**

| Nereden | Hangi şema |
|---|---|
| ikas MCP | **v2** (124 operasyon) |
| `electron/ikas/client.js` | **v1** (132 operasyon) |
| `docs/ikas/` kütüphanesi (106 operasyon) | **v1** |
| `builders.ikas.com` (docs/ikas-builders/) | **v2** |

MCP'de `updateProduct` görüp bunu uygulamaya yazarsanız **v1'de böyle bir mutation
yoktur, patlar.** Tersi de geçerli: uygulamadaki `saveProduct`'ı MCP'de aramak boşuna.

**Kural:** MCP'den gelen her operasyon adı, uygulamaya yazılmadan önce
**v1'de karşılığı var mı** diye kontrol edilir.

---

## Neden geçmiyoruz — gerekçe

| Sebep | Kanıt |
|---|---|
| v1 çalışıyor, düşürülmüyor | **Ölçüldü** — kendi şemasını sunuyor |
| v1 hâlâ resmî | ikas'ın ana API dokümanının tamamı (`docs/ikas/`, 106 operasyon) v1 adresini veriyor |
| v2 daha dar | 132 → 124 operasyon; **görsel yükleme dahil** kayıplar var |
| Geçiş maliyeti yüksek | 6 operasyonun hem adı hem **input tipi** değişiyor |
| Kazanç yok | Kullandığımız 26 operasyon zaten iki sürümde de aynı |

### Ne zaman yeniden bakılır

- ikas v1 için **kapanış duyurusu** yaparsa
- v2'ye taşınan `createPriceList` gibi bir yeteneğe **ihtiyaç doğarsa**
  (fiyat listesi yönetimi — şu an `listPriceList` ile okuyoruz, yazmıyoruz)
- v1 canlı ölçümde **davranış değiştirirse**

**Yeniden ölçüm yöntemi bu dosyanın başında yazılıdır — tekrarlanabilir.**
