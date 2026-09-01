<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/search-product-campaign -->

# SearchProductCampaign

```graphql
type SearchProductCampaign {
  id: String
  applicablePrice: CampaignApplicablePriceEnum
  applyCampaignToProductPrice: Boolean
  buyXThenGetY: SearchProductCampaignBuyXThenGetY
  currencyCodes: [String!]
  dateRange: SearchProductCampaignDateRangeField
  fixedDiscount: SearchProductCampaignFixedDiscount
  includeDiscountedProducts: Boolean
  salesChannelIds: [String!]
  title: String!
  type: CampaignTypeEnum!
}
```
Copy

#### Fields
`id`String

`applicablePrice`CampaignApplicablePriceEnum

`applyCampaignToProductPrice`Boolean

`buyXThenGetY`SearchProductCampaignBuyXThenGetY

`currencyCodes`[String!]

`dateRange`SearchProductCampaignDateRangeField

`fixedDiscount`SearchProductCampaignFixedDiscount

`includeDiscountedProducts`Boolean

`salesChannelIds`[String!]

`title`String!required

`type`CampaignTypeEnum!required
