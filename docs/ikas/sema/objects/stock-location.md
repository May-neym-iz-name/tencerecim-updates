<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/stock-location -->

# StockLocation

```graphql
type StockLocation {
  id: ID!
  address: StockLocationAddress
  deliveryTime: StockLocationDeliveryTimeEnum
  description: String
  isRemindOutOfStockEnabled: Boolean
  name: String!
  outOfStockMailList: [String!]
  type: StockLocationTypeEnum
}
```
Copy

#### Fields
`id`ID!required

`address`StockLocationAddress

It is the address information of the stock location.

`deliveryTime`StockLocationDeliveryTimeEnum

It is the delivery time of the stock location.

`description`String

It is the description of the stock location.

`isRemindOutOfStockEnabled`Boolean

`name`String!required

It is the name of the stock location.

`outOfStockMailList`[String!]

`type`StockLocationTypeEnum

It is the type enum of the stock location.
