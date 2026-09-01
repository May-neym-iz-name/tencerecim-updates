<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/sales-channel-input -->

# SalesChannelInput

```graphql
type SalesChannelInput {
  name: String
  priceListId: String
  stockLocations: [SalesChannelStockLocationInput!]!
}
```
Copy

#### Fields
`name`String

The sales channel name field.

`priceListId`String

The sales channel priceList field.

`stockLocations`[SalesChannelStockLocationInput!]!required

The sales channel stock locations field.
