<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/order-line-discount-input -->

# OrderLineDiscountInput

```graphql
type OrderLineDiscountInput {
  amount: Float!
  amountType: OrderAmountTypeEnum!
  maxApplicableQuantity: Float
  reason: String
}
```
Copy

#### Fields
`amount`Float!required

It is the amount of the discount.

`amountType`OrderAmountTypeEnum!required

It is the amount type enum.

`maxApplicableQuantity`Float

`reason`String

It is the reason of the discount.
