<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/product-tag-input -->

# ProductTagInput

```graphql
type ProductTagInput {
  id: ID
  name: String!
  translations: [ProductTagTranslationInput!]
}
```
Copy

#### Fields
`id`ID

`name`String!required

The name of the product's tag.

`translations`[ProductTagTranslationInput!]

The name of the product's tag.
