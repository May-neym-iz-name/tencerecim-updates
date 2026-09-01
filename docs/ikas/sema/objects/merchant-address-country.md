<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/merchant-address-country -->

# MerchantAddressCountry

```graphql
type MerchantAddressCountry {
  id: String
  code: String
  iso2: String
  iso3: String
  name: String
}
```
Copy

#### Fields
`id`String

`code`String

The ISO3 country code corresponding to the merchant's country.

`iso2`String

Two-letter country code

`iso3`String

Three-letter country code

`name`String

The merchant's normalized country name.
