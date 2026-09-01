<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/shipping-zone-state -->

# ShippingZoneState

```graphql
type ShippingZoneState {
  id: String!
  cities: [ShippingZoneCity!]
  postalCodes: [String!]
}
```
Copy

#### Fields
`id`String!required

`cities`[ShippingZoneCity!]

`postalCodes`[String!]
