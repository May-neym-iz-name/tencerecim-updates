<!-- kaynak: https://ikas.dev/docs/theme/api/models/ikas-order -->

# IkasOrder extends IkasBaseModel

`billingAddress`IkasOrderAddress | null

Refer to the IkasOrderAddress reference.

`cancelReason`IkasOrderCancelReason | null

Refer to the IkasOrderCancelReason reference.

`cancelledAt`number | null

`currencyCode`string

`currencySymbol`string | null

`customer`IkasOrderCustomer | null

Refer to the IkasOrderCustomer reference.

`customerId`string | null

`giftPackageLines`IkasOrderGiftPackageLine[] | null

Refer to the IkasOrderGiftPackageLine reference.

`giftPackageNote`string | null

`invoices`IkasInvoice[] | null

Refer to the IkasInvoice reference.

`isGiftPackage`boolean | null

`note`string | null

`orderAdjustments`IkasOrderAdjustment[] | null

Refer to the IkasOrderAdjustment reference.

`orderLineItems`IkasOrderLineItem[]

Refer to the IkasOrderLineItem reference.

`orderNumber`string | null

`orderPackageStatus`IkasOrderPackageStatus | null

Refer to the IkasOrderPackageStatus reference.

`orderPackages`IkasOrderPackage[] | null

Refer to the IkasOrderPackage reference.

`orderPaymentStatus`IkasOrderPaymentStatus | null

Refer to the IkasOrderPaymentStatus reference.

`orderedAt`number | null

`paymentMethods`IkasOrderPaymentMethod[] | null

Refer to the IkasOrderPaymentMethod reference.

`shippingAddress`IkasOrderAddress | null

Refer to the IkasOrderAddress reference.

`shippingLines`IkasOrderShippingLine[] | null

Refer to the IkasOrderShippingLine reference.

`shippingMethod`IkasOrderShippingMethod

Refer to the IkasOrderShippingMethod reference.

`status`IkasOrderStatus

Refer to the IkasOrderStatus reference.

`taxLines`IkasOrderTaxLine[] | null

Refer to the IkasOrderTaxLine reference.

`totalFinalPrice`number

`totalPrice`number

`refundSettings`IkasOrderRefundSettings | null

Refer to the IkasOrderRefundSettings reference.

`items`IkasOrderLineItem[]

Refer to the IkasOrderLineItem reference.

`itemCount`number

`refundableItems`IkasOrderLineItem[]

Refer to the IkasOrderLineItem reference.

`unfullfilledItems`IkasOrderLineItem[]

Refer to the IkasOrderLineItem reference.

`refundedItems`IkasOrderLineItem[]

Refer to the IkasOrderLineItem reference.

`totalTax`number

`formattedTotalTax`string

`shippingTotal`number

`formattedShippingTotal`string

`formattedTotalFinalPrice`string

`formattedTotalPrice`string

`hasCustomer`boolean

`hasValidCustomerEmail`boolean

`customerFullName`string

`formattedDate`string

`couponAdjustment`IkasOrderAdjustment | undefined

Refer to the IkasOrderAdjustment reference.

`nonCouponAdjustments`IkasOrderAdjustment[] | undefined

Refer to the IkasOrderAdjustment reference.

`isRefundEnabled`boolean
