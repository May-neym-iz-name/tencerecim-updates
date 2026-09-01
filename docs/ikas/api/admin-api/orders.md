<!-- kaynak: https://ikas.dev/docs/api/admin-api/orders -->

# Orders

## Models

### Order

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

### OrderAddress

```graphql
type OrderAddress {
  id: String
  addressLine1: String!
  addressLine2: String
  city: OrderAddressCity!
  company: String
  country: OrderAddressCountry!
  district: OrderAddressDistrict
  firstName: String!
  identityNumber: String
  isDefault: Boolean!
  lastName: String!
  phone: String
  postalCode: String
  region: OrderAddressRegion
  state: OrderAddressState
  taxNumber: String
  taxOffice: String
}
```
Copy

#### Fields
`id`String

The address"s id of the order address.

`addressLine1`String!required

The street address of the address.

`addressLine2`String

An optional additional field for the street address of the address.

`city`OrderAddressCity!required

The city information of the address.

`company`String

The company of the person associated with the address.

`country`OrderAddressCountry!required

The country information of the address.

`district`OrderAddressDistrict

The district information of the address.

`firstName`String!required

The first name of the person associated with the address

`identityNumber`String

The identity number of the person associated with the address.

`isDefault`Boolean!required

The address"s id of the order address.

`lastName`String!required

The last name of the person associated with the address

`phone`String

The phone of the person associated with the address.

`postalCode`String

The postal code of the address.

`region`OrderAddressRegion

The region information of the address.

`state`OrderAddressState

The state information of the address.

`taxNumber`String

The tax number of the person associated with the address.

`taxOffice`String

The tax office of the person associated with the address.

### OrderAddressCountry

```graphql
type OrderAddressCountry {
  id: String
  code: String
  iso2: String
  iso3: String
  name: String!
}
```
Copy

#### Fields
`id`String

It is the id of the country of the address.

`code`String

It is the code of the country of the address.

`iso2`String

It is the two-letter code of the country of the address.

`iso3`String

It is the three-letter code of the country of the address.

`name`String!required

It is the name of the country of the address.

### OrderAddressCity

```graphql
type OrderAddressCity {
  id: String
  code: String
  name: String!
}
```
Copy

#### Fields
`id`String

It is the id of the city of the address.

`code`String

It is the code of the city of the address.

`name`String!required

It is the name of the city of the address.

### OrderAddressDistrict

```graphql
type OrderAddressDistrict {
  id: String
  code: String
  name: String
}
```
Copy

#### Fields
`id`String

It is the id of the district of the address.

`code`String

It is the code of the district of the address.

`name`String

It is the name of the district of the address.

### OrderAddressState

```graphql
type OrderAddressState {
  id: String
  code: String
  name: String
}
```
Copy

#### Fields
`id`String

It is the id of the state of the address.

`code`String

It is the code of the state of the address.

`name`String

It is the name of the state of the address.

### OrderLineItem

```graphql
type OrderLineItem {
  id: ID!
  bundleProductSettings: BundleProductOrderLine
  currencyCode: String
  currencySymbol: String
  discount: OrderLineDiscount
  discountPrice: Float
  finalPrice: Float
  finalUnitPrice: Float
  options: [OrderLineOption!]
  originalOrderLineItemId: String
  price: Float!
  quantity: Float!
  sourceId: String
  status: OrderLineItemStatusEnum!
  statusUpdatedAt: Timestamp
  stockLocationId: String
  taxValue: Float
  unitPrice: Float
  variant: OrderLineVariant!
}
```
Copy

#### Fields
`id`ID!required

`bundleProductSettings`BundleProductOrderLine

It is the option information of the variant value in the order line item.

`currencyCode`String

It is the currency code of the order line item.

`currencySymbol`String

`discount`OrderLineDiscount

Information about the discount. Shows the details of the discount applied to the order line item.

`discountPrice`Float

It is the discount price of the order line item.

`finalPrice`Float

It is the final price of the order line item. If the discount price is less than the sell price, the final price is equal to the discount price.

`finalUnitPrice`Float

It is the unit price of the order line item.

`options`[OrderLineOption!]

It is the option information of the variant value in the order line item.

`originalOrderLineItemId`String

It is the original order line item id of the line item. If the line item is derived from another line item, this field is filled.

`price`Float!required

It is the selling price of the order line item.

`quantity`Float!required

It is the quantity of variant in the order line item.

`sourceId`String

`status`OrderLineItemStatusEnum!required

It is the status enum of the order line item

`statusUpdatedAt`Timestamp

It is the date when the last status of the order line item was updated.

`stockLocationId`String

It is the stock location id of the variant value in the order line item.

`taxValue`Float

It is the tax value of the order line item.

`unitPrice`Float

It is the unit price of the order line item.

`variant`OrderLineVariant!required

Information about the variant of the order line item.

### OrderLineVariant

```graphql
type OrderLineVariant {
  id: String
  barcodeList: [String!]
  baseUnit: OrderLineBaseUnit
  brand: OrderLineVariantBrand
  bundleProducts: [OrderLineVariantBundleProductModel!]
  categories: [OrderLineVariantCategory!]
  fileId: String
  hsCode: String
  mainImageId: String
  name: String!
  prices: [OrderLineVariantPrice!]
  productId: String
  productVolumeDiscountId: String
  sku: String
  slug: String
  tagIds: [String!]
  tags: [OrderLineVariantTag!]
  taxValue: Float
  type: Float
  unit: OrderLineVariantUnit
  variantValues: [OrderLineVariantVariantValues!]
  weight: Float
}
```
Copy

#### Fields
`id`String

It is the id of the variant.

`barcodeList`[String!]

It is the barcode list of the variant.

`baseUnit`OrderLineBaseUnit

Information about the brand of variant.

`brand`OrderLineVariantBrand

Information about the brand of variant.

`bundleProducts`[OrderLineVariantBundleProductModel!]

Shows the list of bundle products in the line item.

`categories`[OrderLineVariantCategory!]

A list of category objects, each containing information about a category in the variant.

`fileId`String

It is the id of the product file.

`hsCode`String

It is the hasCode of the variant.

`mainImageId`String

It is the main image id of the variant.

`name`String!required

It is the name of the variant.

`prices`[OrderLineVariantPrice!]

It is the price list of the variant. Different price lists may have different pricing.

`productId`String

It is the product id of the variant.

`productVolumeDiscountId`String

It is the product volume discount id of the product.

`sku`String

It is the sku of the variant.

`slug`String

It is the slug of the variant. The slug value is unique each variant and product.

`tagIds`[String!]

It is the the tag id list

`tags`[OrderLineVariantTag!]

A list of tag objects, each containing information about a tag in the variant.

`taxValue`Float

It is the tax value of the variant.

`type`Float

`unit`OrderLineVariantUnit

Information about the brand of variant.

`variantValues`[OrderLineVariantVariantValues!]

It is the variant values of the variant.

`weight`Float

### OrderLineVariantVariantValues

```graphql
type OrderLineVariantVariantValues {
  order: Float!
  variantTypeId: String!
  variantTypeName: String
  variantValueId: String!
  variantValueName: String
}
```
Copy

#### Fields
`order`Float!required

It is the order of variant value. The variant value order starts from 0.

`variantTypeId`String!required

It is the order of variant value. The variant value order starts from 0.

`variantTypeName`String

It is the order of variant value. The variant value order starts from 0.

`variantValueId`String!required

It is the order of variant value. The variant value order starts from 0.

`variantValueName`String

It is the order of variant value. The variant value order starts from 0.

### OrderLineVariantPrice

```graphql
type OrderLineVariantPrice {
  buyPrice: Float
  currency: String
  currencySymbol: String
  discountPrice: Float
  priceListId: String
  sellPrice: Float!
  unitPrice: Float
}
```
Copy

#### Fields
`buyPrice`Float

It is the buy price of variant.

`currency`String

It is the currency code of variant.

`currencySymbol`String

`discountPrice`Float

It is the discount price of variant.

`priceListId`String

It is the id of the price list to which the variant is associated.

`sellPrice`Float!required

It is the sell price of variant.

`unitPrice`Float

It is the unit price of variant.

### OrderLineVariantCategory

```graphql
type OrderLineVariantCategory {
  id: String!
  categoryPath: [OrderLineVariantCategoryPath!]
  name: String!
}
```
Copy

#### Fields
`id`String!required

It is the id of the category of the variant.

`categoryPath`[OrderLineVariantCategoryPath!]

It is the path of the category.

`name`String!required

It is the name of the category.

### OrderLineVariantBrand

```graphql
type OrderLineVariantBrand {
  id: String!
  name: String!
}
```
Copy

#### Fields
`id`String!required

It is the id of the brand of the variant.

`name`String!required

It is the name of the category.

### OrderLineOption

```graphql
type OrderLineOption {
  name: String!
  productOptionId: String!
  productOptionsSetId: String!
  type: ProductOptionTypeEnum!
  values: [OrderLineOptionValue!]!
}
```
Copy

#### Fields
`name`String!required

It is the name of order line option in the order line item.

`productOptionId`String!required

It is the product option id of the product in the order line item.

`productOptionsSetId`String!required

It is the product option set id of the product in the order line item.

`type`ProductOptionTypeEnum!required

It is the type of the order line option.

`values`[OrderLineOptionValue!]!required

### OrderAdjustment

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

### OrderLineOptionValue

```graphql
type OrderLineOptionValue {
  name: String
  price: Float
  value: String!
}
```
Copy

#### Fields
`name`String

`price`Float

`value`String!required

### OrderAdjustmentAppliedOrderLine

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

### OrderShippingLine

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

### OrderGiftPackageLine

```graphql
type OrderGiftPackageLine {
  isRefunded: Boolean
  price: Float!
  priceListId: String
  taxValue: Float
}
```
Copy

#### Fields
`isRefunded`Boolean

Indicates whether the gift cost is refunded if the order is refunded. isRefunded returns `true` if the amount is refunded.

`price`Float!required

It is the price of the order gift package line.

`priceListId`String

`taxValue`Float

It is the tax value of the order gift package line price.

### OrderCustomer

```graphql
type OrderCustomer {
  id: String
  email: String
  firstName: String
  fullName: String
  isGuestCheckout: Boolean
  lastName: String
  notificationsAccepted: Boolean
  phone: String
  preferredLanguage: String
}
```
Copy

#### Fields
`id`String

It is the id of the customer who created the order.

`email`String

It is the email of the customer who created the order.

`firstName`String

It is the first name of the customer who created the order.

`fullName`String

It is the full name name of the customer who created the order.

`isGuestCheckout`Boolean

Indicates whether the order was created by a new customer with no email record. isGuestCheckout returns true if the order was created without customer email information.

`lastName`String

It is the last name of the customer who created the order.

`notificationsAccepted`Boolean

`phone`String

It is the phone number of the customer who created the order.

`preferredLanguage`String

It is the preferred language of the customer who created the order.

### OrderTaxLine

```graphql
type OrderTaxLine {
  price: Float!
  rate: Float!
}
```
Copy

#### Fields
`price`Float!required

It is the price of the order tax.

`rate`Float!required

It is the percentage of the slice to which the calculated tax amount belongs.

### OrderPackage

```graphql
type OrderPackage {
  id: ID!
  errorMessage: String
  note: String
  orderLineItemIds: [String!]!
  orderPackageFulfillStatus: OrderPackageFulfillStatusEnum!
  orderPackageNumber: String!
  sourceId: String
  stockLocationId: String!
  trackingInfo: TrackingInfo
}
```
Copy

#### Fields
`id`ID!required

`errorMessage`String

If the package was sent via the cargo application and received an error, this field is filled with an error message.

`note`String

An optional note, can attach to the order package.

`orderLineItemIds`[String!]!required

It is the id list of the order line items in the package.

`orderPackageFulfillStatus`OrderPackageFulfillStatusEnum!required

It is the fulfill status of the package

`orderPackageNumber`String!required

It is the number of order package. Order package number is created with the order number - order package sequence format.

`sourceId`String

`stockLocationId`String!required

`trackingInfo`TrackingInfo

It is the stock location id information where the package will be shipped.

### OrderPackageTrackingInfo

```graphql
type TrackingInfo {
  barcode: String
  cargoCompany: String
  cargoCompanyId: String
  isSendNotification: Boolean
  trackingLink: String
  trackingNumber: String
}
```
Copy

#### Fields
`barcode`String

It is the barcode of the order package.

`cargoCompany`String

It is the name of the cargo company.

`cargoCompanyId`String

It is the key of the cargo company which can be retrieved via listCargoCompany query.

`isSendNotification`Boolean

Indicates whether the notification is sent to the customer after the cargo is delivered. isSendNotification returns true if the notification is sent.

`trackingLink`String

It is the tracking link of the order package.

`trackingNumber`String

It is the tracking number of the order package.

### OrderCurrencyRate

```graphql
type OrderCurrencyRate {
  code: String!
  originalRate: Float!
  rate: Float!
}
```
Copy

#### Fields
`code`String!required

It is the code of the currency.

`originalRate`Float!required

It is the original rate of the currency.

`rate`Float!required

It is the rate of the currency.

### OrderStorefront

```graphql
type OrderStorefront {
  id: String!
  name: String
}
```
Copy

#### Fields
`id`String!required

It is the storefront id where the order was created.

`name`String

It is the storefront name id where the order was created.

### OrderSalesChannel

```graphql
type OrderSalesChannel {
  id: String!
  name: String
  type: Float
}
```
Copy

#### Fields
`id`String!required

It is the sales channel id where the order was created.

`name`String

It is the sales channel name where the order was created.

`type`Float

It is the sales channel type where the order was created.

### OrderStorefrontTheme

```graphql
type OrderStorefrontTheme {
  id: String!
  name: String
  themeId: String
  themeVersionId: String
}
```
Copy

#### Fields
`id`String!required

It is the theme id customized by the merchant used by the storefront when the order was created.

`name`String

It is the theme theme name customized by the merchant used by the storefront when the order was created.

`themeId`String

It is the ikas theme id used by the storefront when the order was created.

`themeVersionId`String

It is the ikas theme version id used by the storefront when the order was created.

### OrderStorefrontRouting

```graphql
type OrderStorefrontRouting {
  id: String!
  domain: String
  dynamicCurrencySettings: OrderStorefrontRoutingDynamicCurrencySettings
  locale: String
  path: String
  priceListId: String
}
```
Copy

#### Fields
`id`String!required

It is the storefront routing id used by the storefront when the order was created.

`domain`String

It is the domain of the storefront routing.

`dynamicCurrencySettings`OrderStorefrontRoutingDynamicCurrencySettings

`locale`String

It is the locale of the storefront routing.

`path`String

It is the path of the storefront routing.

`priceListId`String

It is the price list id that associated on the storefront routing.

### OrderPriceList

```graphql
type OrderPriceList {
  id: String!
  name: String
}
```
Copy

#### Fields
`id`String!required

It is the id of the price list.

`name`String

It is the name of the price list.

### OrderBranch

```graphql
type OrderBranch {
  id: String!
  name: String
}
```
Copy

#### Fields
`id`String!required

It is the id of the branch where the order was created.

`name`String

It is the name of the branch where the order was created.

### OrderStaff

```graphql
type OrderStaff {
  id: String!
  email: String!
  firstName: String!
  lastName: String!
}
```
Copy

#### Fields
`id`String!required

It is the first name of the staff who created the order.

`email`String!required

It is the email of the staff who created the order.

`firstName`String!required

It is the first name of the staff who created the order.

`lastName`String!required

It is the last name of the staff who created the order.

### OrderInvoice

```graphql
type Invoice {
  id: String!
  appId: String!
  appName: String!
  hasPdf: Boolean
  invoiceData: JSON
  invoiceNumber: String!
  storeAppId: String!
  type: InvoiceTypeEnum!
}
```
Copy

#### Fields
`id`String!required

It is the id of the order invoice.

`appId`String!required

It is the id of the order invoice.

`appName`String!required

It is the id of the order invoice.

`hasPdf`Boolean

It is indicates that the invoice has the pdf.

`invoiceData`JSON

It is data of the invoice.

`invoiceNumber`String!required

It is the id of the order invoice.

`storeAppId`String!required

It is the id of the order invoice.

`type`InvoiceTypeEnum!required

It is the type enum of the invoice.

### OrderPaymentMethod

```graphql
type OrderPaymentMethod {
  paymentGatewayCode: String
  paymentGatewayId: String
  paymentGatewayName: String
  price: Float!
  type: PaymentMethodTypeEnum!
}
```
Copy

#### Fields
`paymentGatewayCode`String

It is the gateway code of the order payment method.

`paymentGatewayId`String

It is the gateway name of the order payment method.

`paymentGatewayName`String

It is the gateway name of the order payment method.

`price`Float!required

It is the amount charged by the payment method.

