<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/order-shipping-method-enum-filter-input -->

# OrderShippingMethodEnumFilterInput

```graphql
type OrderShippingMethodEnumFilterInput {
  eq: OrderShippingMethodEnum
  in: [OrderShippingMethodEnum]
  ne: OrderShippingMethodEnum
  nin: [OrderShippingMethodEnum]
}
```
Copy

#### Fields
`eq`OrderShippingMethodEnum

`equal`. The filter used for equality.

`in`[OrderShippingMethodEnum]

Returns a boolean indicating whether a specified value is in an array.

`ne`OrderShippingMethodEnum

`not equal`. The filter used for not equality.

`nin`[OrderShippingMethodEnum]

Returns a boolean indicating whether a specified value is not in an array.
