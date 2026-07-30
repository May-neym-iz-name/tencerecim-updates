# Cloudflare Planı — Tencerecim Mağaza Programı

Hazırlanma: 2026-07-29 · Uygulama sürümü: v1.2.144 · Durum: **araştırma / karar bekliyor** (hiçbir şey uygulanmadı)

Bu belge, mevcut kod tabanı incelenerek "hangi işlevler Cloudflare'e taşınırsa ne kazanırız"
sorusuna cevap verir. Tavsiyeler önceliklendirilmiştir; **taşınmaması gerekenler** bölümü de
en az öneriler kadar önemlidir.

---

## 1. Bugünkü mimari — üç yapısal kısıt

Uygulama Electron + better-sqlite3 (yerel DB) + Supabase (kimlik/yetki/ayar senkronu) üzerine kurulu.
Dış dünyayla üç entegrasyon var: **ikas** (e-ticaret), **UPS** (kargo), **Meta** (FB/IG).

### Kısıt 1 — Public endpoint yok, o yüzden her şey polling

Kodda birebir şu yorum üç yerde geçiyor:

| Yer | Yorum |
|---|---|
| `electron/main.js:140` | "Webhook yerine sık polling: masaüstü uygulama public endpoint alamadığı için" |
| `electron/main.js:202` | "masaüstü uygulama public webhook alamadığı için sık çekme" |
| `electron/meta/index.js:3` | "Polling main.js'ten çağrılır (public webhook gerekmez)" |

Sonuç: `main.js` içinde üç zamanlayıcı çalışıyor.

| Zamanlayıcı | Aralık | Kaynak |
|---|---|---|
| ikas sipariş çekme | 90 sn | `main.js:144` |
| UPS takip yoklama | 10 dk | `main.js:172` |
| Meta yorum/DM çekme | 120 sn | `main.js:204` |

`docs/ikas-api-reference.md:93` zaten uyarıyor: *"Prefer webhooks over tight polling loops."*

### Kısıt 2 — Her PC ayrı yoklama yapıyor (yarış + israf)

`setInterval`'lar uygulama örneği başına çalışır. İki mağaza PC'si açıksa aynı ikas siparişi
iki kez çekilir, aynı UPS takip numarası iki kez sorgulanır. Meta'da bu **çift DM** riski
doğurduğu için elle bir kilit yazılmış: `electron/meta/yurutucu.js` + `main.js:219`
(`_yurutucuMu()` — "yürütücü olmayan PC turu atlar").

Bu, aslında *tek merkezî yürütücü ihtiyacının* uygulama içinde taklit edilmesidir.
Cloudflare Cron Trigger bu ihtiyacın doğal karşılığıdır — kilit koduna gerek kalmaz.

### Kısıt 3 — Uygulama kapalıysa hiçbir şey olmuyor

Mağaza kapandıktan sonra:
- gelen ikas siparişi çekilmez,
- UPS "teslim edildi" damgası okunmaz → müşteri bildirimi gitmez,
- Instagram yorumuna otomatik cevap verilmez (sosyal otomasyon [[sosyal-otomasyon]] tamamen uygulama açıkken çalışır),
- bildirim merkezi boş kalır.

Ertesi sabah biri programı açınca 12 saatlik birikmiş iş tek seferde işlenir.

### Kısıt 4 (güvenlik) — Sırlar her PC'de duruyor

`ikas/client.js` `client_id`/`client_secret` ile OAuth token alıyor, `meta/client.js` kalıcı
sayfa token'ı taşıyor, `ups/soap.js` UPS kimlik bilgisi kullanıyor. Bunların hepsi **her mağaza
PC'sinin yerel DB'sinde**. Personelin eriştiği bir makinede duran üretim API anahtarları demek.
Merkezî Worker modelinde sırlar tek yerde (Cloudflare Secrets) durur, PC'lerde hiç bulunmaz.

---

## 2. Öneriler — öncelik sırasıyla

### 🥇 A. Merkezî ikas webhook alıcısı (Worker) — **en yüksek getiri**

