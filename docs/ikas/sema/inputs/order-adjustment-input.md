<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/order-adjustment-input -->

# OrderAdjustmentInput

```graphql
type OrderAdjustmentInput {
  amount: Float!
  amountType: OrderAmountTypeEnum!
  campaignId: String
  couponId: String
  name: String!
  order: Float!
  type: OrderAdjustmentEnum!
}
```
Copy

#### Fields
`amount`Float!required

It is the amount of the order adjustment.

`amountType`OrderAmountTypeEnum!required

It is the amount type of the order adjustment

`campaignId`String

It is the campaign information that adjustment depends on.

`couponId`String

It is the coupon information of the campaign that adjustment is connected to.

`name`String!required

It is the name of the order adjustment.

`order`Float!required

It is the order information in which the adjustment will be applied.

`type`OrderAdjustmentEnum!required

It is the type enum of the order adjustment
