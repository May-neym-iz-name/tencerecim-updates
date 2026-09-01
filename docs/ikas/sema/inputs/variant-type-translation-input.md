<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/variant-type-translation-input -->

# VariantTypeTranslationInput

```graphql
type VariantTypeTranslationInput {
  locale: String!
  name: String
  values: [VariantValueTranslationInput!]
}
```
Copy

#### Fields
`locale`String!required

It is the name information of the translation.

`name`String

It is the information in which language the translation is saved.

`values`[VariantValueTranslationInput!]

It is the translation information of the values of variant types.
