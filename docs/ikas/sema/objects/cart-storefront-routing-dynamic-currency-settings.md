<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/cart-storefront-routing-dynamic-currency-settings -->

# CartStorefrontRoutingDynamicCurrencySettings

```graphql
type CartStorefrontRoutingDynamicCurrencySettings {
  roundingFormat: String
  targetCurrencyCode: String!
  targetCurrencySymbol: String
}
```
Copy

#### Fields
`roundingFormat`String

One of '.x0' | '.x9' | '.00' | '.90' | '.99' | '0.00' | '9.90'

`targetCurrencyCode`String!required

`targetCurrencySymbol`String
