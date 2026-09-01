<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-adjustment-applied-order-line -->

# OrderAdjustmentAppliedOrderLine

```graphql
type OrderAdjustmentAppliedOrderLine {
  amount: Float!
  appliedQuantity: Float!
  isAutoCreated: Boolean
  orderLineId: String!
}
```
Copy

#### Fields
`amount`Float!required

Is he amount of the applied adjustment.

`appliedQuantity`Float!required

It is the quantity of variants within the order line item to which the adjustment is applied.

`isAutoCreated`Boolean

It is the quantity of variants within the order line item to which the adjustment is applied.

`orderLineId`String!required

It is the id of the order line item to which the adjustment is applied.
