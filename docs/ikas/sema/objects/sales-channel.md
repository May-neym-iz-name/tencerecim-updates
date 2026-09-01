<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/sales-channel -->

# SalesChannel

```graphql
type SalesChannel {
  id: ID!
  name: String!
  paymentGateways: [SalesChannelPaymentGateway!]
  priceListId: String
  stockLocations: [SalesChannelStockLocation!]
  type: SalesChannelTypeEnum!
}
```
Copy

#### Fields
`id`ID!required

`name`String!required

The sales channel name field.

`paymentGateways`[SalesChannelPaymentGateway!]

The sales channel payment gateway field.

`priceListId`String

The sales channel priceList field.

`stockLocations`[SalesChannelStockLocation!]

The sales channel stock locations field.

`type`SalesChannelTypeEnum!required
