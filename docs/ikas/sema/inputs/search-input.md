<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/search-input -->

# SearchInput

```graphql
type SearchInput {
  barcodeList: [String!]
  pagination: PaginationInput
  productIdList: [String!]
  query: String
  skuList: [String!]
}
```
Copy

#### Fields
`barcodeList`[String!]

List of barcodes to search.

`pagination`PaginationInput

Pagination input

`productIdList`[String!]

List of product ids to search.

`query`String

Query string to search products.

`skuList`[String!]

List of SKUs to search.
