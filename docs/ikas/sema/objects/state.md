<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/state -->

# State

```graphql
type State {
  id: ID!
  countryId: String!
  locationTranslations: LocationTranslations
  name: String!
  native: String
  stateCode: String
}
```
Copy

#### Fields
`id`ID!required

`countryId`String!required

ID indicating which country the state belongs to.

`locationTranslations`LocationTranslations

Shows spellings of state name in different languages.

`name`String!required

State's name.

`native`String

Indicates the name of the state in the local language.

`stateCode`String

The two-letter state code corresponding to the state.
