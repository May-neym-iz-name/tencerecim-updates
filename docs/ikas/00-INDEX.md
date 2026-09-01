# ikas Geliştirici Kütüphanesi (yerel kopya)

Kaynak: https://ikas.dev/docs — **987 sayfanın tamamı** markdown'a çevrilip buraya indirildi
(çekim tarihi: 01.09.2026). Her dosyanın ilk satırında orijinal URL yorum olarak durur.

Amaç: ikas ile ilgili her soruyu **internete çıkmadan, grep ile** yanıtlayabilmek.

## Nasıl aranır

```bash
# Bir alanın hangi tipte olduğunu bul
grep -rn "trackingInfo" docs/ikas/sema/

# Bir işlemin imzasını gör
cat docs/ikas/sema/mutations/save-product.md

# Konu bazlı anlatım
cat docs/ikas/api/admin-api/orders.md
```

## Dizin yapısı

| Klasör | Sayfa | İçerik |
|---|---:|---|
| `api/getting-started/` | 1 | Kimlik doğrulama (private app + client_credentials OAuth) |
| `api/admin-api/` | 16 | **Konu anlatımlı** Admin API rehberleri (orders, products, webhooks, ...) |
| `api/custom-definition/` | 3 | Görsel yükleme input'ları (ürün / kategori / marka) |
| `sema/queries/` | 51 | Tüm sorgular (imza + argümanlar + dönüş tipi) |
| `sema/mutations/` | 55 | Tüm mutasyonlar |
| `sema/inputs/` | 130 | Tüm input tipleri (alan alan) |
| `sema/objects/` | 268 | Tüm çıktı tipleri |
| `sema/enums/` | 83 | Tüm enum'lar (sabit değerler) |
| `sema/scalars/` | 7 | Skaler tipler |
| `tema/api/` | 279 | Storefront tema JS API'si: modeller, store'lar, enum'lar |
| `tema/getting-started/`, `tema/prop-types/`, `tema/theme-settings/`, `tema/example-theme/` | 56 | Tema geliştirme rehberi |
| `uygulama/` | 14 | ikas App geliştirme + Next.js adım adım eğitim (OAuth, webhook, ürün ekleme) |
| `panel/` | 12 | ikas Dashboard'un kendi arayüz kavramları |
| `partner/` | 4 | Partner programı (mağaza/tema/personel yönetimi) |

## Kritik sabitler

**Uç noktalar**
- GraphQL: `https://api.myikas.com/api/v1/admin/graphql`
- Token (merkez): `https://api.myikas.com/api/admin/oauth/token`
- Token (mağaza): `https://<store>.myikas.com/api/admin/oauth/token`
- Token ömrü: `expires_in: 14400` (4 saat)

**Uygulama kapsamları** (`AppScopeEnum`) — 11 adet
`READ_/WRITE_ PRODUCTS · ORDERS · CUSTOMERS · INVENTORIES · CAMPAIGNS` + `WRITE_STOREFRONT`

**Webhook konuları** (`WebhookInput.scopes`) — 10 adet
`store/order/created` · `store/order/updated` · `store/product/created` · `store/product/updated`
`store/customer/created` · `store/customer/updated` · `store/customerFavoriteProducts/created`
`store/customerFavoriteProducts/updated` · `store/stock/created` · `store/stock/updated`
> Endpoint HTTP 200 dönmezse ikas **3 kez** dener, sonra o webhook'u bırakır.

## Tüm sorgular (51)

