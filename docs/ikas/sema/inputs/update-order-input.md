<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/update-order-input -->

# UpdateOrderInput

```graphql
type UpdateOrderInput {
  editReason: String!
  orderId: String!
  orderLineItems: [OrderLineItemInput!]!
  restockItems: Boolean!
}
```
Copy

#### Fields
`editReason`String!required

`orderId`String!required

`orderLineItems`[OrderLineItemInput!]!required

`restockItems`Boolean!required
