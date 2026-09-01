<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/product-volume-discount-rule-input -->

# ProductVolumeDiscountRuleInput

```graphql
type ProductVolumeDiscountRuleInput {
  discountRatio: Float!
  lineItemQuantityRange: VolumeDiscountMinMaxRangeFieldInput!
}
```
Copy

#### Fields
`discountRatio`Float!required

Shows the discount amount of the rule.

`lineItemQuantityRange`VolumeDiscountMinMaxRangeFieldInput!required

It shows the quantity of the product that will be included in the rule.
