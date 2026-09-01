<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/htmlmeta-data -->

# HTMLMetaData

```graphql
type HTMLMetaData {
  id: ID!
  canonicals: [String!]
  description: String
  disableIndex: Boolean
  metadataOverrides: [HTMLMetaDataOverride!]
  pageTitle: String
  redirectTo: String
  slug: String!
  targetId: String
  targetType: HTMLMetaDataTargetTypeEnum
  translations: [HTMLMetaDataTranslation!]
}
```
Copy

#### Fields
`id`ID!required

`canonicals`[String!]

Canonical URL list of entity.

`description`String

The description of the metadata.

`disableIndex`Boolean

Defines if the entity is not indexable by search engines

`metadataOverrides`[HTMLMetaDataOverride!]

`pageTitle`String

The page title of the metadata.

`redirectTo`String

`slug`String!required

The token of the metadata. It is saved as completely unique.

`targetId`String

`targetType`HTMLMetaDataTargetTypeEnum

`translations`[HTMLMetaDataTranslation!]

The translations information of the metadata.
