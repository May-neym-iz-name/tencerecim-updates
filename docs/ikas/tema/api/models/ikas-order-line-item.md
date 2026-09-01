<!-- kaynak: https://ikas.dev/docs/theme/api/models/ikas-order-line-item -->

# IkasOrderLineItem extends IkasBaseModel

`currencyCode`string | null

`currencySymbol`string | null

`discount`IkasOrderLineDiscount | null

Refer to the IkasOrderLineDiscount reference.

`discountPrice`number | null

`finalPrice`number | null

`finalUnitPrice`number | null

`options`IkasOrderLineItemOption[] | null

Refer to the IkasOrderLineItemOption reference.

`originalOrderLineItemId`string | null

`price`number

`quantity`number

`status`IkasOrderLineItemStatus

Refer to the IkasOrderLineItemStatus reference.

`statusUpdatedAt`number | null

`stockLocationId`string | null

`taxValue`number | null

`unitPrice`number | null

`variant`IkasOrderLineVariant

Refer to the IkasOrderLineVariant reference.

`orderedAt`number

`priceWithQuantity`number

`formattedPriceWithQuantity`string

`overridenPriceWithQuantity`number | null

`formattedOverridenPriceWithQuantity`string

`formattedFinalPrice`string

`formattedUnitPrice`string

`formattedFinalUnitPrice`string

`unitPriceText`string | undefined

`formattedDiscountPrice`string

`finalPriceWithQuantity`number

`formattedFinalPriceWithQuantity`string

`tax`number

`formattedTax`string

`refundQuantity`number | null | undefined

`refundQuantity`number | null | undefined

`refundQuantity`setter

```typescript
set refundQuantity(value: number | null | undefined): number | null | undefined
```
Copy

value
:
number | null | undefined
