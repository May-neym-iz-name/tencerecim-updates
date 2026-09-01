<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/bulk-update-product-variant-value-import-input -->

# BulkUpdateProductVariantValueImportInput

```graphql
type BulkUpdateProductVariantValueImportInput {
  colorCode: String
  name: String!
  sourceId: String
  thumbnailImageUrl: String
}
```
Copy

#### Fields
`colorCode`String

Hex color code for the variant value.

`name`String!required

Name of the variant value.

`sourceId`String

Source id for variant value.

`thumbnailImageUrl`String

Thumbnail image url for the variant value.
