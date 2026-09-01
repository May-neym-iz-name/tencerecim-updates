<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/queries/list-country -->

# listCountry

```graphql
listCountry(
  id: StringFilterInput
  iso2: StringFilterInput
  iso3: StringFilterInput
  search: String
  updatedAt: DateFilterInput
): [Country!]!
```
Copy

#### Arguments
`id`StringFilterInput

`iso2`StringFilterInput

You can get the filter response by entering the desired condition for the iso2.

`iso3`StringFilterInput

You can get the filter response by entering the desired condition for the iso3.

`search`String

`updatedAt`DateFilterInput

#### Return Type
`Country`Country
