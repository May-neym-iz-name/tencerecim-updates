<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/queries/list-customer -->

# listCustomer

```graphql
listCustomer(
  email: StringFilterInput
  id: StringFilterInput
  merchantId: StringFilterInput
  pagination: PaginationInput
  phone: StringFilterInput
  search: String
  sort: String
  updatedAt: DateFilterInput
): CustomerPaginationResponse!
```
Copy

#### Arguments
`email`StringFilterInput

You can get the filter response by entering the desired condition for the email.
note
For example email: { eq: aa@gmail.com}

`id`StringFilterInput

`merchantId`StringFilterInput

`pagination`PaginationInput

With the pagination feature in the data returned as a response, you can filter the data and display the part you want.

`phone`StringFilterInput

You can get the filter response by entering the desired condition for the email.
note
For example phone: { eq: 5123456789999}

`search`String

Some listing APIs have searchable fields. You can search in these fields as you wish. For example, in an API; Let the `searchableFields :['name', 'description']`. If we send `search: AAA` as input in args, it will return records with 'AAA' in both the name and description fields.

`sort`String

Some listing APIs have sortable fields. Using these fields, the data returned as response has been sorted. For example, in an API; Let it be `sortableFields: ['updatedAt']`. The data returned as a response will be sorted according to updatedAt.

`updatedAt`DateFilterInput

#### Return Type
`CustomerPaginationResponse`CustomerPaginationResponse
