<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/product-price -->

# ProductPrice

```graphql
type ProductPrice {
  buyPrice: Float
  currency: String
  currencyCode: String
  currencySymbol: String
  discountPrice: Float
  priceListId: String
  sellPrice: Float!
}
```
Copy

#### Fields
`buyPrice`Float

Buy price of product.

`currency`String

Currency for the price of product.

`currencyCode`String

`currencySymbol`String

`discountPrice`Float

Discount price of product.

`priceListId`String

Id of the price list that the product belongs to.

`sellPrice`Float!required

Sell price of product.
