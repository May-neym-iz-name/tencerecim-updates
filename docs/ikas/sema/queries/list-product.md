<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/queries/list-product -->

# listProduct

Use this query to list products.
Sort applies to following fields: `createdAt` `updatedAt` `name`

```graphql
listProduct(
  attributeId: ProductAttributeFilterInput
  barcodeList: StringFilterInput
  brandId: StringFilterInput
  categoryIds: CategoryFilterInput
  id: StringFilterInput
  includeDeleted: Boolean
  name: StringFilterInput
  pagination: PaginationInput
  salesChannelIds: StringFilterInput
  sku: StringFilterInput
  sort: String
  tagIds: StringFilterInput
  variantStockLocationId: StringFilterInput
  variantTypeId: StringFilterInput
  vendorId: StringFilterInput
): ProductPaginationResponse!
```
Copy

#### Arguments
`attributeId`ProductAttributeFilterInput

`barcodeList`StringFilterInput

List of barcode for the product.

`brandId`StringFilterInput

`categoryIds`CategoryFilterInput

`id`StringFilterInput

`includeDeleted`Boolean

`name`StringFilterInput

`pagination`PaginationInput

With the pagination feature in the data returned as a response, you can filter the data and display the part you want.

`salesChannelIds`StringFilterInput

`sku`StringFilterInput

SKU of the product.

`sort`String

`tagIds`StringFilterInput

`variantStockLocationId`StringFilterInput

`variantTypeId`StringFilterInput

`vendorId`StringFilterInput

#### Return Type
`ProductPaginationResponse`ProductPaginationResponse
