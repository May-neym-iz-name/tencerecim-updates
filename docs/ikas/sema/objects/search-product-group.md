<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/search-product-group -->

# SearchProductGroup

```graphql
type SearchProductGroup {
  id: String!
  groupKey: String!
  name: String!
  translations: [SearchProductGroupTranslation!]
  values: [SearchProductGroupValueType!]!
}
```
Copy

#### Fields
`id`String!required

`groupKey`String!required

`name`String!required

`translations`[SearchProductGroupTranslation!]

`values`[SearchProductGroupValueType!]!required
