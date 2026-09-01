<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/string-filter-input -->

# StringFilterInput

```graphql
type StringFilterInput {
  eq: String
  in: [String!]
  like: String
  ne: String
  nin: [String!]
}
```
Copy

#### Fields
`eq`String

`equal`. The filter used for equality.

`in`[String!]

Returns a boolean indicating whether a specified value is in an array.

`like`String

It allows using regex code in queries.
The following example matches all documents where the name field is like "%AAA":
note
Example usage: merchantId: { like: AAA }.

`ne`String

`not equal`. The filter used for not equality.

`nin`[String!]

Returns a boolean indicating whether a specified value is not in an array.
