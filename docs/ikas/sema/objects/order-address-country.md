<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-address-country -->

# OrderAddressCountry

```graphql
type OrderAddressCountry {
  id: String
  code: String
  iso2: String
  iso3: String
  name: String!
}
```
Copy

#### Fields
`id`String

It is the id of the country of the address.

`code`String

It is the code of the country of the address.

`iso2`String

It is the two-letter code of the country of the address.

`iso3`String

It is the three-letter code of the country of the address.

`name`String!required

It is the name of the country of the address.
