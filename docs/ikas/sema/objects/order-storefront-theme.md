<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-storefront-theme -->

# OrderStorefrontTheme

```graphql
type OrderStorefrontTheme {
  id: String!
  name: String
  themeId: String
  themeVersionId: String
}
```
Copy

#### Fields
`id`String!required

It is the theme id customized by the merchant used by the storefront when the order was created.

`name`String

It is the theme theme name customized by the merchant used by the storefront when the order was created.

`themeId`String

It is the ikas theme id used by the storefront when the order was created.

`themeVersionId`String

It is the ikas theme version id used by the storefront when the order was created.