- `getAuthorizedApp` — `sema/queries/get-authorized-app.md`
- `getGlobalTaxSettings` — `sema/queries/get-global-tax-settings.md`
- `getImageUploadUrl` — `sema/queries/get-image-upload-url.md`
- `getImportJobData` — `sema/queries/get-import-job-data.md`
- `getLastImportJobData` — `sema/queries/get-last-import-job-data.md`
- `getMerchant` — `sema/queries/get-merchant.md`
- `getMerchantLicence` — `sema/queries/get-merchant-licence.md`
- `getSalesChannel` — `sema/queries/get-sales-channel.md`
- `getVideoUploadUrl` — `sema/queries/get-video-upload-url.md`
- `listAbandonedCheckouts` — `sema/queries/list-abandoned-checkouts.md`
- `listBranch` — `sema/queries/list-branch.md`
- `listCampaign` — `sema/queries/list-campaign.md`
- `listCargoCompany` — `sema/queries/list-cargo-company.md`
- `listCategory` — `sema/queries/list-category.md`
- `listCity` — `sema/queries/list-city.md`
- `listCountry` — `sema/queries/list-country.md`
- `listCoupon` — `sema/queries/list-coupon.md`
- `listCustomer` — `sema/queries/list-customer.md`
- `listCustomerAttribute` — `sema/queries/list-customer-attribute.md`
- `listDistrict` — `sema/queries/list-district.md`
- `listLanguage` — `sema/queries/list-language.md`
- `listMerchantAppPayment` — `sema/queries/list-merchant-app-payment.md`
- `listOrder` — `sema/queries/list-order.md`
- `listOrderTag` — `sema/queries/list-order-tag.md`
- `listOrderTransactions` — `sema/queries/list-order-transactions.md`
- `listPriceList` — `sema/queries/list-price-list.md`
- `listProduct` — `sema/queries/list-product.md`
- `listProductAttribute` — `sema/queries/list-product-attribute.md`
- `listProductBrand` — `sema/queries/list-product-brand.md`
- `listProductOptionSet` — `sema/queries/list-product-option-set.md`
- `listProductOrder` — `sema/queries/list-product-order.md`
- `listProductStockLocation` — `sema/queries/list-product-stock-location.md`
- `listProductTag` — `sema/queries/list-product-tag.md`
- `listProductUnit` — `sema/queries/list-product-unit.md`
- `listProductVolumeDiscount` — `sema/queries/list-product-volume-discount.md`
- `listSalesChannel` — `sema/queries/list-sales-channel.md`
- `listShippingSettings` — `sema/queries/list-shipping-settings.md`
- `listState` — `sema/queries/list-state.md`
- `listStockLocation` — `sema/queries/list-stock-location.md`
- `listStorefront` — `sema/queries/list-storefront.md`
- `listStorefrontJSScript` — `sema/queries/list-storefront-jsscript.md`
- `listTaxSettings` — `sema/queries/list-tax-settings.md`
- `listTerminal` — `sema/queries/list-terminal.md`
- `listTown` — `sema/queries/list-town.md`
- `listVariantType` — `sema/queries/list-variant-type.md`
- `listVendor` — `sema/queries/list-vendor.md`
- `listWebhook` — `sema/queries/list-webhook.md`
- `me` — `sema/queries/me.md`
- `productAttributeExport` — `sema/queries/product-attribute-export.md`
- `searchProducts` — `sema/queries/search-products.md`
- `variantAttributeExport` — `sema/queries/variant-attribute-export.md`

## Tüm mutasyonlar (55)

