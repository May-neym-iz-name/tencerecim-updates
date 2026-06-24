# ikas Admin API Reference (v1)

Curated reference for the Tencerecim desktop app's ikas integration (private app, OAuth client-credentials, Admin GraphQL).

- **GraphQL endpoint:** `https://api.myikas.com/api/v1/admin/graphql`
- **HTTP method:** `POST`, `Content-Type: application/json`
- **Auth header:** `Authorization: Bearer <access_token>`
- **Token endpoint:** `https://<store_name>.myikas.com/api/admin/oauth/token`
- Source: https://ikas.dev/docs/intro and the pages cited per section below.
- **Note:** ikas now markets a v2 ("builders") API at https://builders.ikas.com/docs/app-development for new builds. This doc targets the **v1 Admin API** that the app currently uses.

---

## 1. Getting Started / App Types

Source: https://ikas.dev/docs/intro

- **Private App** — created from ikas Dashboard > Apps > My Apps > More > **Create Private App**. On creation ikas auto-generates a **client id** and **client secret** (keep the secret secure — full account access). This is what the Tencerecim app uses.
- **Public / Custom apps** — distributed apps using the standard OAuth authorization-code flow; not relevant for our single-store private integration.
- **Authorization model:** scope-based. You declare required scopes when creating the private app. Scope families: product (view/edit), order (view/edit + status changes), customer (view/edit), campaign/discount (view/create), inventory/stock (view/manage).
- An interactive **GraphQL Playground** is available in the portal for testing.

---

## 2. Authentication / OAuth

Source: https://ikas.dev/docs/api/getting-started/authentication

Client-credentials flow:

```bash
curl -X POST 'https://<store_name>.myikas.com/api/admin/oauth/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=client_credentials' \
  -d 'client_id=<CLIENT_ID>' \
  -d 'client_secret=<CLIENT_SECRET>'
```

Response:

```json
{
  "access_token": "<JWT>",
  "token_type": "Bearer",
  "expires_in": 14400
}
```

- **Token lifetime:** `expires_in = 14400` seconds = **4 hours**. Cache the token and refresh before expiry (do not request a new token per call).
- All GraphQL calls then send `Authorization: Bearer <access_token>` plus `Content-Type: application/json`.
- **Scopes:** declared in the app config (e.g. view/edit orders on all sales channels incl. their products and customers; view/manage stock; view/edit products & customers). The portal does not publish raw scope identifier strings; they are selected via checkboxes in the dashboard and map to the webhook `store/<resource>/<event>` topics.

**Notes / gotchas:** token endpoint is store-scoped (`<store_name>.myikas.com`), but the GraphQL endpoint is the shared `api.myikas.com`. Don't confuse the two hosts.

---

## 3. Rate Limits, Pagination, Filters, Sorting

Sources: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-pagination-response, https://ikas.dev/docs/api/admin-api/products

### Pagination (page-based)

All `list*` queries take a `pagination: PaginationInput` and return a `*PaginationResponse`:

```graphql
input PaginationInput {
  page: Int   # page number, default 1
  limit: Int  # rows per page, 1-200, default 50
}

type OrderPaginationResponse {
  count: Int!        # total record count
  data: [Order!]!
  hasNext: Boolean!  # more pages exist
  limit: Int!
  page: Int!
}
```

- Loop pages while `hasNext == true`. Max `limit` is **200** (default 50). Same shape for `ProductPaginationResponse`, `CustomerPaginationResponse`, etc.

### Sorting

- `sort: String`. For products: sort applies to `createdAt`, `updatedAt`, `name`. Convention is field name, with `-` prefix for descending (e.g. `"-updatedAt"`).

### Filter input types

- `StringFilterInput` — equality/contains conditions on string fields (id, email, phone, name, sku, etc.).
- `DateFilterInput` — date range filtering (used on `updatedAt`, `orderedAt`, etc.); supports gte/lte style bounds.
- Enum filters — pass enum value arrays for `status`, `orderPackageStatus`, `orderPaymentStatus`.
- `CategoryFilterInput` — hierarchical category filtering on products.

**Rate limits:** the public docs do **not** publish explicit numeric rate limits/throttling for v1. Treat the API as throttled: batch with `limit=200`, back off on errors, and cache the OAuth token. Prefer webhooks over tight polling loops (see section 4).

---

