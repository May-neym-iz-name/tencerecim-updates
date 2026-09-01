<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/branch-address -->

# BranchAddress

```graphql
type BranchAddress {
  address: String!
  city: BranchAddressCity!
  country: BranchAddressCountry!
  district: BranchAddressDistrict
  phone: String
  postalCode: String!
  state: BranchAddressState
}
```
Copy

#### Fields
`address`String!required

`city`BranchAddressCity!required

`country`BranchAddressCountry!required

`district`BranchAddressDistrict

`phone`String

`postalCode`String!required

`state`BranchAddressState
