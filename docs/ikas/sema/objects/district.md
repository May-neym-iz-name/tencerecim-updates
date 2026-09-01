<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/district -->

# District

```graphql
type District {
  id: ID!
  cityId: String!
  countryId: String!
  latitude: String
  longitude: String
  name: String!
  order: Float
  stateId: String!
}
```
Copy

#### Fields
`id`ID!required

`cityId`String!required

ID indicating which city the district belongs to.

`countryId`String!required

ID indicating which country the district belongs to.

`latitude`String

Indicates the latitude of the city.

`longitude`String

Indicates the longitude of the city.

`name`String!required

District's name.

`order`Float

Specifies the order of districts.

`stateId`String!required

ID indicating which state the district belongs to.
