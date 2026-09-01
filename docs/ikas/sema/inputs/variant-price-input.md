<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/variant-price-input -->

# VariantPriceInput

```graphql
type VariantPriceInput {
  price: ProductPriceInput!
  productId: String!
  variantId: String!
}
```
Copy

#### Fields
`price`ProductPriceInput!required

New prices info to update. This operation overrides price objects given here.

`productId`String!required

Id of the corresponding product.

`variantId`String!required

Id of the variant that's prices to be updated.
