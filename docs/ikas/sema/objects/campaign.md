<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/campaign -->

# Campaign

```graphql
type Campaign {
  id: ID!
  applicableCustomerGroupIds: [String!]
  applicableCustomerIds: [String!]
  applicablePrice: CampaignApplicablePriceEnum!
  applyCampaignToProductPrice: Boolean
  buyXThenGetY: BuyXThenGetY
  canCombineWithOtherCampaigns: Boolean!
  createdFor: CampaignCreatedForEnum
  currencyCodes: [String!]
  dateRange: CampaignDateRangeField
  fixedDiscount: FixedDiscount
  hasCoupon: Boolean!
  includeDiscountedProducts: Boolean
  isFreeShipping: Boolean
  onlyUseCustomer: Boolean
  salesChannelIds: [String!]
  title: String!
  translations: [CampaignTranslation!]
  type: CampaignTypeEnum!
  usageCount: Int!
  usageLimit: Int
  usageLimitPerCustomer: Int
}
```
Copy

#### Fields
`id`ID!required

`applicableCustomerGroupIds`[String!]

`applicableCustomerIds`[String!]

`applicablePrice`CampaignApplicablePriceEnum!required

`applyCampaignToProductPrice`Boolean

`buyXThenGetY`BuyXThenGetY

`canCombineWithOtherCampaigns`Boolean!required

`createdFor`CampaignCreatedForEnum

`currencyCodes`[String!]

`dateRange`CampaignDateRangeField

`fixedDiscount`FixedDiscount

`hasCoupon`Boolean!required

`includeDiscountedProducts`Boolean

`isFreeShipping`Boolean

`onlyUseCustomer`Boolean

`salesChannelIds`[String!]

`title`String!required

`translations`[CampaignTranslation!]

`type`CampaignTypeEnum!required

`usageCount`Int!required

`usageLimit`Int

`usageLimitPerCustomer`Int
