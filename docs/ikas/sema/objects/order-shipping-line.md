<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-shipping-line -->

# OrderShippingLine

```graphql
type OrderShippingLine {
  finalPrice: Float!
  isRefunded: Boolean
  paymentMethod: PaymentMethodTypeEnum
  price: Float!
  priceListId: String
  shippingSettingsId: String
  shippingZoneRateId: String
  taxValue: Float
  title: String!
  transactionId: String
}
```
Copy

#### Fields
`finalPrice`Float!required

It is the final price after discounts are applied.

`isRefunded`Boolean

Indicates whether the shipping cost is refunded if the order is refunded. isRefunded returns `true` if the amount is refunded.

`paymentMethod`PaymentMethodTypeEnum

Indicates whether the shipping cost is refunded if the order is refunded. isRefunded returns `true` if the amount is refunded.

`price`Float!required

It is the price of the order shipping line.

`priceListId`String

`shippingSettingsId`String

It is the shipping settings id of the order shipping line.

`shippingZoneRateId`String

It is the shipping zone rate id of the order shipping line.

`taxValue`Float

It is the tax value of the order shipping line price.

`title`String!required

It is the title of the order shipping line.

`transactionId`String

The amount is the id of the transaction.
