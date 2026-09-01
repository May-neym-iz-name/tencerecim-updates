<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/search-product-attribute -->

# SearchProductAttribute

```graphql
type SearchProductAttribute {
  id: String!
  name: String!
  tableTemplate: SearchProductAttributeTableTemplate
  translations: [ProductAttributeTranslation!]
  type: String!
}
```
Copy

#### Fields
`id`String!required

`name`String!required

`tableTemplate`SearchProductAttributeTableTemplate

`translations`[ProductAttributeTranslation!]

`type`String!required