`type`PaymentMethodTypeEnum!required

It is the type enum of the order payment method.

## Queries

### List Orders

```graphql
listOrder(
  branchId: StringFilterInput
  branchSessionId: StringFilterInput
  closedAt: DateFilterInput
  customerEmail: StringFilterInput
  customerId: StringFilterInput
  id: StringFilterInput
  invoicesStoreAppId: StringFilterInput
  orderNumber: StringFilterInput
  orderPackageStatus: OrderPackageStatusEnumInputFilter
  orderPaymentStatus: OrderPaymentStatusEnumInputFilter
  orderTagIds: StringFilterInput
  orderedAt: DateFilterInput
  pagination: PaginationInput
  paymentMethodType: OrderPaymentMethodEnumFilterInput
  salesChannelId: StringFilterInput
  search: String
  shippingMethod: OrderShippingMethodEnumFilterInput
  sort: String
  status: OrderStatusEnumInputFilter
  stockLocationId: StringFilterInput
  terminalId: StringFilterInput
  updatedAt: DateFilterInput
): OrderPaginationResponse!
```
Copy

#### Arguments
`branchId`StringFilterInput

`branchSessionId`StringFilterInput

`closedAt`DateFilterInput

`customerEmail`StringFilterInput

`customerId`StringFilterInput

`id`StringFilterInput

`invoicesStoreAppId`StringFilterInput

`orderNumber`StringFilterInput

`orderPackageStatus`OrderPackageStatusEnumInputFilter

`orderPaymentStatus`OrderPaymentStatusEnumInputFilter

`orderTagIds`StringFilterInput

`orderedAt`DateFilterInput

`pagination`PaginationInput

With the pagination feature in the data returned as a response, you can filter the data and display the part you want.

`paymentMethodType`OrderPaymentMethodEnumFilterInput

`salesChannelId`StringFilterInput

`search`String

Some listing APIs have searchable fields. You can search in these fields as you wish. For example, in an API; Let the `searchableFields :['name', 'description']`. If we send `search: AAA` as input in args, it will return records with 'AAA' in both the name and description fields.

`shippingMethod`OrderShippingMethodEnumFilterInput

`sort`String

Some listing APIs have sortable fields. Using these fields, the data returned as response has been sorted. For example, in an API; Let it be `sortableFields: ['updatedAt']`. The data returned as a response will be sorted according to updatedAt.

`status`OrderStatusEnumInputFilter

`stockLocationId`StringFilterInput

`terminalId`StringFilterInput

`updatedAt`DateFilterInput

#### Return Type
`OrderPaginationResponse`OrderPaginationResponse

## Mutations

### Update Order Package Status
Use this mutation to update the status of packages linked to an order and the status of the order based on the status of those packages.

```graphql
updateOrderPackageStatus(
  input: UpdateOrderPackageStatusInput!
): Order!
```
Copy

#### Arguments
`input`UpdateOrderPackageStatusInput!required

#### Return Type
`Order`Order

### Fulfill Order
Use this mutation to fulfill order line items.

```graphql
fulfillOrder(
  input: FulFillOrderInput!
): Order!
```
Copy

#### Arguments
`input`FulFillOrderInput!required

#### Return Type
`Order`Order

### Add Order Invoice
Use this mutation to add invoice to order.

```graphql
addOrderInvoice(
  input: AddOrderInvoiceInput!
): Order
```
Copy

#### Arguments
`input`AddOrderInvoiceInput!required

#### Return Type
`Order`Order

### Create Order with Transactions
Use this mutation if you want to create a new order with transactions.

```graphql
createOrderWithTransactions(
  input: CreateOrderWithTransactionsInput!
): Order!
```
Copy

#### Arguments
`input`CreateOrderWithTransactionsInput!required

#### Return Type
`Order`Order

### Cancel Fulfillment
Use this mutation to cancel the already created package for an order.

```graphql
cancelFulfillment(
  input: CancelFulfillmentInput!
): Order!
```
Copy

#### Arguments
`input`CancelFulfillmentInput!required

#### Return Type
`Order`Order

### Update Order Line
Use this mutation to cancel the fulfillment of the already created package for an order.

```graphql
updateOrderLine(
  input: UpdateOrderInput!
): Order!
```
Copy

#### Arguments
`input`UpdateOrderInput!required

#### Return Type
`Order`Order

### Refund Order Line
Use this mutation to refund given order lines.

```graphql
refundOrderLine(
  input: OrderRefundInput!
): Order!
```
Copy

#### Arguments
`input`OrderRefundInput!required

#### Return Type
`Order`Order

### Update Order Addresses
Use this mutation for order address information changes.

```graphql
updateOrderAddresses(
  input: UpdateOrderAddressesInput!
): Order!
```
Copy

#### Arguments
`input`UpdateOrderAddressesInput!required

#### Return Type
`Order`Order

## Examples

### List Orders

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ listOrder { data { billingAddress { addressLine1 addressLine2 city { code id name } company country { code id iso2 iso3 name } district { code id name } firstName id identityNumber isDefault lastName phone postalCode state { code id name } taxNumber taxOffice } branch { id name } branchSessionId cancelReason cancelledAt clientIp createdAt currencyCode currencyRates { code originalRate rate } customer { email firstName id identityNumber isGuestCheckout lastName phone } deleted giftPackageLines { price taxValue } giftPackageNote host id invoices { appId appName createdAt id invoiceNumber storeAppId type } isGiftPackage merchantId note orderAdjustments { amount amountType appliedOrderLines { amount appliedQuantity orderLineId } campaignId couponId name order type } orderLineItems { createdAt currencyCode deleted discount { amount amountType reason } discountPrice finalPrice id options { name productOptionId productOptionsSetId type values { name price value } } originalOrderLineItemId price quantity status statusUpdatedAt stockLocationId taxValue updatedAt variant { barcodeList brand { id name } categories { categoryPath { id name } id name } id mainImageId name prices { buyPrice currency discountPrice priceListId sellPrice } productId sku slug tagIds taxValue type variantValues { order variantTypeId variantTypeName variantValueId variantValueName } } } orderNumber orderPackageSequence orderPackageStatus orderPackages { createdAt deleted errorMessage id note orderLineItemIds orderPackageFulfillStatus orderPackageNumber stockLocationId trackingInfo { barcode cargoCompany isSendNotification trackingLink trackingNumber } updatedAt } orderPaymentStatus orderSequence orderTagIds orderedAt paymentMethods { price type } priceList { id name } salesChannel { id name type } shippingAddress { addressLine1 addressLine2 city { code id name } company country { code id iso2 iso3 name } district { code id name } firstName id identityNumber isDefault lastName phone postalCode state { code id name } taxNumber taxOffice } shippingLines { isRefunded price shippingSettingsId shippingZoneRateId taxValue title } shippingMethod staff { email firstName lastName } status storefront { id name } storefrontRouting { domain id locale path priceListId } storefrontTheme { id name themeId themeVersionId } taxLines { price rate } terminalId totalFinalPrice totalPrice updatedAt userAgent } } }"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
     listOrder {
       data {
             billingAddress {
                  addressLine1
                  addressLine2
                  city {
                    code
                    id
                    name
                  }
                  company
                  country {
                    code
                    id
                    iso2
                    iso3
                    name
                  }
                  district {
                    code
                    id
                    name
                  }
                  firstName
                  id
                  identityNumber
                  isDefault
                  lastName
                  phone
                  postalCode
                  state {
                    code
                    id
                    name
                  }
                  taxNumber
                  taxOffice
                }
                branch {
                  id
                  name
                }
                branchSessionId
                cancelReason
                cancelledAt
                clientIp
                createdAt
                currencyCode
                currencyRates {
                  code
                  originalRate
                  rate
                }
                customer {
                  email
                  firstName
                  id
                  identityNumber
                  isGuestCheckout
                  lastName
                  phone
                }
                deleted
                giftPackageLines {
                  price
                  taxValue
                }
                giftPackageNote
                host
                id
                invoices {
                  appId
                  appName
                  createdAt
                  id
                  invoiceNumber
                  storeAppId
                  type
                }
                isGiftPackage
                merchantId
                note
                orderAdjustments {
                  amount
                  amountType
                  appliedOrderLines {
                    amount
                    appliedQuantity
                    orderLineId
                  }
                  campaignId
                  couponId
                  name
                  order
                  type
                }
                orderLineItems {
                  createdAt
                  currencyCode
                  deleted
                  discount {
                    amount
                    amountType
                    reason
                  }
                  discountPrice
                  finalPrice
                  id
                  options {
                    name
                    productOptionId
                    productOptionsSetId
                    type
                    values {
                      name
                      price
                      value
                    }
                  }
                  originalOrderLineItemId
                  price
                  quantity
                  status
                  statusUpdatedAt
                  stockLocationId
                  taxValue
                  updatedAt
                  variant {
                    barcodeList
                    brand {
                      id
                      name
                    }
                    categories {
                      categoryPath {
                        id
                        name
                      }
                      id
                      name
                    }
                    id
                    mainImageId
                    name
                    prices {
                      buyPrice
                      currency
                      discountPrice
                      priceListId
                      sellPrice
                    }
                    productId
                    sku
                    slug
                    tagIds
                    taxValue
                    type
                    variantValues {
                      order
                      variantTypeId
                      variantTypeName
                      variantValueId
                      variantValueName
                    }
                  }
                }
                orderNumber
                orderPackageSequence
                orderPackageStatus
                orderPackages {
                  createdAt
                  deleted
                  errorMessage
                  id
                  note
                  orderLineItemIds
                  orderPackageFulfillStatus
                  orderPackageNumber
                  stockLocationId
                  trackingInfo {
                    barcode
                    cargoCompany
                    isSendNotification
                    trackingLink
                    trackingNumber
                  }
                  updatedAt
                }
                orderPaymentStatus
                orderSequence
                orderTagIds
                orderedAt
                paymentMethods {
                  price
                  type
                }
                priceList {
                  id
                  name
                }
                salesChannel {
                  id
                  name
                  type
                }
                shippingAddress {
                  addressLine1
                  addressLine2
                  city {
                    code
                    id
                    name
                  }
                  company
                  country {
                    code
                    id
                    iso2
                    iso3
                    name
                  }
                  district {
                    code
                    id
                    name
                  }
                  firstName
                  id
                  identityNumber
                  isDefault
                  lastName
                  phone
                  postalCode
                  state {
                    code
                    id
                    name
                  }
                  taxNumber
                  taxOffice
                }
                shippingLines {
                  isRefunded
                  price
                  shippingSettingsId
                  shippingZoneRateId
                  taxValue
                  title
                }
                shippingMethod
                staff {
                  email
                  firstName
                  lastName
                }
                status
                storefront {
                  id
                  name
                }
                storefrontRouting {
                  domain
                  id
                  locale
                  path
                  priceListId
                }
                storefrontTheme {
                  id
                  name
                  themeId
                  themeVersionId
                }
                taxLines {
                  price
                  rate
                }
                terminalId
                totalFinalPrice
                totalPrice
                updatedAt
                userAgent
       }
     }
   }
`};

const config = {
  method: 'POST',
  url: 'https://api.myikas.com/api/v1/admin/graphql',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_token'
  },
  data : data
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  if (error.response) {
    console.log(JSON.stringify(error.response.data));
  }
});
```
Copy

#### Response

```json
{
  "data": {
    "listOrder": {
      "data": [
        {
          "billingAddress": {
            "addressLine1": "ikas A.Ş. Koru Mah. Ahmet Taner Kışlalı Cad. No:4/12 North Star İş Merkezi",
            "addressLine2": null,
            "city": {
              "code": null,
              "id": "6f9272a3-9924-4223-baf8-9b21c9360f0c",
              "name": "Ankara"
            },
            "company": null,
            "country": {
              "code": "TUR",
              "id": "da8c5f2a-8d37-48a8-beff-6ab3793a1861",
              "name": "Turkey"
            },
            "district": {
              "code": null,
              "id": "0774fbd3-b818-463a-b697-2e28a8a6daed",
              "name": "Çankaya"
            },
            "firstName": "ikas",
            "identityNumber": null,
            "isDefault": false,
            "lastName": "docs",
            "phone": "+905555555555",
            "postalCode": null,
            "state": {
              "code": null,
              "id": "dcb9135c-4b84-4c06-9a42-f359317a9b78",
              "name": "Default"
            },
            "taxNumber": null,
            "taxOffice": null
          },
          "cancelReason": null,
          "cancelledAt": null,
          "clientIp": "176.42.29.28",
          "createdAt": 1637759203328,
          "currencyCode": "TRY",
          "currencyRates": [],
          "customer": {
            "email": "ikas@ikas.com",
            "firstName": "ikas",
            "id": "fa8b6fbc-210d-4488-88ab-a7bea0a2648b",
            "identityNumber": null,
            "lastName": "docs",
            "phone": null
          },
          "deleted": false,
          "host": "apidocs.myikas.dev",
          "id": "84ffbfd2-c92c-4f22-9675-8d3edb7a9084",
          "merchantId": "75d8a449-2feb-4230-9eb4-9014673324d5",
          "note": null,
          "orderAdjustments": [
            {
              "amount": 149.5,
              "amountType": "AMOUNT",
              "campaignId": "653aa7c2-4d3c-42ba-aba9-94060f52660d",
              "couponId": null,
              "name": "Kargo Bypass",
              "order": 1,
              "type": "DECREMENT"
            }
          ],
          "orderLineItems": [
            {
              "createdAt": 1638189270536,
              "currencyCode": "TRY",
              "deleted": false,
              "discount": null,
              "discountPrice": null,
              "finalPrice": 149.5,
              "id": "0a6f539f-8338-400c-a3fc-2bc15c01da58",
              "originalOrderLineItemId": "0a6f539f-8338-400c-a3fc-2bc15c01da58",
              "price": 299,
              "quantity": 1,
              "status": "FULFILLED",
              "statusUpdatedAt": null,
              "stockLocationId": "a0d19a13-7603-4d75-9ed7-dc414b1df8df",
              "taxValue": null,
              "updatedAt": 1638189270536,
              "variant": {
                "barcodeList": [],
                "id": "bd9b2bd8-0110-4ded-84c0-b8298332e469",
                "mainImageId": "e047ce73-8b77-40f0-8f13-eff9c2b05f4f",
                "name": "ikas Ürünü Siyah Kılıf - iPhone 11 Pro Max Kılıf Silikon",
                "productId": "62bca022-12be-4e2b-a9dd-90c67cb89dcb",
                "sku": null,
                "slug": "ikas-urunu-siyah-kilif-iphone-11-pro-max-kilif-silikon",
                "tagIds": [],
                "taxValue": null,
                "variantValues": []
              },
              "options": []
            }
          ],
          "orderNumber": "1028",
          "orderPackageStatus": "FULFILLED",
          "orderPackages": [
            {
              "createdAt": 1638189270536,
              "deleted": false,
              "errorMessage": null,
              "id": "a103735c-ece8-4a8f-9576-489f45c4487b",
              "note": null,
              "orderLineItemIds": ["0a6f539f-8338-400c-a3fc-2bc15c01da58"],
              "orderPackageFulfillStatus": "FULFILLED",
              "orderPackageNumber": "1028-1",
              "stockLocationId": "a0d19a13-7603-4d75-9ed7-dc414b1df8df",
              "trackingInfo": {
                "barcode": "123456",
                "cargoCompany": "UPS",
                "isSendNotification": null,
                "trackingLink": null,
                "trackingNumber": "123456"
              },
              "updatedAt": 1638189270536
            }
          ],
          "orderPaymentStatus": "PAID",
          "orderSequence": 28,
          "orderTagIds": [],
          "orderedAt": 1637759203143,
          "paymentMethods": [
            {
              "price": 170.5,
              "type": "MONEY_ORDER"
            }
          ],
          "priceList": null,
          "salesChannel": {
            "id": "9fa400f3-fbf1-4ee7-bc26-3cae7f9c3427",
            "name": "Jack",
            "type": 1
          },
          "shippingAddress": {
            "addressLine1": "ikas A.Ş. Koru Mah. Ahmet Taner Kışlalı Cad. No:4/12 North Star İş Merkezi",
            "addressLine2": null,
            "city": {
              "code": null,
              "id": "6f9272a3-9924-4223-baf8-9b21c9360f0c",
              "name": "Ankara"
            },
            "company": null,
            "country": {
              "code": "TUR",
              "id": "da8c5f2a-8d37-48a8-beff-6ab3793a1861",
              "name": "Turkey"
            },
            "district": {
              "code": null,
              "id": "0774fbd3-b818-463a-b697-2e28a8a6daed",
              "name": "Çankaya"
            },
            "firstName": "ikas",
            "identityNumber": null,
            "isDefault": false,
            "lastName": "docs",
            "phone": "+905555555555",
            "postalCode": null,
            "state": {
              "code": null,
              "id": "dcb9135c-4b84-4c06-9a42-f359317a9b78",
              "name": "Default"
            },
            "taxNumber": null,
            "taxOffice": null
          },
          "shippingLines": [
            {
              "price": 21,
              "shippingSettingsId": "ee4cc76c-f0c3-469f-ab8e-cc14b17fe78c",
              "shippingZoneRateId": "db02cc2d-5ba3-4b5b-8147-fee010faca21",
              "taxValue": null,
              "title": "Kkk",
              "isRefunded": null
            }
          ],
          "shippingMethod": "SHIPMENT",
          "status": "CREATED",
          "storefront": {
            "id": "8b742b03-c8f8-4509-858c-f9487c3701f2",
            "name": "Jack"
          },
          "storefrontRouting": {
            "domain": "tr",
            "id": "d3d0b8d9-76c6-436b-a1ba-024c1f4f4a12",
            "locale": "en",
            "path": "en",
            "priceListId": null
          },
          "storefrontTheme": {
            "id": "69b1451f-3467-4c7b-8ce1-bf4fec8400f8",
            "name": "test 6",
            "themeId": "84a89e25-9826-4b65-b056-6cb98cfb318e",
            "themeVersionId": "9da2385d-9fef-4066-8d3e-8377a5bf0e1b"
          },
          "taxLines": [],
          "invoices": [],
          "totalFinalPrice": 170.5,
          "totalPrice": 299,
          "updatedAt": 1638189270536,
          "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36",
          "isGiftPackage": false,
          "giftPackageNote": null,
          "giftPackageLines": null
        }
      ]
    }
  }
}
```
Copy

