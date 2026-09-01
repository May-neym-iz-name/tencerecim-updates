# ikas Admin API — 106 Operasyonun Tamamı (işaretli katalog)

**Bu dosya okunarak hazırlandı, tahmin yok.** 51 sorgu + 55 mutasyonun hepsinin imzası ve
açıklaması `sema/` altındaki kaynak dosyalardan tek tek okundu (01.09.2026).
Kullanım işaretleri, `electron/` ve `src/` içinde operasyon adının geçtiği yerler taranarak konuldu.

## İşaretler

| İşaret | Anlamı |
|---|---|
| ✅ | **Kullanıyoruz** — hangi dosyada olduğu yazılı |
| ⭐ | **Kullanılabilir, somut karşılığı var** — projede bekleyen bir işi çözüyor |
| ⬜ | Kullanılabilir, şu an ihtiyaç yok |
| ➖ | Bize uymaz (App Store / partner / abonelik işleri) |
| ⚠️ | Tehlikeli — veri siler veya sessizce alan siler |

**Toplam: 106 operasyon. Kullandığımız: 18. Öncelikli aday: 21.**

---

# SORGULAR (51)

## Ürün

| İşaret | Operasyon | Ne yapar / notumuz |
|---|---|---|
| ✅ | `listProduct` | Ürün listeleme. Filtre: `sku`, `barcodeList`, `brandId`, `categoryIds`, `tagIds`, `vendorId`, `salesChannelIds`, `variantStockLocationId`, `includeDeleted`. Sıralama sadece `createdAt`/`updatedAt`/`name`. → `electron/ikas/index.js`, `ekstra.js` |
| ⭐ | `searchProducts` | ikas'ın **kendi arama motoru**. Bizim Türkçe aramamızdan bağımsız; ikas'ta ürün ararken ad eşleştirme yerine bunu kullanabiliriz |
| ⭐ | `listProductAttribute` | Ürün özellikleri (Trendyol'daki 1015 özellik çalışmasının ikas karşılığı) |
| ⭐ | `productAttributeExport` | Özellikleri **dosya olarak dışa aktar** (CSV/XLSX, `ImportSourceEnum`). 24 filtre alanı var — fiyat listesi, depo, kanal, dil dahil. Toplu içerik çalışması için en güçlü uç |
| ⭐ | `variantAttributeExport` | Aynısının varyant seviyesi |
| ⬜ | `listProductBrand` | Marka listesi. Hafızadaki "Markalar CRUD" işi için |
| ⬜ | `listCategory` | Kategori listesi, `categoryPath` filtresi ile ağaç |
| ⬜ | `listProductTag` | Ürün etiketleri |
| ⬜ | `listProductUnit` | Birimler (kg, adet, m²) |
| ⬜ | `listVariantType` | Varyant tipleri (Renk, Beden) |
| ⬜ | `listVendor` | Tedarikçi listesi — bizde ayrı tedarikçi tablosu var, eşleştirilebilir |
| ⬜ | `listProductOptionSet` | Müşterinin doldurduğu ürün seçenekleri (isim yazdırma, hediye notu) |
| ⬜ | `listProductVolumeDiscount` | Miktar indirimi kuralları (3 al 2 öde) |
| ⬜ | `listProductOrder` | Kategori/marka içi vitrin sıralaması |
| ⬜ | `listProductStockLocation` | Depo bazlı stok satırları — sayfalı, `variantId`/`stockLocationId` filtresi |

## Sipariş

| İşaret | Operasyon | Ne yapar / notumuz |
|---|---|---|
| ✅ | `listOrder` | 22 filtre alanı. Aralarında **`invoicesStoreAppId`** (faturası hangi app'ten kesilmiş), `orderTagIds`, `branchId`, `terminalId`, `closedAt` var — bunların hiçbirini kullanmıyoruz. → `index.js`, `ekstra.js`, `kargo-durum.js`, `talep-detay.js` |
| ✅ | `listOrderTransactions` | Sipariş ödeme hareketleri (`orderId` zorunlu). → `index.js` |
| ⭐ | `listAbandonedCheckouts` | **Terk edilmiş sepetler** + `mailSendDate`. WhatsApp hatlarımızla hedefli mesaj akışı kurulabilir |
| ⭐ | `listOrderTag` | Sipariş etiketleri — "faturası bekliyor", "müşteri arandı" gibi iş akışı |
| ⬜ | `listCargoCompany` | ikas'ın tanımlı kargo firmaları. Şu an UPS eşleştirmesini elle yapıyoruz |

## Müşteri

| İşaret | Operasyon | Ne yapar / notumuz |
|---|---|---|
| ✅ | `listCustomer` | Filtre: `email`, `phone`, `search`. → `ekstra.js`, `database.js` |
| ⭐ | `listCustomerAttribute` | Müşteri özel alanları (bayi kodu, vergi no). Kurumsal müşteri ayrımı için |
| ⭐ | `listPriceList` | **Fiyat listeleri = bayi/toptan fiyatı.** Zaten okuyoruz ama sadece okuma amaçlı. → `ekstra.js` |

## Mağaza / altyapı

| İşaret | Operasyon | Ne yapar / notumuz |
|---|---|---|
| ✅ | `getMerchant` | Firma + personel bilgisi. → `index.js` |
| ✅ | `listStockLocation` | Depolar. → `index.js` |
| ✅ | `listStorefront` | Storefront listesi (`id`, `name` — sadece bu iki alan!). → `index.js` (web-link işi) |
| ⭐ | `listStorefrontJSScript` | Siteye enjekte edilmiş scriptleri **listele**. Tema çalışmasındaki "aktif script" analizinin API karşılığı |
| ⭐ | `listCity` / `listDistrict` / `listTown` / `listState` / `listCountry` | **İl / ilçe / semt / eyalet / ülke listesi ikas'tan.** Bizde ayrı tutuluyor; kargo adresi uyuşmazlıklarının kaynağı bu olabilir. Zincir: `listState(countryId)` → `listCity(stateId)` → `listDistrict(cityId)` → `listTown(districtId)` |
| ⬜ | `listSalesChannel` / `getSalesChannel` | Satış kanalları (web, pazaryeri, POS) |
| ⬜ | `listShippingSettings` | Kargo bölgeleri ve ücret kuralları |
| ⬜ | `listTaxSettings` / `getGlobalTaxSettings` | KDV yapılandırması |
| ⬜ | `listBranch` / `listTerminal` | **ikas POS** — şube ve kasa terminali. İki fiziksel mağazamız için ileride |
| ⬜ | `listLanguage` | Aktif diller |
| ⬜ | `me` | Token sahibi kimlik kontrolü — bağlantı testi için ideal |
| ⬜ | `getImportJobData` / `getLastImportJobData` | ikas'ın kendi Excel içe aktarım işlerinin durumu |
| ⬜ | `getMerchantLicence` | Paket/lisans bilgisi — hangi ikas paketindeyiz sorusunun cevabı burada |

## Medya

| İşaret | Operasyon | Ne yapar / notumuz |
|---|---|---|
| ⭐ | `getImageUploadUrl(imageId, imageDir)` | Görsel yükleme adresi al. **Lines içerik çalışmasının bekleyen görsel aşaması bu uçla çözülür** |
| ⭐ | `getVideoUploadUrl(videoId)` | Video yükleme adresi |

## Kampanya

| İşaret | Operasyon | Ne yapar / notumuz |
|---|---|---|
| ⭐ | `listCampaign` | Kampanyalar. **Eski notumuz "kampanya API'de yok" diyordu — yanlıştı** |
| ⭐ | `listCoupon` | Kupon kodları, `campaignId` filtresi |

## Webhook

| İşaret | Operasyon | Ne yapar / notumuz |
|---|---|---|
| ⭐ | `listWebhook` | Kayıtlı webhook'ları listele. Köprümüz çalışıyor ama kayıtları API'den doğrulamıyoruz |

## Bize uymayanlar

| İşaret | Operasyon |
|---|---|
| ➖ | `getAuthorizedApp`, `listMerchantAppPayment` — ikas App Store'da uygulama yayınlarsak anlamlı |

---

# MUTASYONLAR (55)

## Sipariş — fatura (şu an açık olan iş)

| İşaret | Operasyon | Ne yapar / notumuz |
|---|---|---|
| ⭐⭐ | `addOrderInvoice` | **Fatura PDF'ini siparişe iliştir.** Girdi: `orderId`, `invoiceNumber`, `type` (COMPANY/INDIVIDUAL/OTHER), `base64` (PDF içeriği), `appId`, `sendNotificationToCustomer` (müşteriye otomatik bildirim). `faz2-fatura-kesme` dalının eksik son halkası |
| ⭐⭐ | `getOrderInvoicePdfUrl` | Kesilmiş faturanın PDF adresini al (`orderId` + `invoiceId`). `Order.invoices[]` alanı ile birlikte **"bu siparişin faturası kesilmiş mi"** sorusu ikas'tan cevaplanır |

## Sipariş — operasyon

| İşaret | Operasyon | Ne yapar / notumuz |
|---|---|---|
| ✅ | `fulfillOrder` | Kargo paketi oluştur. → `index.js`, `kargo-durum.js` |
| ✅ | `cancelFulfillment` | Paketi iptal et. → `ekstra.js` |
| ✅ | `cancelOrderLine` | Sipariş satırı iptali. ⚠️ `price` alanı **zorunlu** (doküman yanlış, canlı API düzeltti). → `index.js` |
| ✅ | `refundOrderLine` | Satır iadesi + para iadesi. → `index.js`, `ups/takip.js` |
| ✅ | `updateOrderPackageStatus` | Paket durumu → sipariş durumu. → 3 dosya |
| ✅ | `updateOrderAddresses` | Adres düzeltme. → `index.js` |
| ✅ | `approvePendingOrderTransactions` | Havale/EFT onayı. → `index.js` |
| ⭐⭐ | `createOrderWithTransactions` | **Manuel sipariş girişi.** WhatsApp/Instagram siparişini ikas'ta gerçek sipariş olarak aç → stok, kargo, fatura, müşteri zinciri otomatik işler. Hafızadaki 27.07 "YAPILACAK" maddesi |
| ⭐ | `addCustomTimelineEntry` | Siparişe not düş ("UPS teslim etti", "fatura kesildi"). ikas panelinden de görünür — **iki PC ve panel arasında ortak iz** |
| ⭐ | `addOrderTag` / `removeOrderTag` / `saveOrderTag` | Sipariş etiketleme ve etiket tanımlama |
| ⬜ | `updateOrderLine` | Sipariş satırı güncelleme. ⚠️ Açıklaması yanlış yazılmış ("cancel the fulfillment" diyor ama `UpdateOrderInput` alıyor) — kullanmadan önce Playground'da dene |
| ⚠️ | `deleteOrderTagList` | Etiket tanımı siler |

## Ürün — yazma

| İşaret | Operasyon | Ne yapar / notumuz |
|---|---|---|
| ✅⚠️ | `saveProduct` | Ürün oluştur/güncelle. **KRİTİK: `variants.images` gönderilmezse görselleri SİLER, fiyat listesi satırlarını da siler.** Güvenli betik: `URUN-ESLESTIRME/a-grubu-sku-yaz-2026-08-25.js`. → `ekstra.js` |
| ✅ | `saveVariantPrices` | Varyant fiyatı yaz — `saveProduct`'ın silme riski olmadan. → `ekstra.js` |
| ✅ | `saveProductStockLocations` | Depo bazlı stok yaz. → `index.js` |
| ⭐⭐ | `bulkUpdateProducts` | **Toplu güncelleme, alan bazlı.** Marka, kategori, fiyat, stok, etiket, görsel, SEO, varyant ayrı ayrı input'lara sahip → `saveProduct`'ın "gönderilmeyeni siler" riskini taşımıyor. Toplu işlerde tercih edilmeli |
| ⭐ | `updateProductSalesChannelStatus` | Ürünü kanal bazında aç/kapa — web'de göster, pazaryerinde gizle |
| ⭐ | `saveProductAttribute` + `productAttributeImport` + `variantAttributeImport` | Ürün özelliklerini yaz / **dosyadan toplu içe aktar** (CSV/XLSX). İçerik çalışmalarının hızlı yolu |
| ⬜ | `saveProductBrand` | Marka oluştur/güncelle — "Markalar CRUD" işi |
| ⬜ | `saveCategory` | Kategori oluştur/güncelle — "Kategori Haritası" işi |
| ⬜ | `saveProductTag` | Etiket |
| ⬜ | `saveProductUnit` | Birim |
| ⬜ | `saveVariantType` | Varyant tipi |
| ⬜ | `saveVendor` | Tedarikçi tanımla |
| ⬜ | `saveProductVolumeDiscount` | Miktar indirimi kuralı |
| ⬜ | `saveProductOrder` | Vitrin sıralaması |
| ⚠️ | `deleteProductList` | **Ürün siler.** Hafızadaki ders: senkronda silme yayılımı yok → dikkat |
| ⚠️ | `deleteProductBrandList`, `deleteCategoryList`, `deleteProductTagList`, `deleteProductUnitList`, `deleteVariantTypeList`, `deleteVendorList`, `deleteProductAttributeList`, `deleteProductVolumeDiscountList`, `deleteProductOrderList` | Hepsi `idList` alır ve siler |

## Kampanya & kupon

| İşaret | Operasyon | Ne yapar / notumuz |
|---|---|---|
| ⭐ | `saveCampaign` | Kampanya oluştur: X al Y bedava, sabit indirim, sepet indirimi, tarih aralığı, min/max tutar filtresi, çeviri |
| ⭐ | `campaignAddCoupons` | **Toplu kupon kodu üret** |
| ⚠️ | `deleteCampaignList`, `deleteCouponList` | Siler |

## Storefront (tasarım / pixel)

| İşaret | Operasyon | Ne yapar / notumuz |
|---|---|---|
| ⭐⭐ | `saveStorefrontJSScript` | **Siteye JavaScript enjekte et.** Girdi: `storefrontId`, `name`, `scriptContent`, `contentType` (SCRIPT/FILE), `isHighPriority` (`<head>` başına al), `fileName`. Meta Pixel'in panelde kaydedilememesine **yedek yol**; ayrıca CLS düzeltmesi gibi CSS rötuşları. İzin: `WRITE_STOREFRONT` |
| ⚠️ | `deleteStorefrontJSScript` | Script siler — dikkat, `storefrontIdList` alıyor (script id değil!) |

## Webhook

| İşaret | Operasyon | Ne yapar / notumuz |
|---|---|---|
| ⭐ | `saveWebhook` | Webhook kaydet. Endpoint HTTP 200 dönmezse **3 deneme sonra bırakır**. Kullanmadığımız konular: `store/stock/created`, `store/stock/updated` |
| ⚠️ | `deleteWebhook` | `scopes` listesi ile siler |

## Diğer

| İşaret | Operasyon | Ne yapar / notumuz |
|---|---|---|
| ⬜ | `saveSalesChannel` | Kanal adı, fiyat listesi, depo bağlama |
| ⬜ | `updateSubscriptionStatus` | Müşterinin e-posta bülten aboneliği (`customerId` + durum). **Müşteri hakkında yazabildiğimiz tek şey bu** |
| ➖ | `createMerchantAppPayment`, `createMerchantAppPaymentWithSubscription`, `getAppDemoDay` | App Store'da uygulama satarsak |

---

# API'DE OLMAYANLAR (doğrulandı)

`sema/mutations/` ve `sema/objects/` taranarak teyit edildi — bunlar **yok**:

| Yok | Sonuç |
|---|---|
| **Müşteri oluşturma/güncelleme** (`saveCustomer` yok) | Müşteriyi ancak `createOrderWithTransactions` içindeki `OrderCustomerInput` ile dolaylı yaratabiliriz. Tek doğrudan yazma: `updateSubscriptionStatus` |
| Blog yazısı (hiçbir blog query/mutation yok) | Panelden. Tema tarafında `IkasBlog` sadece **okuma** |
| Statik sayfa içeriği (Hakkımızda vb.) | Panelden |
| Tema dosyası yazma | Ayrı kanal: tema editörü / ikas CLI / Studio → `~/.claude/skills/ikas-tema` |
| Hediye kartı | Entity yok (`gift` sadece `orderGiftPackageLine` ve KDV oranında geçiyor) |
| Ürün yorumu yazma | Admin API'de yok; tema tarafında `ikasCustomerStore.sendReview()` var |
| Satış/analitik raporu | Yok — siparişleri çekip kendimiz hesaplıyoruz (zaten öyle) |
| Ödeme sağlayıcı ayarı (PayTR vb.) | Panelden |

---

# KALICI KURALLAR

1. **ikas ile ilgili her düzenlemede önce bu kütüphaneye bak.** İnternete çıkma, `grep -rn "..." docs/ikas/` yap.
2. **Doküman ≠ canlı şema.** Kanıtlanmış sapmalar: `orderPaymentStatus` dokümanda 4, gerçekte 6 değer
   (+`OVER_PAID`, `REFUNDED`); `cancelOrderLine`/`refundOrderLine` input'unda `price` **zorunlu**,
   `paymentGatewayId` **yok**. **Kesin cevap gerekiyorsa Playground'a güven, dokümana değil.**
3. **`saveProduct` alan siler.** Toplu işte `bulkUpdateProducts` veya alan-özel mutasyonu tercih et.
4. **Yeni bir uç kullanmadan önce** `sema/inputs/<input-adı>.md` dosyasını aç — alan alan yazılıdır.
5. Enum'ların Türkçe karşılıkları kodda: `src/pages/OnlineSiparisler.jsx` (satır 24-52).
