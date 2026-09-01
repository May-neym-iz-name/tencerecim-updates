<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/product-search-response -->

# ProductSearchResponse

```graphql
type ProductSearchResponse {
  count: Float!
  data: JSON!
  limit: Float!
  page: Float!
  results: [SearchProduct!]!
  totalCount: Float!
}
```
Copy

#### Fields
`count`Float!required

Number of search results listed in current page.

`data`JSON!required

Search result

`limit`Float!required

Maximum number of results returned in each page.

`page`Float!required

Current page number of the search results.

`results`[SearchProduct!]!required

Search result

`totalCount`Float!required

Total number of search results.
