<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/city -->

# City

```graphql
type City {
  id: ID!
  cityCode: String
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

`cityCode`String

The two-letter city code corresponding to the city.

`countryId`String!required

ID indicating which country the city belongs to.

`latitude`String

Indicates the latitude of the city.

`longitude`String

Indicates the longitude of the city.

`name`String!required

City's name.

`order`Float

Specifies the order of cities.

`stateId`String!required

ID indicating which state the city belongs to.
