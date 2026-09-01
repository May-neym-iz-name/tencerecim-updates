<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/vendor-input -->

# VendorInput

```graphql
type VendorInput {
  id: ID
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
`id`ID

`address`String

`company`String

`email`String

`name`String!required

`phone`String

`staffName`String

`status`VendorStatusEnum

`taxNumber`String

`taxOffice`String
