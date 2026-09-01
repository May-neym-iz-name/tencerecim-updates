<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/bundle-product-input -->

# BundleProductInput

```graphql
type BundleProductInput {
  id: String!
  addToBundleBasePrice: Boolean
  discountRatio: Float
  filteredVariantIds: [String!]!
  maxQuantity: Float
  minQuantity: Float
  order: Float!
  productId: String!
  quantity: Float!
}
```
Copy

#### Fields
`id`String!required

`addToBundleBasePrice`Boolean

`discountRatio`Float

`filteredVariantIds`[String!]!required

`maxQuantity`Float

`minQuantity`Float

`order`Float!required

`productId`String!required

`quantity`Float!required
