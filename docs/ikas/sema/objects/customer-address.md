<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/customer-address -->

# CustomerAddress

```graphql
type CustomerAddress {
  id: ID!
  addressLine1: String!
  addressLine2: String
  attributes: [CustomerAttributeValue!]
  city: CustomerAddressCity!
  company: String
  country: CustomerAddressCountry!
  district: CustomerAddressDistrict
  firstName: String!
  identityNumber: String
  isDefault: Boolean
  lastName: String!
  phone: String
  postalCode: String
  region: CustomerAddressRegion
  state: CustomerAddressState
  taxNumber: String
  taxOffice: String
  title: String!
}
```
Copy

#### Fields
`id`ID!required

`addressLine1`String!required

The customer's mailing address.

`addressLine2`String

An additional field for the customer's mailing address.

`attributes`[CustomerAttributeValue!]

`city`CustomerAddressCity!required

The customer's city.

`company`String

The customer's company.

`country`CustomerAddressCountry!required

The customer's country.

`district`CustomerAddressDistrict

The customer's district in city.

`firstName`String!required

The customer's first name.

`identityNumber`String

The customer's identity numbers.

`isDefault`Boolean

Whether this address is the default address for the customer. Returns `true` for each default address.

`lastName`String!required

The customer's last name.

`phone`String

The customer's phone number at this address

`postalCode`String

The customer's postal code, also known as zip, postcode, etc.

`region`CustomerAddressRegion

`state`CustomerAddressState

`taxNumber`String

Tax number that the customer will use for orders

`taxOffice`String

If customer is corporate, customer can use that field to fill their Tax Office name.

`title`String!required
