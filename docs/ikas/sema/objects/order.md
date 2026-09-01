<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order -->

# Order

```graphql
type Order {
  id: ID!
  abandonedCartFlows: [AbandonedCartFlow!]
  archived: Boolean!
  attributes: [OrderAttributeValue!]
  availableShippingMethods: [AvailableShippingMethod!]
  billingAddress: OrderAddress
  branch: OrderBranch
  branchSession: OrderBranchSession
  branchSessionId: String
  campaignOffers: [CartV2CampaignOffer!]
  cancelledAt: Timestamp
  cancelReason: OrderCancelledReasonEnum
  cartId: String
  cartStatus: CartV2StatusEnum
  checkoutId: String
  clientIp: String
  couponCode: String
  createdBy: CartCreatedByEnum
  currencyCode: String!
  currencyRates: [OrderCurrencyRate!]!
  currencySymbol: String
  customer: OrderCustomer
  customerId: String
  customerOrderCount: Float
  dueDate: Timestamp
  giftPackageLines: [OrderGiftPackageLine!]
  giftPackageNote: String
  host: String
  invoices: [Invoice!]
  isGiftPackage: Boolean
  itemCount: Float
  lastActivityDate: Timestamp
  marketingCampaignId: String
  merchantId: String!
  note: String
  orderAdjustments: [OrderAdjustment!]
  orderedAt: Timestamp
  orderLineItems: [OrderLineItem!]!
  orderNumber: String
  orderPackages: [OrderPackage!]
  orderPackageSequence: Float
  orderPackageStatus: OrderPackageStatusEnum
  orderPaymentStatus: OrderPaymentStatusEnum
  orderSequence: Float
  orderTagIds: [String!]
  paymentMethods: [OrderPaymentMethod!]
  priceList: OrderPriceList
  priceListId: String
  recoverEmailStatus: CheckoutRecoveryEmailStatusEnum
  recoveryStatus: CheckoutRecoveryStatusEnum
  salesChannel: OrderSalesChannel!
  salesChannelId: String
  sessionInfo: OrderSessionInfo
  shippingAddress: OrderAddress
  shippingLines: [OrderShippingLine!]
  shippingMethod: OrderShippingMethodEnum!
  shippingSettingsId: String
  shippingZoneRateId: String
  sourceId: String
  staff: OrderStaff
  status: OrderStatusEnum!
  stockLocation: OrderStockLocation
  stockLocationId: String
  storefront: OrderStorefront
  storefrontId: String
  storefrontRouting: OrderStorefrontRouting
  storefrontRoutingId: String
  storefrontTheme: OrderStorefrontTheme
  storefrontThemeId: String
  taxLines: [OrderTaxLine!]
  terminalId: String
  totalFinalPrice: Float!
  totalPrice: Float!
  userAgent: String
}
```
Copy

#### Fields
`id`ID!required

`abandonedCartFlows`[AbandonedCartFlow!]

`archived`Boolean!required

`attributes`[OrderAttributeValue!]

`availableShippingMethods`[AvailableShippingMethod!]

`billingAddress`OrderAddress

It is the billing address of the order.

`branch`OrderBranch

It is the `branch` information of the orders created via ikasPOS.

`branchSession`OrderBranchSession

It is the `branchSession` information of the orders created via ikasPOS.

`branchSessionId`String

`campaignOffers`[CartV2CampaignOffer!]

`cancelledAt`Timestamp

If the order has been cancelled, it indicates the cancellation date of the order.

`cancelReason`OrderCancelledReasonEnum

It is the cancel reason of the order. If the order has been cancelled, it indicates the cancellation reason of the order.

`cartId`String

`cartStatus`CartV2StatusEnum

Shows the status of the cart linked to the order.

`checkoutId`String

`clientIp`String

The client ip address.

`couponCode`String

`createdBy`CartCreatedByEnum

Indicates who created the order. The order can be created by the customer or the store owner.

`currencyCode`String!required

It is the currency value of the order.

