<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-line-variant-price -->

# OrderLineVariantPrice

```graphql
type OrderLineVariantPrice {
  buyPrice: Float
  currency: String
  currencySymbol: String
  discountPrice: Float
  priceListId: String
  sellPrice: Float!
  unitPrice: Float
}
```
Copy

#### Fields
`buyPrice`Float

It is the buy price of variant.

`currency`String

It is the currency code of variant.

`currencySymbol`String

`discountPrice`Float

It is the discount price of variant.

`priceListId`String

It is the id of the price list to which the variant is associated.

`sellPrice`Float!required

It is the sell price of variant.

`unitPrice`Float

It is the unit price of variant.
