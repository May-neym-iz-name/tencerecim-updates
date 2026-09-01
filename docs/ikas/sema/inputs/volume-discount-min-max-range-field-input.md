<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/volume-discount-min-max-range-field-input -->

# VolumeDiscountMinMaxRangeFieldInput

```graphql
type VolumeDiscountMinMaxRangeFieldInput {
  max: Float
  min: Float!
}
```
Copy

#### Fields
`max`Float

Indicates the maximum amount of the product to be included in the rule.

`min`Float!required

Indicates the minimum amount of the product to be included in the rule.
