<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-storefront-routing -->

# OrderStorefrontRouting

```graphql
type OrderStorefrontRouting {
  id: String!
  domain: String
  dynamicCurrencySettings: OrderStorefrontRoutingDynamicCurrencySettings
  locale: String
  path: String
  priceListId: String
}
```
Copy

#### Fields
`id`String!required

It is the storefront routing id used by the storefront when the order was created.

`domain`String

It is the domain of the storefront routing.

`dynamicCurrencySettings`OrderStorefrontRoutingDynamicCurrencySettings

`locale`String

It is the locale of the storefront routing.

`path`String

It is the path of the storefront routing.

`priceListId`String

It is the price list id that associated on the storefront routing.
