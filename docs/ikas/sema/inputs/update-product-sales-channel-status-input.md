<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/update-product-sales-channel-status-input -->

# UpdateProductSalesChannelStatusInput

```graphql
type UpdateProductSalesChannelStatusInput {
  active: Boolean!
  productId: String!
}
```
Copy

#### Fields
`active`Boolean!required

Status of the product in the updated sales channels.

`productId`String!required

Id of the product to update its sales channels.
