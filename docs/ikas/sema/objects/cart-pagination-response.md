<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/cart-pagination-response -->

# CartPaginationResponse

```graphql
type CartPaginationResponse {
  count: Int!
  data: [Checkout!]!
  hasNext: Boolean!
  limit: Int!
  page: Int!
}
```
Copy

#### Fields
`count`Int!required

Returns the first three records of each page in the records returned as a response.
For example, let's say page = 3, limit = 30, count = 3.
The records that will return as a response are the records between 60-62.

`data`[Checkout!]!required

`hasNext`Boolean!required

In the records returned as Response, it shows whether there are any more records or not. For example, let's say our page field is three and our limit field is thirty. Records between 60 and 90 will be returned. If hasNext is `true` despite these records, it means there are more records. If hasNext is `false`, it means there are a total of 90 records.

`limit`Int!required

The maximum number of data you want to see on a page in the records returned as a response.
For example, if the limit is 20, the data will be displayed as 20 each.
note
min 1, max 200 values can be given. If no value is entered, default 50 is accepted.

`page`Int!required

The number of the page you want to see in the records that return as response.
For example: We entered the page field as 3.And let our limit field be 30.
The records that will return as a response are the records between 60-90.
note
If no value is entered, default 1 is accepted.
