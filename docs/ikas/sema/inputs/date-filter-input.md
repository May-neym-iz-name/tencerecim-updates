<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/date-filter-input -->

# DateFilterInput

```graphql
type DateFilterInput {
  eq: Timestamp
  gt: Timestamp
  gte: Timestamp
  in: [Timestamp!]
  lt: Timestamp
  lte: Timestamp
  ne: Timestamp
  nin: [Timestamp!]
}
```
Copy

#### Fields
`eq`Timestamp

`equal`. The filter used for equality.

`gt`Timestamp

`greater than` selects the documents where the value of the `input` is greater than to ( i.e. > ) a specified value (e.g. value.)

`gte`Timestamp

`greater than or equals` selects the documents where the value of the `input` is greater than or equal to ( i.e. >= ) a specified value (e.g. value.)

`in`[Timestamp!]

Returns a boolean indicating whether a specified value is in an array.

`lt`Timestamp

`less than` selects the documents where the value of the `input` is less than or equal to ( i.e. < ) a specified value (e.g. value.)

`lte`Timestamp

`less than or equals` selects the documents where the value of the `input` is less than or equal to ( i.e. <= ) a specified value (e.g. value.)

`ne`Timestamp

`not equal`. The filter used for not equality.

`nin`[Timestamp!]

Returns a boolean indicating whether a specified value is not in an array.
