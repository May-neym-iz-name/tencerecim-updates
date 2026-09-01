<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/product-attribute-translation-input -->

# ProductAttributeTranslationInput

```graphql
type ProductAttributeTranslationInput {
  description: String
  locale: String!
  name: String
  options: [ProductAttributeOptionTranslationInput!]
}
```
Copy

#### Fields
`description`String

`locale`String!required

`name`String

`options`[ProductAttributeOptionTranslationInput!]
