<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/campaign-input -->

# CampaignInput

```graphql
type CampaignInput {
  id: ID
  applicableCustomerGroupIds: [String!]
  applicableCustomerIds: [String!]
  applicablePrice: CampaignApplicablePriceEnum!
  applyCampaignToProductPrice: Boolean
  buyXThenGetY: BuyXThenGetYInput
  canCombineWithOtherCampaigns: Boolean!
  createdFor: CampaignCreatedForEnum
  currencyCodes: [String!]
  dateRange: CampaignDateRangeFieldInput
  fixedDiscount: FixedDiscountInput
  hasCoupon: Boolean!
  includeDiscountedProducts: Boolean
  isFreeShipping: Boolean
  onlyUseCustomer: Boolean
  salesChannelIds: [String!]
  title: String!
  translations: [CampaignTranslationInput!]
  type: CampaignTypeEnum!
  usageLimit: Int
  usageLimitPerCustomer: Int
}
```
Copy

#### Fields
`id`ID

`applicableCustomerGroupIds`[String!]

`applicableCustomerIds`[String!]

`applicablePrice`CampaignApplicablePriceEnum!required

`applyCampaignToProductPrice`Boolean

`buyXThenGetY`BuyXThenGetYInput

`canCombineWithOtherCampaigns`Boolean!required

`createdFor`CampaignCreatedForEnum

`currencyCodes`[String!]

`dateRange`CampaignDateRangeFieldInput

`fixedDiscount`FixedDiscountInput

`hasCoupon`Boolean!required

`includeDiscountedProducts`Boolean

`isFreeShipping`Boolean

`onlyUseCustomer`Boolean

`salesChannelIds`[String!]

`title`String!required

`translations`[CampaignTranslationInput!]

`type`CampaignTypeEnum!required

`usageLimit`Int

`usageLimitPerCustomer`Int
