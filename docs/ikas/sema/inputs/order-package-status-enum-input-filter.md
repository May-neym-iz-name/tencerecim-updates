<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/order-package-status-enum-input-filter -->

# OrderPackageStatusEnumInputFilter

```graphql
type OrderPackageStatusEnumInputFilter {
  eq: OrderPackageStatusEnum
  in: [OrderPackageStatusEnum]
  ne: OrderPackageStatusEnum
  nin: [OrderPackageStatusEnum]
}
```
Copy

#### Fields
`eq`OrderPackageStatusEnum

`equal`. The filter used for equality.

`in`[OrderPackageStatusEnum]

Returns a boolean indicating whether a specified value is in an array.

`ne`OrderPackageStatusEnum

`not equal`. The filter used for not equality.

`nin`[OrderPackageStatusEnum]

Returns a boolean indicating whether a specified value is not in an array.
