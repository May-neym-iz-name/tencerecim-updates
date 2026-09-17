# 90 — Tencerecim: Bu Bilgilerle Neler Yapabiliriz

> Bu dosya **belge değil, karar dosyasıdır.** Yukarıdaki 01–31 dosyalarındaki
> yetenekleri bizim mevcut durumumuzla eşleştirir.
> Kanıt seviyeleri: **Belgeli** (ikas yazıyor) · **Çıkarım** (ben türettim) · **Ölçülmeli** (denenmedi)

---

## 0. Önce durum tespiti

**Bugün neredeyiz:**

| | Durum |
|---|---|
| ikas bağlantı modeli | **Özel Uygulama (Private App)** — `client_credentials` |
| Panelde görünürlük | **Yok** — özel uygulama arayüz ekleyemez |
| Tema | Mevcut ikas teması (Studio değil) + özel CSS/JS |
| Partner hesabı | **Yok** |
| Webhook | Cloudflare Worker köprüsü ✔ |
| MCP | ikas MCP **bağlı değil** |

**Bu üç kapı açık ama girmemişiz:**
1. 🟢 **ikas MCP** — bugün, bu oturumda açılabilir, bedava
2. 🟢 **Storefront Events** — vitrin ölçümü, kod yazmadan erişilebilir
3. 🟡 **Admin App + Gizli Yayınlama** — panele buton ekleme; Partner hesabı gerekir

---

## 1. 🟢 HEMEN YAPILABİLİR — ikas MCP'yi bağla

**Maliyet:** ~15 dakika · **Risk:** düşük (ama bkz. uyarı) · **Kanıt:** Belgeli

Mağaza panelinden **"MCP Client"** tipinde uygulama oluştur → `mcp_` ile başlayan token al →
Claude Code'a ekle:

```json
{
  "mcpServers": {
    "ikas-admin": {
      "command": "npx",
      "args": ["mcp-remote", "https://api.myikas.com/api/v2/admin/mcp",
               "--header", "Authorization:${IKAS_ADMIN_AUTH_TOKEN}"],
      "env": { "IKAS_ADMIN_AUTH_TOKEN": "<ACCESS_TOKEN>" }
    }
  }
}
```

### Ne kazanırız

| Bugünkü sorun | MCP ile |
|---|---|
| CLAUDE.md: *"Doküman ≠ canlı şema"* | **Canlı şemayı** doğrudan sorgularız — `docs/ikas/sema/` tahmini biter |
| Her ikas işi için betik yazmak | Sohbetten doğrudan sorgu/mutasyon |
| Ürün/sipariş kontrolü için panele girmek | Anında okuma |

### 🔴 UYARI — bunu atlamayın

MCP token **tam yetkilidir** ve **bizim koruma katmanlarımızı ATLAR**:

| Koruma | MCP'de geçerli mi |
|---|---|
| `_gorsel-guvence` (görsel silme koruması) | ❌ **Atlanır** |
| Fiyat yazma yasağı | ❌ **Atlanır** |
| `saveProduct` sonrası `saveVariantPrices` zorunluluğu | ❌ **Hatırlatılmaz** |

**Öneri:** MCP'yi **önce salt-okunur** kullanalım. Yazma işleri uygulamanın kendi
katmanından geçmeye devam etsin. Yazma gerekirse önce
`docs/ikas/01-OPERASYON-KATALOGU.md` açılsın.

