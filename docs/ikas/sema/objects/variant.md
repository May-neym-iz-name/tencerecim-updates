<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/variant -->

# Variant

```graphql
type Variant {
  id: ID!
  attributes: [ProductAttributeValue!]
  barcodeList: [String!]
  bundleSettings: BundleSettingsModel
  fileId: String
  hsCode: String
  images: [ProductImage!]
  isActive: Boolean!
  prices: [ProductPrice!]!
  sellIfOutOfStock: Boolean
  sku: String
  stocks: [ProductStockLocation!]
  unit: VariantUnitModel
  variantValueIds: [VariantValueRelation!]
  weight: Float
}
```
Copy

#### Fields
`id`ID!required

`attributes`[ProductAttributeValue!]

List of variant attributes.

`barcodeList`[String!]

List of barcode for the variant.

`bundleSettings`BundleSettingsModel

Show the product bundle settings.

`fileId`String

Id of product file.

`hsCode`String

Hs code of the variant.

`images`[ProductImage!]

List of images for variant.

`isActive`Boolean!required

Whether the variant is active or not.

`prices`[ProductPrice!]!required

List of prices for the variant.

`sellIfOutOfStock`Boolean

Whether to sell if variant is out of stock or not.

`sku`String

SKU of the variant.

`stocks`[ProductStockLocation!]

`unit`VariantUnitModel

Translations for the product.

`variantValueIds`[VariantValueRelation!]

List of variant value ids.

`weight`Float

Weight of the variant.
