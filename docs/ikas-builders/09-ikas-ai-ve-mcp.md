# 09 — ikas AI: MCP Sunucusu ve AI ile Geliştirme

> Kaynak: `/docs/ikas-ai` · `/ikas-ai/mcp-capabilities` · `/ikas-ai/graphql-introspection` · `/admin-app/ai-app-development`
> Kanıt seviyesi: **Belgeli** · 🟢 **Bizim için EN YÜKSEK DEĞERLİ sayfa**

---

## 1. ikas Admin MCP Sunucusu

ikas, Admin API'sini bir **MCP sunucusu** olarak sunuyor. Cursor veya Claude gibi
MCP istemcilerinden doğrudan bağlanılabiliyor.

**Uç nokta:** `https://api.myikas.com/api/v2/admin/mcp`

### Kimlik doğrulama

Access token, mağaza panelindeki **"Uygulamalarım"** bölümünden **MCP Client** tipinde
bir uygulama oluşturularak alınır.

> *"Access Token, panelden aldığın `mcp_` ile başlayan tokendır."*

### Yapılandırma (kimlik doğrulamalı — tam yetki)

```json
{
  "mcpServers": {
    "ikas-admin": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://api.myikas.com/api/v2/admin/mcp",
        "--header",
        "Authorization:${IKAS_ADMIN_AUTH_TOKEN}"
      ],
      "env": {
        "IKAS_ADMIN_AUTH_TOKEN": "<ACCESS_TOKEN>"
      }
    }
  }
}
```

🔴 Token'ı **kaynak koda commit etmeyin**, environment variable kullanın.

### Yapılandırma (kimlik doğrulamasız — yalnızca şema keşfi)

Sadece introspection için token gerekmez:

```json
{
  "mcpServers": {
    "ikas": {
      "url": "https://api.myikas.com/api/v2/admin/mcp",
      "type": "remote"
    }
  }
}
```

> *"IDE'nize yalnızca uzak MCP sunucusunu eklemeniz yeterlidir"* — ek kimlik doğrulama
> veya istemci kurulumu gerekmez.

---

## 2. MCP'nin yetenekleri

### Query (okuma)

| Alan | Kapsam |
|---|---|
| **Müşteri** | Gelişmiş filtre ve özel niteliklerle müşteri listesi |
| **Coğrafi veri** | Ülke → il → ilçe → semt hiyerarşisi |
| **Merchant** | Mağaza bilgisi, lisans verisi |
| **Satış takibi** | **Terk edilmiş sepetler** |
| **Ürün kataloğu** | Ürün, nitelik, marka sorguları |
| **Sipariş** | Sipariş, etiket, işlem kayıtları |
| **Yapılandırma** | Vergi ve kargo ayarları |

### Mutation (yazma)

| Alan | Kapsam |
|---|---|
| **Müşteri** | Kayıt güncelleme, timeline girişi ekleme |
| **Ödeme** | Merchant app ödemesi oluşturma, webhook yönetimi |
| **Sipariş** | Sipariş oluşturma, kargolama (fulfill), **iade**, faturalama |
| **Ürün** | Ürün oluştur/güncelle, varyant ve fiyat yönetimi |
| **Kampanya** | **Kampanya oluşturma, kupon dağıtma** |
| **Storefront** | **Vitrin JavaScript scriptlerini yönetme** |
| **Timeline** | Müşteri ve sipariş için giriş ekleme |

> 🟢 **"Storefront JavaScript script yönetimi"** = `docs/ikas/` tarafındaki
> `saveStorefrontScript` / script injector. Tema tarafına **API ile** kod enjekte
> etmenin resmi yolu budur. Hafızadaki **[Tema HTML Blok Aktarım]** işi tam buraya oturur.

---

## 3. AI ile App Geliştirme

CLI ile üretilen projeler **hazırda** şunlarla gelir:
- Cursor rules
- **context7 MCP**
- **shadcn/ui MCP**
- **ikas MCP**

### Ruler yapılandırması

