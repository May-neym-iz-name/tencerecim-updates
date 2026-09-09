# Kampanya sekmesi + hediye kuponu gönderimi — tasarım (09.09.2026)

## Amaç
1. Uygulamada **Kampanya** sekmesi: ikas kampanyalarını (indirim kodları dahil) ikas panelindeki
   akışla oluşturmak, düzenlemek, kupon üretmek. Panelde yapılan her şey burada da yapılır;
   API'de olmayan panel özellikleri (katlı indirim, dönem bazlı limit, sepete ürün ekleyen
   kampanya teklifleri) **kapsam dışı** ve arayüzde yer almaz.
2. **Sosyal Medya**'da temsilci tek tıkla müşteriye **hediye kuponu** gönderir: havuzdan
   kullanılmamış bir kod çekilir, "nasıl kullanılır" şablonuyla birleşip tek mesaj olarak gider.

## Ölçülen gerçekler (09.09.2026, canlı API + panel)
- Private app **okuma yetkisi var**: `listCampaign` ve `listCoupon` 200 döndü (3 kampanya, 5 kupon).
  Yazma yetkisi ilk `saveCampaign` çağrısında anlaşılır; başarısızsa ikas panelinden
  uygulamaya "campaign edit" kapsamı eklenir (Ayarlar > Uygulamalar > private app).
- **Yüzde indirim** `type: RATIO` + `fixedDiscount.amount = 15` (yüzde değeri aynı alanda).
- **Tarihler** `dateRange.start/end` milisaniye epoch; `start` boş olabilir.
- **Canlı sapma:** ürün süzgeci `filters[].type = "PRODUCT_AND_VARIANT"`, `idList` öğeleri
  `"p:<productId>"` biçiminde. Belgeli enum (`CATEGORY, PRODUCT, PRODUCT_BRAND, PRODUCT_TAG,
  VARIANT`) bunu içermiyor. Varyant için muhtemelen `v:` öneki; ilk yazmada doğrulanacak.
- Panel formu bölüm sırası: Başlık · İndirim Türü (Yüzdelik / Sabit Tutar / Ücretsiz Kargo /
  X Al Y Kazan) · Kuponlar · İndirim Oranı · Koşullar · Gereksinimler · Kullanım Limitleri ·
  Müşteriler · Ayarlar · Aktif Tarihler. X Al Y Kazan'da Koşullar/Gereksinimler yerine
  "Müşterinin Aldıkları" (min adet **veya** min tutar + ürün süzgeci + maks adet) ve
  "Müşterinin Kazandıkları" (adet + ürün süzgeci + yüzde/ücretsiz + otomatik sepete ekle) gelir;
  Ayarlar'a "sipariş başına limit" eklenir.
- Kupon ekle diyaloğu: **Özel Kupon** (kod) ya da **Otomatik Kod Üret** (ön ek + adet);
  her ikisinde toplam limit ve müşteri başına limit. Şema: `AddCouponsInput.coupons` /
  `.generateCoupons`.
- Mevcut havuz: "Maxx Doria İndirim Kuponu" kampanyasında 5 kupon, `tencerecim` ön ekli,
  limit 1/1, `usageCount 0`.

