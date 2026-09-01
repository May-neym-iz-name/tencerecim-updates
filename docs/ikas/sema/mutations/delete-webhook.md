<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/mutations/delete-webhook -->

# deleteWebhook

Use this mutation to delete webhooks by giving `scope` list.

```graphql
deleteWebhook(
  scopes: [String!]!
): Boolean!
```
Copy

#### Arguments
`scopes`[String!]!required

#### Return Type
`Boolean`Boolean

The `Boolean` scalar type represents `true` or `false`.
