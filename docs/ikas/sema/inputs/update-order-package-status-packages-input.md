<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/update-order-package-status-packages-input -->

# UpdateOrderPackageStatusPackagesInput

```graphql
type UpdateOrderPackageStatusPackagesInput {
  errorMessage: String
  packageId: String!
  sourceId: String
  status: OrderPackageFulfillStatusEnum!
  trackingInfo: TrackingInfoDetailInput
}
```
Copy

#### Fields
`errorMessage`String

If the package fulfill status is an `ERROR` , this field can be sent as full.

`packageId`String!required

It is the package id whose status will be updated.

- Is the entered id must be exist in ikas.

`sourceId`String

It is the source id of the package.

`status`OrderPackageFulfillStatusEnum!required

It is the status enum of the will be updated package

`trackingInfo`TrackingInfoDetailInput

It is the tracking information of the package
