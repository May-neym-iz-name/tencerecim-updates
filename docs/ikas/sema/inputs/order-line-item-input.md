<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/order-line-item-input -->

# OrderLineItemInput

```graphql
type OrderLineItemInput {
  id: ID
  discount: OrderLineDiscountInput
  discountPrice: Float
  options: [OrderLineOptionInput!]
  price: Float!
  quantity: Float!
  sourceId: String
  variant: OrderLineVariantInput!
}
```
Copy

#### Fields
`id`ID

`discount`OrderLineDiscountInput

It is the discount information that will be applied to the line item.

`discountPrice`Float

It is the discount price of the line item.

`options`[OrderLineOptionInput!]

It is the options information in the order line item.

`price`Float!required

It is the price of the line item.

`quantity`Float!required

It is the quantity of the line item.

`sourceId`String

It is the source id of the line item. If the order came from the marketplace, it shows the line id in the marketplace.

`variant`OrderLineVariantInput!required

It is the variant information in the order line item.
