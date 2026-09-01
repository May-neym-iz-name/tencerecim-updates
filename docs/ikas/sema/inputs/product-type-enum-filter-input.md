<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/product-type-enum-filter-input -->

# ProductTypeEnumFilterInput

```graphql
type ProductTypeEnumFilterInput {
  eq: ProductTypeEnum
  in: [ProductTypeEnum]
  ne: ProductTypeEnum
  nin: [ProductTypeEnum]
}
```
Copy

#### Fields
`eq`ProductTypeEnum

`equal`. The filter used for equality.

`in`[ProductTypeEnum]

Returns a boolean indicating whether a specified value is in an array.

`ne`ProductTypeEnum

`not equal`. The filter used for not equality.

`nin`[ProductTypeEnum]

Returns a boolean indicating whether a specified value is not in an array.
