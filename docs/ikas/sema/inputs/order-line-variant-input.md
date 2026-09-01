<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/order-line-variant-input -->

# OrderLineVariantInput

```graphql
type OrderLineVariantInput {
  id: String
  name: String
}
```
Copy

#### Fields
`id`String

It is the id of the variant. This field can be left blank if a product that is not registered in ikas will be sold.

- Is the entered id must be exist in ikas.

`name`String

It is the name of the variant.
