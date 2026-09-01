<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/variant-type-input -->

# VariantTypeInput

```graphql
type VariantTypeInput {
  id: ID
  name: String!
  selectionType: VariantSelectionTypeEnum!
  translations: [VariantTypeTranslationInput!]
  values: [VariantValueInput!]!
}
```
Copy

#### Fields
`id`ID

`name`String!required

Product variant type name information. For example: Size, Color, Number etc..It can be a maximum of 100 characters.

`selectionType`VariantSelectionTypeEnum!required

Product variant type selection type. It can be choice or color.

`translations`[VariantTypeTranslationInput!]

It is the translation information of the product variant types.

`values`[VariantValueInput!]!required

Variant values used in Variant type. For example, variant type: Size. Variant values can be thought of as S, M, L, XL. It is unique according to the value name.Values array size must have at least one element.
