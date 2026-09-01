<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/bulk-update-product-htmlmeta-data-input -->

# BulkUpdateProductHTMLMetaDataInput

```graphql
type BulkUpdateProductHTMLMetaDataInput {
  id: String!
  canonicals: [String!]
  description: String
  disableIndex: Boolean
  metadataOverrides: [BulkUpdateProductHTMLMetaDataOverrideInput!]
  pageTitle: String
  redirectTo: String
  slug: String!
  target: String
  targetType: String
}
```
Copy

#### Fields
`id`String!required

`canonicals`[String!]

Canonical URL list of entity.

`description`String

Description of the product in HTML metadata.

`disableIndex`Boolean

Defines if the entity is not indexable by search engines

`metadataOverrides`[BulkUpdateProductHTMLMetaDataOverrideInput!]

Metadata overrides for the product

`pageTitle`String

Page title for the product

`redirectTo`String

Redirect URL for the product.

`slug`String!required

Slug of the product

`target`String

Target of HTML metadata.

`targetType`String

Target type for HTML metadata.
