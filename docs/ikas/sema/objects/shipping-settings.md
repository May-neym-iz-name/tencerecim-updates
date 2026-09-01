<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/shipping-settings -->

# ShippingSettings

```graphql
type ShippingSettings {
  id: ID!
  isPassive: Boolean
  localDeliverySettings: LocalDeliverySettings
  salesChannelId: String!
  shippingZones: [ShippingZone!]!
  stockLocations: [ShippingSettingsStockLocation!]
  type: ShippingSettingsType!
  zoneName: String!
  zoneRate: [ShippingZoneRate!]!
}
```
Copy

#### Fields
`id`ID!required

`isPassive`Boolean

`localDeliverySettings`LocalDeliverySettings

`salesChannelId`String!required

`shippingZones`[ShippingZone!]!required

`stockLocations`[ShippingSettingsStockLocation!]

`type`ShippingSettingsType!required

`zoneName`String!required

`zoneRate`[ShippingZoneRate!]!required
