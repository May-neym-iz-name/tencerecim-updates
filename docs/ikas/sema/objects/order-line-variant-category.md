<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-line-variant-category -->

# OrderLineVariantCategory

```graphql
type OrderLineVariantCategory {
  id: String!
  categoryPath: [OrderLineVariantCategoryPath!]
  name: String!
}
```
Copy

#### Fields
`id`String!required

It is the id of the category of the variant.

`categoryPath`[OrderLineVariantCategoryPath!]

It is the path of the category.

`name`String!required

It is the name of the category.
