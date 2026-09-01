<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/storefront-jsscript -->

# StorefrontJSScript

```graphql
type StorefrontJSScript {
  id: ID!
  authorizedAppId: String
  contentType: StorefrontJSScriptContentTypeEnum
  fileName: String
  isActive: Boolean!
  isHighPriority: Boolean
  name: String!
  order: Float
  scriptContent: String!
  storeAppId: String
  storefrontId: String!
}
```
Copy

#### Fields
`id`ID!required

`authorizedAppId`String

The id of the logged in application.

`contentType`StorefrontJSScriptContentTypeEnum

The type of javascript script content.

`fileName`String

The type of javascript script content.

`isActive`Boolean!required

Shows the availability status of the storefront.

`isHighPriority`Boolean

Indicates if the script has a high priority and should be executed before others.

`name`String!required

The storefront javascript script's name.

`order`Float

The order of the script to be executed.

`scriptContent`String!required

The storefront javascript script's content.

`storeAppId`String

The store app's id.

`storefrontId`String!required

The storefront's id.