`currencyRates`[OrderCurrencyRate!]!required

A list of currency rate objects.

`currencySymbol`String

`customer`OrderCustomer

Information about the customer. The order does not have to be a customer information. If the order was created by ikasPOS, the customer information may be null.

`customerId`String

`customerOrderCount`Float

It shows the number of orders given by the relevant customer.

`dueDate`Timestamp

`giftPackageLines`[OrderGiftPackageLine!]

A list of gift package line objects, each containing information about a gift package pricing in the order.

`giftPackageNote`String

An optional gift package note, can attach to the order.

`host`String

It is the host where the order was created.

`invoices`[Invoice!]

A list of invoice objects, each containing information about an invoice.

`isGiftPackage`Boolean

Indicates whether there is a gift package in the order. isGiftPackage returns `true` if the order has gift package

`itemCount`Float

`lastActivityDate`Timestamp

`marketingCampaignId`String

`merchantId`String!required

`note`String

An optional note, can attach to the order.

`orderAdjustments`[OrderAdjustment!]

A list of adjustment objects, each containing information about a adjustment in the order.

`orderedAt`Timestamp

The date the order was ordered.

`orderLineItems`[OrderLineItem!]!required

A list of line item objects, each containing information about an item in the order.

`orderNumber`String

The position of the order in the store's order count starting from 1001. Order numbers are sequential and start from 1001.

`orderPackages`[OrderPackage!]

A list of order package objects.

`orderPackageSequence`Float

is the sequence value of the packages in the order.

`orderPackageStatus`OrderPackageStatusEnum

It is the package status enum of the order

`orderPaymentStatus`OrderPaymentStatusEnum

It is the payment status enum of the order

`orderSequence`Float

It is the sequence value of the order_number. The sequence value starts from 1 and an order with order number 1001 has a sequence value of 1.

`orderTagIds`[String!]

It is the tag id list in the order.

`paymentMethods`[OrderPaymentMethod!]

A list of payment method objects, each containing information about a payment method in the order.

`priceList`OrderPriceList

Information about the `priceList` used when the order was created.

`priceListId`String

`recoverEmailStatus`CheckoutRecoveryEmailStatusEnum

`recoveryStatus`CheckoutRecoveryStatusEnum

`salesChannel`OrderSalesChannel!required

Information about the `salesChannel` where the order was created.

`salesChannelId`String

`sessionInfo`OrderSessionInfo

`shippingAddress`OrderAddress

It is the shipping address of the order.

`shippingLines`[OrderShippingLine!]

A list of shipping line objects, each containing information about a shipping in the order.

`shippingMethod`OrderShippingMethodEnum!required

It is the shipping method enum of the order

`shippingSettingsId`String

`shippingZoneRateId`String

`sourceId`String

`staff`OrderStaff

It is the `staff` information of the orders created via ikasPOS.

`status`OrderStatusEnum!required

It is the status enum of the order

`stockLocation`OrderStockLocation

It is the `stock location` information of the orders.

`stockLocationId`String

`storefront`OrderStorefront

Information about the `storefront` where the order was created.

`storefrontId`String

`storefrontRouting`OrderStorefrontRouting

Information about the `storefrontRouting` used by the storefront at the time the order was created.

`storefrontRoutingId`String

`storefrontTheme`OrderStorefrontTheme

Information about the `storefrontTheme` used by the storefront at the time the order was created.

`storefrontThemeId`String

`taxLines`[OrderTaxLine!]

A list of tax line objects, tax line objects contain the taxes of the shippingLines, orderLineItems, and giftPackageLines.

`terminalId`String

It is the `terminalId`` information of the orders created via ikasPOS.

`totalFinalPrice`Float!required

The total final price of the order resulting from the apply of `orderAdjustments` , `shippingLines`, and `giftPackageLines` pricing to the order total price.

`totalPrice`Float!required

It is the sum of the net prices of the line items in the order.

`userAgent`String

Details of the browsing client, including software and operating versions.