**Bugün:** 90 saniyede bir `listOrder` sorgusu; iki PC açıksa 2×. Günde ~1.900 gereksiz istek/PC.
**Cloudflare ile:** ikas `saveWebhook` ile `store/order/*` konularını bir Worker URL'ine yönlendirir
(`docs/ikas-api-reference.md:138` örneği hazır). Sipariş geldiği anda Worker tetiklenir.

Mimari (kritik nokta): **Worker ikas'tan gelen gövdeye güvenmez.** ikas dokümanı imza doğrulama
başlığı belgelemiyor (`ikas-api-reference.md:154`), o yüzden webhook yalnızca *tetikleyici*
sayılır. Worker sadece "şu sipariş id'si değişti" bilgisini bir kuyruğa (KV veya D1) yazar;
uygulama bu kuyruğu okuyup **yetkili kaydı ikas'tan kendisi çeker**. Yani mevcut
`_pullSiparisler()` mantığı değişmez, sadece "ne zaman çalışacağı" değişir.

Kazanç:
- Sipariş gecikmesi 90 sn → ~2 sn.
- Polling %95 azalır (güvenlik ağı olarak seyrek — 15 dk'lık — bir mutabakat turu kalır).
- ikas'ın "3 deneme sonrası vazgeçer" davranışı, mutabakat turu sayesinde veri kaybına dönüşmez.

Risk: Orta. Yeni bir dış bağımlılık. Ama polling'i **kaldırmadan** eklenebileceği için
geri dönüşü tek satır.

### 🥈 B. Merkezî UPS takip yoklayıcısı (Worker Cron)

**Bugün:** Her PC 10 dakikada bir UPS'e sorar (`main.js:172`); uygulama kapalıysa hiç sormaz.
**Cloudflare ile:** Worker Cron Trigger 10 dakikada bir, **7/24**, tek merkezden yoklar; durumu
D1'e veya Supabase'e yazar. PC'ler açıldığında hazır veriyi bulur.

Bu, hafızadaki [[kargo-bildirim-anlik]] kararının doğal devamı. Üretim mantığı (`ups/takip.js`)
Node.js; Worker'a taşınması için `soap.js`'in `fetch` tabanlı olması gerekiyor — kontrol edilmeli.
Eğer SOAP çağrıları saf `fetch` ise taşıma neredeyse kopyala-yapıştır.

Kazanç: gece teslim olan kargolar sabah değil, anında işlenir; müşteri bildirimi zamanında gider;
UPS'e giden istek yarıya (PC sayısı kadar) iner; `takip ayrı login ister` sorunu ([[ups-kargo-entegrasyonu]])
tek yerde çözülür.

Risk: Düşük-orta. UPS kimlik bilgisi Cloudflare Secret'ına taşınır (güvenlik açısından **iyileşme**).

### 🥉 C. Uygulama-dışı bildirim köprüsü

Worker zaten 7/24 çalıştığına göre, kritik olayları (yüksek tutarlı sipariş, kargo sorunu,
iade talebi) WhatsApp/e-posta ile **uygulama kapalıyken** iletebilir. Bugün bildirim merkezi
tamamen yerel ([[bildirim-merkezi]]) ve "diğer PC'de gelmiyor" şikâyeti bu yüzden var.

Kazanç: Yüksek iş değeri, düşük teknik karmaşıklık (A veya B yapıldıysa altyapı hazır).

### 4️⃣ D. Meta webhook alıcısı

**Bugün:** 120 sn polling + elle yazılmış tek-yürütücü kilidi (`yurutucu.js`).
**Cloudflare ile:** Meta gerçek webhook destekler (imza doğrulaması **var** — `X-Hub-Signature-256`,
ikas'tan daha güvenli). Worker imzayı doğrular, olayı kuyruğa yazar.

Kazanç: `yurutucu.js` kilidi ve "çift DM" endişesi yapısal olarak ortadan kalkar; yoruma cevap
gecikmesi 2 dk → saniyeler.

Neden 4. sırada: Sosyal otomasyon şu an **çalışıyor ve canlı doğrulanmış** (208+ kişi, 0 çift DM —
[[sosyal-otomasyon]]). Çalışan ve doğrulanmış bir sistemi taşımak, kırık olanı düzeltmekten
daha düşük öncelikli. Ayrıca Meta App Review sınırları ([[meta-app-review-siniri]]) webhook
abonelikleri için ek izin isteyebilir — önce araştırılmalı.

### 5️⃣ E. R2 — etiket depolama (Supabase Storage yerine)

Bugün kargo etiketleri Supabase Storage'da (`src/lib/etiketDepo.js`, [[kargo-etiket-storage]]).
Çalışıyor. R2'nin tek avantajı çıkış (egress) ücretinin sıfır olması — bu ölçekte fark yok.

**Tavsiye: yapma.** Çalışan bir şeyi kazanç olmadan taşımak saf risktir.

### 6️⃣ F. Cloudflare Tunnel — PC'ler arası doğrudan erişim

Teorik olarak mümkün ama bu mimaride gereksiz: PC'ler arası paylaşım zaten Supabase üzerinden
çözülmüş ([[senkron-mimarisi]]). Tunnel, her PC'yi internete açar — güvenlik yüzeyini büyütür.

**Tavsiye: yapma.**

---

## 3. Cloudflare'e **taşınmaması** gerekenler

Bu bölüm önerilerden daha önemli. Aşağıdakiler bilinçli olarak yerel kalmalı:

| Ne | Neden yerel kalmalı |
|---|---|
| **Satış / kasa / stok işlemleri** | better-sqlite3 senkron ve anlık. Barkod okutup Enter'a basınca kasada milisaniye bekleniyor. Ağ üzerinden bir Worker çağrısı bunu 100-300 ms'e çıkarır ve **internet kesilince mağaza satış yapamaz.** Kabul edilemez. |
| **Kimlik / yetki** | Supabase RLS'te çözülmüş ([[supabase-erisim-kisiti]], [[yetki-sistemi]]). İkinci bir yetki katmanı = ikinci bir hata kaynağı. |
| **Barkod/fiş yazdırma** | Yerel donanım (OS-214, XP-470B). Buluta taşınacak bir şey yok. |
| **Ürün arama / listeler** | Yerel SQLite + `tr-arama.js` katlama mantığı ([[turkce-arama]]). Ağ gecikmesi katarsak arama kutusu hissedilir yavaşlar. |
| **Veritabanının kendisi (D1'e taşıma)** | Cazip görünür ama offline çalışmayı öldürür. Mevcut "her PC yerel + köprü" modeli ([[senkron-mimarisi]]) bu iş için doğru modeldir. |

**Altın kural:** Cloudflare'e yalnızca *"uygulama kapalıyken de olması gereken"* ve
*"dış dünyanın bize ulaşması gereken"* işler taşınır. Kullanıcının önünde bekleyen hiçbir iş taşınmaz.

---

## 4. Maliyet

| Kalem | Ücretsiz plan sınırı | Bizim tahmini kullanım |
|---|---|---|
| Workers istek | 100.000/gün | ~5.000/gün (webhook + cron) |
| Cron Trigger | 5 adet | 2-3 adet |
| KV okuma | 100.000/gün | çok altında |
| D1 | 5 GB / 5M okuma günlük | çok altında |

> ⚠️ **DÜZELTME (uygulama sırasında, 2026-07-29):** Yukarıdaki tablo YANLIŞ SINIRA bakıyor.
> Günlük 100.000 istek bizi hiç zorlamıyor, doğru. Ama asıl bağlayıcı sınır **tek çağrı içi**:
> ücretsiz planda **50 dış alt-istek** ve **cron başına 10 ms CPU**. Her UPS sorgusu 1 dış
> alt-istek olduğundan tek turda 93 kargo yoklamak imkânsız. Çözüm parti + sık cron:
> `PARTI_BOYUTU=15`, cron `*/5` → saatte ~180 sorgu (ölçülen 93 açık kargo için fazlasıyla yeterli).
> D1 çağrıları bu 50'ye **girmez** — Cloudflare servisleri için ayrı 1000/çağrı bütçesi var.
> Cron'un duvar saati sınırı **15 dakika** (30 sn'lik `waitUntil` tavanı yalnız HTTP tetikli
> Worker'lara ait), o yüzden 15 ardışık UPS çağrısı rahat sığıyor.

**Sonuç: bu ölçekte ücretsiz plan yeter,** ama "yeter" gerekçesi günlük istek sayısı değil,
çağrı-içi sınırlara göre tasarlanmış küçük parti. Workers Paid ($5/ay) her iki sınırı da kaldırır
ve `PARTI_BOYUTU` tek satırda büyütülebilir.

---

## 5. Önerilen uygulama sırası

Her adım tek başına değer üretir ve bir sonrakini beklemez. Her adımda **eski polling kaldırılmaz,
aralığı seyrekleştirilir** — böylece geri dönüş tek satırdır.

1. **Adım 0 — Temel:** Bir Worker projesi + Cloudflare Secrets'a ikas/UPS kimlikleri. Sağlık ucu (`/saglik`). Yayına alma denemesi.
2. **Adım 1 — UPS cron (Öneri B):** En düşük riskli, en somut kazanç. Uygulamadaki 10 dk'lık tur 60 dk'ya çekilir (mutabakat olarak kalır).
3. **Adım 2 — ikas webhook (Öneri A):** En yüksek getiri. Uygulamadaki 90 sn'lik tur 15 dk'ya çekilir.
4. **Adım 3 — Bildirim köprüsü (Öneri C):** İş değeri en görünür adım.
5. **Adım 4 — Meta webhook (Öneri D):** Ancak App Review sınırı araştırıldıktan sonra.
6. **E ve F: yapılmayacak.**

---

## 6. Açık sorular (uygulamadan önce cevaplanmalı)

1. `ups/soap.js` saf `fetch` mi kullanıyor, yoksa Node'a özgü modül mü? Worker'a taşınabilirliği buna bağlı.
2. ikas webhook'ları imza başlığı gönderiyor mu? (Doküman söylemiyor — canlı test gerekir. Söylemiyorsa "yalnız tetikleyici" modeli zorunlu.)
3. Meta webhook aboneliği App Review istiyor mu? ([[meta-app-review-siniri]] bulgusuna göre bazı uçlar onaysız çalışıyor.)
4. ~~Worker → uygulama yönünde iş kuyruğu nerede tutulacak: KV mi Supabase mi?~~
   **KARAR: D1** (2026-07-29, kullanıcı seçti — plandaki Supabase önerisi terk edildi).
   Gerekçe önerimden güçlü çıktı: Supabase'i Worker'a koymak oraya bir servis anahtarı taşımak
   ve her satır için ağ üstünden çağrı demekti; D1 binding'i anahtarsız ve gecikmesiz.
   Bedeli: uygulamanın okuyabilmesi için Worker'a `/kargo/durumlar` ucu yazmak gerekti.

---

## 7. Uygulama notları (Adım 1 tamamlandığında eklendi)

**Plan belgesinin kaçırdığı mimari gerçek:** Worker **yoklanacak listeyi üretemez**. Liste yerel
SQLite'taki `kargolar` + `online_siparisler` birleşiminden çıkıyor (`electron/ups/takip.js:94`)
ve bulutta karşılığı yok. Bu yüzden akış üç parçalı olmak zorunda:

```
uygulama  --POST /kargo/izle-->      Worker      (yoklanacak liste)
                                       |
                                    cron 5 dk → UPS → D1
                                       |
uygulama  <--GET /kargo/durumlar--   Worker      (yalnız DEĞİŞENLER)
```

`durumCevir`, bildirim merkezi, ikas köprüsü, telafi turu — **hepsi yerelde kalır.**

**Plandaki "uygulamadaki turu 60 dk'ya çek" maddesi iptal:** bulut açıkken uygulama UPS'e hiç
gitmiyor, tur iki HTTP çağrısına iniyor. Seyrekleştirmek yalnız tazeliği bozardı. 10 dk kaldı.

**İki zorunlu farklı HTTP API'si:** Worker'da `node:https` yok (`fetch` şart), Electron 22/Node 16'da
global `fetch` yok (`node:https` şart). `electron/ups/soap.js` ile `cloudflare/kargo-worker/src/ups-soap.js`
aynı mantığın iki kopyası — **biri değişirse diğeri de değişmeli.**
