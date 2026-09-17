# 03 — Yetkilendirme (OAuth2)

> Kaynak: `/docs/app-development/admin-app/authorization/*` · `/docs/admin-api/authorization`
> Kanıt seviyesi: **Belgeli**

ikas, mağazaya erişim için **OAuth2 Authorization Code Flow** kullanır (Admin App).
Özel uygulamalar ise **Client Credentials Flow** kullanır.

---

## İki başlatma senaryosu — ikisini de desteklemek ZORUNLU

| Senaryo | Nasıl başlar |
|---|---|
| **A — Panelden kurulum** | Mağaza sahibi ikas Uygulama Mağazası'ndan uygulamaya tıklar; ikas `storeName` parametresiyle yönlendirir |
| **B — Uygulamadan kurulum** | Kullanıcı doğrudan sizin sitenize gelir, bir formla mağaza adını yazar |

> "Uygulamanız her iki yetkilendirme akışını da desteklemelidir."

---

## Partner panelinde önce ayarlanması gerekenler

- **Kurulum Adresi (Setup URL)**
- **Yönlendirme Adresi (Redirect URL)**
- **Gerekli scope'lar**

🔴 **Uygulamanın gönderdiği `redirect_uri`, ikas Partner'daki yönlendirme adresiyle BİREBİR aynı olmalıdır.**

---

## Akış — 4 aşama

### 1. Ana sayfa mantığı
`useBaseHomePage` hook'u: elde token var mı, URL'de parametre var mı → ya devam eder
ya da mağaza yetkilendirme sayfasına yönlendirir.

### 2. Authorize API — `app/api/oauth/authorize/route.ts`

- `storeName` query parametresi **zorunlu** (mağazanın subdomain'i)
- **CSRF için `state` üretir** ve Redis'e **60 saniye TTL** ile yazar
  - 🔴 `state` değeri **10 karakterden uzun olmalı** ve callback'te doğrulanmalı
- `@ikas/api-client` ile yetkilendirme URL'ini kurar
- Kullanıcıyı ikas panel yetkilendirme sayfasına yönlendirir

URL'de giden parametreler: `client_id`, `redirect_uri`, `scope`, `state`

### 3. Callback API — `app/api/oauth/callback/route.ts`

1. Query'den `code`, `storeName`, `state` alınır
2. **State doğrulaması** — Redis'teki değerle karşılaştırılır
3. `OAuthAPI.getTokenWithAuthorizationCode` ile token alınır
4. `me` query'si çağrılıp **authorizedAppId** öğrenilir, token Redis'e yazılır
5. (Opsiyonel) Webhook kaydı yapılır
6. Kullanıcı panele geri yönlendirilir

### 4. Callback sayfası
JWT `sessionStorage`'a yazılır, kullanıcı ikas Admin Paneline döner.

---

## Token yenileme — `lib/ikas-api.ts`

`getIkas` fonksiyonu `onCheckToken` callback'i ile token süresini kontrol eder;
dolmuşsa `OAuthAPI.refreshToken` ile yeniler ve saklar.

```typescript
export function getIkas(token: AuthToken): ikasAdminGraphQLAPIClient<AuthToken> {
  return new ikasAdminGraphQLAPIClient<AuthToken>({
    graphApiUrl: config.graphApiUrl!,
    accessToken: token.accessToken,
    tokenData: token,
    onCheckToken: () => onCheckToken(token),
  });
}
```

`onCheckToken` içinde:
```typescript
const now = new Date();
const expireDate = new Date(token.expireDate);
if (now.getTime() >= expireDate.getTime()) {
  const response = await OAuthAPI.refreshToken({
    refresh_token: token.refreshToken,
    client_id: process.env.NEXT_PUBLIC_CLIENT_ID!,
    client_secret: process.env.CLIENT_SECRET!,
  }, { storeName: 'api', storeDomain: '.myikas.dev' });
  // yeni access_token / refresh_token / expireDate kaydedilir
}
```

---

## App Access Token üretme — 2 yol

### Yol 1 (önerilen): ikas AppBridge
iframe uygulamaları için. `TokenHelpers` sınıfı:
- `sessionStorage`'da token var mı, süresi dolmuş mu bakar
- Yoksa **postMessage API** ile AppBridge'den yeni token ister
- Token isteğinde **5 saniye zaman aşımı** uygular
- Başarısızsa yetkilendirme akışına yönlendirir

```javascript
const token = await TokenHelpers.getTokenForiframeApp();
```

### Yol 2: İmza doğrulaması (AppBridge'siz harici uygulamalar)

Query parametreleri SHA256 ile doğrulanır:

```
signature = SHA256_HMAC( `${storeName}${merchantId}${timestamp}`, AppSecret )
```

Doğrulanırsa `/api/get-token-with-signature` endpoint'i JWT üretir.

### JWT ayrıntıları (`JwtHelpers`)

| Alan | Değer |
|---|---|
| Algoritma | **HS256** |
| Ömür | **1 saat** |
| `sub` claim | `merchantId` |
| `aud` claim | `authorizedAppId` |

---

## Scope değişikliklerini yönetme

Yeni özellik = yeni izin. Örn. sipariş okumak `read_orders`, değiştirmek `write_orders`.

Akış:
1. **Scope doğrulaması** — token alındıktan sonra kayıtlı scope'lar ile uygulamanın
   gerektirdikleri karşılaştırılır (bir `GET` reauthorization-check endpoint'i)
2. **Koşullu yeniden yetkilendirme**
   - iframe uygulaması → AppBridge ile panelin yetkilendirme sayfası çağrılır
   - harici uygulama → doğrudan `/api/oauth/authorize`'a yönlendirilir
3. Kullanıcı onaylayınca callback API token'ı günceller

🔴 **UYARI:** *"Scope değişikliği yapıldığında TÜM mağaza sahipleri uygulamanıza
yeniden yetki vermelidir."* — Bu ciddi bir kullanıcı deneyimi maliyetidir, scope'ları
baştan geniş seçmek daha iyidir.

---

## Özel Uygulama (Private App) yetkilendirmesi

Çok daha basit — **Client Credentials**:

```http
POST https://api.myikas.com/api/admin/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id={{client_id}}&client_secret={{client_secret}}
```

Dönen `access_token`, GraphQL çağrılarında Bearer olarak kullanılır:

```http
POST https://api.myikas.com/api/v2/admin/graphql
Authorization: Bearer {{access_token}}
```

- `client_secret` **yalnızca bir kez** gösterilir, güvenli saklayın
- Token'ın `expires_in` süresi saniye cinsindedir, dolunca yenisi alınır
- 🔴 `client_secret` asla koda gömülmez, paylaşılmaz

**Bu, Tencerecim uygulamasının bugün kullandığı akıştır.**
