<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/product-order-input -->

# ProductOrderInput

```graphql
type ProductOrderInput {
  id: ID
  brandIds: [String!]
  categoryIds: [String!]
  products: [ProductOrderProductInput!]!
}
```
Copy

#### Fields
`id`ID

`brandIds`[String!]

`categoryIds`[String!]

`products`[ProductOrderProductInput!]!required
