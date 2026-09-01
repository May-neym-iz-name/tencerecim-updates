<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/product-unit-input -->

# ProductUnitInput

```graphql
type ProductUnitInput {
  id: ID
  name: String!
  translations: [ProductUnitTranslationInput!]
}
```
Copy

#### Fields
`id`ID

`name`String!required

The name of the product's unit.

`translations`[ProductUnitTranslationInput!]

The name of the product's unit.
