<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/variant-value-input -->

# VariantValueInput

```graphql
type VariantValueInput {
  id: ID
  colorCode: String
  name: String!
  thumbnailImageId: String
}
```
Copy

#### Fields
`id`ID

`colorCode`String

It is the color code information of the variant values. It can be a maximum of 7 characters.

`name`String!required

It is the name information of the values used in the Variant type. Value information of Variant type is unique according to name.It can be a maximum of 100 characters.

`thumbnailImageId`String

It is the image information of the variant values.
