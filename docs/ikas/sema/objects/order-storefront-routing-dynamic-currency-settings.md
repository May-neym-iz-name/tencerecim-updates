<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-storefront-routing-dynamic-currency-settings -->

# OrderStorefrontRoutingDynamicCurrencySettings

```graphql
type OrderStorefrontRoutingDynamicCurrencySettings {
  roundingFormat: String
  targetCurrencyCode: String!
}
```
Copy

#### Fields
`roundingFormat`String

One of '.x0' | '.x9' | '.00' | '.90' | '.99' | '0.00' | '9.90'

`targetCurrencyCode`String!required
