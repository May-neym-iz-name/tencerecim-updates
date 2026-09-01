<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/queries/list-town -->

# listTown

```graphql
listTown(
  districtId: StringFilterInput!
  id: StringFilterInput
  search: String
  updatedAt: DateFilterInput
): [Town!]!
```
Copy

#### Arguments
`districtId`StringFilterInput!required

You can get the filter response by entering the desired condition for the districtId.

`id`StringFilterInput

`search`String

`updatedAt`DateFilterInput

#### Return Type
`Town`Town
