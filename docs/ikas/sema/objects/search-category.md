<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/search-category -->

# SearchCategory

```graphql
type SearchCategory {
  id: String!
  name: String!
  path: [SearchCategoryPath!]!
  slug: String
  translations: [SearchCategoryTranslation!]
}
```
Copy

#### Fields
`id`String!required

`name`String!required

`path`[SearchCategoryPath!]!required

`slug`String

`translations`[SearchCategoryTranslation!]
