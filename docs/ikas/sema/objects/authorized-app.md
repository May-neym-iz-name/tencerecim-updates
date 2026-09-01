<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/authorized-app -->

# AuthorizedApp

```graphql
type AuthorizedApp {
  id: ID!
  addedDate: Timestamp!
  partnerId: String!
  salesChannelId: String
  scope: String!
  storeAppId: String!
  supportsMultipleInstallation: Boolean
}
```
Copy

#### Fields
`id`ID!required

`addedDate`Timestamp!required

The date the app was added.

`partnerId`String!required

`salesChannelId`String

The id of the sales channel owned by the merchant.

`scope`String!required

`storeAppId`String!required

The application's id in the store.

`supportsMultipleInstallation`Boolean

It keeps the information that a merchant cn install more than one application. If `true`, merchant can add more than one application.
