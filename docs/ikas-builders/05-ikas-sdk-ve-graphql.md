# 05 — ikas SDK, GraphQL Playground ve Codegen

> Kaynak: `/docs/app-development/ikas-sdk` · `/docs/admin-api/graphql-playground` · `/ikas-sdk/api-examples`
> Kanıt seviyesi: **Belgeli**

## GraphQL Playground

**Adres:** https://api.myikas.com/api/v2/admin/graphql

Geçerli bir access token gerekir; `Authorization: Bearer YOUR_TOKEN` başlığıyla gönderilir.

### İlk sorgu

```graphql
query ListProducts($pagination: PaginationInput) {
  listProduct(pagination: $pagination) {
    count
    data {
      id
      name
      description
      totalStock
      type
      brand { name }
      variants { id barcodeList }
    }
  }
}
```

**Query Variables** bölümü:
```json
{ "pagination": { "limit": 10, "page": 1 } }
```

**HTTP Headers** bölümü:
```json
{ "Authorization": "Bearer YOUR_ACCESS_TOKEN" }
```

Sağ paneldeki **Schema** sekmesi tüm query, mutation ve tipleri gösterir.

> 🔴 CLAUDE.md kuralı gereği: doküman ≠ canlı şema. Kesin cevap için **Playground'a güvenin.**

---

## GraphQL Code Generation (codegen)

Şemadan otomatik TypeScript tipi ve istemci kodu üretir:

- **Tip güvenliği** — derleme zamanı kontrol
- **IntelliSense** — IDE tamamlama
- **Hata azaltma** — runtime hatalarını önler

### `codegen.ts`

```typescript
import type { CodegenConfig } from '@graphql-codegen/cli';
import { preset } from '@ikas/admin-api-client';

const config: CodegenConfig = {
  schema: {
    'https://api.myikas.com/api/v2/admin/graphql': {
      headers: { 'Content-Type': 'application/json' },
    },
  },
  documents: ['src/lib/ikas-client/**/*.ts'],
  generates: {
    'src/lib/ikas-client/generated/graphql.ts': {
      preset,
      plugins: [],
      presetConfig: { gqlTagName: 'gql' },
    },
  },
};

export default config;
```

### `src/lib/ikas-client/graphql-requests.ts`

```typescript
import { gql } from 'graphql-request';

export const LIST_PRODUCTS = gql`
  query ListProducts($pagination: PaginationInput) {
    listProduct(pagination: $pagination) {
      count
      data {
        id name description totalStock type
        brand { name }
        variants { id barcodeNumber }
        categories { id name }
      }
    }
  }
`;

export const GET_PRODUCT = gql`
  query GetProduct($id: ID!) {
    getProduct(id: $id) {
      id name description totalStock type
      brand { name }
      variants { id barcodeList }
    }
  }
`;

export const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) { id name type totalStock }
  }
`;
```

### Üretim

```bash
pnpm codegen
```

`graphql-requests.ts` her değiştiğinde tekrar çalıştırılır. File watcher ile
otomatikleştirilebilir.

---

## API istemcisi kullanımı

### Auth yardımcıları — `src/lib/auth-helpers.ts`

```typescript
export function getUserFromRequest(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    const jwtToken = authHeader.substring(7);
    const payload = JwtHelpers.verifyToken(jwtToken);
    if (!payload || !payload.sub || !payload.aud) return null;

    return { merchantId: payload.sub, authorizedAppId: payload.aud };
  } catch (error) {
    return null;
  }
}
```

### Query örneği (API route)

```typescript
export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const token = await AuthTokenManager.get(user.authorizedAppId);
  if (!token) return NextResponse.json({ error: 'Token not found' }, { status: 401 });

  const ikasClient = getIkas(token);

  const result = await ikasClient.query({
    query: `query ListProducts($pagination: PaginationInput) {
      listProduct(pagination: $pagination) {
        count
        data { id name description totalStock type brand { name } }
      }
    }`,
    variables: { pagination: { limit: 20, page: 1 } }
  });

  return NextResponse.json({
    products: result.data.listProduct.data,
    total: result.data.listProduct.count
  });
}
```

### Mutation örneği

```typescript
const result = await ikasClient.mutation({
  query: `mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) { id name type totalStock }
  }`,
  variables: { input: { name: productData.name, type: productData.type || "SIMPLE" } }
});
```

---

## Hazır API örnekleri

Belge, en güncel ve çalıştırılabilir örnekler için **Postman koleksiyonunu** işaret ediyor:
https://documenter.getpostman.com/view/17621802/2sAYJ7eyUq

Belgedeki uyarı: *"Bu sayfadaki Postman istekleri yol gösterici örneklerdir"* —
filtreler, alanlar ve şema için canlı GraphQL arayüzü kullanılmalı.

### Belgelenmiş hazır örnek uç noktalar

| Alan | Örnekler |
|---|---|
| **Product** | create-basic-product, create-product-with-variants, add-new-variant-to-product, list-product, update-product, update-product-stock-count, update-variant-prices, update-product-sales-channel-status |
| **Order** | list-order, fulfill-order, update-order-package-status-delivered |
| **Customer** | list-customer, search-customer |
| **Merchant** | get-merchant, list-merchant-settings, list-stock-location |
| **Sales Channels** | list-sales-channel |
| **Timeline** | add-custom-timeline-entry |
| **Webhook** | list-webhook, save-webhook |

> Bunların bizdeki karşılıkları ve tuzakları için: `docs/ikas/01-OPERASYON-KATALOGU.md`
