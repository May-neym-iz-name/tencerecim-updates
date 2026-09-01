<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/town -->

# Town

```graphql
type Town {
  id: ID!
  districtId: String!
  name: String!
  order: Float
}
```
Copy

#### Fields
`id`ID!required

`districtId`String!required

ID indicating which district the town belongs to.

`name`String!required

Town's name.

`order`Float

Specifies the order of towns.
