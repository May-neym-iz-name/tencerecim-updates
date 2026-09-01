<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/product-option-set -->

# ProductOptionSet

```graphql
type ProductOptionSet {
  id: ID!
  name: String!
  options: [ProductOption!]!
  translations: [ProductOptionSetTranslations!]
}
```
Copy

#### Fields
`id`ID!required

`name`String!required

`options`[ProductOption!]!required

`translations`[ProductOptionSetTranslations!]
