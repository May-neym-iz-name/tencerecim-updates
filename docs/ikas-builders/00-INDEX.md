# ikas Builders Dokümantasyon Kütüphanesi

> Kaynak: **https://builders.ikas.com/docs** — 219 URL'lik site haritası taranarak
> konu bazlı derlendi.
> **Çekim tarihi: 14.09.2026** · Site canlıdır, bu dosyalar o günün fotoğrafıdır.

---

## 🔴 Bu kütüphane ile `docs/ikas/` arasındaki fark

| | `docs/ikas/` | **`docs/ikas-builders/` (burası)** |
|---|---|---|
| Ne anlatır | **Admin API'nin kendisi** — 106 operasyon, şema, input/output | **Platform ve araçlar** — uygulama geliştirme, tema, partner, MCP |
| Ne zaman bak | "Hangi mutation? Hangi alan?" | "Bunu nasıl yaparım? Hangi model?" |
| Durum | Bizim asıl referansımız | Tamamlayıcı |

**Bir ikas API alanı arıyorsanız → `docs/ikas/` .
Bir yetenek/mimari arıyorsanız → burası.**

---

## Dosyalar

### Platform ve uygulama geliştirme

| Dosya | İçerik |
|---|---|
| [01 — Uygulama Türleri ve Platform](01-uygulama-turleri-ve-platform.md) | Admin App vs Özel App, karşılaştırma tablosu, 5 temel yetenek |
| [02 — ikas CLI ve Geliştirme Ortamı](02-ikas-cli-ve-gelistirme-ortami.md) | `npm i -g ikas`, `app init`, `app dev`, Cloudflare tüneli, proje yığını |
| [03 — Yetkilendirme (OAuth2)](03-authorization-oauth.md) | Authorization Code + Client Credentials, token yenileme, JWT, scope değişimi |
| [04 — Uygulama Aksiyonları](04-uygulama-aksiyonlari.md) | 🟢 Panele buton ekleme: ürün/sipariş/paket/toplu aksiyonlar, imza doğrulama |
| [05 — ikas SDK ve GraphQL](05-ikas-sdk-ve-graphql.md) | Playground, codegen, `getIkas`, query/mutation örnekleri |
| [06 — Webhook'lar](06-webhooks.md) | 9 scope, imza doğrulama, 3 retry kuralı |
| [07 — Planlar ve Yayınlama](07-planlar-ve-yayinlama.md) | Plan türleri, bölgeler, 5 aşamalı yayınlama, Gizli yayınlama, izinli mağazalar, analytics |
| [08 — Rate Limit ve Engelleme](08-rate-limit-ve-engelleme.md) | 🔴 **10sn/50 istek**, kalıcı engel eşikleri |
| [31 — Özel Uygulama](31-ozel-uygulama-private-app.md) | 🟢 Bizim bugünkü modelimiz |

### AI ve ölçüm

| Dosya | İçerik |
|---|---|
| [09 — ikas AI ve MCP](09-ikas-ai-ve-mcp.md) | 🟢 **MCP sunucusu**, yetenek listesi, Cursor/Claude yapılandırması, XML prompt kalıbı |
| [10 — Storefront Events](10-storefront-events.md) | 🟢 **18 vitrin olayı**, `window.IkasEvents`, tam örnek dosya |

### Tema — ikas Studio

| Dosya | İçerik |
|---|---|
| [20 — Studio Nedir ve Kurulum](20-studio-nedir-ve-kurulum.md) | 🔴 Mevcut tema ≠ Studio · 3 kip · Preact · `ikas theme init` · proje yapısı · yayınlama · sürüm notları |
| [21 — İçerik ve Tasarım Kipi](21-studio-icerik-ve-tasarim.md) | 22 sayfa tipi · bölüm/bileşen/element/liste · 27 veri tipi · 18 olay · koşullar · 24 animasyon · global değerler · Figma · çoklu dil |
| [22 — Blueprint Kipi](22-studio-blueprint.md) | Düğüm tabanlı mantık · `onStartBrowser` · kapsam hiyerarşisi · fonksiyonlar |
| [23 — Stil ve Nitelik Referansı](23-studio-stil-ve-nitelik-referansi.md) | 18 stil kategorisi · 11 HTML + 6 ikas niteliği · SSS başlıkları |

### Partner

| Dosya | İçerik |
|---|---|
| [30 — Partner Hesabı](30-partner-hesabi.md) | Hesap açma · 3 mağaza türü · doğrulama · personel · hak edişler |

### 🟢 Karar dosyası

| Dosya | İçerik |
|---|---|
| **[90 — Tencerecim: Ne Yapabiliriz](90-TENCERECIM-NE-YAPABILIRIZ.md)** | **Bu yeteneklerin bizim durumumuza uygulanması, önceliklendirilmiş 8 maddelik plan, yapılmaması gerekenler** |

---

## Hızlı bakış — temel adresler

| Ne | Adres |
|---|---|
| Admin GraphQL API / Playground | `https://api.myikas.com/api/v2/admin/graphql` |
| OAuth token | `https://api.myikas.com/api/admin/oauth/token` |
| **MCP sunucusu** | `https://api.myikas.com/api/v2/admin/mcp` |
| Partner paneli | `https://partners.ikas.com` |
| Postman koleksiyonu | https://documenter.getpostman.com/view/17621802/2sAYJ7eyUq |
| Örnek uygulamalar | https://github.com/ikascom/ikas-app-examples |
| **Claude Code skill kütüphanesi** | https://github.com/ikascom/ikas-cc-skills |
| Dokümantasyon | https://builders.ikas.com/docs |

---

## Kanıt seviyesi notu

`~/.claude/rules/ecc/common/api-verification.md` §5 uyarınca bu dosyalardaki bilgiler:

- **Belgeli** — ikas kendi dokümanında yazıyor (çoğunluk)
- **Çıkarım** — belgeden türetildi, doğrudan yazmıyor (işaretlendi)
- **Ölçülmeli** — denenmedi (işaretlendi)

🔴 **Hiçbiri "ölçüldü" değildir.** CLAUDE.md kuralı geçerli:
*doküman ≠ canlı şema.* Kesin cevap için **Playground** veya **MCP introspection**.

### Bilinen boşluklar (çekilemeyen / eksik kalan)

| Konu | Durum |
|---|---|
| Studio SSS **cevapları** | Yalnızca 26 soru başlığı alınabildi |
| Studio hata kodları (`support/errors`) | Çekilmedi |
| Studio klavye kısayolları | Çekilmedi |
| `saveStorefrontScript` mutation imzası | Belgede verilmemiş — **Playground'da doğrulayın** |
| Storefront event payload alanları | Örnekten çıkarım — **canlıda `console.log` ile ölçün** |
| Blueprint `variables` / `types` detayı | Belgede yüzeysel |
| 20 stil alt sayfası + 17 nitelik sayfası | Dizin düzeyinde listelendi, tek tek çekilmedi |
| Figma import teknik sınırları | Belgede yazmıyor |
