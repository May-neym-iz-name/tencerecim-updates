<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-address -->

# OrderAddress

```graphql
type OrderAddress {
  id: String
  addressLine1: String!
  addressLine2: String
  city: OrderAddressCity!
  company: String
  country: OrderAddressCountry!
  district: OrderAddressDistrict
  firstName: String!
  identityNumber: String
  isDefault: Boolean!
  lastName: String!
  phone: String
  postalCode: String
  region: OrderAddressRegion
  state: OrderAddressState
  taxNumber: String
  taxOffice: String
}
```
Copy

#### Fields
`id`String

The address"s id of the order address.

`addressLine1`String!required

The street address of the address.

`addressLine2`String

An optional additional field for the street address of the address.

`city`OrderAddressCity!required

The city information of the address.

`company`String

The company of the person associated with the address.

`country`OrderAddressCountry!required

The country information of the address.

`district`OrderAddressDistrict

The district information of the address.

`firstName`String!required

The first name of the person associated with the address

`identityNumber`String

The identity number of the person associated with the address.

`isDefault`Boolean!required

The address"s id of the order address.

`lastName`String!required

The last name of the person associated with the address

`phone`String

The phone of the person associated with the address.

`postalCode`String

The postal code of the address.

`region`OrderAddressRegion

The region information of the address.

`state`OrderAddressState

The state information of the address.

`taxNumber`String

The tax number of the person associated with the address.

`taxOffice`String

The tax office of the person associated with the address.
