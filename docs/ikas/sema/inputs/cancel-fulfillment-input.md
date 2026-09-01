<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/cancel-fulfillment-input -->

# CancelFulfillmentInput

```graphql
type CancelFulfillmentInput {
  lines: [CancelFulfillmentOrderLineInput!]
  orderId: String!
  orderPackageId: String!
}
```
Copy

#### Fields
`lines`[CancelFulfillmentOrderLineInput!]

`orderId`String!required

`orderPackageId`String!required
