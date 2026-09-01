<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/search-product-brand -->

# SearchProductBrand

```graphql
type SearchProductBrand {
  id: String!
  imageId: String
  name: String!
  slug: String
  translations: [SearchProductBrandTranslation!]
}
```
Copy

#### Fields
`id`String!required

`imageId`String

`name`String!required

`slug`String

`translations`[SearchProductBrandTranslation!]