- `addCustomTimelineEntry` — `sema/mutations/add-custom-timeline-entry.md`
- `addOrderInvoice` — `sema/mutations/add-order-invoice.md`
- `addOrderTag` — `sema/mutations/add-order-tag.md`
- `approvePendingOrderTransactions` — `sema/mutations/approve-pending-order-transactions.md`
- `bulkUpdateProducts` — `sema/mutations/bulk-update-products.md`
- `campaignAddCoupons` — `sema/mutations/campaign-add-coupons.md`
- `cancelFulfillment` — `sema/mutations/cancel-fulfillment.md`
- `cancelOrderLine` — `sema/mutations/cancel-order-line.md`
- `createMerchantAppPayment` — `sema/mutations/create-merchant-app-payment.md`
- `createMerchantAppPaymentWithSubscription` — `sema/mutations/create-merchant-app-payment-with-subscription.md`
- `createOrderWithTransactions` — `sema/mutations/create-order-with-transactions.md`
- `deleteCampaignList` — `sema/mutations/delete-campaign-list.md`
- `deleteCategoryList` — `sema/mutations/delete-category-list.md`
- `deleteCouponList` — `sema/mutations/delete-coupon-list.md`
- `deleteOrderTagList` — `sema/mutations/delete-order-tag-list.md`
- `deleteProductAttributeList` — `sema/mutations/delete-product-attribute-list.md`
- `deleteProductBrandList` — `sema/mutations/delete-product-brand-list.md`
- `deleteProductList` — `sema/mutations/delete-product-list.md`
- `deleteProductOrderList` — `sema/mutations/delete-product-order-list.md`
- `deleteProductTagList` — `sema/mutations/delete-product-tag-list.md`
- `deleteProductUnitList` — `sema/mutations/delete-product-unit-list.md`
- `deleteProductVolumeDiscountList` — `sema/mutations/delete-product-volume-discount-list.md`
- `deleteStorefrontJSScript` — `sema/mutations/delete-storefront-jsscript.md`
- `deleteVariantTypeList` — `sema/mutations/delete-variant-type-list.md`
- `deleteVendorList` — `sema/mutations/delete-vendor-list.md`
- `deleteWebhook` — `sema/mutations/delete-webhook.md`
- `fulfillOrder` — `sema/mutations/fulfill-order.md`
- `getAppDemoDay` — `sema/mutations/get-app-demo-day.md`
- `getOrderInvoicePdfUrl` — `sema/mutations/get-order-invoice-pdf-url.md`
- `productAttributeImport` — `sema/mutations/product-attribute-import.md`
- `refundOrderLine` — `sema/mutations/refund-order-line.md`
- `removeOrderTag` — `sema/mutations/remove-order-tag.md`
- `saveCampaign` — `sema/mutations/save-campaign.md`
- `saveCategory` — `sema/mutations/save-category.md`
- `saveOrderTag` — `sema/mutations/save-order-tag.md`
- `saveProduct` — `sema/mutations/save-product.md`
- `saveProductAttribute` — `sema/mutations/save-product-attribute.md`
- `saveProductBrand` — `sema/mutations/save-product-brand.md`
- `saveProductOrder` — `sema/mutations/save-product-order.md`
- `saveProductStockLocations` — `sema/mutations/save-product-stock-locations.md`
- `saveProductTag` — `sema/mutations/save-product-tag.md`
- `saveProductUnit` — `sema/mutations/save-product-unit.md`
- `saveProductVolumeDiscount` — `sema/mutations/save-product-volume-discount.md`
- `saveSalesChannel` — `sema/mutations/save-sales-channel.md`
- `saveStorefrontJSScript` — `sema/mutations/save-storefront-jsscript.md`
- `saveVariantPrices` — `sema/mutations/save-variant-prices.md`
- `saveVariantType` — `sema/mutations/save-variant-type.md`
- `saveVendor` — `sema/mutations/save-vendor.md`
- `saveWebhook` — `sema/mutations/save-webhook.md`
- `updateOrderAddresses` — `sema/mutations/update-order-addresses.md`
- `updateOrderLine` — `sema/mutations/update-order-line.md`
- `updateOrderPackageStatus` — `sema/mutations/update-order-package-status.md`
- `updateProductSalesChannelStatus` — `sema/mutations/update-product-sales-channel-status.md`
- `updateSubscriptionStatus` — `sema/mutations/update-subscription-status.md`
- `variantAttributeImport` — `sema/mutations/variant-attribute-import.md`

## Konu anlatımlı rehberler

- `api/admin-api/category.md`
- `api/admin-api/customers.md`
- `api/admin-api/locations.md`
- `api/admin-api/merchant.md`
- `api/admin-api/orders.md`
- `api/admin-api/price-lists.md`
- `api/admin-api/product-attributes.md`
- `api/admin-api/product-brand.md`
- `api/admin-api/products.md`
- `api/admin-api/product-tag.md`
- `api/admin-api/sales-channels.md`
- `api/admin-api/stock-locations.md`
- `api/admin-api/storefronts.md`
- `api/admin-api/timeline.md`
- `api/admin-api/variant-type.md`
- `api/admin-api/webhooks.md`
