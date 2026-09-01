<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/me-response -->

# MeResponse

```graphql
type MeResponse {
  id: String
  addedDate: Timestamp
  email: String
  name: String
  partnerId: String
  salesChannelId: String
  scope: String
  scopes: [AppScopeEnum!]
  storeAppId: String
  supportsMultipleInstallation: Boolean
}
```
Copy

#### Fields
`id`String

`addedDate`Timestamp

The date the app was added.

`email`String

The merchant staff's email address.

`name`String

`partnerId`String

`salesChannelId`String

The id of the sales channel owned by the merchant.

`scope`String

`scopes`[AppScopeEnum!]

It keeps the information of the operations that this application can access and perform. For more information please review Scopes section.

`storeAppId`String

The application's id in the store.

`supportsMultipleInstallation`Boolean

It keeps the information that a merchant cn install more than one application. If `true`, merchant can add more than one application.
