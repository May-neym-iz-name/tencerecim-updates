<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-gift-package-line -->

# OrderGiftPackageLine

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
