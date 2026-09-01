<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/product-option-select-value -->

# ProductOptionSelectValue

```graphql
type ProductOptionSelectValue {
  id: ID!
  colorCode: String
  order: Float!
  otherPrices: [ProductOptionSelectValueOtherPrice!]
  price: Float
  thumbnailImageId: String
  value: String!
}
```
Copy

#### Fields
`id`ID!required

`colorCode`String

`order`Float!required

`otherPrices`[ProductOptionSelectValueOtherPrice!]

`price`Float

`thumbnailImageId`String

`value`String!required
