<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/product-option-translations -->

# ProductOptionTranslations

```graphql
type ProductOptionTranslations {
  id: String!
  name: String
  optionalText: String
  values: [ProductOptionSelectValueTranslations!]
}
```
Copy

#### Fields
`id`String!required

`name`String

`optionalText`String

`values`[ProductOptionSelectValueTranslations!]