### Set Order Package Status as Ready for Shipment

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"mutation { updateOrderPackageStatus( input: { orderId: \"84ffbfd2-c92c-4f22-9675-8d3edb7a9084\" packages: [ { packageId:\"a103735c-ece8-4a8f-9576-489f45c4487b\" status: READY_FOR_SHIPMENT trackingInfo: { barcode: \"123456\" cargoCompany: \"UPS\" trackingNumber: \"123456\" } } ] } ) {billingAddress { addressLine1 addressLine2 city { code id name } company country { code id iso2 iso3 name } district { code id name } firstName id identityNumber isDefault lastName phone postalCode state { code id name } taxNumber taxOffice } branch { id name } branchSessionId cancelReason cancelledAt clientIp createdAt currencyCode currencyRates { code originalRate rate } customer { email firstName id identityNumber isGuestCheckout lastName phone } deleted giftPackageLines { price taxValue } giftPackageNote host id invoices { appId appName createdAt id invoiceNumber storeAppId type } isGiftPackage merchantId note orderAdjustments { amount amountType appliedOrderLines { amount appliedQuantity orderLineId } campaignId couponId name order type } orderLineItems { createdAt currencyCode deleted discount { amount amountType reason } discountPrice finalPrice id options { name productOptionId productOptionsSetId type values { name price value } } originalOrderLineItemId price quantity status statusUpdatedAt stockLocationId taxValue updatedAt variant { barcodeList brand { id name } categories { categoryPath { id name } id name } id mainImageId name prices { buyPrice currency discountPrice priceListId sellPrice } productId sku slug tagIds taxValue type variantValues { order variantTypeId variantTypeName variantValueId variantValueName } } } orderNumber orderPackageSequence orderPackageStatus orderPackages { createdAt deleted errorMessage id note orderLineItemIds orderPackageFulfillStatus orderPackageNumber stockLocationId trackingInfo { barcode cargoCompany isSendNotification trackingLink trackingNumber } updatedAt } orderPaymentStatus orderSequence orderTagIds orderedAt paymentMethods { price type } priceList { id name } salesChannel { id name type } shippingAddress { addressLine1 addressLine2 city { code id name } company country { code id iso2 iso3 name } district { code id name } firstName id identityNumber isDefault lastName phone postalCode state { code id name } taxNumber taxOffice } shippingLines { isRefunded price shippingSettingsId shippingZoneRateId taxValue title } shippingMethod staff { email firstName lastName } status storefront { id name } storefrontRouting { domain id locale path priceListId } storefrontTheme { id name themeId themeVersionId } taxLines { price rate } terminalId totalFinalPrice totalPrice updatedAt userAgent} }"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`mutation {
              updateOrderPackageStatus(
                input: {
                  orderId: "84ffbfd2-c92c-4f22-9675-8d3edb7a9084"
                  packages: [
                    {
                      packageId:"a103735c-ece8-4a8f-9576-489f45c4487b"
                      status: READY_FOR_SHIPMENT
                      trackingInfo: {
                        barcode: "123456"
                        cargoCompany: "UPS"
                        trackingNumber: "123456"
                      }
                    }
                  ]
                }
              ) {billingAddress {
                  addressLine1
                  addressLine2
                  city {
                    code
                    id
                    name
                  }
                  company
                  country {
                    code
                    id
                    iso2
                    iso3
                    name
                  }
                  district {
                    code
                    id
                    name
                  }
                  firstName
                  id
                  identityNumber
                  isDefault
                  lastName
                  phone
                  postalCode
                  state {
                    code
                    id
                    name
                  }
                  taxNumber
                  taxOffice
                }
                branch {
                  id
                  name
                }
                branchSessionId
                cancelReason
                cancelledAt
                clientIp
                createdAt
                currencyCode
                currencyRates {
                  code
                  originalRate
                  rate
                }
                customer {
                  email
                  firstName
                  id
                  identityNumber
                  isGuestCheckout
                  lastName
                  phone
                }
                deleted
                giftPackageLines {
                  price
                  taxValue
                }
                giftPackageNote
                host
                id
                invoices {
                  appId
                  appName
                  createdAt
                  id
                  invoiceNumber
                  storeAppId
                  type
                }
                isGiftPackage
                merchantId
                note
                orderAdjustments {
                  amount
                  amountType
                  appliedOrderLines {
                    amount
                    appliedQuantity
                    orderLineId
                  }
                  campaignId
                  couponId
                  name
                  order
                  type
                }
                orderLineItems {
                  createdAt
                  currencyCode
                  deleted
                  discount {
                    amount
                    amountType
                    reason
                  }
                  discountPrice
                  finalPrice
                  id
                  options {
                    name
                    productOptionId
                    productOptionsSetId
                    type
                    values {
                      name
                      price
                      value
                    }
                  }
                  originalOrderLineItemId
                  price
                  quantity
                  status
                  statusUpdatedAt
                  stockLocationId
                  taxValue
                  updatedAt
                  variant {
                    barcodeList
                    brand {
                      id
                      name
                    }
                    categories {
                      categoryPath {
                        id
                        name
                      }
                      id
                      name
                    }
                    id
                    mainImageId
                    name
                    prices {
                      buyPrice
                      currency
                      discountPrice
                      priceListId
                      sellPrice
                    }
                    productId
                    sku
                    slug
                    tagIds
                    taxValue
                    type
                    variantValues {
                      order
                      variantTypeId
                      variantTypeName
                      variantValueId
                      variantValueName
                    }
                  }
                }
                orderNumber
                orderPackageSequence
                orderPackageStatus
                orderPackages {
                  createdAt
                  deleted
                  errorMessage
                  id
                  note
                  orderLineItemIds
                  orderPackageFulfillStatus
                  orderPackageNumber
                  stockLocationId
                  trackingInfo {
                    barcode
                    cargoCompany
                    isSendNotification
                    trackingLink
                    trackingNumber
                  }
                  updatedAt
                }
                orderPaymentStatus
                orderSequence
                orderTagIds
                orderedAt
                paymentMethods {
                  price
                  type
                }
                priceList {
                  id
                  name
                }
                salesChannel {
                  id
                  name
                  type
                }
                shippingAddress {
                  addressLine1
                  addressLine2
                  city {
                    code
                    id
                    name
                  }
                  company
                  country {
                    code
                    id
                    iso2
                    iso3
                    name
                  }
                  district {
                    code
                    id
                    name
                  }
                  firstName
                  id
                  identityNumber
                  isDefault
                  lastName
                  phone
                  postalCode
                  state {
                    code
                    id
                    name
                  }
                  taxNumber
                  taxOffice
                }
                shippingLines {
                  isRefunded
                  price
                  shippingSettingsId
                  shippingZoneRateId
                  taxValue
                  title
                }
                shippingMethod
                staff {
                  email
                  firstName
                  lastName
                }
                status
                storefront {
                  id
                  name
                }
                storefrontRouting {
                  domain
                  id
                  locale
                  path
                  priceListId
                }
                storefrontTheme {
                  id
                  name
                  themeId
                  themeVersionId
                }
                taxLines {
                  price
                  rate
                }
                terminalId
                totalFinalPrice
                totalPrice
                updatedAt
                userAgent}
   }
`};

const config = {
  method: 'POST',
  url: 'https://api.myikas.com/api/v1/admin/graphql',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_token'
  },
  data : data
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  if (error.response) {
    console.log(JSON.stringify(error.response.data));
  }
});
```
Copy

#### Response

```json
{
  "data": {
    "updateOrderPackageStatus": {
      "billingAddress": {
        "addressLine1": "ikas A.Ş. Koru Mah. Ahmet Taner Kışlalı Cad. No:4/12 North Star İş Merkezi",
        "addressLine2": null,
        "city": {
          "code": null,
          "id": "6f9272a3-9924-4223-baf8-9b21c9360f0c",
          "name": "Ankara"
        },
        "company": null,
        "country": {
          "code": "TUR",
          "id": "da8c5f2a-8d37-48a8-beff-6ab3793a1861",
          "name": "Turkey"
        },
        "district": {
          "code": null,
          "id": "0774fbd3-b818-463a-b697-2e28a8a6daed",
          "name": "Çankaya"
        },
        "firstName": "ikas",
        "identityNumber": null,
        "isDefault": false,
        "lastName": "docs",
        "phone": "+905555555555",
        "postalCode": null,
        "state": {
          "code": null,
          "id": "dcb9135c-4b84-4c06-9a42-f359317a9b78",
          "name": "Default"
        },
        "taxNumber": null,
        "taxOffice": null
      },
      "cancelReason": null,
      "cancelledAt": null,
      "clientIp": "176.42.29.28",
      "createdAt": 1637759203328,
      "currencyCode": "TRY",
      "currencyRates": [],
      "customer": {
        "email": "ikas@ikas.com",
        "firstName": "ikas",
        "id": "fa8b6fbc-210d-4488-88ab-a7bea0a2648b",
        "identityNumber": null,
        "lastName": "docs",
        "phone": null
      },
      "deleted": false,
      "host": "apidocs.myikas.dev",
      "id": "84ffbfd2-c92c-4f22-9675-8d3edb7a9084",
      "merchantId": "75d8a449-2feb-4230-9eb4-9014673324d5",
      "note": null,
      "orderAdjustments": [
        {
          "amount": 149.5,
          "amountType": "AMOUNT",
          "campaignId": "653aa7c2-4d3c-42ba-aba9-94060f52660d",
          "couponId": null,
          "name": "Kargo Bypass",
          "order": 1,
          "type": "DECREMENT"
        }
      ],
      "orderLineItems": [
        {
          "createdAt": 1638189270536,
          "currencyCode": "TRY",
          "deleted": false,
          "discount": null,
          "discountPrice": null,
          "finalPrice": 149.5,
          "id": "0a6f539f-8338-400c-a3fc-2bc15c01da58",
          "originalOrderLineItemId": "0a6f539f-8338-400c-a3fc-2bc15c01da58",
          "price": 299,
          "quantity": 1,
          "status": "FULFILLED",
          "statusUpdatedAt": null,
          "stockLocationId": "a0d19a13-7603-4d75-9ed7-dc414b1df8df",
          "taxValue": null,
          "updatedAt": 1638189270536,
          "variant": {
            "barcodeList": [],
            "id": "bd9b2bd8-0110-4ded-84c0-b8298332e469",
            "mainImageId": "e047ce73-8b77-40f0-8f13-eff9c2b05f4f",
            "name": "ikas Ürünü Siyah Kılıf - iPhone 11 Pro Max Kılıf Silikon",
            "productId": "62bca022-12be-4e2b-a9dd-90c67cb89dcb",
            "sku": null,
            "slug": "ikas-urunu-siyah-kilif-iphone-11-pro-max-kilif-silikon",
            "tagIds": [],
            "taxValue": null,
            "variantValues": []
          },
          "options": []
        }
      ],
      "orderNumber": "1028",
      "orderPackageStatus": "FULFILLED",
      "orderPackages": [
        {
          "createdAt": 1638189270536,
          "deleted": false,
          "errorMessage": null,
          "id": "a103735c-ece8-4a8f-9576-489f45c4487b",
          "note": null,
          "orderLineItemIds": ["0a6f539f-8338-400c-a3fc-2bc15c01da58"],
          "orderPackageFulfillStatus": "FULFILLED",
          "orderPackageNumber": "1028-1",
          "stockLocationId": "a0d19a13-7603-4d75-9ed7-dc414b1df8df",
          "trackingInfo": {
            "barcode": "123456",
            "cargoCompany": "UPS",
            "isSendNotification": null,
            "trackingLink": null,
            "trackingNumber": "123456"
          },
          "updatedAt": 1638189270536
        }
      ],
      "orderPaymentStatus": "PAID",
      "orderSequence": 28,
      "orderTagIds": [],
      "orderedAt": 1637759203143,
      "paymentMethods": [
        {
          "price": 170.5,
          "type": "MONEY_ORDER"
        }
      ],
      "priceList": null,
      "salesChannel": {
        "id": "9fa400f3-fbf1-4ee7-bc26-3cae7f9c3427",
        "name": "Jack",
        "type": 1
      },
      "shippingAddress": {
        "addressLine1": "ikas A.Ş. Koru Mah. Ahmet Taner Kışlalı Cad. No:4/12 North Star İş Merkezi",
        "addressLine2": null,
        "city": {
          "code": null,
          "id": "6f9272a3-9924-4223-baf8-9b21c9360f0c",
          "name": "Ankara"
        },
        "company": null,
        "country": {
          "code": "TUR",
          "id": "da8c5f2a-8d37-48a8-beff-6ab3793a1861",
          "name": "Turkey"
        },
        "district": {
          "code": null,
          "id": "0774fbd3-b818-463a-b697-2e28a8a6daed",
          "name": "Çankaya"
        },
        "firstName": "ikas",
        "identityNumber": null,
        "isDefault": false,
        "lastName": "docs",
        "phone": "+905555555555",
        "postalCode": null,
        "state": {
          "code": null,
          "id": "dcb9135c-4b84-4c06-9a42-f359317a9b78",
          "name": "Default"
        },
        "taxNumber": null,
        "taxOffice": null
      },
      "shippingLines": [
        {
          "price": 21,
          "shippingSettingsId": "ee4cc76c-f0c3-469f-ab8e-cc14b17fe78c",
          "shippingZoneRateId": "db02cc2d-5ba3-4b5b-8147-fee010faca21",
          "taxValue": null,
          "title": "Kkk",
          "isRefunded": null
        }
      ],
      "shippingMethod": "SHIPMENT",
      "status": "CREATED",
      "storefront": {
        "id": "8b742b03-c8f8-4509-858c-f9487c3701f2",
        "name": "Jack"
      },
      "storefrontRouting": {
        "domain": "tr",
        "id": "d3d0b8d9-76c6-436b-a1ba-024c1f4f4a12",
        "locale": "en",
        "path": "en",
        "priceListId": null
      },
      "storefrontTheme": {
        "id": "69b1451f-3467-4c7b-8ce1-bf4fec8400f8",
        "name": "test 6",
        "themeId": "84a89e25-9826-4b65-b056-6cb98cfb318e",
        "themeVersionId": "9da2385d-9fef-4066-8d3e-8377a5bf0e1b"
      },
      "taxLines": [],
      "invoices": [],
      "totalFinalPrice": 170.5,
      "totalPrice": 299,
      "updatedAt": 1638189270536,
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36",
      "isGiftPackage": false,
      "giftPackageNote": null,
      "giftPackageLines": null
    }
  }
}
```
Copy

### Fulfill Order Lines with Tracking Info

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"mutationundefined"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"mutation":`{
              fulfillOrder(
                input: {
                  lines: [{ orderLineItemId: '0a6f539f-8338-400c-a3fc-2bc15c01da58', quantity: 1 }]
                  orderId:'84ffbfd2-c92c-4f22-9675-8d3edb7a9084'
                  trackingInfoDetail: {
                    barcode:'123456'
                    cargoCompany: 'UPS'
                    isSendNotification: false
                    trackingLink: 'www.ikas.com'
                    trackingNumber: '123456'
                  }
                }
              ) {billingAddress {
                  addressLine1
                  addressLine2
                  city {
                    code
                    id
                    name
                  }
                  company
                  country {
                    code
                    id
                    iso2
                    iso3
                    name
                  }
                  district {
                    code
                    id
                    name
                  }
                  firstName
                  id
                  identityNumber
                  isDefault
                  lastName
                  phone
                  postalCode
                  state {
                    code
                    id
                    name
                  }
                  taxNumber
                  taxOffice
                }
                branch {
                  id
                  name
                }
                branchSessionId
                cancelReason
                cancelledAt
                clientIp
                createdAt
                currencyCode
                currencyRates {
                  code
                  originalRate
                  rate
                }
                customer {
                  email
                  firstName
                  id
                  identityNumber
                  isGuestCheckout
                  lastName
                  phone
                }
                deleted
                giftPackageLines {
                  price
                  taxValue
                }
                giftPackageNote
                host
                id
                invoices {
                  appId
                  appName
                  createdAt
                  id
                  invoiceNumber
                  storeAppId
                  type
                }
                isGiftPackage
                merchantId
                note
                orderAdjustments {
                  amount
                  amountType
                  appliedOrderLines {
                    amount
                    appliedQuantity
                    orderLineId
                  }
                  campaignId
                  couponId
                  name
                  order
                  type
                }
                orderLineItems {
                  createdAt
                  currencyCode
                  deleted
                  discount {
                    amount
                    amountType
                    reason
                  }
                  discountPrice
                  finalPrice
                  id
                  options {
                    name
                    productOptionId
                    productOptionsSetId
                    type
                    values {
                      name
                      price
                      value
                    }
                  }
                  originalOrderLineItemId
                  price
                  quantity
                  status
                  statusUpdatedAt
                  stockLocationId
                  taxValue
                  updatedAt
                  variant {
                    barcodeList
                    brand {
                      id
                      name
                    }
                    categories {
                      categoryPath {
                        id
                        name
                      }
                      id
                      name
                    }
                    id
                    mainImageId
                    name
                    prices {
                      buyPrice
                      currency
                      discountPrice
                      priceListId
                      sellPrice
                    }
                    productId
                    sku
                    slug
                    tagIds
                    taxValue
                    type
                    variantValues {
                      order
                      variantTypeId
                      variantTypeName
                      variantValueId
                      variantValueName
                    }
                  }
                }
                orderNumber
                orderPackageSequence
                orderPackageStatus
                orderPackages {
                  createdAt
                  deleted
                  errorMessage
                  id
                  note
                  orderLineItemIds
                  orderPackageFulfillStatus
                  orderPackageNumber
                  stockLocationId
                  trackingInfo {
                    barcode
                    cargoCompany
                    isSendNotification
                    trackingLink
                    trackingNumber
                  }
                  updatedAt
                }
                orderPaymentStatus
                orderSequence
                orderTagIds
                orderedAt
                paymentMethods {
                  price
                  type
                }
                priceList {
                  id
                  name
                }
                salesChannel {
                  id
                  name
                  type
                }
                shippingAddress {
                  addressLine1
                  addressLine2
                  city {
                    code
                    id
                    name
                  }
                  company
                  country {
                    code
                    id
                    iso2
                    iso3
                    name
                  }
                  district {
                    code
                    id
                    name
                  }
                  firstName
                  id
                  identityNumber
                  isDefault
                  lastName
                  phone
                  postalCode
                  state {
                    code
                    id
                    name
                  }
                  taxNumber
                  taxOffice
                }
                shippingLines {
                  isRefunded
                  price
                  shippingSettingsId
                  shippingZoneRateId
                  taxValue
                  title
                }
                shippingMethod
                staff {
                  email
                  firstName
                  lastName
                }
                status
                storefront {
                  id
                  name
                }
                storefrontRouting {
                  domain
                  id
                  locale
                  path
                  priceListId
                }
                storefrontTheme {
                  id
                  name
                  themeId
                  themeVersionId
                }
                taxLines {
                  price
                  rate
                }
                terminalId
                totalFinalPrice
                totalPrice
                updatedAt
                userAgent}
   }
