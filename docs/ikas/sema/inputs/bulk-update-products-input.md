<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/bulk-update-products-input -->

# BulkUpdateProductsInput

```graphql
type BulkUpdateProductsInput {
  id: String
  brand: BulkUpdateProductBrandInput
  categories: [BulkUpdateProductCategoryInput!]!
  description: String
  googleTaxonomyId: String
  maxQuantityPerCart: Float
  metaData: BulkUpdateProductHTMLMetaDataInput
  name: String!
  productVariantTypes: [BulkUpdateProductVariantTypeImportInput!]!
  salesChannelIds: [String!]
  shortDescription: String
  sourceId: String
  tags: [BulkUpdateProductTagInput!]
  type: ProductTypeEnum!
  variants: [BulkUpdateProductVariantInput!]!
  vendor: String
  weight: Float
}
```
Copy

#### Fields
`id`String

`brand`BulkUpdateProductBrandInput

Brand of the product.

`categories`[BulkUpdateProductCategoryInput!]!required

List of categories of the product.

`description`String

Description of the product.

`googleTaxonomyId`String

Product Google Categories

`maxQuantityPerCart`Float

Max purchasable quantity of the product for per cart.

`metaData`BulkUpdateProductHTMLMetaDataInput

HTML Metadata identifier of the product.

`name`String!required

Name of the product

`productVariantTypes`[BulkUpdateProductVariantTypeImportInput!]!required

Variant types of the product.

`salesChannelIds`[String!]

Sales channel ids for bulk update.

`shortDescription`String

Short description of the product.

`sourceId`String

Source id for bulk update.

`tags`[BulkUpdateProductTagInput!]

List of product tags.

`type`ProductTypeEnum!required

Type of the product.

`variants`[BulkUpdateProductVariantInput!]!required

List of product variants.

`vendor`String

Vendor of the product.

`weight`Float

Weight of the product.
