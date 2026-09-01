<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/product-attribute-table-template -->

# ProductAttributeTableTemplate

```graphql
type ProductAttributeTableTemplate {
  columns: [ProductAttributeTableCellData!]!
  rows: [ProductAttributeTableCellData!]!
}
```
Copy

#### Fields
`columns`[ProductAttributeTableCellData!]!required

List of columns for product attribute table.

`rows`[ProductAttributeTableCellData!]!required

List of rows for product attribute table.