`};

const config = {
  method: 'POST',
  url: 'https://api.myikas.com/api/v1/admin/graphql',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_token'
  },
  data : data
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  if (error.response) {
    console.log(JSON.stringify(error.response.data));
  }
});
```
Copy

#### Response

```json
{
  "data": {
    "fulfillOrder": {
      "billingAddress": {
        "addressLine1": "ikas A.Ş. Koru Mah. Ahmet Taner Kışlalı Cad. No:4/12 North Star İş Merkezi",
        "addressLine2": null,
        "city": {
          "code": null,
          "id": "6f9272a3-9924-4223-baf8-9b21c9360f0c",
          "name": "Ankara"
        },
        "company": null,
        "country": {
          "code": "TUR",
          "id": "da8c5f2a-8d37-48a8-beff-6ab3793a1861",
          "name": "Turkey"
        },
        "district": {
          "code": null,
          "id": "0774fbd3-b818-463a-b697-2e28a8a6daed",
          "name": "Çankaya"
        },
        "firstName": "ikas",
        "identityNumber": null,
        "isDefault": false,
        "lastName": "docs",
        "phone": "+905555555555",
        "postalCode": null,
        "state": {
          "code": null,
          "id": "dcb9135c-4b84-4c06-9a42-f359317a9b78",
          "name": "Default"
        },
        "taxNumber": null,
        "taxOffice": null
      },
      "cancelReason": null,
      "cancelledAt": null,
      "clientIp": "176.42.29.28",
      "createdAt": 1637759203328,
      "currencyCode": "TRY",
      "currencyRates": [],
      "customer": {
        "email": "ikas@ikas.com",
        "firstName": "ikas",
        "id": "fa8b6fbc-210d-4488-88ab-a7bea0a2648b",
        "identityNumber": null,
        "lastName": "docs",
        "phone": null
      },
      "deleted": false,
      "host": "apidocs.myikas.dev",
      "id": "84ffbfd2-c92c-4f22-9675-8d3edb7a9084",
      "merchantId": "75d8a449-2feb-4230-9eb4-9014673324d5",
      "note": null,
      "orderAdjustments": [
        {
          "amount": 149.5,
          "amountType": "AMOUNT",
          "campaignId": "653aa7c2-4d3c-42ba-aba9-94060f52660d",
          "couponId": null,
          "name": "Kargo Bypass",
          "order": 1,
          "type": "DECREMENT"
        }
      ],
      "orderLineItems": [
        {
          "createdAt": 1638189270536,
          "currencyCode": "TRY",
          "deleted": false,
          "discount": null,
          "discountPrice": null,
          "finalPrice": 149.5,
          "id": "0a6f539f-8338-400c-a3fc-2bc15c01da58",
          "originalOrderLineItemId": "0a6f539f-8338-400c-a3fc-2bc15c01da58",
          "price": 299,
          "quantity": 1,
          "status": "FULFILLED",
          "statusUpdatedAt": null,
          "stockLocationId": "a0d19a13-7603-4d75-9ed7-dc414b1df8df",
          "taxValue": null,
          "updatedAt": 1638189270536,
          "variant": {
            "barcodeList": [],
            "id": "bd9b2bd8-0110-4ded-84c0-b8298332e469",
            "mainImageId": "e047ce73-8b77-40f0-8f13-eff9c2b05f4f",
            "name": "ikas Ürünü Siyah Kılıf - iPhone 11 Pro Max Kılıf Silikon",
            "productId": "62bca022-12be-4e2b-a9dd-90c67cb89dcb",
            "sku": null,
            "slug": "ikas-urunu-siyah-kilif-iphone-11-pro-max-kilif-silikon",
            "tagIds": [],
            "taxValue": null,
            "variantValues": []
          },
          "options": []
        }
      ],
      "orderNumber": "1028",
      "orderPackageStatus": "FULFILLED",
      "orderPackages": [
        {
          "createdAt": 1638189270536,
          "deleted": false,
          "errorMessage": null,
          "id": "a103735c-ece8-4a8f-9576-489f45c4487b",
          "note": null,
          "orderLineItemIds": ["0a6f539f-8338-400c-a3fc-2bc15c01da58"],
          "orderPackageFulfillStatus": "FULFILLED",
          "orderPackageNumber": "1028-1",
          "stockLocationId": "a0d19a13-7603-4d75-9ed7-dc414b1df8df",
          "trackingInfo": {
            "barcode": "123456",
            "cargoCompany": "UPS",
            "isSendNotification": null,
            "trackingLink": null,
            "trackingNumber": "123456"
          },
          "updatedAt": 1638189270536
        }
      ],
      "orderPaymentStatus": "PAID",
      "orderSequence": 28,
      "orderTagIds": [],
      "orderedAt": 1637759203143,
      "paymentMethods": [
        {
          "price": 170.5,
          "type": "MONEY_ORDER"
        }
      ],
      "priceList": null,
      "salesChannel": {
        "id": "9fa400f3-fbf1-4ee7-bc26-3cae7f9c3427",
        "name": "Jack",
        "type": 1
      },
      "shippingAddress": {
        "addressLine1": "ikas A.Ş. Koru Mah. Ahmet Taner Kışlalı Cad. No:4/12 North Star İş Merkezi",
        "addressLine2": null,
        "city": {
          "code": null,
          "id": "6f9272a3-9924-4223-baf8-9b21c9360f0c",
          "name": "Ankara"
        },
        "company": null,
        "country": {
          "code": "TUR",
          "id": "da8c5f2a-8d37-48a8-beff-6ab3793a1861",
          "name": "Turkey"
        },
        "district": {
          "code": null,
          "id": "0774fbd3-b818-463a-b697-2e28a8a6daed",
          "name": "Çankaya"
        },
        "firstName": "ikas",
        "identityNumber": null,
        "isDefault": false,
        "lastName": "docs",
        "phone": "+905555555555",
        "postalCode": null,
        "state": {
          "code": null,
          "id": "dcb9135c-4b84-4c06-9a42-f359317a9b78",
          "name": "Default"
        },
        "taxNumber": null,
        "taxOffice": null
      },
      "shippingLines": [
        {
          "price": 21,
          "shippingSettingsId": "ee4cc76c-f0c3-469f-ab8e-cc14b17fe78c",
          "shippingZoneRateId": "db02cc2d-5ba3-4b5b-8147-fee010faca21",
          "taxValue": null,
          "title": "Kkk",
          "isRefunded": null
        }
      ],
      "shippingMethod": "SHIPMENT",
      "status": "CREATED",
      "storefront": {
        "id": "8b742b03-c8f8-4509-858c-f9487c3701f2",
        "name": "Jack"
      },
      "storefrontRouting": {
        "domain": "tr",
        "id": "d3d0b8d9-76c6-436b-a1ba-024c1f4f4a12",
        "locale": "en",
        "path": "en",
        "priceListId": null
      },
      "storefrontTheme": {
        "id": "69b1451f-3467-4c7b-8ce1-bf4fec8400f8",
        "name": "test 6",
        "themeId": "84a89e25-9826-4b65-b056-6cb98cfb318e",
        "themeVersionId": "9da2385d-9fef-4066-8d3e-8377a5bf0e1b"
      },
      "taxLines": [],
      "invoices": [],
      "totalFinalPrice": 170.5,
      "totalPrice": 299,
      "updatedAt": 1638189270536,
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36",
      "isGiftPackage": false,
      "giftPackageNote": null,
      "giftPackageLines": null
    }
  }
}
```
Copy

### Add Invoice PDF to Order

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"mutationundefined"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"mutation":`{
              addOrderInvoice(
                  input: {
                    appId: '1a3456a8-5119-11ec-bf63-0242ac130002'
                    base64: 'LWludm9pY2UgY29udGV...[Base64 Invoice Data]'
                    invoiceNumber: 'IK-10001-1'
                    orderId:'84ffbfd2-c92c-4f22-9675-8d3edb7a9084'
                    sendNotificationToCustomer: false
                    type: COMPANY
                  }
              ) {billingAddress {
                  addressLine1
                  addressLine2
                  city {
                    code
                    id
                    name
                  }
                  company
                  country {
                    code
                    id
                    iso2
                    iso3
                    name
                  }
                  district {
                    code
                    id
                    name
                  }
                  firstName
                  id
                  identityNumber
                  isDefault
                  lastName
                  phone
                  postalCode
                  state {
                    code
                    id
                    name
                  }
                  taxNumber
                  taxOffice
                }
                branch {
                  id
                  name
                }
                branchSessionId
                cancelReason
                cancelledAt
                clientIp
                createdAt
                currencyCode
                currencyRates {
                  code
                  originalRate
                  rate
                }
                customer {
                  email
                  firstName
                  id
                  identityNumber
                  isGuestCheckout
                  lastName
                  phone
                }
                deleted
                giftPackageLines {
                  price
                  taxValue
                }
                giftPackageNote
                host
                id
                invoices {
                  appId
                  appName
                  createdAt
                  id
                  invoiceNumber
                  storeAppId
                  type
                }
                isGiftPackage
                merchantId
                note
                orderAdjustments {
                  amount
                  amountType
                  appliedOrderLines {
                    amount
                    appliedQuantity
                    orderLineId
                  }
                  campaignId
                  couponId
                  name
                  order
                  type
                }
                orderLineItems {
                  createdAt
                  currencyCode
                  deleted
                  discount {
                    amount
                    amountType
                    reason
                  }
                  discountPrice
                  finalPrice
                  id
                  options {
                    name
                    productOptionId
                    productOptionsSetId
                    type
                    values {
                      name
                      price
                      value
                    }
                  }
                  originalOrderLineItemId
                  price
                  quantity
                  status
                  statusUpdatedAt
                  stockLocationId
                  taxValue
                  updatedAt
                  variant {
                    barcodeList
                    brand {
                      id
                      name
                    }
                    categories {
                      categoryPath {
                        id
                        name
                      }
                      id
                      name
                    }
                    id
                    mainImageId
                    name
                    prices {
                      buyPrice
                      currency
                      discountPrice
                      priceListId
                      sellPrice
                    }
                    productId
                    sku
                    slug
                    tagIds
                    taxValue
                    type
                    variantValues {
                      order
                      variantTypeId
                      variantTypeName
                      variantValueId
                      variantValueName
                    }
                  }
                }
                orderNumber
                orderPackageSequence
                orderPackageStatus
                orderPackages {
                  createdAt
                  deleted
                  errorMessage
                  id
                  note
                  orderLineItemIds
                  orderPackageFulfillStatus
                  orderPackageNumber
                  stockLocationId
                  trackingInfo {
                    barcode
                    cargoCompany
                    isSendNotification
                    trackingLink
                    trackingNumber
                  }
                  updatedAt
                }
                orderPaymentStatus
                orderSequence
                orderTagIds
                orderedAt
                paymentMethods {
                  price
                  type
                }
                priceList {
                  id
                  name
                }
                salesChannel {
                  id
                  name
                  type
                }
                shippingAddress {
                  addressLine1
                  addressLine2
                  city {
                    code
                    id
                    name
                  }
                  company
                  country {
                    code
                    id
                    iso2
                    iso3
                    name
                  }
                  district {
                    code
                    id
                    name
                  }
                  firstName
                  id
                  identityNumber
                  isDefault
                  lastName
                  phone
                  postalCode
                  state {
                    code
                    id
                    name
                  }
                  taxNumber
                  taxOffice
                }
                shippingLines {
                  isRefunded
                  price
                  shippingSettingsId
                  shippingZoneRateId
                  taxValue
                  title
                }
                shippingMethod
                staff {
                  email
                  firstName
                  lastName
                }
                status
                storefront {
                  id
                  name
                }
                storefrontRouting {
                  domain
                  id
                  locale
                  path
                  priceListId
                }
                storefrontTheme {
                  id
                  name
                  themeId
                  themeVersionId
                }
                taxLines {
                  price
                  rate
                }
                terminalId
                totalFinalPrice
                totalPrice
                updatedAt
                userAgent}
   }
`};

