<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/product-stock-location-input -->

# ProductStockLocationInput

```graphql
type ProductStockLocationInput {
  id: ID
  productId: String!
  stockCount: Float!
  stockLocationId: String!
  variantId: String!
}
```
Copy

#### Fields
`id`ID

`productId`String!required

It is the product id to which the variant associated.

`stockCount`Float!required

It is the stock quantity of the variant.

`stockLocationId`String!required

It is the stock location id information where the stock information will be edited.

`variantId`String!required

It is the of the variant.
