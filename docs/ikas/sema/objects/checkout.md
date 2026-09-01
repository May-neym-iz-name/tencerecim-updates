<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/checkout -->

# Checkout

```graphql
type Checkout {
  id: ID!
  abandonedCheckoutFlows: [AbandonedCartFlow!]
  adjustments: [OrderAdjustment!]
  availableShippingMethods: [AvailableShippingMethod!]
  billingAddress: OrderAddress
  cart: Cart
  cartId: String!
  couponCode: String
  customer: CheckoutCustomer
  giftPackageLines: [OrderGiftPackageLine!]
  giftPackageNote: String
  isGiftPackage: Boolean
  merchantId: String!
  note: String
  orderedAt: Timestamp
  orderId: String
  orderNumber: String
  recoverEmailStatus: CheckoutRecoveryEmailStatusEnum
  recoveryStatus: CheckoutRecoveryStatusEnum
  shippingAddress: OrderAddress
  shippingLines: [OrderShippingLine!]
  shippingMethod: OrderShippingMethodEnum!
  shippingSettingsId: String
  shippingZoneRateId: String
  status: CheckoutStatusEnum!
  stockLocationId: String
  totalFinalPrice: Float!
}
```
Copy

#### Fields
`id`ID!required

`abandonedCheckoutFlows`[AbandonedCartFlow!]

`adjustments`[OrderAdjustment!]

`availableShippingMethods`[AvailableShippingMethod!]

`billingAddress`OrderAddress

`cart`Cart

`cartId`String!required

`couponCode`String

`customer`CheckoutCustomer

`giftPackageLines`[OrderGiftPackageLine!]

`giftPackageNote`String

`isGiftPackage`Boolean

`merchantId`String!required

`note`String

`orderedAt`Timestamp

`orderId`String

`orderNumber`String

`recoverEmailStatus`CheckoutRecoveryEmailStatusEnum

`recoveryStatus`CheckoutRecoveryStatusEnum

`shippingAddress`OrderAddress

`shippingLines`[OrderShippingLine!]

`shippingMethod`OrderShippingMethodEnum!required

`shippingSettingsId`String

`shippingZoneRateId`String

`status`CheckoutStatusEnum!required

`stockLocationId`String

`totalFinalPrice`Float!required
