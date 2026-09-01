<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/cart -->

# Cart

```graphql
type Cart {
  id: ID!
  campaignOffers: [CartCampaignOffer!]
  createdBy: CartCreatedByEnum
  currencyCode: String
  currencySymbol: String
  customerId: String
  dueDate: Timestamp!
  itemCount: Float!
  items: [OrderLineItem!]!
  lastActivityDate: Timestamp!
  merchantId: String!
  priceListId: String
  salesChannelId: String!
  status: CartStatusEnum!
  storefrontId: String
  storefrontRouting: CartStorefrontRouting
  storefrontRoutingId: String
  storefrontThemeId: String
  taxLines: [OrderTaxLine!]
  totalPrice: Float!
}
```
Copy

#### Fields
`id`ID!required

`campaignOffers`[CartCampaignOffer!]

`createdBy`CartCreatedByEnum

`currencyCode`String

`currencySymbol`String

`customerId`String

`dueDate`Timestamp!required

`itemCount`Float!required

`items`[OrderLineItem!]!required

`lastActivityDate`Timestamp!required

`merchantId`String!required

`priceListId`String

`salesChannelId`String!required

`status`CartStatusEnum!required

`storefrontId`String

`storefrontRouting`CartStorefrontRouting

`storefrontRoutingId`String

`storefrontThemeId`String

`taxLines`[OrderTaxLine!]

`totalPrice`Float!required
