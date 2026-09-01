<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/bulk-update-product-variant-input -->

# BulkUpdateProductVariantInput

```graphql
type BulkUpdateProductVariantInput {
  id: String
  barcodeList: [String!]
  hsCode: String
  images: [BulkUpdateProductImageInput!]
  isActive: Boolean!
  prices: [BulkUpdateProductPriceInput!]!
  sku: String
  sourceId: String
  stocks: [BulkUpdateProductStockInput!]
  variantValues: [BulkUpdateProductVariationValueRelationInput!]
  weight: Float
}
```
Copy

#### Fields
`id`String

`barcodeList`[String!]

List of barcode for the variant.

`hsCode`String

Source id for variant.

`images`[BulkUpdateProductImageInput!]

List of images for variant.

`isActive`Boolean!required

Whether the variant is active or not.

`prices`[BulkUpdateProductPriceInput!]!required

List of prices for the variant.

`sku`String

SKU of the variant.

`sourceId`String

Source id for variant.

`stocks`[BulkUpdateProductStockInput!]

List of stocks for the variant.

`variantValues`[BulkUpdateProductVariationValueRelationInput!]

List of variant values.

`weight`Float

Weight of the variant.
