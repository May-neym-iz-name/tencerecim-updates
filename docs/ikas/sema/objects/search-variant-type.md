<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/search-variant-type -->

# SearchVariantType

```graphql
type SearchVariantType {
  id: String!
  name: String!
  selectionType: String!
  translations: [VariantTypeTranslation!]
  values: [SearchVariantValue!]!
}
```
Copy

#### Fields
`id`String!required

`name`String!required

`selectionType`String!required

`translations`[VariantTypeTranslation!]

`values`[SearchVariantValue!]!required
