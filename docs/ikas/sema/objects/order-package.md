<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-package -->

# OrderPackage

```graphql
type OrderPackage {
  id: ID!
  errorMessage: String
  note: String
  orderLineItemIds: [String!]!
  orderPackageFulfillStatus: OrderPackageFulfillStatusEnum!
  orderPackageNumber: String!
  sourceId: String
  stockLocationId: String!
  trackingInfo: TrackingInfo
}
```
Copy

#### Fields
`id`ID!required

`errorMessage`String

If the package was sent via the cargo application and received an error, this field is filled with an error message.

`note`String

An optional note, can attach to the order package.

`orderLineItemIds`[String!]!required

It is the id list of the order line items in the package.

`orderPackageFulfillStatus`OrderPackageFulfillStatusEnum!required

It is the fulfill status of the package

`orderPackageNumber`String!required

It is the number of order package. Order package number is created with the order number - order package sequence format.

`sourceId`String

`stockLocationId`String!required

`trackingInfo`TrackingInfo

It is the stock location id information where the package will be shipped.
