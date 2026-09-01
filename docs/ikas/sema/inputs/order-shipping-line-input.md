<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/order-shipping-line-input -->

# OrderShippingLineInput

```graphql
type OrderShippingLineInput {
  price: Float!
  priceListId: Float
  taxValue: Float
  title: String!
}
```
Copy

#### Fields
`price`Float!required

It is the price of the order shipping line.

`priceListId`Float

`taxValue`Float

It is the tax value of the order shipping line.

`title`String!required

It is the title of the order shipping line.
