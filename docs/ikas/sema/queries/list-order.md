<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/queries/list-order -->

# listOrder

```graphql
listOrder(
  branchId: StringFilterInput
  branchSessionId: StringFilterInput
  closedAt: DateFilterInput
  customerEmail: StringFilterInput
  customerId: StringFilterInput
  id: StringFilterInput
  invoicesStoreAppId: StringFilterInput
  orderNumber: StringFilterInput
  orderPackageStatus: OrderPackageStatusEnumInputFilter
  orderPaymentStatus: OrderPaymentStatusEnumInputFilter
  orderTagIds: StringFilterInput
  orderedAt: DateFilterInput
  pagination: PaginationInput
  paymentMethodType: OrderPaymentMethodEnumFilterInput
  salesChannelId: StringFilterInput
  search: String
  shippingMethod: OrderShippingMethodEnumFilterInput
  sort: String
  status: OrderStatusEnumInputFilter
  stockLocationId: StringFilterInput
  terminalId: StringFilterInput
  updatedAt: DateFilterInput
): OrderPaginationResponse!
```
Copy

#### Arguments
`branchId`StringFilterInput

`branchSessionId`StringFilterInput

`closedAt`DateFilterInput

`customerEmail`StringFilterInput

`customerId`StringFilterInput

`id`StringFilterInput

`invoicesStoreAppId`StringFilterInput

`orderNumber`StringFilterInput

`orderPackageStatus`OrderPackageStatusEnumInputFilter

`orderPaymentStatus`OrderPaymentStatusEnumInputFilter

`orderTagIds`StringFilterInput

`orderedAt`DateFilterInput

`pagination`PaginationInput

With the pagination feature in the data returned as a response, you can filter the data and display the part you want.

`paymentMethodType`OrderPaymentMethodEnumFilterInput

`salesChannelId`StringFilterInput

`search`String

Some listing APIs have searchable fields. You can search in these fields as you wish. For example, in an API; Let the `searchableFields :['name', 'description']`. If we send `search: AAA` as input in args, it will return records with 'AAA' in both the name and description fields.

`shippingMethod`OrderShippingMethodEnumFilterInput

`sort`String

Some listing APIs have sortable fields. Using these fields, the data returned as response has been sorted. For example, in an API; Let it be `sortableFields: ['updatedAt']`. The data returned as a response will be sorted according to updatedAt.

`status`OrderStatusEnumInputFilter

`stockLocationId`StringFilterInput

`terminalId`StringFilterInput

`updatedAt`DateFilterInput

#### Return Type
`OrderPaginationResponse`OrderPaginationResponse
