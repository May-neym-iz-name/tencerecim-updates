<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/vendor -->

# Vendor

```graphql
type Vendor {
  id: ID!
  address: String
  company: String
  email: String
  name: String!
  phone: String
  staffName: String
  status: VendorStatusEnum
  taxNumber: String
  taxOffice: String
}
```
Copy

#### Fields
`id`ID!required

`address`String

`company`String

`email`String

`name`String!required

`phone`String

`staffName`String

`status`VendorStatusEnum

`taxNumber`String

`taxOffice`String
