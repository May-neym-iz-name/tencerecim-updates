# 02 — ikas CLI ve Geliştirme Ortamı

> Kaynak: `/docs/app-development/admin-app/ikas-cli` · `/admin-app/development` · `/admin-app` (Hızlı Başlangıç)
> Kanıt seviyesi: **Belgeli**

## Gereksinim

**Node.js v16+** ve ikas Partner hesabı (test mağazasıyla birlikte).

## Kurulum

```bash
npm i -g ikas
ikas --version        # sürüm kontrolü
```

Güncelleme de aynı komutla yapılır: `npm i -g ikas`.

## Komutlar

| Komut | Kategori | Ne yapar |
|---|---|---|
| `ikas app init` | Uygulama | Yeni ikas app projesi oluşturur |
| `ikas app dev` | Uygulama | Geliştirme sunucusu + tünel başlatır |
| `ikas auth login` | Kimlik | CLI üzerinden ikas hesabına giriş |
| `ikas help` | Yardım | Komut listesi |
| `ikas --version` | Yardım | CLI sürümü |

---

## `ikas app init` — interaktif kurulum

Sorduğu adımlar:

1. **Uygulama adı**
2. **Framework seçimi** → Next.js (önerilen)
3. **Şablon seçimi** (3 seçenek):
   - `Starter App` — temel iskelet
   - `Dashboard Actions App` — örnek iframe + API aksiyonlarıyla gelir
   - `Starter App with subscription` — plan/abonelik akışı dahil
   - (Ayrıca `Webhook Listener` tipi de belgede geçer)
4. **Yeni OAuth uygulaması oluşturma** → otomatik
5. **API izin kapsamlarının (scope) seçimi**
6. Sonuç: **Client ID** + **Client Secret** verilir, `.env` otomatik yazılır

### Üretilen projenin teknoloji yığını

| Katman | Teknoloji |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript 5, Tailwind CSS v4 |
| Kimlik | OAuth 2.0, JWT, Iron Session |
| Veritabanı | Prisma ORM + SQLite |
| API | GraphQL, `@ikas/admin-api-client` |
| AI | cursor rules, context7 MCP, shadcn/ui MCP hazır gelir |

---

## `ikas app dev` — geliştirme sunucusu

Proje dizini içinde çalıştırılır. Yaptıkları:

1. **Test mağazası seçimi** ister (ad ikas Partners'taki ile **birebir aynı** olmalı)
2. **Cloudflare Tunnel** kurar → `https://xyz.trycloudflare.com` → `http://localhost:3000`
3. Tarayıcıyı **OAuth yetkilendirme sayfasına** yönlendirir
4. Uygulamayı ikas Admin Paneline bağlar → "Congratulations!" mesajı

### Tünel hakkında uyarılar

- Tünel ömrü **8 saattir**, sonra yenilenmeli
- **Terminali kapatmak tüneli öldürür**
- Tüm trafik HTTPS; OAuth akışı için zorunlu
- Süre dolunca `ikas app dev` tekrar çalıştırılır → yeni tünel üretilir
- Kod değişiklikleri panele **gerçek zamanlı** yansır

---

## Güvenlik mimarisi (belgede vurgulanan)

- Oturum yönetimi **sunucu tarafında**
- JWT doğrulaması `getUserFromRequest` ile
- 🔴 **Tarayıcıdan doğrudan GraphQL API çağrısı KESİNLİKLE yasak** — tüm çağrılar backend üzerinden

## Önerilen geliştirme akışı

```
GraphQL operasyon keşfi → graphql-requests.ts'e doküman ekle
   → codegen → API route yaz → frontend'e bağla → test
```