## 4. Webhooks (HIGH PRIORITY — can augment/replace polling)

Source: https://ikas.dev/docs/api/admin-api/webhooks, https://ikas.dev/docs/api/type-definitions/admin-api/objects/webhook

**Webhooks ARE supported.** This can replace the current `listOrder` polling loop.

### Webhook object

```graphql
type Webhook {
  id: ID!
  endpoint: String!  # URL ikas POSTs the webhook to
  scope: String!     # topic, e.g. "store/order/created"
}
```

### Operations

```graphql
# Register / update one or more webhooks
saveWebhook(input: WebhookInput!): [Webhook!]

# input shape:
input WebhookInput {
  scopes: [String!]!   # one or more topic strings
  endpoint: String!    # your receiver URL
}

# List all registered webhooks for the app
listWebhook: [Webhook!]!

# Remove webhooks by topic
deleteWebhook(scopes: [String!]!): Boolean!
```

Example:

```graphql
mutation {
  saveWebhook(input: {
    scopes: ["store/order/created", "store/order/updated"],
    endpoint: "https://your-receiver.example.com/ikas/webhook"
  }) { id endpoint scope }
}
```

### Topics / scopes

Topic strings follow the pattern **`store/<resource>/<event>`**. Documented examples: `store/customer/created`, `store/customer/updated`. By the same pattern the order/product/stock resources expose created/updated events (e.g. `store/order/created`, `store/order/updated`, `store/product/created`, `store/product/updated`, `store/stock/updated`). The topic set corresponds to the API scopes your app holds.

**Verify the exact available topic strings in the GraphQL Playground / dashboard before relying on them — the docs only enumerate the customer examples explicitly.**

### Delivery & reliability

- ikas POSTs to your `endpoint`. If the endpoint is unreachable or returns anything other than **HTTP 200**, ikas **retries up to 3 times, then stops** sending that webhook.
- Your receiver must respond `200` quickly and process async.

**Notes / gotchas:** docs do not detail a signature-verification header in this section. Until confirmed, treat the webhook only as a *trigger* and re-fetch the authoritative record via `listOrder`/`listProduct` using the id in the payload. Keep a low-frequency reconciliation poll as a safety net for missed/retry-exhausted deliveries.

---

## 5. Orders

Source: https://ikas.dev/docs/api/admin-api/orders

### listOrder query

```graphql
listOrder(
  id: StringFilterInput
  orderNumber: StringFilterInput
  customerId: StringFilterInput
  customerEmail: StringFilterInput
  status: [OrderStatusEnum]
  orderPackageStatus: [OrderPackageStatusEnum]
  orderPaymentStatus: [OrderPaymentStatusEnum]
  salesChannelId: StringFilterInput
  stockLocationId: StringFilterInput
  orderedAt: DateFilterInput
  updatedAt: DateFilterInput
  pagination: PaginationInput
  sort: String
): OrderPaginationResponse
```

(Filter the polling job by `updatedAt` (incremental) plus `orderPackageStatus`/`status` as needed.)

### Order fields (key set)

- Identity: `id`, `orderNumber`, `orderedAt`, `createdAt`, `updatedAt`, `status`, `orderPackageStatus`, `orderPaymentStatus`
- Customer: `customer { id firstName lastName email phone }`, `customerId`
- Money: `totalFinalPrice`, `totalPrice`, `currencyCode`, `currencyСode`, adjustments (campaigns, coupons)
- Lines: `orderLineItems { id variant { id sku name } quantity price finalPrice status }`
- Addresses: `shippingAddress`, `billingAddress` (name, phone, addressLine1/2, city, district, country, postalCode)
- Fulfillment: `orderPackages { id packageNumber orderPackageFulfillStatus trackingInfo { trackingNumber cargoCompany trackingLink barcode } }`
- Channel: `salesChannel { id name type }`, `branch`/`branchSessionId`

### Enums (verbatim)

**OrderStatusEnum:**
```
CANCELLED
CREATED
DRAFT
PARTIALLY_CANCELLED
PARTIALLY_REFUNDED
REFUNDED
REFUND_REJECTED
REFUND_REQUESTED
WAITING_UPSELL_ACTION
```

