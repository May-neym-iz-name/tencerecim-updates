<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/category-path-item -->

# CategoryPathItem

```graphql
type CategoryPathItem {
  id: ID!
  description: String
  imageId: String
  isAutomated: Boolean
  metaData: HTMLMetaData
  name: String!
  translations: [CategoryTranslation!]
}
```
Copy

#### Fields
`id`ID!required

`description`String

It is the description of the category of the product.

`imageId`String

It is the id where the picture of the category is kept in the system.

`isAutomated`Boolean

`metaData`HTMLMetaData

It is the metadata information of the product category.

`name`String!required

It is the name of the category in which the product is located.

`translations`[CategoryTranslation!]

It is the translation information of the product category.
