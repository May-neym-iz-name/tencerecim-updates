<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/queries/list-state -->

# listState

```graphql
listState(
  countryId: StringFilterInput!
  id: StringFilterInput
  search: String
  updatedAt: DateFilterInput
): [State!]!
```
Copy

#### Arguments
`countryId`StringFilterInput!required

You can get the filter response by entering the desired condition for the countryId.

`id`StringFilterInput

`search`String

`updatedAt`DateFilterInput

#### Return Type
`State`State
