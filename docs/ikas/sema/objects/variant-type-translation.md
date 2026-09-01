<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/variant-type-translation -->

# VariantTypeTranslation

```graphql
type VariantTypeTranslation {
  locale: String!
  name: String
  values: [VariantValueTranslation!]
}
```
Copy

#### Fields
`locale`String!required

It is the name information of the translation.

`name`String

It is the information in which language the translation is saved.

`values`[VariantValueTranslation!]

It is the translation information of the values of variant types.
