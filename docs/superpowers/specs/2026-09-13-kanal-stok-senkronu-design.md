# Kanal Stok Senkronu — tasarım

Tarih: 13.09.2026 · Durum: onaylandı, uygulanıyor

## Problem

ikas mağazası ile Trendyol mağazası birbirinden kopuk. Aynı ürünün ikas'ta 3, Trendyol'da
1 adet göründüğü ölçüldü. Stok elle iki panelden ayrı ayrı yönetiliyor.

## Ölçülen başlangıç durumu (13.09.2026)

| Bulgu | Değer |
|---|---|
| `ikas_ayarlar.stok_push_kapali` | **1** — yerel→ikas stok gönderimi KAPALI |
| `urun_stoklar` (aktif ürün) | 5.624 satır sıfır, 178 satır dolu |
| Aktif yerel ürün | 2.901 · ikas'a bağlı 401 · barkodlu 2.789 |
| ikas varyant | 424 |
| Trendyol'da barkodla eşleşen | 161 |
| Lokasyon | Pendik + Gölcük, ikisi de ikas'a bağlı; online = Gölcük |

**Sonuç:** mağaza sayımı yapılmadığı için yerel stok sayıları gerçeği yansıtmıyor ve
bilinçli olarak ikas'a gönderilmiyor. Bugün gerçeği tutan taraf **ikas**.

## Kapsam

**Var:** ikas ↔ Trendyol karşılaştırma, ikas → Trendyol yazma, doğrulamalı uygulama,
değişiklik öncesi anlık görüntü, geri alma, Stok sekmesinde arayüz.

**Yok (bilinçli):**
- Otomatik/zamanlanmış yazma — v1'de her gönderim insan onaylıdır.
- Trendyol sipariş çekme — bu yüzden Trendyol satışları uygulamaya düşmez; kayma olur,
  kullanıcı bunu bilerek kabul etti.
- Yerel stoğun kaynak olması — sayım bitene kadar mağaza sütunu salt-okunur.
- Trendyol'a ürün açma — Trendyol'daki ürünler zaten ikas'ta mevcut (kullanıcı teyidi).

## Kararlar

1. **Senkron birimi = ikas adedi.** Trendyol adedi := ikas adedi. ikas'ta 0 ise Trendyol'da
   da 0 (ürün satıştan kalkar). Emniyet payı yok, sabit adet yok.
2. **Fark seçimi yok.** Kullanıcı tek tek ürün seçmez; farklı olan her eşleşmiş ürün
   gönderilir. Ekran farkı *gösterir*, ama iş akışı seçime dayanmaz.
3. **Tek kişi + doğrulama.** İki farklı kullanıcı şartı yok. Uygulamadan önce özetli bir
   doğrulama sorusu sorulur; onay orada verilir.
4. **Anlık görüntü ayrı tablo değil** — `stok_senk_kalem.eski_miktar`. Gönderimden hemen
   önce Trendyol'dan TAZE okunup yazılır. Yedek yoksa kalem yok, kalem yoksa gönderim yok.
5. **Kanal satırdır, sütun değil.** Üçüncü/dördüncü kanal eklenince şema değişmez.

## Veri modeli

```sql
-- Kanal kimlik bilgileri. meta_ayarlar modeli; api_key/api_secret HASSAS (safeStorage).
trendyol_ayarlar(anahtar TEXT PRIMARY KEY, deger TEXT)
  -- seller_id, api_key*, api_secret*, entegrasyon_ref, senk_kapali ('1'/'0')

-- Kanalların okunmuş stok fotoğrafı. Karşılaştırma barkod üzerinden self-join.
kanal_stok(
  barkod TEXT, kanal TEXT,            -- 'ikas' | 'trendyol' | 'magaza'
  miktar INTEGER, ad TEXT,
  durum TEXT,                          -- trendyol: onayli/onaysiz/arsiv/kilitli
  son_okuma TEXT,
  PRIMARY KEY (barkod, kanal))

-- Bir gönderim işlemi.
stok_senk_islem(
  id INTEGER PRIMARY KEY, kaynak TEXT, hedef TEXT,
  durum TEXT,                          -- hazir | uygulandi | kismi | hata | geri_alindi
  olusturan TEXT, olusturma_tarihi TEXT, uygulama_tarihi TEXT,
  ty_batch_id TEXT, geri_alindigi_islem_id INTEGER, not_ TEXT)

-- Kalem başına plan + ANLIK GÖRÜNTÜ.
stok_senk_kalem(
  islem_id INTEGER, barkod TEXT, ad TEXT,
  eski_miktar INTEGER,                 -- gönderimden hemen önce hedeften taze okundu
  yeni_miktar INTEGER,
  sonuc TEXT, hata TEXT,
  PRIMARY KEY (islem_id, barkod))
```