**OrderPackageStatusEnum:**
```
CANCELLED
CANCEL_REJECTED
CANCEL_REQUESTED
DELIVERED
FULFILLED
PARTIALLY_CANCELLED
PARTIALLY_DELIVERED
PARTIALLY_FULFILLED
PARTIALLY_READY_FOR_SHIPMENT
PARTIALLY_REFUNDED
READY_FOR_PICK_UP
READY_FOR_SHIPMENT
REFUNDED
REFUND_REJECTED
REFUND_REQUESTED
REFUND_REQUEST_ACCEPTED
UNABLE_TO_DELIVER
UNFULFILLED
```

**OrderPaymentStatusEnum:**
```
FAILED
PAID
PARTIALLY_PAID
WAITING
```

### Mutations

**Fulfill order + tracking:**
```graphql
fulfillOrder(input: FulFillOrderInput!): Order!

input FulFillOrderInput {
  orderId: String!
  lines: [FulfillOrderLineInput!]!     # which order lines + qty to fulfill
  markAsReadyForShipment: Boolean
  sendNotificationToCustomer: Boolean
  sourcePackageId: String
  trackingInfoDetail: TrackingInfoDetailInput   # tracking number, cargo company, link, barcode
}
```

**Update package status (+ tracking):**
```graphql
updateOrderPackageStatus(input: UpdateOrderPackageStatusInput!): Order!
# Set a package to READY_FOR_SHIPMENT / DELIVERED etc. and attach tracking info.
```

**Refund order lines:**
```graphql
refundOrderLine(input: OrderRefundInput!): Order!
```

**Other order mutations available:**
- `cancelFulfillment` — reverse a fulfillment
- `updateOrderAddresses` — modify billing/shipping addresses
- `cancelOrderLine` — cancel specific lines (referenced; confirm exact input in Playground)

**Notes / gotchas:** the app already uses `cancelOrderLine` → fallback `refundOrderLine` (see commit history v1.2.34). `finalUnitPrice null` previously caused price mismatch (v1.2.33). Always read back the returned `Order` to confirm new `orderPackageStatus`.

---

## 6. Products & Variants

Source: https://ikas.dev/docs/api/admin-api/products, https://ikas.dev/docs/api/type-definitions/admin-api/objects/variant

### listProduct query

```graphql
listProduct(
  id: StringFilterInput
  name: StringFilterInput
  sku: StringFilterInput
  brandId: StringFilterInput
  vendorId: StringFilterInput
  categoryIds: CategoryFilterInput
  tagIds: StringFilterInput
  barcodeList: StringFilterInput
  variantTypeId: StringFilterInput
  variantStockLocationId: StringFilterInput
  includeDeleted: Boolean
  pagination: PaginationInput
  sort: String           # createdAt | updatedAt | name
): ProductPaginationResponse
```

### Product fields

- Required: `id`, `name`, `type` (ProductTypeEnum), `variants [Variant]`
- Content: `description`, `shortDescription`, `metaData` (HTMLMetaData — **SEO**), `weight`, `baseUnit`
- Classification: `categories`, `categoryIds`, `tags`, `tagIds`, `brand`, `brandId`, `attributes [ProductAttributeValue]`
- Visibility: `salesChannelIds`, `hiddenSalesChannelIds`
- i18n: `translations [ProductTranslation]`

### Variant fields (verbatim set)

```
id: ID!
sku: String
barcodeList: [String]
weight: Float
isActive: Boolean!
prices: [ProductPrice]!          # buyPrice, sellPrice, discountPrice, currency
stocks: [ProductStockLocation]   # stockCount per stockLocationId
sellIfOutOfStock: Boolean
attributes: [ProductAttributeValue]
images: [ProductImage]
variantValueIds: [VariantValueRelation]
unit: VariantUnitModel
bundleSettings: BundleSettingsModel
fileId: String
hsCode: String
```

### SEO metaData

- `metaData` is an **HTMLMetaData** object (title, description, slug, canonicals, OG tags). Set per product, per category, and per brand. Editable through the respective save mutations (`saveProduct`, `saveCategory`).

### Mutations

- `saveProduct(input: ProductInput!)` — create/update product (incl. variants, barcode, SKU, metaData/SEO).
- `deleteProductList(idList: [String!]!)`
- `bulkUpdateProducts(input: BulkUpdateProductsInput!)` — batch updates.
- `saveVariantPrices(input: SaveVariantPricesInput!)` — `priceListId` + `variantPriceInputs { productId variantId buyPrice sellPrice }`.
- `updateProductSalesChannelStatus` — channel visibility.
- Categories: `saveCategory` / `productCategory` (with their own `metaData` SEO).
- **Image upload is REST, not GraphQL:** `POST /api/v1/admin/product/upload/image` with `productImage { variantIds(required), order, isMain, url|base64 }` (also `categoryImage`, `brandImage`).

