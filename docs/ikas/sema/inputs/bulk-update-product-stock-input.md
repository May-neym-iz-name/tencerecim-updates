<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/bulk-update-product-stock-input -->

# BulkUpdateProductStockInput

```graphql
type BulkUpdateProductStockInput {
  stockCount: Float!
  stockLocationId: String!
}
```
Copy

#### Fields
`stockCount`Float!required

Number of available items in the stock location.

`stockLocationId`String!required

Id of the stock location.
