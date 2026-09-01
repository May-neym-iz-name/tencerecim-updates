<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/number-filter-input -->

# NumberFilterInput

```graphql
type NumberFilterInput {
  eq: Float
  gt: Float
  gte: Float
  in: [Float!]
  lt: Float
  lte: Float
  ne: Float
  nin: [Float!]
}
```
Copy

#### Fields
`eq`Float

`equal`. The filter used for equality.

`gt`Float

`greater than` selects the documents where the value of the `input` is greater than to ( i.e. > ) a specified value (e.g. value.)

`gte`Float

`greater than or equals` selects the documents where the value of the `input` is greater than or equal to ( i.e. >= ) a specified value (e.g. value.)

`in`[Float!]

Returns a boolean indicating whether a specified value is in an array.

`lt`Float

`less than` selects the documents where the value of the `input` is less than or equal to ( i.e. < ) a specified value (e.g. value.)

`lte`Float

`less than or equals` selects the documents where the value of the `input` is less than or equal to ( i.e. <= ) a specified value (e.g. value.)

`ne`Float

`not equal`. The filter used for not equality.

`nin`[Float!]

Returns a boolean indicating whether a specified value is not in an array.