## Akış

```
Karşılaştır      ikas + Trendyol okunur → kanal_stok tazelenir
     ↓
Hazırla          farklı olan eşleşmiş ürünlerden islem üretilir (durum 'hazir')
     ↓            · hedeften TAZE okuma → eski_miktar yazılır  ← ANLIK GÖRÜNTÜ
     ↓            · özet: N ürün · X artacak · Y azalacak · Z SIFIRLANACAK
     ↓
Doğrula          modal: özet + sıfırlanacaklar vurgulu + "Uygula" / "Vazgeç"
     ↓
Gönder           POST price-and-inventory, 1000'lik parçalar → ty_batch_id
     ↓
Sonuç            GET batch-requests/{id} → kalem kalem sonuc/hata
     ↓
Geri al          eski_miktar'lardan ters islem üretir (aynı doğrulamadan geçer)
```

## Trendyol kısıtları (belgeli)

| Kısıt | Değer | Tasarıma etkisi |
|---|---|---|
| Parti boyutu | max 1000 kalem | parçalama zorunlu |
| Ürün başına stok | max 20.000 | tavan uygulanır |
| Aynı istek tekrarı | **15 dk reddedilir** | geri alma sayaçla gösterilir, hata sayılmaz |
| İstek hızı | 50 istek/10 sn | istemci sınırlar |
| Sonuç | asenkron, batchRequestId | 4 saat sorgulanabilir |
| 🔴 Parti `status` alanı | **stok partisinde HİÇ GELMİYOR** (ölçüldü) | tamamlanma kapısı `items.length >= itemCount`; `status==='COMPLETED'` beklenirse sonsuza kadar yoklanır (ürün YARATMA partisinde status var, karıştırma) |

Uç noktalar (15 Eyl 2026 V2 geçişinden **etkilenmiyor**):
- Oku: `GET /integration/product/sellers/{id}/products?page&size&archived` + başlık
  `x-api-version: 2` — **CANLIDA ÖLÇÜLDÜ**. `approved/inventory-and-price` KULLANILMADI:
  o uç yalnız onaylı ürünü döndürür, "Trendyol'da yok" ile "onay bekliyor" ayrımı yapılamaz.
  Arşivliler `archived=true` ile AYRI çekilir.
- Yaz: `POST /integration/inventory/sellers/{id}/products/price-and-inventory` (V1-V2)
- Sonuç: `GET /integration/product/sellers/{id}/products/batch-requests/{batchId}` (V2)

Auth: Basic (apiKey:apiSecret), `User-Agent: {sellerId} - SelfIntegration` zorunlu.

## Güvenlik frenleri

- `senk_kapali` acil anahtarı (ikas'taki `stok_push_kapali` deseni).
- Trendyol'da **onaysız / arşivli / kilitli** ürünler gönderime GİRMEZ; ayrı "gönderilemez"
  listesinde gerekçesiyle gösterilir.
- Eşleşmeyen barkodlar ayrı listede — sessizce yutulmaz.
- Yetki: `stok_duzenle`.
- Her işlem kalıcı kayıt: kim, ne zaman, ne gitti, ne döndü.
- Yayında yazma düğmeleri başlangıçta KAPALI; kullanıcı gerçek veriyle bir tur baktıktan
  sonra açılır.

## Arayüz

Stok sayfasına üçüncü alt sekme: **🔗 Kanal Senkronu** (mevcut `sekme` deseni korunur).

Tek tablo, satır başına ürün, yan yana üç kanal. Mağaza sütunu gri + "sayım bekliyor".
Renk: eşit nötr · yükselecek · düşecek · sıfıra inecek ayrı vurgulu.

## Test

Saf mantık `electron/db/stok-senk-mantik.js` içinde, ağ ve DB dışarıda: plan üretimi,
durum makinesi, parçalama, tavan, gönderilemez ayıklama. Mutasyon testinden geçmeli.

## Bilinen ve kabul edilen açıklar

1. **Trendyol satışları uygulamaya düşmez** → gönderimden sonra Trendyol'da satış olursa
   sayı kayar. Sipariş çekme ayrı bir iş olarak ertelendi.
2. Eşleşme **barkoda** dayanır; barkodu olmayan/yanlış olan ürün eşleşmez.
3. Yerel mağaza stoğu sayım yapılana kadar hiçbir karara girmez.
