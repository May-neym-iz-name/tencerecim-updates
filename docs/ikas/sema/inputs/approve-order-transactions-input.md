<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/approve-order-transactions-input -->

# ApproveOrderTransactionsInput

```graphql
type ApproveOrderTransactionsInput {
  orderId: String!
  paymentMethods: [PaymentMethodTypeEnum!]
}
```
Copy

#### Fields
`orderId`String!required

`paymentMethods`[PaymentMethodTypeEnum!]
