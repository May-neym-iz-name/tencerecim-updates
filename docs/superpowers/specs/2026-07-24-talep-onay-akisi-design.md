# İptal/İade Talebi Onay Akışı — Tasarım

Tarih: 2026-07-24
Dal: `feat/talep-gorunurluk`
Öncül: [2026-07-24-talep-gorunurluk-design.md](2026-07-24-talep-gorunurluk-design.md) (bildirim butonu + KPI kartı)

## Problem

Bildirim butonu talebi *gösteriyor* ama personel talebi *işleyemiyor*. Sipariş detayında
"İptal Et" / "İade Et" butonları var, ancak müşterinin **ne talep ettiği** görünmüyor.

Canlı örnek (sipariş 1141437359, Sebiha Yıldız): sipariş 3 üründen oluşuyor ve 2 pakete
bölünmüş. Paket-1 (3.100 + 2.200 TL) teslim edilmiş; iade talebi **yalnızca Paket-2'de**
— tek ürün, 2.670 TL. Bugün personel "İade Et"e bastığında modal 3 ürünü de listeler ve
hangisinin talep edildiğini bilmediği için **7.970 TL'lik tam iade** yapması işten değil.

**Talep paket bazlıdır.** Özelliğin asıl değeri onay butonu değil, doğru kalemlerin
önceden seçili gelmesidir.

## İkas API kısıtları (canlı introspection, 2026-07-24)

| Yetenek | Durum |
|---|---|
| Talebi onaylamak = fiilen iade/iptal | ✅ `refundOrderLine` / `cancelOrderLine` — uygulamada zaten var |
| Talebin kapsadığı kalemler | ✅ `Order.orderPackages[].orderLineItemIds` |
| Müşteri notu / iade kargo yöntemi | ✅ `OrderPackage.note`, `returnShippingMethod` — **canlı veride `null` geldi**, varlığına güvenilmez |
| İade sebebi | ⚠️ `refundReasonId` var, ID'yi metne çevirecek sorgu **yok** (63 query tarandı) |
| Talebi **reddetmek** | ❌ 69 mutation içinde yok — yalnız ikas panelinden |
| "Onaylandı, ürün bekleniyor" ara durumu yazmak | ❌ `REFUND_REQUEST_ACCEPTED` durumu okunabiliyor ama **set edilemiyor** |

Son iki satır tasarımı belirler: bu iki bilgi **yerelde** tutulmak zorunda.

## Kararlar (kullanıcı, 2026-07-24)

1. **İki aşamalı iade seçeneği.** Onay ile para iadesi ayrı adımlar olabilmeli
   ("Sadece onayla" ve "Ürün geldi, tamamla" ayrı butonlar).
2. **Onaylanan talep listede kalır**, sarı "Ürün Bekleniyor" etiketiyle ayrılır.
   Bildirim butonu `N talep · M ürün bekleniyor` der.
3. **Yerel "Talebi Kapat" + zorunlu not.** Reddetme API'den yapılamadığı için,
   kapatma yereldir ve "ikas panelinden de reddetmeniz gerekir" uyarısı gösterilir.
4. **Çok-PC paylaşımı: Supabase.** Bir mağazada kapatılan talep diğerinde de düşer;
   iki kişinin aynı iadeyi işlemesi engellenir.
5. Onay aşamasında ikas'a hiçbir şey yazılmaz, müşteriye bildirim gitmez.
6. Talep dışı kalemler modalda soluk gösterilir (yanlış ürün iadesini önleyen bağlam).

## Veri modeli

`talep_durumlari` — ikas'a yazamadığımız iki bilgi:

| kolon | tip | açıklama |
|---|---|---|
| `ikas_siparis_id` | TEXT PK | Çok-PC bağı yerel `id` ile değil ikas kimliğiyle kurulur (kargolar dersi) |
| `asama` | TEXT | `onaylandi` \| `kapatildi` |
| `not` | TEXT | Kapatma sebebi — `kapatildi` için zorunlu |
| `kullanici` | TEXT | Kim |
| `tarih` | TEXT | Ne zaman |

Supabase'e senkronlanır: `supabase/10_talep_durumlari.sql` (kullanıcı çalıştırır).

