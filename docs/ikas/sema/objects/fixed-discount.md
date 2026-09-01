<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/fixed-discount -->

# FixedDiscount

```graphql
type FixedDiscount {
  amount: Float
  filters: [CampaignFilter!]
  isApplyByCartAmount: Boolean
  lineItemQuantityRange: CampaignMinMaxRangeField
  priceRange: CampaignMinMaxRangeField
}
```
Copy

#### Fields
`amount`Float

`filters`[CampaignFilter!]

`isApplyByCartAmount`Boolean

`lineItemQuantityRange`CampaignMinMaxRangeField

`priceRange`CampaignMinMaxRangeField
