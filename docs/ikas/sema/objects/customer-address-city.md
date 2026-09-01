<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/customer-address-city -->

# CustomerAddressCity

```graphql
type CustomerAddressCity {
  id: String
  code: String
  name: String!
}
```
Copy

#### Fields
`id`String

`code`String

The two-letter country code corresponding to the customer's country.

`name`String!required

The customer's normalized city name.
