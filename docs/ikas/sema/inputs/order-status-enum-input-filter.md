<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/order-status-enum-input-filter -->

# OrderStatusEnumInputFilter

```graphql
type OrderStatusEnumInputFilter {
  eq: OrderStatusEnum
  in: [OrderStatusEnum]
  ne: OrderStatusEnum
  nin: [OrderStatusEnum]
}
```
Copy

#### Fields
`eq`OrderStatusEnum

`equal`. The filter used for equality.

`in`[OrderStatusEnum]

Returns a boolean indicating whether a specified value is in an array.

`ne`OrderStatusEnum

`not equal`. The filter used for not equality.

`nin`[OrderStatusEnum]

Returns a boolean indicating whether a specified value is not in an array.