> Ayrıca kimlik doğrulamasız **şema keşfi** sürümü de var (token'sız, `url` + `type: remote`) —
> yazma riski sıfır. Bununla başlamak en güvenlisi.

---

## 2. 🟢 YÜKSEK DEĞER — Storefront Events ile gerçek dönüşüm ölçümü

**Maliyet:** 1 gün · **Risk:** düşük · **Kanıt:** Belgeli (olay listesi) + Ölçülmeli (payload alanları)

### Çözdüğü 3 açık sorun (hafızadan)

| Sorun | Şu anki durum | Storefront Events ile |
|---|---|---|
| **[GTM/Dönüşüm Takibi]** 2 fazla dönüşüm Birincil takılı | Panel ROAS şişkin | `COMPLETE_CHECKOUT`'tan **tek, doğru** purchase gönderilir |
| **[Google Ads] 0. basamak kapısı** — panel ≠ gerçek | Doğrulanmamış | `data.transaction.id` → ikas siparişi eşlenir, **fark ölçülür** |
| **[GA4] Instagram gelirin %75'i** | GA4'e güveniyoruz | Kendi Supabase'imize **4. basamak** ham veri yazılır |

### Nasıl

`window.IkasEvents.subscribe()` ile 18 olayı dinleyen bir JS dosyası → **Cloudflare
Worker'ımıza** gönderir → Supabase'e yazar.

🟢 **Cloudflare Worker altyapımız zaten var** (`cloudflare/arama-worker`, webhook köprüsü).
Yeni bir uç nokta eklemek yeterli.

### Bize özel kazanç
Bugün reklam kararlarını **panel ROAS'ıyla (6. basamak)** veriyoruz.
`docs/google-ads-reference.md` §1 bunu yasaklıyor. Bu iş, **4. basamak ölçümü**
kurmanın en ucuz yolu — ve tROAS yasağını kaldırmanın ön şartı.

---

## 3. 🟢 Kampanya şeridi işini bitir — `saveStorefrontScript`

**Kanıt:** Belgeli (MCP yeteneklerinde *"Storefront JavaScript script yönetimi"* listeli)

Hafızadaki **[Tema HTML Blok Aktarım]** kaydı: *"kampanya şeridi scripti hazır, panelde
denenmedi"* — 🟡 açık iş.

Belge, vitrin JS scriptlerini **API ile yönetmenin** resmî bir yolu olduğunu söylüyor
(`/ornek-uygulamalar/admin-app-script-injector` örneği de bunu anlatıyor).

**Yapılacak:** Şu an elle panele yapıştırılacak scripti, uygulamamızdan
**API ile** enjekte edelim. Böylece:
- Kampanya başlat/bitir → tek tıkla
- Sürüm takibi bizde
- Panelde manuel iş kalmaz

🔴 **Ölçülmeli:** mutation'ın kesin adı ve imzası belgede verilmemiş.
Playground'da `saveStorefrontScript` / benzeri adı **doğrulayın**, sonra yazın.

---

## 4. 🟡 ORTA VADE — Admin App'e geçiş (Gizli Yayınlama)

**Maliyet:** 1–2 hafta · **Kanıt:** Belgeli

### Neden değer

Bugün PC uygulamasında **elle** yaptığımız işler, ikas panelinin **içine** taşınır:

| Bizim işimiz (bugün elle) | Admin App aksiyonu |
|---|---|
| Siparişe fatura kesme | **Sipariş Genel Aksiyon** → (︙) menüsünde "Fatura Kes" |
| Paketi UPS'e verme | **Sipariş Paket Aksiyonu** → paket kartının altında "Kargoya Ver" |
| Ürünü Trendyol/HB'ye gönderme | **Ürün Genel Aksiyon** → (︙) menüsünde "Pazaryerine Gönder" |
| Toplu sipariş işlemi | **Sipariş Listesi Toplu Aksiyon** |

> 🔴 Bu dört satır, ikas'ın **belgede verdiği örneklerin aynısıdır.** Tesadüf değil —
> platform tam bu iş için tasarlanmış.

### Neden "Gizli Yayınlama"

| | Herkese Açık | **Gizli** |
|---|---|---|
| ikas incelemesi | **Var** (süre belirsiz) | **Yok** |
| Partner doğrulama | **Zorunlu** | Gerekli değil* |
| Mağaza listesinde görünür | Evet | Hayır |
| Kendi mağazamıza kurulum | ✅ | ✅ |

\* *Partner hesabı gerekir ama incelemeye girmeyiz.*

**Ayrıca "İzin Verilen Mağazalar"** ile hiç yayınlamadan sadece kendi mağazamıza
kurabiliriz — en hızlı yol bu.

### Adımlar
1. Partner hesabı aç (3 adım, ücretsiz)
2. `dev-` geliştirme mağazası oluştur
3. `npm i -g ikas` → `ikas app init` → **"Dashboard Actions App"** şablonu
4. `ikas app dev` → Cloudflare tünel → test
5. İzin Verilen Mağazalar'a **tencerecim.store**'u ekle (Erişim Mağazası olarak)
6. Kur, kullan

### 🔴 Engel: Next.js
Belge Next.js'i **zorunlu tavsiye** ediyor. Bizim uygulama **Electron + React (JS)**.
Bu **yeni, ayrı bir proje** olur — mevcut uygulamanın yerine geçmez, **yanında** durur.

**Mimari önerisi:** Admin App ince bir **kabuk** olsun; gerçek işi zaten çalışan
Cloudflare Worker + Supabase katmanımız yapsın. Böylece iş mantığı iki yerde durmaz.

---

## 5. 🟡 Tema tarafı — ikas Studio

**Kanıt:** Belgeli · Durum: **BETA**

### 🔴 Önce netleştirelim: Studio mevcut temayı düzenlemez

`docs/ikas/tema/` (279 sayfa) ve `~/.claude/skills/ikas-tema` **mevcut tema sistemini**
anlatır. ikas Studio **sıfırdan yeni tema** üretme platformudur.

tencerecim.store'un bugünkü görünümünü değiştirmek için → **mevcut skill'i kullanın.**

### Studio ne zaman mantıklı olur

| Durum | Studio'ya geçer miyiz |
|---|---|
| Renk/font/banner değişikliği | ❌ Hayır — mevcut panel yeter |
| Kampanya şeridi, küçük blok | ❌ Hayır — script enjeksiyonu yeter |
| **Sıfırdan yeni tema tasarımı** | ✅ Evet |
| **Site performansı 🔴 mobil 39, LCP 18,7 sn** | 🟡 **Belki** — aşağıya bakın |

### Performans bağlantısı — dikkatli olun

Hafızadaki **[Site Performansı]** kaydı: mobil **39 puan**, LCP **18,7 saniye**.
Bu felaket bir sayıdır.

Studio **Preact** tabanlı ve **harici paket kurulumuna izin vermiyor** — bu, teorik
olarak daha hafif bir tema demek.

🔴 **AMA:** *"Studio kullanırsak LCP düzelir"* bir **sonuç iddiasıdır ve ÖLÇÜLMEMİŞTİR.**
LCP 18,7 sn'nin sebebi tema motoru değil, büyük olasılıkla **görsellerdir**
(hafıza: **[Görsel Kalite Denetimi]** — 114 ürün <600px, demek ki görsel işleme var).

**Doğru sıra:**
1. Önce LCP'nin **gerçek sebebini ölç** (Lighthouse → hangi kaynak?)
2. Görselse → görselleri düzelt, tema değişmesin
3. Tema motoruysa → Studio'yu değerlendir

> `~/.claude/rules/ecc/common/api-verification.md` §2: *"Şekil iddiası ile sonuç
> iddiası ayrıdır."* Studio'nun Preact olması bir **gözlem**; LCP'yi düzelteceği
> ayrı bir **iddia**dır ve ayrıca ölçülmelidir.

### Studio'nun gerçekten cazip yanları

| Yetenek | Bizim için |
|---|---|
| **Figma'dan içe aktarma** | Tasarımı Figma'da yapıp doğrudan aktarma |
| **Global Değerler → Renkler** | `#ecdf93` / `#052238` paletimiz tek merkezde |
| **22 sayfa tipi** | Hafıza: **[Yasal Metin Eksikleri]** 🔴 çerez/iletişim sayfası YOK → **Özel Sayfa** ile çözülür |
| **24 hazır "Belli ol" animasyonu** | Kod yazmadan giriş animasyonları |
| **`ikas-cc-skills` Claude Code kütüphanesi** | Bizim iş akışımıza doğrudan uyuyor |

---

## 6. 🟢 KÜÇÜK AMA HEMEN — resmi skill kütüphanesini incele

https://github.com/ikascom/ikas-cc-skills/

ikas'ın **resmi Claude Code skill kütüphanesi.** Bizim `~/.claude/skills/ikas-tema`
skill'imizle karşılaştırılmalı — örtüşen, eksik veya çelişen yerler var mı?

**Maliyet:** 30 dakika okuma. **Kanıt:** Belgeli (sürüm notlarında geçiyor).

---

## 7. 🔴 RİSK UYARISI — rate limit

`08-rate-limit-ve-engelleme.md` dosyasındaki sayılar **bizi doğrudan ilgilendiriyor**:

| Bizim iş | Risk |
|---|---|
| 424 ürünlük toplu açıklama işi | 10 sn/50 istek sınırı |
| Kanal stok senkronu otomatik turu | Tekrarlı hata → **%60 → KALICI ENGEL** |
| Webhook köprüsü | %70 hata, 1 günde **240 istek** → **KALICI ENGEL** |

🔴 **Webhook Worker'ımız downstream işi yapmadan ÖNCE 200 dönmeli.**
Bu belgede açıkça yazıyor ve bizim Worker'ımızda **doğrulanmadı**.

**Aksiyon:** Worker kodunu kontrol edin — `200` yanıtı iş bittikten sonra mı
dönüyor, yoksa hemen mi? Hemen dönmüyorsa **düzeltin.**

---

## Öncelik sırası (önerim)

| # | İş | Süre | Değer | Risk |
|---|---|---|---|---|
| 1 | **Webhook Worker 200-önce kontrolü** | 1 saat | Kalıcı engeli önler | — |
| 2 | **ikas MCP (salt-okunur)** | 15 dk | Şema tahmini biter | düşük |
| 3 | **Storefront Events → gerçek dönüşüm** | 1 gün | Reklam kararları düzelir | düşük |
| 4 | `ikas-cc-skills` inceleme | 30 dk | Bilgi | — |
| 5 | **Kampanya şeridi API enjeksiyonu** | yarım gün | Açık iş kapanır | orta |
| 6 | LCP'nin gerçek sebebini ölç | 2 saat | Karar dayanağı | — |
| 7 | Admin App (Gizli) — fatura aksiyonu | 1–2 hafta | Elle iş biter | orta |
| 8 | ikas Studio değerlendirmesi | — | Beta, beklemeli | yüksek |

---

## Ne YAPMAMALIYIZ

| Cazip gelen | Neden hayır |
|---|---|
| Uygulamayı Admin App'e **taşımak** | Electron uygulaması yerini tutmaz; Admin App **yanında** durmalı |
| ikas Studio ile **temayı yeniden yazmak** | Beta; ayrıca LCP sebebi ölçülmedi |
| MCP ile **toplu yazma** yapmak | Koruma katmanlarımızı atlar |
| Uygulamayı **Herkese Açık** yayınlamak | İnceleme + partner doğrulama; bize gerek yok |
| Scope'ları sonradan genişletmek | *"Tüm mağaza sahipleri yeniden yetki vermeli"* — baştan geniş seçin |
