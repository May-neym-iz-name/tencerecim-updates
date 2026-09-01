<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/webhook-input -->

# WebhookInput

```graphql
type WebhookInput {
  endpoint: String!
  salesChannelIds: [String!]
  scopes: [String!]!
}
```
Copy

#### Fields
`endpoint`String!required

`endpoint` must be a valid `URL` address.

`salesChannelIds`[String!]

You can filter webhooks by using specific SalesChannel id. Please check `listSalesChannel` query to retrieve active sales channel ids.

`scopes`[String!]!required

Valid scopes are `store/order/created` `store/order/updated` `store/product/created` `store/product/updated` `store/customer/created` `store/customer/updated` `store/customerFavoriteProducts/created` `store/customerFavoriteProducts/updated` `store/stock/created` `store/stock/updated`.
