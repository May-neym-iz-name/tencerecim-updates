<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/branch -->

# Branch

```graphql
type Branch {
  id: ID!
  address: BranchAddress!
  favoriteItems: [BranchFavoriteItem!]
  name: String!
  salesChannelId: String!
  settings: BranchSettings
}
```
Copy

#### Fields
`id`ID!required

`address`BranchAddress!required

`favoriteItems`[BranchFavoriteItem!]

`name`String!required

`salesChannelId`String!required

`settings`BranchSettings
