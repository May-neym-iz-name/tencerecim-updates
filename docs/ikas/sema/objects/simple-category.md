<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/simple-category -->

# SimpleCategory

```graphql
type SimpleCategory {
  id: ID!
  name: String!
  parentId: String
}
```
Copy

#### Fields
`id`ID!required

`name`String!required

It is the name of the category in which the product is located.

`parentId`String

It is the id of the superclass category of the category.
