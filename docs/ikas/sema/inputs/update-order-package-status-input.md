<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/update-order-package-status-input -->

# UpdateOrderPackageStatusInput

```graphql
type UpdateOrderPackageStatusInput {
  orderId: String!
  packages: [UpdateOrderPackageStatusPackagesInput!]!
  sourceId: String
}
```
Copy

#### Fields
`orderId`String!required

It is the order id whose status will be updated.

- Is the entered id must be exist in ikas.

`packages`[UpdateOrderPackageStatusPackagesInput!]!required

A list of package objects, each containing input about an package in the order.

`sourceId`String

It is the source id of the order.
