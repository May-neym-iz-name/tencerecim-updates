<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/available-shipping-method -->

# AvailableShippingMethod

```graphql
type AvailableShippingMethod {
  estimatedDeliveryTime: LocalDeliverySettingsDayEstimatedDeliveryTime
  price: Float!
  rateName: String!
  shippingMethod: OrderShippingMethodEnum!
  shippingSettingsId: String!
  shippingZoneRateId: String!
}
```
Copy

#### Fields
`estimatedDeliveryTime`LocalDeliverySettingsDayEstimatedDeliveryTime

`price`Float!required

`rateName`String!required

`shippingMethod`OrderShippingMethodEnum!required

`shippingSettingsId`String!required

`shippingZoneRateId`String!required
