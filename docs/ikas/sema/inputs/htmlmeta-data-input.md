<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/htmlmeta-data-input -->

# HTMLMetaDataInput

```graphql
type HTMLMetaDataInput {
  id: ID
  canonicals: [String!]
  description: String
  disableIndex: Boolean
  metadataOverrides: [HTMLMetaDataOverrideInput!]
  pageTitle: String
  slug: String!
  targetId: String
  targetType: HTMLMetaDataTargetTypeEnum
  translations: [HTMLMetaDataTranslationInput!]
}
```
Copy

#### Fields
`id`ID

`canonicals`[String!]

`description`String

`disableIndex`Boolean

`metadataOverrides`[HTMLMetaDataOverrideInput!]

`pageTitle`String

`slug`String!required

`targetId`String

`targetType`HTMLMetaDataTargetTypeEnum

`translations`[HTMLMetaDataTranslationInput!]
