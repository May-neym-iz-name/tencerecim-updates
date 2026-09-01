<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-line-item -->

# OrderLineItem

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
