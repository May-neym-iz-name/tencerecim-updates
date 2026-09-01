<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/campaign-offer -->

# CampaignOffer

```graphql
type CampaignOffer {
  id: ID!
  availableSalesChannelIds: [String!]!
  currencyCodes: [String!]
  endDate: Timestamp
  followUpActionType: CampaignOfferFollowUpActionTypeEnum!
  maxCount: Float
  maximumRequiredCartAmount: Float
  minimumRequiredCartAmount: Float
  name: String!
  offers: [CampaignOfferProduct!]!
  startDate: Timestamp
  targetPageTypes: [CampaignOfferTargetPageTypeEnum!]!
  triggerSettings: CampaignOfferTriggerSettings!
  type: CampaignOfferTypeEnum!
}
```
Copy

#### Fields
`id`ID!required

`availableSalesChannelIds`[String!]!required

`currencyCodes`[String!]

`endDate`Timestamp

`followUpActionType`CampaignOfferFollowUpActionTypeEnum!required

`maxCount`Float

`maximumRequiredCartAmount`Float

`minimumRequiredCartAmount`Float

`name`String!required

`offers`[CampaignOfferProduct!]!required

`startDate`Timestamp

`targetPageTypes`[CampaignOfferTargetPageTypeEnum!]!required

`triggerSettings`CampaignOfferTriggerSettings!required

`type`CampaignOfferTypeEnum!required