const config = {
  method: 'POST',
  url: 'https://api.myikas.com/api/v1/admin/graphql',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_token'
  },
  data : data
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  if (error.response) {
    console.log(JSON.stringify(error.response.data));
  }
});
```
Copy

#### Response

```json
{
  "data": {
    "addOrderInvoice": {
      "billingAddress": {
        "addressLine1": "ikas A.Ş. Koru Mah. Ahmet Taner Kışlalı Cad. No:4/12 North Star İş Merkezi",
        "addressLine2": null,
        "city": {
          "code": null,
          "id": "6f9272a3-9924-4223-baf8-9b21c9360f0c",
          "name": "Ankara"
        },
        "company": null,
        "country": {
          "code": "TUR",
          "id": "da8c5f2a-8d37-48a8-beff-6ab3793a1861",
          "name": "Turkey"
        },
        "district": {
          "code": null,
          "id": "0774fbd3-b818-463a-b697-2e28a8a6daed",
          "name": "Çankaya"
        },
        "firstName": "ikas",
        "identityNumber": null,
        "isDefault": false,
        "lastName": "docs",
        "phone": "+905555555555",
        "postalCode": null,
        "state": {
          "code": null,
          "id": "dcb9135c-4b84-4c06-9a42-f359317a9b78",
          "name": "Default"
        },
        "taxNumber": null,
        "taxOffice": null
      },
      "cancelReason": null,
      "cancelledAt": null,
      "clientIp": "176.42.29.28",
      "createdAt": 1637759203328,
      "currencyCode": "TRY",
      "currencyRates": [],
      "customer": {
        "email": "ikas@ikas.com",
        "firstName": "ikas",
        "id": "fa8b6fbc-210d-4488-88ab-a7bea0a2648b",
        "identityNumber": null,
        "lastName": "docs",
        "phone": null
      },
      "deleted": false,
      "host": "apidocs.myikas.dev",
      "id": "84ffbfd2-c92c-4f22-9675-8d3edb7a9084",
      "merchantId": "75d8a449-2feb-4230-9eb4-9014673324d5",
      "note": null,
      "orderAdjustments": [
        {
          "amount": 149.5,
          "amountType": "AMOUNT",
          "campaignId": "653aa7c2-4d3c-42ba-aba9-94060f52660d",
          "couponId": null,
          "name": "Kargo Bypass",
          "order": 1,
          "type": "DECREMENT"
        }
      ],
      "orderLineItems": [
        {
          "createdAt": 1638189270536,
          "currencyCode": "TRY",
          "deleted": false,
          "discount": null,
          "discountPrice": null,
          "finalPrice": 149.5,
          "id": "0a6f539f-8338-400c-a3fc-2bc15c01da58",
          "originalOrderLineItemId": "0a6f539f-8338-400c-a3fc-2bc15c01da58",
          "price": 299,
          "quantity": 1,
          "status": "FULFILLED",
          "statusUpdatedAt": null,
          "stockLocationId": "a0d19a13-7603-4d75-9ed7-dc414b1df8df",
          "taxValue": null,
          "updatedAt": 1638189270536,
          "variant": {
            "barcodeList": [],
            "id": "bd9b2bd8-0110-4ded-84c0-b8298332e469",
            "mainImageId": "e047ce73-8b77-40f0-8f13-eff9c2b05f4f",
            "name": "ikas Ürünü Siyah Kılıf - iPhone 11 Pro Max Kılıf Silikon",
            "productId": "62bca022-12be-4e2b-a9dd-90c67cb89dcb",
            "sku": null,
            "slug": "ikas-urunu-siyah-kilif-iphone-11-pro-max-kilif-silikon",
            "tagIds": [],
            "taxValue": null,
            "variantValues": []
          },
          "options": []
        }
      ],
      "orderNumber": "1028",
      "orderPackageStatus": "FULFILLED",
      "orderPackages": [
        {
          "createdAt": 1638189270536,
          "deleted": false,
          "errorMessage": null,
          "id": "a103735c-ece8-4a8f-9576-489f45c4487b",
          "note": null,
          "orderLineItemIds": ["0a6f539f-8338-400c-a3fc-2bc15c01da58"],
          "orderPackageFulfillStatus": "FULFILLED",
          "orderPackageNumber": "1028-1",
          "stockLocationId": "a0d19a13-7603-4d75-9ed7-dc414b1df8df",
          "trackingInfo": {
            "barcode": "123456",
            "cargoCompany": "UPS",
            "isSendNotification": null,
            "trackingLink": null,
            "trackingNumber": "123456"
          },
          "updatedAt": 1638189270536
        }
      ],
      "orderPaymentStatus": "PAID",
      "orderSequence": 28,
      "orderTagIds": [],
      "orderedAt": 1637759203143,
      "paymentMethods": [
        {
          "price": 170.5,
          "type": "MONEY_ORDER"
        }
      ],
      "priceList": null,
      "salesChannel": {
        "id": "9fa400f3-fbf1-4ee7-bc26-3cae7f9c3427",
        "name": "Jack",
        "type": 1
      },
      "shippingAddress": {
        "addressLine1": "ikas A.Ş. Koru Mah. Ahmet Taner Kışlalı Cad. No:4/12 North Star İş Merkezi",
        "addressLine2": null,
        "city": {
          "code": null,
          "id": "6f9272a3-9924-4223-baf8-9b21c9360f0c",
          "name": "Ankara"
        },
        "company": null,
        "country": {
          "code": "TUR",
          "id": "da8c5f2a-8d37-48a8-beff-6ab3793a1861",
          "name": "Turkey"
        },
        "district": {
          "code": null,
          "id": "0774fbd3-b818-463a-b697-2e28a8a6daed",
          "name": "Çankaya"
        },
        "firstName": "ikas",
        "identityNumber": null,
        "isDefault": false,
        "lastName": "docs",
        "phone": "+905555555555",
        "postalCode": null,
        "state": {
          "code": null,
          "id": "dcb9135c-4b84-4c06-9a42-f359317a9b78",
          "name": "Default"
        },
        "taxNumber": null,
        "taxOffice": null
      },
      "shippingLines": [
        {
          "price": 21,
          "shippingSettingsId": "ee4cc76c-f0c3-469f-ab8e-cc14b17fe78c",
          "shippingZoneRateId": "db02cc2d-5ba3-4b5b-8147-fee010faca21",
          "taxValue": null,
          "title": "Kkk",
          "isRefunded": null
        }
      ],
      "shippingMethod": "SHIPMENT",
      "status": "CREATED",
      "storefront": {
        "id": "8b742b03-c8f8-4509-858c-f9487c3701f2",
        "name": "Jack"
      },
      "storefrontRouting": {
        "domain": "tr",
        "id": "d3d0b8d9-76c6-436b-a1ba-024c1f4f4a12",
        "locale": "en",
        "path": "en",
        "priceListId": null
      },
      "storefrontTheme": {
        "id": "69b1451f-3467-4c7b-8ce1-bf4fec8400f8",
        "name": "test 6",
        "themeId": "84a89e25-9826-4b65-b056-6cb98cfb318e",
        "themeVersionId": "9da2385d-9fef-4066-8d3e-8377a5bf0e1b"
      },
      "taxLines": [],
      "invoices": [
        {
          "appId": "1a3456a8-5119-11ec-bf63-0242ac130002",
          "appName": "ikas-app",
          "createdAt": "1638189270536",
          "id": "97e39a32-5119-11ec-bf63-0242ac130002",
          "invoiceNumber": "IK-10001-",
          "storeAppId": "ddf74564-5119-11ec-bf63-0242ac130002",
          "type": "COMPANY"
        }
      ],
      "totalFinalPrice": 170.5,
      "totalPrice": 299,
      "updatedAt": 1638189270536,
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36",
      "isGiftPackage": false,
      "giftPackageNote": null,
      "giftPackageLines": null
    }
  }
}
```
Copy

### Create New Order With Transaction Data

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"mutationundefined"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"mutation":`{
              createOrderWithTransactions(
                    input: {
                      disableAutoCreateCustomer: true
                      order: {
                        billingAddress: {
                          addressLine1: 'ikas A.Ş. Koru Mah. Ahmet Taner Kışlalı Cad. No:4/12 North Star İş Merkezi'
                          city: { id: '6f9272a3-9924-4223-baf8-9b21c9360f0c', name: 'Ankara' }
                          country: {
                            code: 'TUR'
                            id: 'da8c5f2a-8d37-48a8-beff-6ab3793a1861'
                            name: 'Turkey'
                          }
                          firstName: 'ikas'
                          lastName: 'docs'
                          isDefault: false
                        }
                        currencyCode: 'TRY'
                        orderLineItems: [
                          {
                            price: 299
                            quantity: 1
                            variant: {
                              id: 'bd9b2bd8-0110-4ded-84c0-b8298332e469'
                              name: 'ikas Ürünü Siyah Kılıf - iPhone 11 Pro Max Kılıf Silikon'
                            }
                          }
                        ]
                        customer: { id: 'fa8b6fbc-210d-4488-88ab-a7bea0a2648b' }
                        orderAdjustments: [
                          {
                            amount: 149.5
                            amountType: AMOUNT
                            campaignId: '653aa7c2-4d3c-42ba-aba9-94060f52660d'
                            name: 'Kargo Bypass'
                            order: 1
                            type: DECREMENT
                          }
                        ]
                        salesChannelId: '9fa400f3-fbf1-4ee7-bc26-3cae7f9c3427'
                        shippingAddress: {
                          addressLine1: 'ikas A.Ş. Koru Mah. Ahmet Taner Kışlalı Cad. No:4/12 North Star İş Merkezi'
                          city: { id: '6f9272a3-9924-4223-baf8-9b21c9360f0c', name: 'Ankara' }
                          country: {
                            code: 'TUR'
                            id: 'da8c5f2a-8d37-48a8-beff-6ab3793a1861'
                            name: 'Turkey'
                          }
                          firstName: 'ikas'
                          lastName: 'docs'
                          isDefault: false
                        }
                        shippingLines: [{ price: 21, title: 'Kkk' }]
                        shippingMethod: SHIPMENT
                      }
                      transactions: [
                        {
                          amount: 149.5
                          paymentGatewayId: 'e3e9f662-511c-11ec-bf63-0242ac130002'
                        }
                      ]
                    }
              ) {billingAddress {
                  addressLine1
                  addressLine2
                  city {
                    code
                    id
                    name
                  }
                  company
                  country {
                    code
                    id
                    iso2
                    iso3
                    name
                  }
                  district {
                    code
                    id
                    name
                  }
                  firstName
                  id
                  identityNumber
                  isDefault
                  lastName
                  phone
                  postalCode
                  state {
                    code
                    id
                    name
                  }
                  taxNumber
                  taxOffice
                }
                branch {
                  id
                  name
                }
                branchSessionId
                cancelReason
                cancelledAt
                clientIp
                createdAt
                currencyCode
                currencyRates {
                  code
                  originalRate
                  rate
                }
                customer {
                  email
                  firstName
                  id
                  identityNumber
                  isGuestCheckout
                  lastName
                  phone
                }
                deleted
                giftPackageLines {
                  price
                  taxValue
                }
                giftPackageNote
                host
                id
                invoices {
                  appId
                  appName
                  createdAt
                  id
                  invoiceNumber
                  storeAppId
                  type
                }
                isGiftPackage
                merchantId
                note
                orderAdjustments {
                  amount
                  amountType
                  appliedOrderLines {
                    amount
                    appliedQuantity
                    orderLineId
                  }
                  campaignId
                  couponId
                  name
                  order
                  type
                }
                orderLineItems {
                  createdAt
                  currencyCode
                  deleted
                  discount {
                    amount
                    amountType
                    reason
                  }
                  discountPrice
                  finalPrice
                  id
                  options {
                    name
                    productOptionId
                    productOptionsSetId
                    type
                    values {
                      name
                      price
                      value
                    }
                  }
                  originalOrderLineItemId
                  price
                  quantity
                  status
                  statusUpdatedAt
                  stockLocationId
                  taxValue
                  updatedAt
                  variant {
                    barcodeList
                    brand {
                      id
                      name
                    }
                    categories {
                      categoryPath {
                        id
                        name
                      }
                      id
                      name
                    }
                    id
                    mainImageId
                    name
                    prices {
                      buyPrice
                      currency
                      discountPrice
                      priceListId
                      sellPrice
                    }
                    productId
                    sku
                    slug
                    tagIds
                    taxValue
                    type
                    variantValues {
                      order
                      variantTypeId
                      variantTypeName
                      variantValueId
                      variantValueName
                    }
                  }
                }
                orderNumber
                orderPackageSequence
                orderPackageStatus
                orderPackages {
                  createdAt
                  deleted
                  errorMessage
                  id
                  note
                  orderLineItemIds
                  orderPackageFulfillStatus
                  orderPackageNumber
                  stockLocationId
                  trackingInfo {
                    barcode
                    cargoCompany
                    isSendNotification
                    trackingLink
                    trackingNumber
                  }
                  updatedAt
                }
                orderPaymentStatus
                orderSequence
                orderTagIds
                orderedAt
                paymentMethods {
                  price
                  type
                }
                priceList {
                  id
                  name
                }
                salesChannel {
                  id
                  name
                  type
                }
                shippingAddress {
                  addressLine1
                  addressLine2
                  city {
                    code
                    id
                    name
                  }
                  company
                  country {
                    code
                    id
                    iso2
                    iso3
                    name
                  }
                  district {
                    code
                    id
                    name
                  }
                  firstName
                  id
                  identityNumber
                  isDefault
                  lastName
                  phone
                  postalCode
                  state {
                    code
                    id
                    name
                  }
                  taxNumber
                  taxOffice
                }
                shippingLines {
                  isRefunded
                  price
                  shippingSettingsId
                  shippingZoneRateId
                  taxValue
                  title
                }
                shippingMethod
                staff {
                  email
                  firstName
                  lastName
                }
                status
                storefront {
                  id
                  name
                }
                storefrontRouting {
                  domain
                  id
                  locale
                  path
                  priceListId
                }
                storefrontTheme {
                  id
                  name
                  themeId
                  themeVersionId
                }
                taxLines {
                  price
                  rate
                }
                terminalId
                totalFinalPrice
                totalPrice
                updatedAt
                userAgent}
   }
`};

const config = {
  method: 'POST',
  url: 'https://api.myikas.com/api/v1/admin/graphql',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_token'
  },
  data : data
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  if (error.response) {
    console.log(JSON.stringify(error.response.data));
  }
});
```
Copy

#### Response

