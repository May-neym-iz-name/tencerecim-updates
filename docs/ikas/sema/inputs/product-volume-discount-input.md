<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/product-volume-discount-input -->

# ProductVolumeDiscountInput

```graphql
type ProductVolumeDiscountInput {
  id: ID
  name: String!
  rules: [ProductVolumeDiscountRuleInput!]!
  scope: ProductVolumeDiscountScopeEnum!
}
```
Copy

#### Fields
`id`ID

`name`String!required

The name of the product volume discount.

`rules`[ProductVolumeDiscountRuleInput!]!required

Shows the product volume discount rules.

`scope`ProductVolumeDiscountScopeEnum!required

Determines whether variants will be evaluated separately.
