<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/fixed-discount-input -->

# FixedDiscountInput

```graphql
type FixedDiscountInput {
  amount: Float
  filters: [CampaignFilterInput!]
  isApplyByCartAmount: Boolean
  lineItemQuantityRange: CampaignMinMaxRangeFieldInput
  priceRange: CampaignMinMaxRangeFieldInput
}
```
Copy

#### Fields
`amount`Float

`filters`[CampaignFilterInput!]

`isApplyByCartAmount`Boolean

`lineItemQuantityRange`CampaignMinMaxRangeFieldInput

`priceRange`CampaignMinMaxRangeFieldInput
