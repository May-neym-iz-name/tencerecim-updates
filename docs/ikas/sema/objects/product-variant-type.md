<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/product-variant-type -->

# ProductVariantType

```graphql
type ProductVariantType {
  order: Float!
  variantTypeId: String!
  variantValueIds: [String!]
}
```
Copy

#### Fields
`order`Float!required

Order of the variant type.

`variantTypeId`String!required

Id of variant type.

`variantValueIds`[String!]

List of variant value identifiers.
