<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/shipping-zone -->

# ShippingZone

```graphql
type ShippingZone {
  countryId: String!
  postalCodes: [String!]
  states: [ShippingZoneState!]
}
```
Copy

#### Fields
`countryId`String!required

`postalCodes`[String!]

`states`[ShippingZoneState!]
