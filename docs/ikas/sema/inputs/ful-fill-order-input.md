<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/ful-fill-order-input -->

# FulFillOrderInput

```graphql
type FulFillOrderInput {
  lines: [FulfillOrderLineInput!]!
  markAsReadyForShipment: Boolean
  orderId: String!
  sendNotificationToCustomer: Boolean
  sourcePackageId: String
  trackingInfoDetail: TrackingInfoDetailInput
}
```
Copy

#### Fields
`lines`[FulfillOrderLineInput!]!required

`markAsReadyForShipment`Boolean

`orderId`String!required

`sendNotificationToCustomer`Boolean

`sourcePackageId`String

`trackingInfoDetail`TrackingInfoDetailInput
