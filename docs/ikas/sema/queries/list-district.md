<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/queries/list-district -->

# listDistrict

```graphql
listDistrict(
  cityId: StringFilterInput!
  countryId: StringFilterInput
  id: StringFilterInput
  search: String
  stateId: StringFilterInput
  updatedAt: DateFilterInput
): [District!]!
```
Copy

#### Arguments
`cityId`StringFilterInput!required

You can get the filter response by entering the desired condition for the cityId.

`countryId`StringFilterInput

You can get the filter response by entering the desired condition for the countryId.

`id`StringFilterInput

`search`String

`stateId`StringFilterInput

You can get the filter response by entering the desired condition for the stateId.

`updatedAt`DateFilterInput

#### Return Type
`District`District
