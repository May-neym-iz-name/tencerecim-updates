<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/webhook -->

# Webhook

Webhook model description.

```graphql
type Webhook {
  id: ID!
  endpoint: String!
  scope: String!
}
```
Copy

#### Fields
`id`ID!required

`endpoint`String!required

URL address that webhooks will be pushed.

`scope`String!required

Scope of webhook that defines content of webhook.
