<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/campaign-offer-product -->

# CampaignOfferProduct

```graphql
type CampaignOfferProduct {
  id: String!
  applicablePrice: CampaignOfferProductApplicablePriceEnum
  countdownMinutes: Float
  description: String
  discountAmount: Float
  discountType: OrderAmountTypeEnum
  excludedVariantIdList: [String!]
  order: Float!
  productId: String!
  showCriteria: CampaignOfferProductShowCriteriaEnum
  skipOfferIfProductExistsInCart: Boolean
  title: String!
  translations: [CampaignOfferProductTranslation!]
}
```
Copy

#### Fields
`id`String!required

`applicablePrice`CampaignOfferProductApplicablePriceEnum

`countdownMinutes`Float

`description`String

`discountAmount`Float

`discountType`OrderAmountTypeEnum

`excludedVariantIdList`[String!]

`order`Float!required

`productId`String!required

`showCriteria`CampaignOfferProductShowCriteriaEnum

`skipOfferIfProductExistsInCart`Boolean

`title`String!required

`translations`[CampaignOfferProductTranslation!]
