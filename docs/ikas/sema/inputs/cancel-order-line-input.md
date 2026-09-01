<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/cancel-order-line-input -->

# CancelOrderLineInput

```graphql
type CancelOrderLineInput {
  orderId: String!
  orderLineItems: [CancelOrderLineItemInput!]!
}
```
Copy

#### Fields
`orderId`String!required

`orderLineItems`[CancelOrderLineItemInput!]!required
