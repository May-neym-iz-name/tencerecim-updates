<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/storefront-jsscript-input -->

# StorefrontJSScriptInput

```graphql
type StorefrontJSScriptInput {
  contentType: StorefrontJSScriptContentTypeEnum!
  fileName: String
  isHighPriority: Boolean
  name: String!
  scriptContent: String!
  storefrontId: String!
}
```
Copy

#### Fields
`contentType`StorefrontJSScriptContentTypeEnum!required

`fileName`String

`isHighPriority`Boolean

`name`String!required

`scriptContent`String!required

`storefrontId`String!required
