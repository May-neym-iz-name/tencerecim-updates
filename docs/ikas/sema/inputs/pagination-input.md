<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/pagination-input -->

# PaginationInput

```graphql
type PaginationInput {
  limit: Int
  page: Int
}
```
Copy

#### Fields
`limit`Int

The maximum number of data you want to see on a page in the records returned as a response.
For example, if the limit is 20, the data will be displayed as 20 each.
note
min 1, max 200 values can be given. If no value is entered, default 50 is accepted.

`page`Int

The number of the page you want to see in the records that return as response.
For example: We entered the page field as 3.And let our limit field be 30.
The records that will return as a response are the records between 60-90.
note
If no value is entered, default 1 is accepted.
