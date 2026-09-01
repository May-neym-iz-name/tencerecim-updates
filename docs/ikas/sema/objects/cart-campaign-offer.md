<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/cart-campaign-offer -->

# CartCampaignOffer

```graphql
type CartCampaignOffer {
  appliedOrderLineId: String
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

`campaignOfferId`String!required

`campaignOfferProductId`String

`offerEndDate`Timestamp

`offerStartDate`Timestamp!required

`status`CartCampaignOfferStatus!required

`targetPageTypes`[CampaignOfferTargetPageTypeEnum!]!required

`triggerSourceOrderLineId`String!required
