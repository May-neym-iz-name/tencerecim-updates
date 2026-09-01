<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/update-order-addresses-input -->

# UpdateOrderAddressesInput

```graphql
type UpdateOrderAddressesInput {
  billingAddress: OrderAddressInput
  orderId: String!
  shippingAddress: OrderAddressInput
}
```
Copy

#### Fields
`billingAddress`OrderAddressInput

The address information to which the order will be billing.

`orderId`String!required

It is the order id for which the invoice is issued.

- Is the entered id must be exist in ikas.

`shippingAddress`OrderAddressInput

The address information to which the order will be shipping.