```json
{
  "data": {
    "addOrderInvoice": {
      "billingAddress": {
        "addressLine1": "ikas A.Ş. Koru Mah. Ahmet Taner Kışlalı Cad. No:4/12 North Star İş Merkezi",
        "addressLine2": null,
        "city": {
          "code": null,
          "id": "6f9272a3-9924-4223-baf8-9b21c9360f0c",
          "name": "Ankara"
        },
        "company": null,
        "country": {
          "code": "TUR",
          "id": "da8c5f2a-8d37-48a8-beff-6ab3793a1861",
          "name": "Turkey"
        },
        "district": {
          "code": null,
          "id": "0774fbd3-b818-463a-b697-2e28a8a6daed",
          "name": "Çankaya"
        },
        "firstName": "ikas",
        "identityNumber": null,
        "isDefault": false,
        "lastName": "docs",
        "phone": "+905555555555",
        "postalCode": null,
        "state": {
          "code": null,
          "id": "dcb9135c-4b84-4c06-9a42-f359317a9b78",
          "name": "Default"
        },
        "taxNumber": null,
        "taxOffice": null
      },
      "cancelReason": null,
      "cancelledAt": null,
      "clientIp": "176.42.29.28",
      "createdAt": 1637759203328,
      "currencyCode": "TRY",
      "currencyRates": [],
      "customer": {
        "email": "ikas@ikas.com",
        "firstName": "ikas",
        "id": "fa8b6fbc-210d-4488-88ab-a7bea0a2648b",
        "identityNumber": null,
        "lastName": "docs",
        "phone": null
      },
      "deleted": false,
      "host": "apidocs.myikas.dev",
      "id": "84ffbfd2-c92c-4f22-9675-8d3edb7a9084",
      "merchantId": "75d8a449-2feb-4230-9eb4-9014673324d5",
      "note": null,
      "orderAdjustments": [
        {
          "amount": 149.5,
          "amountType": "AMOUNT",
          "campaignId": "653aa7c2-4d3c-42ba-aba9-94060f52660d",
          "couponId": null,
          "name": "Kargo Bypass",
          "order": 1,
          "type": "DECREMENT"
        }
      ],
      "orderLineItems": [
        {
          "createdAt": 1638189270536,
          "currencyCode": "TRY",
          "deleted": false,
          "discount": null,
          "discountPrice": null,
          "finalPrice": 149.5,
          "id": "0a6f539f-8338-400c-a3fc-2bc15c01da58",
          "originalOrderLineItemId": "0a6f539f-8338-400c-a3fc-2bc15c01da58",
          "price": 299,
          "quantity": 1,
          "status": "FULFILLED",
          "statusUpdatedAt": null,
          "stockLocationId": "a0d19a13-7603-4d75-9ed7-dc414b1df8df",
          "taxValue": null,
          "updatedAt": 1638189270536,
          "variant": {
            "barcodeList": [],
            "id": "bd9b2bd8-0110-4ded-84c0-b8298332e469",
            "mainImageId": "e047ce73-8b77-40f0-8f13-eff9c2b05f4f",
            "name": "ikas Ürünü Siyah Kılıf - iPhone 11 Pro Max Kılıf Silikon",
            "productId": "62bca022-12be-4e2b-a9dd-90c67cb89dcb",
            "sku": null,
            "slug": "ikas-urunu-siyah-kilif-iphone-11-pro-max-kilif-silikon",
            "tagIds": [],
            "taxValue": null,
            "variantValues": []
          },
          "options": []
        }
      ],
      "orderNumber": "1028",
      "orderPackageStatus": "FULFILLED",
      "orderPackages": [
        {
          "createdAt": 1638189270536,
          "deleted": false,
          "errorMessage": null,
          "id": "a103735c-ece8-4a8f-9576-489f45c4487b",
          "note": null,
          "orderLineItemIds": ["0a6f539f-8338-400c-a3fc-2bc15c01da58"],
          "orderPackageFulfillStatus": "FULFILLED",
          "orderPackageNumber": "1028-1",
          "stockLocationId": "a0d19a13-7603-4d75-9ed7-dc414b1df8df",
          "trackingInfo": {
            "barcode": "123456",
            "cargoCompany": "UPS",
            "isSendNotification": null,
            "trackingLink": null,
            "trackingNumber": "123456"
          },
          "updatedAt": 1638189270536
        }
      ],
      "orderPaymentStatus": "PAID",
      "orderSequence": 28,
      "orderTagIds": [],
      "orderedAt": 1637759203143,
      "paymentMethods": [
        {
          "price": 170.5,
          "type": "MONEY_ORDER"
        }
      ],
      "priceList": null,
      "salesChannel": {
        "id": "9fa400f3-fbf1-4ee7-bc26-3cae7f9c3427",
        "name": "Jack",
        "type": 1
      },
      "shippingAddress": {
        "addressLine1": "ikas A.Ş. Koru Mah. Ahmet Taner Kışlalı Cad. No:4/12 North Star İş Merkezi",
        "addressLine2": null,
        "city": {
          "code": null,
          "id": "6f9272a3-9924-4223-baf8-9b21c9360f0c",
          "name": "Ankara"
        },
        "company": null,
        "country": {
          "code": "TUR",
          "id": "da8c5f2a-8d37-48a8-beff-6ab3793a1861",
          "name": "Turkey"
        },
        "district": {
          "code": null,
          "id": "0774fbd3-b818-463a-b697-2e28a8a6daed",
          "name": "Çankaya"
        },
        "firstName": "ikas",
        "identityNumber": null,
        "isDefault": false,
        "lastName": "docs",
        "phone": "+905555555555",
        "postalCode": null,
        "state": {
          "code": null,
          "id": "dcb9135c-4b84-4c06-9a42-f359317a9b78",
          "name": "Default"
        },
        "taxNumber": null,
        "taxOffice": null
      },
      "shippingLines": [
        {
          "price": 21,
          "shippingSettingsId": "ee4cc76c-f0c3-469f-ab8e-cc14b17fe78c",
          "shippingZoneRateId": "db02cc2d-5ba3-4b5b-8147-fee010faca21",
          "taxValue": null,
          "title": "Kkk",
          "isRefunded": null
        }
      ],
      "shippingMethod": "SHIPMENT",
      "status": "CREATED",
      "storefront": {
        "id": "8b742b03-c8f8-4509-858c-f9487c3701f2",
        "name": "Jack"
      },
      "storefrontRouting": {
        "domain": "tr",
        "id": "d3d0b8d9-76c6-436b-a1ba-024c1f4f4a12",
        "locale": "en",
        "path": "en",
        "priceListId": null
      },
      "storefrontTheme": {
        "id": "69b1451f-3467-4c7b-8ce1-bf4fec8400f8",
        "name": "test 6",
        "themeId": "84a89e25-9826-4b65-b056-6cb98cfb318e",
        "themeVersionId": "9da2385d-9fef-4066-8d3e-8377a5bf0e1b"
      },
      "taxLines": [],
      "invoices": [
        {
          "appId": "1a3456a8-5119-11ec-bf63-0242ac130002",
          "appName": "ikas-app",
          "createdAt": "1638189270536",
          "id": "97e39a32-5119-11ec-bf63-0242ac130002",
          "invoiceNumber": "IK-10001-",
          "storeAppId": "ddf74564-5119-11ec-bf63-0242ac130002",
          "type": "COMPANY"
        }
      ],
      "totalFinalPrice": 170.5,
      "totalPrice": 299,
      "updatedAt": 1638189270536,
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36",
      "isGiftPackage": false,
      "giftPackageNote": null,
      "giftPackageLines": null
    }
  }
}
```
Copy

### Cancel Fulfilled Package

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"mutationundefined"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"mutation":`{
              cancelFulfillment(
                    input: {
                      orderId: '84ffbfd2-c92c-4f22-9675-8d3edb7a9084'
                      packageId: 'a103735c-ece8-4a8f-9576-489f45c4487b'
                    }
              ) {billingAddress {
                  addressLine1
                  addressLine2
                  city {
                    code
                    id
                    name
                  }
                  company
                  country {
                    code
                    id
                    iso2
                    iso3
                    name
                  }
                  district {
                    code
                    id
                    name
                  }
                  firstName
                  id
                  identityNumber
                  isDefault
                  lastName
                  phone
                  postalCode
                  state {
                    code
                    id
                    name
                  }
                  taxNumber
                  taxOffice
                }
                branch {
                  id
                  name
                }
                branchSessionId
                cancelReason
                cancelledAt
                clientIp
                createdAt
                currencyCode
                currencyRates {
                  code
                  originalRate
                  rate
                }
                customer {
                  email
                  firstName
                  id
                  identityNumber
                  isGuestCheckout
                  lastName
                  phone
                }
                deleted
                giftPackageLines {
                  price
                  taxValue
                }
                giftPackageNote
                host
                id
                invoices {
                  appId
                  appName
                  createdAt
                  id
                  invoiceNumber
                  storeAppId
                  type
                }
                isGiftPackage
                merchantId
                note
                orderAdjustments {
                  amount
                  amountType
                  appliedOrderLines {
                    amount
                    appliedQuantity
                    orderLineId
                  }
                  campaignId
                  couponId
                  name
                  order
                  type
                }
                orderLineItems {
                  createdAt
                  currencyCode
                  deleted
                  discount {
                    amount
                    amountType
                    reason
                  }
                  discountPrice
                  finalPrice
                  id
                  options {
                    name
                    productOptionId
                    productOptionsSetId
                    type
                    values {
                      name
                      price
                      value
                    }
                  }
                  originalOrderLineItemId
                  price
                  quantity
                  status
                  statusUpdatedAt
                  stockLocationId
                  taxValue
                  updatedAt
                  variant {
                    barcodeList
                    brand {
                      id
                      name
                    }
                    categories {
                      categoryPath {
                        id
                        name
                      }
                      id
                      name
                    }
                    id
                    mainImageId
                    name
                    prices {
                      buyPrice
                      currency
                      discountPrice
                      priceListId
                      sellPrice
                    }
                    productId
                    sku
                    slug
                    tagIds
                    taxValue
                    type
                    variantValues {
                      order
                      variantTypeId
                      variantTypeName
                      variantValueId
                      variantValueName
                    }
                  }
                }
                orderNumber
                orderPackageSequence
                orderPackageStatus
                orderPackages {
                  createdAt
                  deleted
                  errorMessage
                  id
                  note
                  orderLineItemIds
                  orderPackageFulfillStatus
                  orderPackageNumber
                  stockLocationId
                  trackingInfo {
                    barcode
                    cargoCompany
                    isSendNotification
                    trackingLink
                    trackingNumber
                  }
                  updatedAt
                }
                orderPaymentStatus
                orderSequence
                orderTagIds
                orderedAt
                paymentMethods {
                  price
                  type
                }
                priceList {
                  id
                  name
                }
                salesChannel {
                  id
                  name
                  type
                }
                shippingAddress {
                  addressLine1
                  addressLine2
                  city {
                    code
                    id
                    name
                  }
                  company
                  country {
                    code
                    id
                    iso2
                    iso3
                    name
                  }
                  district {
                    code
                    id
                    name
                  }
                  firstName
                  id
                  identityNumber
                  isDefault
                  lastName
                  phone
                  postalCode
                  state {
                    code
                    id
                    name
                  }
                  taxNumber
                  taxOffice
                }
                shippingLines {
                  isRefunded
                  price
                  shippingSettingsId
                  shippingZoneRateId
                  taxValue
                  title
                }
                shippingMethod
                staff {
                  email
                  firstName
                  lastName
                }
                status
                storefront {
                  id
                  name
                }
                storefrontRouting {
                  domain
                  id
                  locale
                  path
                  priceListId
                }
                storefrontTheme {
                  id
                  name
                  themeId
                  themeVersionId
                }
                taxLines {
                  price
                  rate
                }
                terminalId
                totalFinalPrice
                totalPrice
                updatedAt
                userAgent}
   }
`};

const config = {
  method: 'POST',
  url: 'https://api.myikas.com/api/v1/admin/graphql',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_token'
  },
  data : data
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  if (error.response) {
    console.log(JSON.stringify(error.response.data));
  }
});
```
Copy

#### Response

```json
{
  "data": {
    "cancelfulfillment": {
      "billingAddress": {
        "addressLine1": "ikas A.Ş. Koru Mah. Ahmet Taner Kışlalı Cad. No:4/12 North Star İş Merkezi",
        "addressLine2": null,
        "city": {
          "code": null,
          "id": "6f9272a3-9924-4223-baf8-9b21c9360f0c",
          "name": "Ankara"
        },
        "company": null,
        "country": {
          "code": "TUR",
          "id": "da8c5f2a-8d37-48a8-beff-6ab3793a1861",
          "name": "Turkey"
        },
        "district": {
          "code": null,
          "id": "0774fbd3-b818-463a-b697-2e28a8a6daed",
          "name": "Çankaya"
        },
        "firstName": "ikas",
        "identityNumber": null,
        "isDefault": false,
        "lastName": "docs",
        "phone": "+905555555555",
        "postalCode": null,
        "state": {
          "code": null,
          "id": "dcb9135c-4b84-4c06-9a42-f359317a9b78",
          "name": "Default"
        },
        "taxNumber": null,
        "taxOffice": null
      },
      "cancelReason": null,
      "cancelledAt": null,
      "clientIp": "176.42.29.28",
      "createdAt": 1637759203328,
      "currencyCode": "TRY",
      "currencyRates": [],
      "customer": {
        "email": "ikas@ikas.com",
        "firstName": "ikas",
        "id": "fa8b6fbc-210d-4488-88ab-a7bea0a2648b",
        "identityNumber": null,
        "lastName": "docs",
        "phone": null
      },
      "deleted": false,
      "host": "apidocs.myikas.dev",
      "id": "84ffbfd2-c92c-4f22-9675-8d3edb7a9084",
      "merchantId": "75d8a449-2feb-4230-9eb4-9014673324d5",
      "note": null,
      "orderAdjustments": [
        {
          "amount": 149.5,
          "amountType": "AMOUNT",
          "campaignId": "653aa7c2-4d3c-42ba-aba9-94060f52660d",
          "couponId": null,
          "name": "Kargo Bypass",
          "order": 1,
          "type": "DECREMENT"
        }
      ],
      "orderLineItems": [
        {
          "createdAt": 1638196461905,
          "currencyCode": "TRY",
          "deleted": false,
          "discount": null,
          "discountPrice": null,
          "finalPrice": 149.5,
          "id": "0a6f539f-8338-400c-a3fc-2bc15c01da58",
          "originalOrderLineItemId": "0a6f539f-8338-400c-a3fc-2bc15c01da58",
          "price": 299,
          "quantity": 1,
          "status": "UNFULFILLED",
          "statusUpdatedAt": null,
          "stockLocationId": "a0d19a13-7603-4d75-9ed7-dc414b1df8df",
          "taxValue": null,
          "updatedAt": 1638196461905,
          "variant": {
            "barcodeList": [],
            "id": "bd9b2bd8-0110-4ded-84c0-b8298332e469",
            "mainImageId": "e047ce73-8b77-40f0-8f13-eff9c2b05f4f",
            "name": "ikas Ürünü Siyah Kılıf - iPhone 11 Pro Max Kılıf Silikon",
            "productId": "62bca022-12be-4e2b-a9dd-90c67cb89dcb",
            "sku": null,
            "slug": "ikas-urunu-siyah-kilif-iphone-11-pro-max-kilif-silikon",
            "tagIds": [],
            "taxValue": null,
            "variantValues": []
          },
          "options": []
        }
      ],
      "orderNumber": "1028",
      "orderPackageStatus": "UNFULFILLED",
      "orderPackages": [],
      "orderPaymentStatus": "PAID",
      "orderSequence": 28,
      "orderTagIds": [],
      "orderedAt": 1637759203143,
      "paymentMethods": [
        {
          "price": 170.5,
          "type": "MONEY_ORDER"
        }
      ],
      "priceList": null,
      "salesChannel": {
        "id": "9fa400f3-fbf1-4ee7-bc26-3cae7f9c3427",
        "name": "Jack",
        "type": 1
      },
      "shippingAddress": {
        "addressLine1": "ikas A.Ş. Koru Mah. Ahmet Taner Kışlalı Cad. No:4/12 North Star İş Merkezi",
        "addressLine2": null,
        "city": {
          "code": null,
          "id": "6f9272a3-9924-4223-baf8-9b21c9360f0c",
          "name": "Ankara"
        },
        "company": null,
        "country": {
          "code": "TUR",
          "id": "da8c5f2a-8d37-48a8-beff-6ab3793a1861",
          "name": "Turkey"
        },
        "district": {
          "code": null,
          "id": "0774fbd3-b818-463a-b697-2e28a8a6daed",
          "name": "Çankaya"
        },
        "firstName": "ikas",
        "identityNumber": null,
        "isDefault": false,
        "lastName": "docs",
        "phone": "+905555555555",
        "postalCode": null,
        "state": {
          "code": null,
          "id": "dcb9135c-4b84-4c06-9a42-f359317a9b78",
          "name": "Default"
        },
        "taxNumber": null,
        "taxOffice": null
      },
      "shippingLines": [
        {
          "price": 21,
          "shippingSettingsId": "ee4cc76c-f0c3-469f-ab8e-cc14b17fe78c",
          "shippingZoneRateId": "db02cc2d-5ba3-4b5b-8147-fee010faca21",
          "taxValue": null,
          "title": "Kkk",
          "isRefunded": null
        }
      ],
      "shippingMethod": "SHIPMENT",
      "status": "CREATED",
      "storefront": {
        "id": "8b742b03-c8f8-4509-858c-f9487c3701f2",
        "name": "Jack"
      },
      "storefrontRouting": {
        "domain": "tr",
        "id": "d3d0b8d9-76c6-436b-a1ba-024c1f4f4a12",
        "locale": "en",
        "path": "en",
        "priceListId": null
      },
      "storefrontTheme": {
        "id": "69b1451f-3467-4c7b-8ce1-bf4fec8400f8",
        "name": "test 6",
        "themeId": "84a89e25-9826-4b65-b056-6cb98cfb318e",
        "themeVersionId": "9da2385d-9fef-4066-8d3e-8377a5bf0e1b"
      },
      "taxLines": [],
      "invoices": [],
      "totalFinalPrice": 170.5,
      "totalPrice": 299,
      "updatedAt": 1638196461905,
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36",
      "isGiftPackage": false,
      "giftPackageNote": null,
      "giftPackageLines": null
    }
  }
}
```
Copy

### Update Order Line Item

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"mutationundefined"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"mutation":`{
              updateOrderLine(
                    input: {
                      packageId: 'a103735c-ece8-4a8f-9576-489f45c4487b'
                      editReason:'update'
                      orderId: '84ffbfd2-c92c-4f22-9675-8d3edb7a9084'
                      orderLineItems: [
                         { id: '0a6f539f-8338-400c-a3fc-2bc15c01da58', price: 1, quantity:1, variant: { id: 'bd9b2bd8-0110-4ded-84c0-b8298332e469', name: 'ikas Ürünü Siyah Kılıf - iPhone 11 Pro Max Kılıf Silikon' } }
                      ]
                      restockItems:true
                    }
              ) {billingAddress {
                  addressLine1
                  addressLine2
                  city {
                    code
                    id
                    name
                  }
                  company
                  country {
                    code
                    id
                    iso2
                    iso3
                    name
                  }
                  district {
                    code
                    id
                    name
                  }
                  firstName
                  id
                  identityNumber
                  isDefault
                  lastName
                  phone
                  postalCode
                  state {
                    code
                    id
                    name
                  }
                  taxNumber
                  taxOffice
                }
                branch {
                  id
                  name
                }
                branchSessionId
                cancelReason
                cancelledAt
                clientIp
                createdAt
                currencyCode
                currencyRates {
                  code
                  originalRate
                  rate
                }
                customer {
                  email
                  firstName
                  id
                  identityNumber
                  isGuestCheckout
                  lastName
                  phone
                }
                deleted
                giftPackageLines {
                  price
                  taxValue
                }
                giftPackageNote
                host
                id
                invoices {
                  appId
                  appName
                  createdAt
                  id
                  invoiceNumber
                  storeAppId
                  type
                }
                isGiftPackage
                merchantId
                note
                orderAdjustments {
                  amount
                  amountType
                  appliedOrderLines {
                    amount
                    appliedQuantity
                    orderLineId
                  }
                  campaignId
                  couponId
                  name
                  order
                  type
                }
                orderLineItems {
                  createdAt
                  currencyCode
                  deleted
                  discount {
                    amount
                    amountType
                    reason
                  }
                  discountPrice
                  finalPrice
                  id
                  options {
                    name
                    productOptionId
                    productOptionsSetId
                    type
                    values {
                      name
                      price
                      value
                    }
                  }
                  originalOrderLineItemId
                  price
                  quantity
                  status
                  statusUpdatedAt
                  stockLocationId
                  taxValue
                  updatedAt
                  variant {
                    barcodeList
                    brand {
                      id
                      name
                    }
                    categories {
                      categoryPath {
                        id
                        name
                      }
                      id
                      name
                    }
                    id
                    mainImageId
                    name
                    prices {
                      buyPrice
                      currency
                      discountPrice
                      priceListId
                      sellPrice
                    }
                    productId
                    sku
                    slug
                    tagIds
                    taxValue
                    type
                    variantValues {
                      order
                      variantTypeId
                      variantTypeName
                      variantValueId
                      variantValueName
                    }
                  }
                }
                orderNumber
                orderPackageSequence
                orderPackageStatus
                orderPackages {
                  createdAt
                  deleted
                  errorMessage
                  id
                  note
                  orderLineItemIds
                  orderPackageFulfillStatus
                  orderPackageNumber
                  stockLocationId
                  trackingInfo {
                    barcode
                    cargoCompany
                    isSendNotification
                    trackingLink
                    trackingNumber
                  }
                  updatedAt
                }
                orderPaymentStatus
                orderSequence
                orderTagIds
                orderedAt
                paymentMethods {
                  price
                  type
                }
                priceList {
                  id
                  name
                }
                salesChannel {
                  id
                  name
                  type
                }
                shippingAddress {
                  addressLine1
                  addressLine2
                  city {
                    code
                    id
                    name
                  }
                  company
                  country {
                    code
                    id
                    iso2
                    iso3
                    name
                  }
                  district {
                    code
                    id
                    name
                  }
                  firstName
                  id
                  identityNumber
                  isDefault
                  lastName
                  phone
                  postalCode
                  state {
                    code
                    id
                    name
                  }
                  taxNumber
                  taxOffice
                }
                shippingLines {
                  isRefunded
                  price
                  shippingSettingsId
                  shippingZoneRateId
                  taxValue
                  title
                }
                shippingMethod
                staff {
                  email
                  firstName
                  lastName
                }
                status
                storefront {
                  id
                  name
                }
                storefrontRouting {
                  domain
                  id
                  locale
                  path
                  priceListId
                }
                storefrontTheme {
                  id
                  name
                  themeId
                  themeVersionId
                }
                taxLines {
                  price
                  rate
                }
                terminalId
                totalFinalPrice
                totalPrice
                updatedAt
                userAgent}
   }
