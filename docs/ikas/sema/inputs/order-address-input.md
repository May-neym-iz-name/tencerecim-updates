<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/order-address-input -->

# OrderAddressInput

```graphql
type OrderAddressInput {
  id: String
  addressLine1: String!
  addressLine2: String
  city: OrderAddressCityInput!
  company: String
  country: OrderAddressCountryInput!
  district: OrderAddressDistrictInput
  firstName: String!
  identityNumber: String
  isDefault: Boolean!
  lastName: String!
  phone: String
  postalCode: String
  region: OrderAddressRegionInput
  state: OrderAddressStateInput
  taxNumber: String
  taxOffice: String
}
```
Copy

#### Fields
`id`String

If the address to be updated is registered in ikas, this field must be filled. If the Id field is sent blank, a new address is generated.

`addressLine1`String!required

The street address of the address.

`addressLine2`String

An optional additional field for the street address of the address.

`city`OrderAddressCityInput!required

The name of the city of the address.

`company`String

The company of the person associated with the address.

`country`OrderAddressCountryInput!required

The name of the country of the address.

`district`OrderAddressDistrictInput

The name of the district of the address.

`firstName`String!required

The first name of the person associated with the address

`identityNumber`String

The identity number of the person associated with the address.

`isDefault`Boolean!required

If the address is to be saved as default, this field can be sent as `true`.

`lastName`String!required

The last name of the person associated with the address

`phone`String

The phone of the person associated with the address.

`postalCode`String

The postal code of the address.

`region`OrderAddressRegionInput

The name of the region of the address.

`state`OrderAddressStateInput

The name of the state of the address.

`taxNumber`String

The tax number of the person associated with the address.

`taxOffice`String

The tax office of the person associated with the address.
