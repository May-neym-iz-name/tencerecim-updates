<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/product-volume-discount-rule -->

# ProductVolumeDiscountRule

```graphql
type ProductVolumeDiscountRule {
  discountRatio: Float!
  lineItemQuantityRange: VolumeDiscountMinMaxRangeField!
}
```
Copy

#### Fields
`discountRatio`Float!required

Shows the discount amount of the rule.

`lineItemQuantityRange`VolumeDiscountMinMaxRangeField!required

It shows the quantity of the product that will be included in the rule.