`};

const config = {
  method: 'POST',
  url: 'https://api.myikas.com/api/v1/admin/graphql',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_token'
  },
  data : data
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  if (error.response) {
    console.log(JSON.stringify(error.response.data));
  }
});
```
Copy

#### Response

```json
{
  "data": {
    "updateOrderLine": {
      "billingAddress": {
        "addressLine1": "ikas A.Ş. Koru Mah. Ahmet Taner Kışlalı Cad. No:4/12 North Star İş Merkezi",
        "addressLine2": null,
        "city": {
          "code": null,
          "id": "6f9272a3-9924-4223-baf8-9b21c9360f0c",
          "name": "Ankara"
        },
        "company": null,
        "country": {
          "code": "TUR",
          "id": "da8c5f2a-8d37-48a8-beff-6ab3793a1861",
          "name": "Turkey"
        },
        "district": {
          "code": null,
          "id": "0774fbd3-b818-463a-b697-2e28a8a6daed",
          "name": "Çankaya"
        },
        "firstName": "ikas",
        "identityNumber": null,
        "isDefault": false,
        "lastName": "docs",
        "phone": "+905555555555",
        "postalCode": null,
        "state": {
          "code": null,
          "id": "dcb9135c-4b84-4c06-9a42-f359317a9b78",
          "name": "Default"
        },
        "taxNumber": null,
        "taxOffice": null
      },
      "cancelReason": null,
      "cancelledAt": null,
      "clientIp": "176.42.29.28",
      "createdAt": 1637759203328,
      "currencyCode": "TRY",
      "currencyRates": [],
      "customer": {
        "email": "ikas@ikas.com",
        "firstName": "ikas",
        "id": "fa8b6fbc-210d-4488-88ab-a7bea0a2648b",
        "identityNumber": null,
        "lastName": "docs",
        "phone": null
      },
      "deleted": false,
      "host": "apidocs.myikas.dev",
      "id": "84ffbfd2-c92c-4f22-9675-8d3edb7a9084",
      "merchantId": "75d8a449-2feb-4230-9eb4-9014673324d5",
      "note": null,
      "orderAdjustments": [
        {
          "amount": 149.5,
          "amountType": "AMOUNT",
          "campaignId": "653aa7c2-4d3c-42ba-aba9-94060f52660d",
          "couponId": null,
          "name": "Kargo Bypass",
          "order": 1,
          "type": "DECREMENT"
        }
      ],
      "orderLineItems": [
        {
          "createdAt": 1638196461905,
          "currencyCode": "TRY",
          "deleted": false,
          "discount": null,
          "discountPrice": null,
          "finalPrice": 149.5,
          "id": "0a6f539f-8338-400c-a3fc-2bc15c01da58",
          "originalOrderLineItemId": "0a6f539f-8338-400c-a3fc-2bc15c01da58",
          "price": 299,
          "quantity": 1,
          "status": "UNFULFILLED",
          "statusUpdatedAt": null,
          "stockLocationId": "a0d19a13-7603-4d75-9ed7-dc414b1df8df",
          "taxValue": null,
          "updatedAt": 1638196461905,
          "variant": {
            "barcodeList": [],
            "id": "bd9b2bd8-0110-4ded-84c0-b8298332e469",
            "mainImageId": "e047ce73-8b77-40f0-8f13-eff9c2b05f4f",
            "name": "ikas Ürünü Siyah Kılıf - iPhone 11 Pro Max Kılıf Silikon",
            "productId": "62bca022-12be-4e2b-a9dd-90c67cb89dcb",
            "sku": null,
            "slug": "ikas-urunu-siyah-kilif-iphone-11-pro-max-kilif-silikon",
            "tagIds": [],
            "taxValue": null,
            "variantValues": []
          },
          "options": []
        }
      ],
      "orderNumber": "1028",
      "orderPackageStatus": "UNFULFILLED",
      "orderPackages": [],
      "orderPaymentStatus": "PAID",
      "orderSequence": 28,
      "orderTagIds": [],
      "orderedAt": 1637759203143,
      "paymentMethods": [
        {
          "price": 170.5,
          "type": "MONEY_ORDER"
        }
      ],
      "priceList": null,
      "salesChannel": {
        "id": "9fa400f3-fbf1-4ee7-bc26-3cae7f9c3427",
        "name": "Jack",
        "type": 1
      },
      "shippingAddress": {
        "addressLine1": "ikas A.Ş. Koru Mah. Ahmet Taner Kışlalı Cad. No:4/12 North Star İş Merkezi",
        "addressLine2": null,
        "city": {
          "code": null,
          "id": "6f9272a3-9924-4223-baf8-9b21c9360f0c",
          "name": "Ankara"
        },
        "company": null,
        "country": {
          "code": "TUR",
          "id": "da8c5f2a-8d37-48a8-beff-6ab3793a1861",
          "name": "Turkey"
        },
        "district": {
          "code": null,
          "id": "0774fbd3-b818-463a-b697-2e28a8a6daed",
          "name": "Çankaya"
        },
        "firstName": "ikas",
        "identityNumber": null,
        "isDefault": false,
        "lastName": "docs",
        "phone": "+905555555555",
        "postalCode": null,
        "state": {
          "code": null,
          "id": "dcb9135c-4b84-4c06-9a42-f359317a9b78",
          "name": "Default"
        },
        "taxNumber": null,
        "taxOffice": null
      },
      "shippingLines": [
        {
          "price": 21,
          "shippingSettingsId": "ee4cc76c-f0c3-469f-ab8e-cc14b17fe78c",
          "shippingZoneRateId": "db02cc2d-5ba3-4b5b-8147-fee010faca21",
          "taxValue": null,
          "title": "Kkk",
          "isRefunded": null
        }
      ],
      "shippingMethod": "SHIPMENT",
      "status": "CREATED",
      "storefront": {
        "id": "8b742b03-c8f8-4509-858c-f9487c3701f2",
        "name": "Jack"
      },
      "storefrontRouting": {
        "domain": "tr",
        "id": "d3d0b8d9-76c6-436b-a1ba-024c1f4f4a12",
        "locale": "en",
        "path": "en",
        "priceListId": null
      },
      "storefrontTheme": {
        "id": "69b1451f-3467-4c7b-8ce1-bf4fec8400f8",
        "name": "test 6",
        "themeId": "84a89e25-9826-4b65-b056-6cb98cfb318e",
        "themeVersionId": "9da2385d-9fef-4066-8d3e-8377a5bf0e1b"
      },
      "taxLines": [],
      "invoices": [],
      "totalFinalPrice": 170.5,
      "totalPrice": 299,
      "updatedAt": 1638196461905,
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36",
      "isGiftPackage": false,
      "giftPackageNote": null,
      "giftPackageLines": null
    }
  }
}
```
Copy

### Update Order Billing Address

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"mutationundefined"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"mutation":`{
              updateOrderAddresses(
                    input: {
                      billingAddress: {
                        addressLine1: 'ikas A.Ş. Koru Mah. Ahmet Taner Kışlalı Cad. No:4/12 North Star İş Merkezi'
                        city: { id: '6f9272a3-9924-4223-baf8-9b21c9360f0c', name: 'Ankara' }
                        country: {
                          code: 'TUR'
                          id: 'da8c5f2a-8d37-48a8-beff-6ab3793a1861'
                          name: 'Turkey'
                        }
                        firstName: 'ikas'
                        lastName: 'docs'
                        identityNumber:'11111111111'
                        isDefault: false
                      }
                      orderId: '84ffbfd2-c92c-4f22-9675-8d3edb7a9084'
                    }
              ) {billingAddress {
                  addressLine1
                  addressLine2
                  city {
                    code
                    id
                    name
                  }
                  company
                  country {
                    code
                    id
                    iso2
                    iso3
                    name
                  }
                  district {
                    code
                    id
                    name
                  }
                  firstName
                  id
                  identityNumber
                  isDefault
                  lastName
                  phone
                  postalCode
                  state {
                    code
                    id
                    name
                  }
                  taxNumber
                  taxOffice
                }
                branch {
                  id
                  name
                }
                branchSessionId
                cancelReason
                cancelledAt
                clientIp
                createdAt
                currencyCode
                currencyRates {
                  code
                  originalRate
                  rate
                }
                customer {
                  email
                  firstName
                  id
                  identityNumber
                  isGuestCheckout
                  lastName
                  phone
                }
                deleted
                giftPackageLines {
                  price
                  taxValue
                }
                giftPackageNote
                host
                id
                invoices {
                  appId
                  appName
                  createdAt
                  id
                  invoiceNumber
                  storeAppId
                  type
                }
                isGiftPackage
                merchantId
                note
                orderAdjustments {
                  amount
                  amountType
                  appliedOrderLines {
                    amount
                    appliedQuantity
                    orderLineId
                  }
                  campaignId
                  couponId
                  name
                  order
                  type
                }
                orderLineItems {
                  createdAt
                  currencyCode
                  deleted
                  discount {
                    amount
                    amountType
                    reason
                  }
                  discountPrice
                  finalPrice
                  id
                  options {
                    name
                    productOptionId
                    productOptionsSetId
                    type
                    values {
                      name
                      price
                      value
                    }
                  }
                  originalOrderLineItemId
                  price
                  quantity
                  status
                  statusUpdatedAt
                  stockLocationId
                  taxValue
                  updatedAt
                  variant {
                    barcodeList
                    brand {
                      id
                      name
                    }
                    categories {
                      categoryPath {
                        id
                        name
                      }
                      id
                      name
                    }
                    id
                    mainImageId
                    name
                    prices {
                      buyPrice
                      currency
                      discountPrice
                      priceListId
                      sellPrice
                    }
                    productId
                    sku
                    slug
                    tagIds
                    taxValue
                    type
                    variantValues {
                      order
                      variantTypeId
                      variantTypeName
                      variantValueId
                      variantValueName
                    }
                  }
                }
                orderNumber
                orderPackageSequence
                orderPackageStatus
                orderPackages {
                  createdAt
                  deleted
                  errorMessage
                  id
                  note
                  orderLineItemIds
                  orderPackageFulfillStatus
                  orderPackageNumber
                  stockLocationId
                  trackingInfo {
                    barcode
                    cargoCompany
                    isSendNotification
                    trackingLink
                    trackingNumber
                  }
                  updatedAt
                }
                orderPaymentStatus
                orderSequence
                orderTagIds
                orderedAt
                paymentMethods {
                  price
                  type
                }
                priceList {
                  id
                  name
                }
                salesChannel {
                  id
                  name
                  type
                }
                shippingAddress {
                  addressLine1
                  addressLine2
                  city {
                    code
                    id
                    name
                  }
                  company
                  country {
                    code
                    id
                    iso2
                    iso3
                    name
                  }
                  district {
                    code
                    id
                    name
                  }
                  firstName
                  id
                  identityNumber
                  isDefault
                  lastName
                  phone
                  postalCode
                  state {
                    code
                    id
                    name
                  }
                  taxNumber
                  taxOffice
                }
                shippingLines {
                  isRefunded
                  price
                  shippingSettingsId
                  shippingZoneRateId
                  taxValue
                  title
                }
                shippingMethod
                staff {
                  email
                  firstName
                  lastName
                }
                status
                storefront {
                  id
                  name
                }
                storefrontRouting {
                  domain
                  id
                  locale
                  path
                  priceListId
                }
                storefrontTheme {
                  id
                  name
                  themeId
                  themeVersionId
                }
                taxLines {
                  price
                  rate
                }
                terminalId
                totalFinalPrice
                totalPrice
                updatedAt
                userAgent}
   }
`};

