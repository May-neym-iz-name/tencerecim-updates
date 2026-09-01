<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/queries/list-abandoned-checkouts -->

# listAbandonedCheckouts

Use this query to get abandoned checkouts.

```graphql
listAbandonedCheckouts(
  id: StringFilterInput
  input: ListAbandonedCartInput!
  mailSendDate: DateFilterInput
  pagination: PaginationInput
  sort: String
  updatedAt: DateFilterInput
): CartPaginationResponse!
```
Copy

#### Arguments
`id`StringFilterInput

`input`ListAbandonedCartInput!required

`mailSendDate`DateFilterInput

`pagination`PaginationInput

`sort`String

`updatedAt`DateFilterInput

#### Return Type
`CartPaginationResponse`CartPaginationResponse
