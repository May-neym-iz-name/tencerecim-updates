<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/order-refund-line-input -->

# OrderRefundLineInput

```graphql
type OrderRefundLineInput {
  orderLineItemId: String!
  quantity: Float!
  restockItems: Boolean!
}
```
Copy

#### Fields
`orderLineItemId`String!required

`quantity`Float!required

`restockItems`Boolean!required
