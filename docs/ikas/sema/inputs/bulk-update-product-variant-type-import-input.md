<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/bulk-update-product-variant-type-import-input -->

# BulkUpdateProductVariantTypeImportInput

```graphql
type BulkUpdateProductVariantTypeImportInput {
  order: Float!
  variantTypeName: String
  variantValues: [BulkUpdateProductVariantValueImportInput!]!
}
```
Copy

#### Fields
`order`Float!required

Order of the variant type.

`variantTypeName`String

Name of variant type.

`variantValues`[BulkUpdateProductVariantValueImportInput!]!required

List of variant values.
