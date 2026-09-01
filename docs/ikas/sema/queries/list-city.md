<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/queries/list-city -->

# listCity

```graphql
listCity(
  countryId: StringFilterInput
  id: StringFilterInput
  search: String
  stateId: StringFilterInput!
  updatedAt: DateFilterInput
): [City!]!
```
Copy

#### Arguments
`countryId`StringFilterInput

You can get the filter response by entering the desired condition for the countryId.

`id`StringFilterInput

`search`String

`stateId`StringFilterInput!required

You can get the filter response by entering the desired condition for the stateId.

`updatedAt`DateFilterInput

#### Return Type
`City`City
