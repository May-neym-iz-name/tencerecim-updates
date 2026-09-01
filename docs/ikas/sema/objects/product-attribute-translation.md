<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/product-attribute-translation -->

# ProductAttributeTranslation

```graphql
type ProductAttributeTranslation {
  description: String
  locale: String!
  name: String
  options: [ProductAttributeOptionTranslation!]
}
```
Copy

#### Fields
`description`String

It is the description information of the translation.

`locale`String!required

It is the name information of the translation.

`name`String

It is the information in which language the translation is saved.

`options`[ProductAttributeOptionTranslation!]

List of translations for attribute options