## Şema eşlemesi (form → `CampaignInput`)
| Panel bölümü | Alan |
|---|---|
| Otomatik / İndirim kodu | `hasCoupon` |
| Başlık | `title` |
| Yüzdelik / Sabit / Kargo / X al Y | `type: RATIO / FIXED_AMOUNT / FREE_SHIPPING / BUY_X_THEN_GET_Y` |
| İndirim oranı / tutarı | `fixedDiscount.amount` |
| Ek indirim: kargo ücretsiz | `isFreeShipping` |
| Koşullar: belirli ürünler | `fixedDiscount.filters[{type, idList}]` |
| İndirimli ürünleri dahil et | `includeDiscountedProducts` |
| Sepet tutarı sınırı | `fixedDiscount.priceRange{min,max}` + `isApplyByCartAmount` |
| Ürün adedi sınırı | `fixedDiscount.lineItemQuantityRange{min,max}` |
| Toplam limit / kullanıcı başına | `usageLimit` / `usageLimitPerCustomer` |
| Müşteriler: grup / spesifik | `applicableCustomerGroupIds` / `applicableCustomerIds` |
| Yalnız hesabı olanlar | `onlyUseCustomer` |
| Diğer kampanyalarla birleş | `canCombineWithOtherCampaigns` |
| Satış kanalı / kur | `salesChannelIds` / `currencyCodes` |
| Aktif tarihler | `dateRange{start,end}` (ms) |
| X al: adet/tutar + süzgeç + maks | `buyXThenGetY.buyX{amount, applyByQuantity, filter}` |
| Y kazan: adet + süzgeç + oran + otomatik ekle | `buyXThenGetY.getY{amount, discountRatio, filter, automaticallyAddItemToCart}` |
| Sipariş başına limit | `buyXThenGetY.maxUsagePerOrder` |
| İndirimin uygulanacağı fiyat | `applicablePrice` (varsayılan `SELL_PRICE`; kampanyalı üründe `DISCOUNT_PRICE`) |

Kupon: `campaignAddCoupons({campaignId, coupons:[{code, usageLimit, usageLimitPerCustomer,
canCombineWithOtherCampaigns}]})` ya da `generateCoupons:{prefix, quantity, …}`.

## Mimari

### 1. `electron/ikas/kampanya.js` (yeni)
Saf ikas katmanı; DB'ye dokunmaz. Fonksiyonlar: `kampanyalariListele()`, `kampanyaGetir(id)`,
`kampanyaKaydet(input)`, `kampanyaSil(id)`, `kuponlariListele(campaignId)`,
`kuponEkle(campaignId, {coupons|generateCoupons})`, `kuponSil(idList)`.
- `kampanyaKaydet` sonrası **geri okuma**: `listCampaign(id)` ile alınıp gönderilen input ile
  alan alan karşılaştırılır; fark varsa `{ok:true, farklar:[…]}` döner, arayüz uyarır.
- IPC kanalları: `kampanya:liste`, `kampanya:getir`, `kampanya:kaydet`, `kampanya:sil`,
  `kampanya:kuponlar`, `kampanya:kuponEkle`, `kampanya:kuponSil`. Hepsi `yetkiKontrol('kampanya_yonet')`
  ve `kanal-yetki.js`'e eklenir.
- `electron/ikas/kampanya-donustur.js` (saf, test edilir): form durumu ↔ `CampaignInput`
  dönüşümü; `p:` önek kuralı; ms tarih; boş alanları göndermeme.

### 2. Yetki
`src/auth/izinler.js` + Supabase yetki listesine `kampanya_yonet`. Sekme kapısı bu yetki.
Sosyal Medya'daki kupon gönderme düğmesi `sosyal_medya_yonet` ile çalışır (temsilci kampanya
düzenleyemez ama kupon verebilir).

### 3. `src/pages/Kampanyalar.jsx` + `src/components/kampanya/`
- `KampanyaListesi.jsx`: başlık, tür simgesi, kuponlu mu, kullanılan, bitiş tarihi, havuz
  sayacı (kuponlu kampanyada "kullanılmamış N · verilmemiş M"). Arama kutusu.
- `KampanyaFormu.jsx`: ikas'taki bölüm sırası. Tür seçimi X al Y ise koşul bölümleri değişir.
  Ürün/kategori/marka seçici mevcut `AranabilirSecici` ile; ürün araması yerel `urunler`
  tablosundan (`ikas_urun_id` dolu olanlar).
- `KuponPaneli.jsx`: kupon listesi (kod, kullanılan, limitler, verildi mi/kime), "Kupon ekle"
  diyaloğu (özel / otomatik üret), seçili kuponları sil.
- Sayfa tembel yüklenir (`lazy`), mağaza PC'sinde gösterilmez (mevcut 7 sekme kuralı korunur;
  yetkisi olan kullanıcıda görünür).

