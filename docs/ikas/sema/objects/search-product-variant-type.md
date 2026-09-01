<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/search-product-variant-type -->

# SearchProductVariantType

```graphql
type SearchProductVariantType {
  order: Float!
  variantType: SearchVariantType!
  variantValueIds: [String!]!
}
```
Copy

#### Fields
`order`Float!required

`variantType`SearchVariantType!required

`variantValueIds`[String!]!required