`.ruler/` klasörü AI ajanlarının proje kurallarını yönetir.

| MCP Server | Amaç | Komut / URL |
|---|---|---|
| **shadcn** | UI bileşen üretimi ve örnekleri | `npx shadcn@latest mcp` (stdio) |
| **ikas** | GraphQL API keşfi, introspection | `https://api.myikas.com/api/v2/admin/mcp` (HTTP) |

Kuralları uygulama:
```bash
pnpm apply:ai-rules
```

Claude, Cursor, Copilot ve diğer ajanlar için hazır; `default_agents` ve
agent-özel çıktı yolları ayarlanabilir.

### Önerilen MCP iş akışı

**GraphQL keşfi (ikas MCP):**
1. `ikas list` → mevcut GraphQL operasyonlarını keşfet
2. `ikas introspect` → operasyon detayı ve şeması
3. Query/mutation'ın tam yapısını AI'ya anlat

**UI geliştirme (shadcn MCP):**
1. `shadcn list` → mevcut bileşenler
2. `shadcn view` → bileşen kodunu incele
3. AI'dan entegrasyonu iste

**Döngü:** keşif → context verme → üretilen kodu inceleme/test → gerekirse ek bilgi

### Örnek prompt biçimi (XML etiketli)

ikas'ın belgede verdiği kalıp — Anthropic'in XML etiket rehberine dayanıyor:

```xml
<task>
Create an ikas app for Inventory Tracking that displays stock levels and low-stock alerts for products.
</task>

<requirements>
1. Product list with current stock levels
2. Visual indicators for stock status (low, medium, high)
3. Low-stock alerts section (products with stock < 10)
4. Real-time data from ikas GraphQL API
5. Clean, responsive UI using shadcn components
</requirements>

<instructions>
1. First, use ikas MCP to discover product and inventory GraphQL operations
2. Add necessary GraphQL queries to src/lib/ikas-client/graphql-requests.ts
3. Create API route at src/app/api/inventory/route.ts with JWT authentication
4. Build dashboard page at src/app/dashboard/inventory/page.tsx
5. Use shadcn components: Card, Table, Badge, Alert
6. Implement color coding: red (stock < 10), yellow (10-50), green (50+)
</instructions>

<technical_constraints>
- Follow existing project patterns in the starter template
- Use server-side API calls only (no direct GraphQL from browser)
- Implement proper error handling and loading states
- Keep TypeScript strict mode compliance
- Use the existing ApiRequests pattern for frontend-backend communication
</technical_constraints>

<output_format>
Create the files in this order:
1. GraphQL queries in graphql-requests.ts
2. API route with proper authentication
3. Dashboard page with inventory display
4. Include comments explaining key decisions
</output_format>
```

**XML etiketlerinin faydası:** netlik (bölümleri ayırır), doğruluk (talimat karışma
riskini azaltır), esneklik (bölümleri kolay düzenlemek).

### MCP kullanım kuralları (belgeden)

- API token'larını ve secret'ları **asla loglamayın**
- Gizli bilgileri environment variable ile yönetin
- Local `.env` dosyalarını VCS'den hariç tutun
- Secret'ları repository'ye **commit etmeyin**
- Rate limit'lere dikkat edin (bkz. `08-rate-limit-ve-engelleme.md`)

---

## 🟢 Tencerecim için anlamı

**Bugün bu oturumda bile kullanılabilir.** ikas MCP'yi Claude Code'a eklersek:
- `docs/ikas/sema/` dosyalarına bakmak yerine **canlı şemayı** sorgularız
  → CLAUDE.md'deki *"doküman ≠ canlı şema"* uyarısı büyük ölçüde çözülür
- Ürün/sipariş/müşteri işlerini **doğrudan konuşma içinden** yapabiliriz
- 🔴 **Ama:** `mcp_` token tam yetkilidir ve hafızadaki *fiyat yazma yasağı*,
  *saveProduct görsel silme* tuzakları MCP üzerinden de geçerlidir. MCP,
  koruma katmanlarımızı **atlar**.
