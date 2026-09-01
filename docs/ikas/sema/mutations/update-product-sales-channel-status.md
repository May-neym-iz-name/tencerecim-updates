<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/mutations/update-product-sales-channel-status -->

# updateProductSalesChannelStatus

Response indicating the status of operation.

```graphql
updateProductSalesChannelStatus(
  input: [UpdateProductSalesChannelStatusInput!]!
  salesChannelId: String
): Boolean!
```
Copy

#### Arguments
`input`[UpdateProductSalesChannelStatusInput!]!required

Input to update sales channels list of the product.

`salesChannelId`String

Id of the sales channel to update its sales channels.

#### Return Type
`Boolean`Boolean

The `Boolean` scalar type represents `true` or `false`.
