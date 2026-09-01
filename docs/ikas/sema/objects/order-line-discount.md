<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-line-discount -->

# OrderLineDiscount

```graphql
type OrderLineDiscount {
  amount: Float!
  amountType: OrderAmountTypeEnum!
  campaignOfferId: String
  campaignOfferProductId: String
  maxApplicableQuantity: Float
  productVolumeDiscountId: String
  reason: String
}
```
Copy

#### Fields
`amount`Float!required

`amountType`OrderAmountTypeEnum!required

`campaignOfferId`String

`campaignOfferProductId`String

`maxApplicableQuantity`Float

`productVolumeDiscountId`String

`reason`String
