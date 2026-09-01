<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/create-order-with-transactions-input -->

# CreateOrderWithTransactionsInput

```graphql
type CreateOrderWithTransactionsInput {
  disableAutoCreateCustomer: Boolean
  order: CreateOrderInput!
  transactions: [OrderTransactionInput!]!
}
```
Copy

#### Fields
`disableAutoCreateCustomer`Boolean

If there is no customer connected to the e-mail in the order and it is not desired to create a new customer with this e-mail, it can be sent as `true`.

`order`CreateOrderInput!required

Contains the order information to be created.

`transactions`[OrderTransactionInput!]!required

A list of transaction objects.

- The list must contain at least one transaction.
