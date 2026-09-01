<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/variant-input -->

# VariantInput

```graphql
type VariantInput {
  id: ID
  attributes: [ProductAttributeValueInput!]
  barcodeList: [String!]
  bundleSettings: BundleSettingsInput
  fileId: String
  hsCode: String
  images: [ProductImageInput!]
  isActive: Boolean!
  prices: [ProductPriceInput!]!
  sellIfOutOfStock: Boolean
  sku: String
  unit: VariantUnitModelInput
  variantValueIds: [VariantValueRelationInput!]
  weight: Float
}
```
Copy

#### Fields
`id`ID

`attributes`[ProductAttributeValueInput!]

`barcodeList`[String!]

`bundleSettings`BundleSettingsInput

`fileId`String

`hsCode`String

`images`[ProductImageInput!]

`isActive`Boolean!required

`prices`[ProductPriceInput!]!required

`sellIfOutOfStock`Boolean

`sku`String

`unit`VariantUnitModelInput

`variantValueIds`[VariantValueRelationInput!]

`weight`Float
