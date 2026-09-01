<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/search-variant -->

# SearchVariant

```graphql
type SearchVariant {
  id: String!
  attributes: [SearchProductAttributeValue!]
  barcodeList: [String!]
  baseBundlePrices: [SearchProductPrice!]
  bundleSettings: BundleSettingsModel
  images: [SearchProductImage!]
  isActive: Boolean
  prices: [SearchProductPrice!]
  sellIfOutOfStock: Boolean
  sku: String
  stocks: [SearchProductStockLocation!]
  unit: VariantUnitModel
  variantValues: [SearchVariationValueRelation!]
  weight: Float
}
```
Copy

#### Fields
`id`String!required

`attributes`[SearchProductAttributeValue!]

`barcodeList`[String!]

`baseBundlePrices`[SearchProductPrice!]

`bundleSettings`BundleSettingsModel

`images`[SearchProductImage!]

`isActive`Boolean

`prices`[SearchProductPrice!]

`sellIfOutOfStock`Boolean

`sku`String

`stocks`[SearchProductStockLocation!]

`unit`VariantUnitModel

`variantValues`[SearchVariationValueRelation!]

`weight`Float
