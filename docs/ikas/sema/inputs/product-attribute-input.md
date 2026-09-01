<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/product-attribute-input -->

# ProductAttributeInput

```graphql
type ProductAttributeInput {
  id: ID
  description: String
  name: String!
  options: [ProductAttributeOptionInput!]
  tableTemplate: ProductAttributeTableTemplateInput
  translations: [ProductAttributeTranslationInput!]
  type: ProductAttributeTypeEnum!
}
```
Copy

#### Fields
`id`ID

`description`String

`name`String!required

`options`[ProductAttributeOptionInput!]

`tableTemplate`ProductAttributeTableTemplateInput

`translations`[ProductAttributeTranslationInput!]

`type`ProductAttributeTypeEnum!required
