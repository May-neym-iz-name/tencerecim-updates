<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-adjustment -->

# OrderAdjustment

```graphql
type OrderAdjustment {
  amount: Float!
  amountType: OrderAmountTypeEnum!
  appliedOrderLines: [OrderAdjustmentAppliedOrderLine!]
  campaignId: String
  campaignType: CampaignTypeEnum
  couponId: String
  name: String!
  order: Float!
  transactionId: String
  type: OrderAdjustmentEnum!
}
```
Copy

#### Fields
`amount`Float!required

It is the adjustment amount in the order. This amount can be positive or negative.

`amountType`OrderAmountTypeEnum!required

`appliedOrderLines`[OrderAdjustmentAppliedOrderLine!]

A list of order line items, each containing information about a order line item in the order.

`campaignId`String

If the adjustment is associated to the campaign, it will show the campaign id.

`campaignType`CampaignTypeEnum

If the adjustment is associated to the campaign, it will show the campaign id.

`couponId`String

It is the coupon id generated depending on the campaign.

`name`String!required

It is the name of the adjustment.

`order`Float!required

It is the order of the adjustment. Adjustments are applied in this order.

`transactionId`String

The amount is the id of the transaction.

`type`OrderAdjustmentEnum!required
