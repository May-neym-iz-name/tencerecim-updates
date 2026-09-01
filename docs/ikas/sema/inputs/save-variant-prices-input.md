<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/save-variant-prices-input -->

# SaveVariantPricesInput

```graphql
type SaveVariantPricesInput {
  priceListId: String
  variantPriceInputs: [VariantPriceInput!]!
}
```
Copy

#### Fields
`priceListId`String

`variantPriceInputs`[VariantPriceInput!]!required

List of variants to be updated. Maximum 3000 entries allowed.
