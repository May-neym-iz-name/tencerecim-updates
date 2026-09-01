<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/product-order -->

# ProductOrder

```graphql
type ProductOrder {
  id: ID!
  brandIds: [String!]
  categoryIds: [String!]
  products: [ProductOrderProduct!]!
}
```
Copy

#### Fields
`id`ID!required

`brandIds`[String!]

`categoryIds`[String!]

`products`[ProductOrderProduct!]!required
