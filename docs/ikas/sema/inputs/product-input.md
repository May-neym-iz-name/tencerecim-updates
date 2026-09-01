<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/product-input -->

# ProductInput

```graphql
type ProductInput {
  id: ID
  attributes: [ProductAttributeValueInput!]
  baseUnit: ProductBaseUnitModelInput
  brandId: String
  categoryIds: [String!]
  description: String
  googleTaxonomyId: String
  groupVariantsByVariantTypeId: String
  hiddenSalesChannelIds: [String!]
  maxQuantityPerCart: Float
  metaData: HTMLMetaDataInput
  name: String!
  productOptionSetId: String
  productVariantTypes: [ProductVariantTypeInput!]
  productVolumeDiscountId: String
  salesChannelIds: [String!]
  shortDescription: String
  tagIds: [String!]
  translations: [ProductTranslationInput!]
  type: ProductTypeEnum!
  variants: [VariantInput!]!
  vendorId: String
  weight: Float
}
```
Copy

#### Fields
`id`ID

`attributes`[ProductAttributeValueInput!]

`baseUnit`ProductBaseUnitModelInput

`brandId`String

`categoryIds`[String!]

`description`String

`googleTaxonomyId`String

`groupVariantsByVariantTypeId`String

`hiddenSalesChannelIds`[String!]

`maxQuantityPerCart`Float

Max purchasable quantity of the product for per cart.

`metaData`HTMLMetaDataInput

`name`String!required

`productOptionSetId`String

`productVariantTypes`[ProductVariantTypeInput!]

`productVolumeDiscountId`String

`salesChannelIds`[String!]

`shortDescription`String

`tagIds`[String!]

`translations`[ProductTranslationInput!]

`type`ProductTypeEnum!required

`variants`[VariantInput!]!required

`vendorId`String

`weight`Float
