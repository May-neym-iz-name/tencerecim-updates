<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/order-payment-method-enum-filter-input -->

# OrderPaymentMethodEnumFilterInput

```graphql
type OrderPaymentMethodEnumFilterInput {
  eq: PaymentMethodTypeEnum
  in: [PaymentMethodTypeEnum]
  ne: PaymentMethodTypeEnum
  nin: [PaymentMethodTypeEnum]
}
```
Copy

#### Fields
`eq`PaymentMethodTypeEnum

`equal`. The filter used for equality.

`in`[PaymentMethodTypeEnum]

Returns a boolean indicating whether a specified value is in an array.

`ne`PaymentMethodTypeEnum

`not equal`. The filter used for not equality.

`nin`[PaymentMethodTypeEnum]

Returns a boolean indicating whether a specified value is not in an array.