const config = {
  method: 'POST',
  url: 'https://api.myikas.com/api/v1/admin/graphql',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_token'
  },
  data : data
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  if (error.response) {
    console.log(JSON.stringify(error.response.data));
  }
});
```
Copy

#### Response

```json
{
  "data": {
    "updateOrderAddresses": {
      "billingAddress": {
        "addressLine1": "ikas A.Ş. Koru Mah. Ahmet Taner Kışlalı Cad. No:4/12 North Star İş Merkezi",
        "addressLine2": null,
        "city": {
          "code": null,
          "id": "6f9272a3-9924-4223-baf8-9b21c9360f0c",
          "name": "Ankara"
        },
        "company": null,
        "country": {
          "code": "TUR",
          "id": "da8c5f2a-8d37-48a8-beff-6ab3793a1861",
          "name": "Turkey"
        },
        "district": {
          "code": null,
          "id": "0774fbd3-b818-463a-b697-2e28a8a6daed",
          "name": "Çankaya"
        },
        "firstName": "ikas",
        "identityNumber": "111111111111",
        "isDefault": false,
        "lastName": "docs",
        "phone": "+905555555555",
        "postalCode": null,
        "state": {
          "code": null,
          "id": "dcb9135c-4b84-4c06-9a42-f359317a9b78",
          "name": "Default"
        },
        "taxNumber": null,
        "taxOffice": null
      },
      "cancelReason": null,
      "cancelledAt": null,
      "clientIp": "176.42.29.28",
      "createdAt": 1637759203328,
      "currencyCode": "TRY",
      "currencyRates": [],
      "customer": {
        "email": "ikas@ikas.com",
        "firstName": "ikas",
        "id": "fa8b6fbc-210d-4488-88ab-a7bea0a2648b",
        "identityNumber": null,
        "lastName": "docs",
        "phone": null
      },
      "deleted": false,
      "host": "apidocs.myikas.dev",
      "id": "84ffbfd2-c92c-4f22-9675-8d3edb7a9084",
      "merchantId": "75d8a449-2feb-4230-9eb4-9014673324d5",
      "note": null,
      "orderAdjustments": [
        {
          "amount": 149.5,
          "amountType": "AMOUNT",
          "campaignId": "653aa7c2-4d3c-42ba-aba9-94060f52660d",
          "couponId": null,
          "name": "Kargo Bypass",
          "order": 1,
          "type": "DECREMENT"
        }
      ],
      "orderLineItems": [
        {
          "createdAt": 1638196461905,
          "currencyCode": "TRY",
          "deleted": false,
          "discount": null,
          "discountPrice": null,
          "finalPrice": 149.5,
          "id": "0a6f539f-8338-400c-a3fc-2bc15c01da58",
          "originalOrderLineItemId": "0a6f539f-8338-400c-a3fc-2bc15c01da58",
          "price": 299,
          "quantity": 1,
          "status": "UNFULFILLED",
          "statusUpdatedAt": null,
          "stockLocationId": "a0d19a13-7603-4d75-9ed7-dc414b1df8df",
          "taxValue": null,
          "updatedAt": 1638196461905,
          "variant": {
            "barcodeList": [],
            "id": "bd9b2bd8-0110-4ded-84c0-b8298332e469",
            "mainImageId": "e047ce73-8b77-40f0-8f13-eff9c2b05f4f",
            "name": "ikas Ürünü Siyah Kılıf - iPhone 11 Pro Max Kılıf Silikon",
            "productId": "62bca022-12be-4e2b-a9dd-90c67cb89dcb",
            "sku": null,
            "slug": "ikas-urunu-siyah-kilif-iphone-11-pro-max-kilif-silikon",
            "tagIds": [],
            "taxValue": null,
            "variantValues": []
          },
          "options": []
        }
      ],
      "orderNumber": "1028",
      "orderPackageStatus": "UNFULFILLED",
      "orderPackages": [],
      "orderPaymentStatus": "PAID",
      "orderSequence": 28,
      "orderTagIds": [],
      "orderedAt": 1637759203143,
      "paymentMethods": [
        {
          "price": 170.5,
          "type": "MONEY_ORDER"
        }
      ],
      "priceList": null,
      "salesChannel": {
        "id": "9fa400f3-fbf1-4ee7-bc26-3cae7f9c3427",
        "name": "Jack",
        "type": 1
      },
      "shippingAddress": {
        "addressLine1": "ikas A.Ş. Koru Mah. Ahmet Taner Kışlalı Cad. No:4/12 North Star İş Merkezi",
        "addressLine2": null,
        "city": {
          "code": null,
          "id": "6f9272a3-9924-4223-baf8-9b21c9360f0c",
          "name": "Ankara"
        },
        "company": null,
        "country": {
          "code": "TUR",
          "id": "da8c5f2a-8d37-48a8-beff-6ab3793a1861",
          "name": "Turkey"
        },
        "district": {
          "code": null,
          "id": "0774fbd3-b818-463a-b697-2e28a8a6daed",
          "name": "Çankaya"
        },
        "firstName": "ikas",
        "identityNumber": null,
        "isDefault": false,
        "lastName": "docs",
        "phone": "+905555555555",
        "postalCode": null,
        "state": {
          "code": null,
          "id": "dcb9135c-4b84-4c06-9a42-f359317a9b78",
          "name": "Default"
        },
        "taxNumber": null,
        "taxOffice": null
      },
      "shippingLines": [
        {
          "price": 21,
          "shippingSettingsId": "ee4cc76c-f0c3-469f-ab8e-cc14b17fe78c",
          "shippingZoneRateId": "db02cc2d-5ba3-4b5b-8147-fee010faca21",
          "taxValue": null,
          "title": "Kkk",
          "isRefunded": null
        }
      ],
      "shippingMethod": "SHIPMENT",
      "status": "CREATED",
      "storefront": {
        "id": "8b742b03-c8f8-4509-858c-f9487c3701f2",
        "name": "Jack"
      },
      "storefrontRouting": {
        "domain": "tr",
        "id": "d3d0b8d9-76c6-436b-a1ba-024c1f4f4a12",
        "locale": "en",
        "path": "en",
        "priceListId": null
      },
      "storefrontTheme": {
        "id": "69b1451f-3467-4c7b-8ce1-bf4fec8400f8",
        "name": "test 6",
        "themeId": "84a89e25-9826-4b65-b056-6cb98cfb318e",
        "themeVersionId": "9da2385d-9fef-4066-8d3e-8377a5bf0e1b"
      },
      "taxLines": [],
      "invoices": [],
      "totalFinalPrice": 170.5,
      "totalPrice": 299,
      "updatedAt": 1638196461905,
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36",
      "isGiftPackage": false,
      "giftPackageNote": null,
      "giftPackageLines": null
    }
  }
}
```
Copy

### Refund Order Line Item

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"mutationundefined"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"mutation":`{
              refundOrderLine(
                    input: {
                         orderId: '84ffbfd2-c92c-4f22-9675-8d3edb7a9084'
                         orderRefundLines: [{ orderLineItemId: '0a6f539f-8338-400c-a3fc-2bc15c01da58', quantity: 1 }]
                         paymentGatewayId: 'e3e9f662-511c-11ec-bf63-0242ac130002'
                         stockLocationId: 'a0d19a13-7603-4d75-9ed7-dc414b1df8df'
                    }
              ) {billingAddress {
                  addressLine1
                  addressLine2
                  city {
                    code
                    id
                    name
                  }
                  company
                  country {
                    code
                    id
                    iso2
                    iso3
                    name
                  }
                  district {
                    code
                    id
                    name
                  }
                  firstName
                  id
                  identityNumber
                  isDefault
                  lastName
                  phone
                  postalCode
                  state {
                    code
                    id
                    name
                  }
                  taxNumber
                  taxOffice
                }
                branch {
                  id
                  name
                }
                branchSessionId
                cancelReason
                cancelledAt
                clientIp
                createdAt
                currencyCode
                currencyRates {
                  code
                  originalRate
                  rate
                }
                customer {
                  email
                  firstName
                  id
                  identityNumber
                  isGuestCheckout
                  lastName
                  phone
                }
                deleted
                giftPackageLines {
                  price
                  taxValue
                }
                giftPackageNote
                host
                id
                invoices {
                  appId
                  appName
                  createdAt
                  id
                  invoiceNumber
                  storeAppId
                  type
                }
                isGiftPackage
                merchantId
                note
                orderAdjustments {
                  amount
                  amountType
                  appliedOrderLines {
                    amount
                    appliedQuantity
                    orderLineId
                  }
                  campaignId
                  couponId
                  name
                  order
                  type
                }
                orderLineItems {
                  createdAt
                  currencyCode
                  deleted
                  discount {
                    amount
                    amountType
                    reason
                  }
                  discountPrice
                  finalPrice
                  id
                  options {
                    name
                    productOptionId
                    productOptionsSetId
                    type
                    values {
                      name
                      price
                      value
                    }
                  }
                  originalOrderLineItemId
                  price
                  quantity
                  status
                  statusUpdatedAt
                  stockLocationId
                  taxValue
                  updatedAt
                  variant {
                    barcodeList
                    brand {
                      id
                      name
                    }
                    categories {
                      categoryPath {
                        id
                        name
                      }
                      id
                      name
                    }
                    id
                    mainImageId
                    name
                    prices {
                      buyPrice
                      currency
                      discountPrice
                      priceListId
                      sellPrice
                    }
                    productId
                    sku
                    slug
                    tagIds
                    taxValue
                    type
                    variantValues {
                      order
                      variantTypeId
                      variantTypeName
                      variantValueId
                      variantValueName
                    }
                  }
                }
                orderNumber
                orderPackageSequence
                orderPackageStatus
                orderPackages {
                  createdAt
                  deleted
                  errorMessage
                  id
                  note
                  orderLineItemIds
                  orderPackageFulfillStatus
                  orderPackageNumber
                  stockLocationId
                  trackingInfo {
                    barcode
                    cargoCompany
                    isSendNotification
                    trackingLink
                    trackingNumber
                  }
                  updatedAt
                }
                orderPaymentStatus
                orderSequence
                orderTagIds
                orderedAt
                paymentMethods {
                  price
                  type
                }
                priceList {
                  id
                  name
                }
                salesChannel {
                  id
                  name
                  type
                }
                shippingAddress {
                  addressLine1
                  addressLine2
                  city {
                    code
                    id
                    name
                  }
                  company
                  country {
                    code
                    id
                    iso2
                    iso3
                    name
                  }
                  district {
                    code
                    id
                    name
                  }
                  firstName
                  id
                  identityNumber
                  isDefault
                  lastName
                  phone
                  postalCode
                  state {
                    code
                    id
                    name
                  }
                  taxNumber
                  taxOffice
                }
                shippingLines {
                  isRefunded
                  price
                  shippingSettingsId
                  shippingZoneRateId
                  taxValue
                  title
                }
                shippingMethod
                staff {
                  email
                  firstName
                  lastName
                }
                status
                storefront {
                  id
                  name
                }
                storefrontRouting {
                  domain
                  id
                  locale
                  path
                  priceListId
                }
                storefrontTheme {
                  id
                  name
                  themeId
                  themeVersionId
                }
                taxLines {
                  price
                  rate
                }
                terminalId
                totalFinalPrice
                totalPrice
                updatedAt
                userAgent}
   }
`};

const config = {
  method: 'POST',
  url: 'https://api.myikas.com/api/v1/admin/graphql',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_token'
  },
  data : data
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  if (error.response) {
    console.log(JSON.stringify(error.response.data));
  }
});
```
Copy

#### Response

```json
{
    "data": {
        "updateOrderAddresses": {
                "billingAddress": {
                    "addressLine1": "ikas A.Ş. Koru Mah. Ahmet Taner Kışlalı Cad. No:4/12 North Star İş Merkezi",
                    "addressLine2": null,
                    "city": {
                        "code": null,
                        "id": "6f9272a3-9924-4223-baf8-9b21c9360f0c",
                        "name": "Ankara"
                    },
                    "company": null,
                    "country": {
                        "code": "TUR",
                        "id": "da8c5f2a-8d37-48a8-beff-6ab3793a1861",
                        "name": "Turkey"
                    },
                    "district": {
                        "code": null,
                        "id": "0774fbd3-b818-463a-b697-2e28a8a6daed",
                        "name": "Çankaya"
                    },
                    "firstName": "ikas",
                    "identityNumber": null,
                    "isDefault": false,
                    "lastName": "docs",
                    "phone": "+905386405353",
                    "postalCode": null,
                    "state": {
                        "code": null,
                        "id": "dcb9135c-4b84-4c06-9a42-f359317a9b78",
                        "name": "Default"
                    },
                    "taxNumber": null,
                    "taxOffice": null
                },
                "cancelReason": null,
                "cancelledAt": null,
                "clientIp": "176.42.29.28",
                "createdAt": 1637759203328,
                "currencyCode": "TRY",
                "currencyRates": [],
                "customer": {
                    "email": "ikas@ikas.com",
                    "firstName": "ikas",
                    "id": "fa8b6fbc-210d-4488-88ab-a7bea0a2648b",
                    "identityNumber": null,
                    "lastName": "docs",
                    "phone": null
                },
                "deleted": false,
                "host": "apidocs.myikas.dev",
                "id": "84ffbfd2-c92c-4f22-9675-8d3edb7a9084",
                "merchantId": "75d8a449-2feb-4230-9eb4-9014673324d5",
                "note": null,
                "orderAdjustments": [
                    {
                        "amount": 149.5,
                        "amountType": "AMOUNT",
                        "campaignId": "653aa7c2-4d3c-42ba-aba9-94060f52660d",
                        "couponId": null,
                        "name": "Kargo Bypass",
                        "order": 1,
                        "type": "DECREMENT"
                    }
                ],
                "orderLineItems": [
                    {
                        "createdAt": 1638198123416,
                        "currencyCode": "TRY",
                        "deleted": false,
                        "discount": null,
                        "discountPrice": null,
                        "finalPrice": 149.5,
                        "id": "0a6f539f-8338-400c-a3fc-2bc15c01da58",
                        "originalOrderLineItemId": "0a6f539f-8338-400c-a3fc-2bc15c01da58",
                        "price": 299,
                        "quantity": 1,
                        "status": "REFUNDED",
                        "statusUpdatedAt": null,
                        "stockLocationId": "a0d19a13-7603-4d75-9ed7-dc414b1df8df",
                        "taxValue": null,
                        "updatedAt": 1638198123416,
                        "variant": {
                            "barcodeList": [],
                            "id": "bd9b2bd8-0110-4ded-84c0-b8298332e469",
                            "mainImageId": "e047ce73-8b77-40f0-8f13-eff9c2b05f4f",
                            "name": "ikas Ürünü Siyah Kılıf - iPhone 11 Pro Max Kılıf Silikon",
                            "productId": "62bca022-12be-4e2b-a9dd-90c67cb89dcb",
                            "sku": null,
                            "slug": "ikas-urunu-siyah-kilif-iphone-11-pro-max-kilif-silikon",
                            "tagIds": [],
                            "taxValue": null,
                            "variantValues": []
                        },
                        "options": []
                    }
                ],
                "orderNumber": "1028",
                "orderPackageStatus": "REFUNDED",
                "orderPackages": [
                    {
                        "createdAt": 1638198123416,
                        "deleted": false,
                        "errorMessage": null,
                        "id": "f738798f-22fe-4267-b696-3685a9706ada",
                        "note": "asdsd",
                        "orderLineItemIds": [
                            "0a6f539f-8338-400c-a3fc-2bc15c01da58"
                        ],
                        "orderPackageFulfillStatus": "REFUNDED",
                        "orderPackageNumber": "1028-3",
                        "stockLocationId": "a0d19a13-7603-4d75-9ed7-dc414b1df8df",
                        "trackingInfo": null,
                        "updatedAt": 1638198123416
                    }
                ],
                "orderPaymentStatus": "PAID",
                "orderSequence": 28,
                "orderTagIds": [],
                "orderedAt": 1637759203143,
                "paymentMethods": [
                    {
                        "price": 170.5,
                        "type": "MONEY_ORDER"
                    }
                ],
                "priceList": null,
                "salesChannel": {
                    "id": "9fa400f3-fbf1-4ee7-bc26-3cae7f9c3427",
                    "name": "Jack",
                    "type": 1
                },
                "shippingAddress": {
                    "addressLine1": "ikas A.Ş. Koru Mah. Ahmet Taner Kışlalı Cad. No:4/12 North Star İş Merkezi",
                    "addressLine2": null,
                    "city": {
                        "code": null,
                        "id": "6f9272a3-9924-4223-baf8-9b21c9360f0c",
                        "name": "Ankara"
                    },
                    "company": null,
                    "country": {
                        "code": "TUR",
                        "id": "da8c5f2a-8d37-48a8-beff-6ab3793a1861",
                        "name": "Turkey"
                    },
                    "district": {
                        "code": null,
                        "id": "0774fbd3-b818-463a-b697-2e28a8a6daed",
                        "name": "Çankaya"
                    },
                    "firstName": "ikas",
                    "identityNumber": "11111111111",
                    "isDefault": false,
                    "lastName": "docs",
                    "phone": "+905555555555",
                    "postalCode": null,
                    "state": {
                        "code": null,
                        "id": "dcb9135c-4b84-4c06-9a42-f359317a9b78",
                        "name": "Default"
                    },
                    "taxNumber": null,
                    "taxOffice": null
                },
                "shippingLines": [
                    {
                        "price": 21,
                        "shippingSettingsId": "ee4cc76c-f0c3-469f-ab8e-cc14b17fe78c",
                        "shippingZoneRateId": "db02cc2d-5ba3-4b5b-8147-fee010faca21",
                        "taxValue": null,
                        "title": "Kkk",
                        "isRefunded": true
                    }
                ],
                "shippingMethod": "SHIPMENT",
                "status": "REFUNDED",
                "storefront": {
                    "id": "8b742b03-c8f8-4509-858c-f9487c3701f2",
                    "name": "Jack"
                },
                "storefrontRouting": {
                    "domain": "tr",
                    "id": "d3d0b8d9-76c6-436b-a1ba-024c1f4f4a12",
                    "locale": "en",
                    "path": "en",
                    "priceListId": null
                },
                "storefrontTheme": {
                    "id": "69b1451f-3467-4c7b-8ce1-bf4fec8400f8",
                    "name": "test 6",
                    "themeId": "84a89e25-9826-4b65-b056-6cb98cfb318e",
                    "themeVersionId": "9da2385d-9fef-4066-8d3e-8377a5bf0e1b"
                },
                "taxLines": [],
                "invoices": [],
                "totalFinalPrice": 170.5,
                "totalPrice": 299,
                "updatedAt": 1638198123416,
                "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36",
                "isGiftPackage": false,
                "giftPackageNote": null,
                "giftPackageLines": null
            }
        }
    }
}
```
Copy
