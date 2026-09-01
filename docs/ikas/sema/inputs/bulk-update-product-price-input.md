<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/bulk-update-product-price-input -->

# BulkUpdateProductPriceInput

```graphql
type BulkUpdateProductPriceInput {
  buyPrice: Float
  currencyCode: String
  discountPrice: Float
  priceListId: String
  sellPrice: Float!
}
```
Copy

#### Fields
`buyPrice`Float

Buy price of product.

`currencyCode`String

Currency code for the price of product.

`discountPrice`Float

Discount price of product.

`priceListId`String

Id of the price list that the product belongs to.

`sellPrice`Float!required

Sell price of product.