### 4. Kupon havuzu ve dağıtım kaydı
Yeni tablo `kupon_dagitim` (senkronlanır; `senk-sema.js`'e eklenir):
`id, senk_id, kupon_id (ikas), kupon_kodu, kampanya_id (ikas), platform, konu_id, alici_id,
gonderen_kullanici, tarih`.
Havuzdan seçim (`electron/db/kupon-havuz.js`, saf mantık test edilir):
`listCoupon(campaignId)` → `usageCount = 0` ∧ kod `kupon_dagitim`'de yok → ilk kod.
İki PC yarışı: kayıt `INSERT` UNIQUE(kupon_kodu) ile; senkron çakışırsa ikinci PC'de
hata görünür ve temsilci yeniden dener. (Kabul edilen sınır: pencere birkaç saniye.)

### 5. Sosyal Medya düğmesi
`HizliUrunler` panelinin altına `KuponGonder.jsx`: "🎁 Hediye kuponu gönder".
Tık → kuponlu kampanyalar listesi (havuz sayısıyla); seçim → `meta:kuponGonder({hedef,
kampanyaId, kullanici})`:
1. havuzdan kod seç, `kupon_dagitim`'e yaz (önce yaz ki yarış kaybedilse mesaj gitmesin),
2. şablonu doldur, `kartGonder` ile aynı yoldan (DM `RESPONSE` → `HUMAN_AGENT`; yorumdan
   mesaj) gönder,
3. gönderim başarısızsa `kupon_dagitim` satırı silinir (kod havuza döner).
Havuz boşsa düğme pasif: "Havuz boş — Kampanya sekmesinden kupon üretin."
Son seçilen kampanya `yerel_ayarlar`'da hatırlanır.

### 6. Kupon şablonu
`sosyal_sablonlar.tur = 'kupon'` (üçüncü tür). `SablonFormu`'nda "Kupon" türü: serbest metin +
yer tutucular `{kod} {indirim} {bitis} {min_tutar} {site}`. `electron/meta/kupon-mesaj.js`
(saf): kampanya + kupon + şablon → metin; `{bitis}` yoksa satır atlanır; 1000 karakter kapısı
`sablon-mesaj.js` ile aynı. İlk kurulumda varsayılan bir "nasıl kullanılır" şablonu eklenir
(migration'da `INSERT … WHERE NOT EXISTS`); kullanıcı Şablon Kütüphanesi'nden düzenler.
Kupon türünde birden fazla şablon varsa düğmede seçilir; tek ise doğrudan gider.

## Hata yönetimi
- ikas yazma yetkisi yoksa: `saveCampaign` hatası olduğu gibi kullanıcıya, üstüne "private
  app kapsamı" ipucu.
- Geri okuma farkı: kayıt başarılı sayılır ama fark listesi toast'ta gösterilir.
- Meta gönderim hatası: `kartGonder` ile aynı `_pencereHatasi` mesajları; kod havuza iade.

## Test
- `kampanya-donustur.test.js`: her tür için form → input; boş alan gönderilmez; `p:` öneki;
  mutasyon testi (bkz. hafıza): `RATIO` amount alanı bozulursa test kırmızı olmalı.
- `kupon-havuz.test.js`: verilmiş/kullanılmış kodlar atlanır; havuz boşsa null.
- `kupon-mesaj.test.js`: yer tutucular; bitişsiz kampanya; 1000 karakter aşımı.
- `senk-sema.test.js`: `kupon_dagitim` listede.
- `kanal-yetki.test.js`: yeni kanallar eşlenmiş.
- Canlı: tek deneme kampanyası (`hasCoupon`, RATIO %5, bitiş yarın, 1 kupon) — kullanıcı
  gözünün önünde; sonra panelden silinir.

## Belge düzeltmeleri (aynı işte)
- `docs/ikas-api-reference.md` §9: "kampanya API'de yok" cümlesi yanlış → kataloga yönlendir.
- `docs/ikas/01-OPERASYON-KATALOGU.md` sapmalar bölümü: `PRODUCT_AND_VARIANT` + `p:` öneki,
  RATIO'nun `fixedDiscount.amount` kullanması, ms tarih.

## Kapsam dışı
Katlı indirim, dönem bazlı limit, Kampanya Teklifleri (`CampaignOffer`), müşteri segmenti
oluşturma (yalnız mevcut grup id'leri seçilir), miktar indirimi (`ProductVolumeDiscount`).
