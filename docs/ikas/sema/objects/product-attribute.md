<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/product-attribute -->

# ProductAttribute

```graphql
type ProductAttribute {
  id: ID!
  description: String
  name: String!
  options: [ProductAttributeOption!]
  tableTemplate: ProductAttributeTableTemplate
  translations: [ProductAttributeTranslation!]
  type: ProductAttributeTypeEnum!
}
```
Copy

#### Fields
`id`ID!required

`description`String

Description of the attribute

`name`String!required

Name of the attribute

`options`[ProductAttributeOption!]

Options of the attribute

`tableTemplate`ProductAttributeTableTemplate

Table template description for product attribute

`translations`[ProductAttributeTranslation!]

Translations for the attribute

`type`ProductAttributeTypeEnum!required

Type of the attribute