**Neden eleme yerelden yapılır:** kapatılan talep ikas'ta `REFUND_REQUESTED` olarak
kalır. Eleme ikas durumuna dayansaydı sonraki senkron talebi geri diriltirdi.

## Talep tanımı (mevcut, değişmiyor)

`bekleyenTalepMi` (src/utils/talep.js): paket durumu belirleyicidir; paket henüz
oluşmamışsa (`''`/`UNFULFILLED`) sipariş durumuna bakılır. Bu tanıma yerel aşama eklenir:
`kapatildi` → elenir, `onaylandi` → listede kalır (etiketli).

## Akış

### Talep modalı — "🔎 Talebi İncele"

Talepli siparişin detay panelinde, geri alınamaz bölümün ÜSTÜNDE.

**Üst bölüm — müşteri ne istedi** (ikas'tan canlı, paket bazlı):
talep edilen paket no, kalemler (ad/adet/tutar), talep toplamı; altında soluk
"talep dışı" kalemler. Sebep/not/kargo yöntemi yalnız doluysa gösterilir.

**Alt bölüm — aksiyonlar (iade talebi):**

| Buton | Etki |
|---|---|
| ✅ Onayla — ürün bekleniyor | Yerel `asama='onaylandi'`. İkas'a yazılmaz, para/stok değişmez. |
| 💰 Ürün geldi — iadeyi tamamla | Mevcut iade modalını **talep edilen kalemler seçili** açar → `ikas:siparis-iade` |
| 🚫 Talebi Kapat | Not zorunlu. Listeden düşer + ikas paneli uyarısı. |

**İptal talebi (`CANCEL_REQUESTED`):** ürün geri gelmez → orta buton yok.
"✅ İptali Onayla" → mevcut `ikas:siparis-iptal`.

## Kod yapısı

| Dosya | Rol |
|---|---|
| `electron/db/talep-durumlari.js` *(yeni)* | `asamaAl / onayla / kapat` — saf DB, ~80 satır |
| `electron/ikas/talep-detay.js` *(yeni)* | Paket bazlı talep sorgusu. Karar mantığı `_talepPaketleri` **saf ve DB'siz** → mock'suz test (emsal: `kargo-durum.js _bildirimKarari`) |
| `electron/ikas/index.js` | `talep:detay`, `talep:onayla`, `talep:kapat`. Yetki: mevcut `ikas_yonet` |
| `src/utils/talep.js` | Yerel aşamayı hesaba katar |
| `src/pages/OnlineSiparisler.jsx` | Talep modalı + "Ürün Bekleniyor" etiketi |
| `supabase/10_talep_durumlari.sql` *(yeni)* | Tablo + senkron kaydı |
| `electron/db/panel.js` | KPI kapatılanları saymaz |

**Yeni yetki kodu eklenmez.** Mevcut `ikas_yonet` kullanılır — yenisi Supabase
`yetki_kodlari`'na da eklenmezse "Özel" rolde toggle çıkmaz (bilinen tuzak).

## Hata yönetimi

- İkas talep detayı çekilemezse: modal açılır, üst bölüm "Talep detayı alınamadı"
  der ve **onay butonları kapalı** kalır. Kör onay yaptırılmaz.
- `talep:onayla` / `talep:kapat` yalnız yerel yazar → ağ hatası riski yok.
- `iadeyi tamamla` mevcut kodun kanıtlanmış hata mesajlarını kullanır
  (tutar/işlem uyuşmazlığı, stok lokasyonu yok vb.).
- Kapatma notu boşsa IPC ucu reddeder (UI doğrulamasına güvenilmez).

## Test

- `_talepPaketleri`: gerçek veri fixture'ı (1141437359 — 2 paket, biri `DELIVERED`
  biri `REFUND_REQUESTED`) → yalnız talepli paketin kalemleri dönmeli.
- `bekleyenTalepMi`: `kapatildi` eler, `onaylandi` elemez.
- `talep-durumlari.js`: onayla/kapat/okuma, notsuz kapatma reddi.
- Mevcut 171 test korunur.

## Kapsam dışı (YAGNI)

- Müşteriye otomatik bildirim (WhatsApp altyapısı var, istenirse sonra).
- İade sebebi metni (API'de karşılığı yok).
- Ayrı "Talepler" sayfası (bildirim butonu + KPI kartı giriş noktası olarak yeterli).
