<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/queries/list-merchant-app-payment -->

# listMerchantAppPayment

Using this api, you can view the payment features that a merchant has created for the app.

```graphql
listMerchantAppPayment(
  id: StringFilterInput
  pagination: PaginationInput
): MerchantAppPaymentPaginationResponse!
```
Copy

#### Arguments
`id`StringFilterInput

`pagination`PaginationInput

With the pagination feature in the data returned as a response, you can filter the data and display the part you want.

#### Return Type
`MerchantAppPaymentPaginationResponse`MerchantAppPaymentPaginationResponse
