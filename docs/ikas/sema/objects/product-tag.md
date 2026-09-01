<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/product-tag -->

# ProductTag

```graphql
type ProductTag {
  id: ID!
  name: String!
  translations: [ProductTagTranslation!]
}
```
Copy

#### Fields
`id`ID!required

`name`String!required

The name of the product's tag.

`translations`[ProductTagTranslation!]

The name of the product's tag.