---

## 7. Stock / Inventory

Sources: https://ikas.dev/docs/api/admin-api/products, https://ikas.dev/docs/api/type-definitions/admin-api/mutations/save-product-stock-locations

### Stock model

- Stock is tracked **per variant per stock location**. Each `Variant.stocks` entry is a `ProductStockLocation` with `stockCount` and `stockLocationId`.
- Stock locations list: `listStockLocation` query (returns id, name, type/address). (Exact field page returned 404; confirm fields in Playground.)

### saveProductStockLocations mutation (exact input)

```graphql
saveProductStockLocations(input: SaveStockLocationsInput!): Boolean!

input SaveStockLocationsInput {
  productStockLocationInputs: [ProductStockLocationInput!]
}

input ProductStockLocationInput {
  id: ID
  productId: String!         # product the variant belongs to
  variantId: String!         # the variant
  stockLocationId: String!   # which location's stock to edit
  stockCount: Float!         # the new stock quantity
}
```

Example:

```graphql
mutation {
  saveProductStockLocations(input: {
    productStockLocationInputs: [
      { productId: "P1", variantId: "V1", stockLocationId: "LOC_A", stockCount: 12 }
    ]
  })
}
```

**Notes / gotchas:** `stockCount` is the **absolute** count for that location (a set, not a delta). This is the mutation the app already uses for push sync (v1.2.21). Batch multiple variants/locations in one call via the array.

---

## 8. Customers

Source: https://ikas.dev/docs/api/admin-api/customers

### listCustomer query

```graphql
listCustomer(
  id: StringFilterInput
  email: StringFilterInput
  phone: StringFilterInput
  merchantId: StringFilterInput
  search: String
  updatedAt: DateFilterInput
  pagination: PaginationInput
  sort: String
): CustomerPaginationResponse
```

### Customer fields

- Core: `id`, `firstName`, `lastName`, `email`, `phone`, `accountStatus`, `isEmailVerified`, `isPhoneVerified`
- **Purchase stats (valuable):** `orderCount`, `totalOrderPrice`, `firstOrderDate`, `lastOrderDate`
- Other: `addresses` (10 most recently updated), `customerGroupIds`, `customerSegmentIds`, `tagIds`, `priceListId`, `preferredLanguage`, `note`

**Notes / gotchas:** `orderCount` / `totalOrderPrice` come precomputed — no need to aggregate orders client-side for customer lifetime value. A `saveCustomer` mutation likely exists but is not documented on the customers page; confirm in Playground before relying on writes.

---

## 9. Price Lists, Discounts, Campaigns, Gift Cards

Source: https://ikas.dev/docs/api/admin-api/price-lists

- **Price Lists:** read-only via `listPriceList` (id, name, currency, rule lists). Per-variant prices are written through `saveVariantPrices` (section 6) with a `priceListId`.
- **Discounts / Campaigns / Gift Cards:** **not exposed** as documented create/manage operations in the v1 Admin API. Campaign/coupon data appears on orders as read-only adjustments. Do not assume programmatic create/manage; manage these in the dashboard.

---

## Quick reference

| Operation | Type | Purpose |
|---|---|---|
| `listOrder` | query | fetch orders (filters: updatedAt, status, package/payment status, channel) |
| `fulfillOrder` | mutation | fulfill lines + tracking |
| `updateOrderPackageStatus` | mutation | set package status + tracking |
| `refundOrderLine` | mutation | refund lines |
| `cancelOrderLine` / `cancelFulfillment` | mutation | cancel |
| `updateOrderAddresses` | mutation | edit addresses |
| `listProduct` / `saveProduct` | query/mutation | products incl. SEO metaData |
| `saveVariantPrices` | mutation | variant pricing per price list |
| `saveProductStockLocations` | mutation | set absolute stock per location |
| `listStockLocation` | query | locations |
| `listCustomer` | query | customers + orderCount/totalOrderPrice |
| `saveWebhook` / `listWebhook` / `deleteWebhook` | mutation/query | webhook subscriptions |
| `listPriceList` | query | price lists (read-only) |
