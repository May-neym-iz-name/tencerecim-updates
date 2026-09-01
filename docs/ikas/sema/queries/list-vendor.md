<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/queries/list-vendor -->

# listVendor

Use this query to list the vendor.

```graphql
listVendor(
  id: StringFilterInput
  includeDeleted: Boolean
  merchantId: StringFilterInput
  name: StringFilterInput
  updatedAt: DateFilterInput
): [Vendor!]!
```
Copy

#### Arguments
`id`StringFilterInput

`includeDeleted`Boolean

`merchantId`StringFilterInput

`name`StringFilterInput

`updatedAt`DateFilterInput

#### Return Type
`Vendor`Vendor
