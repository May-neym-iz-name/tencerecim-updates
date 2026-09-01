<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/cart-v2-campaign-offer -->

# CartV2CampaignOffer

```graphql
type CartV2CampaignOffer {
  appliedOrderLineId: String
  campaignOffer: CampaignOffer
  campaignOfferId: String!
  campaignOfferProductId: String
  offerEndDate: Timestamp
  offerStartDate: Timestamp!
  status: CartCampaignOfferStatus!
  targetPageTypes: [CampaignOfferTargetPageTypeEnum!]!
  triggerSourceOrderLineId: String!
}
```
Copy

#### Fields
`appliedOrderLineId`String

`campaignOffer`CampaignOffer

`campaignOfferId`String!required

`campaignOfferProductId`String

`offerEndDate`Timestamp

`offerStartDate`Timestamp!required

`status`CartCampaignOfferStatus!required

`targetPageTypes`[CampaignOfferTargetPageTypeEnum!]!required

`triggerSourceOrderLineId`String!required
