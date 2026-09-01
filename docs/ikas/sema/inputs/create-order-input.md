<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/create-order-input -->

# CreateOrderInput

```graphql
type CreateOrderInput {
  id: ID
  billingAddress: OrderAddressInput
  branchSessionId: String
  currencyCode: String
  customer: OrderCustomerInput
  host: String
  note: String
  orderAdjustments: [OrderAdjustmentInput!]
  orderedAt: Timestamp
  orderLineItems: [OrderLineItemInput!]!
  orderTagIds: [String!]
  priceListId: String
  salesChannelId: String
  shippingAddress: OrderAddressInput
  shippingLines: [OrderShippingLineInput!]
  shippingMethod: OrderShippingMethodEnum
  sourceId: String
  terminalId: String
}
```
Copy

#### Fields
`id`ID

`billingAddress`OrderAddressInput

It is the address to which the order will be billing.

`branchSessionId`String

It is the branch session id of the order. If the order is placed via ikasPos, this field can be sent as filled.

`currencyCode`String

It is the currency code of the order.

`customer`OrderCustomerInput

It is the customer information in the order.

`host`String

Host name of order source.

`note`String

It is an order note.

`orderAdjustments`[OrderAdjustmentInput!]

A list of adjustment objects, each containing information about a adjustment in the order.

`orderedAt`Timestamp

The date the order was ordered.

`orderLineItems`[OrderLineItemInput!]!required

A list of line item objects, each containing information about an item in the order.

`orderTagIds`[String!]

It is the id list of the tags in the order.

- Is the entered tag id list must be exist in ikas.

`priceListId`String

It is the id of the price list that includes the prices of the products in the order.

- Is the entered id must be exist in ikas.

`salesChannelId`String

It is the sales channel id where the order was created.

- Is the entered id must be exist in ikas.

`shippingAddress`OrderAddressInput

It is the address to which the order will be shipping.

`shippingLines`[OrderShippingLineInput!]

A list of shipping line objects, each containing information about a shipping in the order.

`shippingMethod`OrderShippingMethodEnum

It is the shipping method enum of the order

`sourceId`String

It is the source id of the order. If the order came from the marketplace, it shows the order number in the marketplace.

`terminalId`String

It is the terminal session id of the order. If the order is placed via ikasPos, this field can be sent as filled.
