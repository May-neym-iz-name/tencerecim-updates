<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/order-refund-input -->

# OrderRefundInput

```graphql
type OrderRefundInput {
  orderId: String!
  orderRefundLines: [OrderRefundLineInput!]!
  paymentGatewayId: String!
  reason: String
  refundGift: Boolean
  refundShipping: Boolean
  sendNotificationToCustomer: Boolean
  stockLocationId: String!
}
```
Copy

#### Fields
`orderId`String!required

`orderRefundLines`[OrderRefundLineInput!]!required

`paymentGatewayId`String!required

`reason`String

`refundGift`Boolean

`refundShipping`Boolean

`sendNotificationToCustomer`Boolean

`stockLocationId`String!required
