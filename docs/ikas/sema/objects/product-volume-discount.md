<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/product-volume-discount -->

# ProductVolumeDiscount

```graphql
type ProductVolumeDiscount {
  id: ID!
  name: String!
  rules: [ProductVolumeDiscountRule!]!
  scope: ProductVolumeDiscountScopeEnum!
}
```
Copy

#### Fields
`id`ID!required

`name`String!required

The name of the product volume discount.

`rules`[ProductVolumeDiscountRule!]!required

Shows the product volume discount rules.

`scope`ProductVolumeDiscountScopeEnum!required

Determines whether variants will be evaluated separately.
