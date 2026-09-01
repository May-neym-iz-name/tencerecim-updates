<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/order-payment-status-enum-input-filter -->

# OrderPaymentStatusEnumInputFilter

```graphql
type OrderPaymentStatusEnumInputFilter {
  eq: OrderPaymentStatusEnum
  in: [OrderPaymentStatusEnum]
  ne: OrderPaymentStatusEnum
  nin: [OrderPaymentStatusEnum]
}
```
Copy

#### Fields
`eq`OrderPaymentStatusEnum

`equal`. The filter used for equality.

`in`[OrderPaymentStatusEnum]

Returns a boolean indicating whether a specified value is in an array.

`ne`OrderPaymentStatusEnum

`not equal`. The filter used for not equality.

`nin`[OrderPaymentStatusEnum]

Returns a boolean indicating whether a specified value is not in an array.
