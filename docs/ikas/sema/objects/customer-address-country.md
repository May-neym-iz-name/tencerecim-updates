<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/customer-address-country -->

# CustomerAddressCountry

```graphql
type CustomerAddressCountry {
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

`code`String

The two-letter country code corresponding to the customer's country.

`iso2`String

The two-letter country code corresponding to the customer's country.

`iso3`String

The two-letter country code corresponding to the customer's country.

`name`String!required

The customer's normalized country name.
