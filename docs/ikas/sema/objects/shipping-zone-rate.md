<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/shipping-zone-rate -->

# ShippingZoneRate

```graphql
type ShippingZoneRate {
  id: ID!
  condition: ShippingZoneRateCondition
  currency: String
  currencyCode: String
  currencySymbol: String
  price: Float!
  priceListId: String
  rateName: String!
}
```
Copy

#### Fields
`id`ID!required

`condition`ShippingZoneRateCondition

`currency`String

`currencyCode`String

`currencySymbol`String

`price`Float!required

`priceListId`String

`rateName`String!required
