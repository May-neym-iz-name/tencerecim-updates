<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/search-htmlmeta-data -->

# SearchHTMLMetaData

```graphql
type SearchHTMLMetaData {
  canonicals: [String!]
  description: String
  disableIndex: Boolean
  metadataOverrides: [SearchHTMLMetaDataOverride!]
  pageTitle: String
  redirectTo: String
  slug: String!
  translations: [HTMLMetaDataTranslation!]
}
```
Copy

#### Fields
`canonicals`[String!]

`description`String

`disableIndex`Boolean

`metadataOverrides`[SearchHTMLMetaDataOverride!]

`pageTitle`String

`redirectTo`String

`slug`String!required

`translations`[HTMLMetaDataTranslation!]
