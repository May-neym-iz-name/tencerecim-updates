<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/mutations/save-webhook -->

# saveWebhook

Use this mutation to save webhooks by using multiple `scope` variables. After saving a webhook, ikas will start to push new webhooks to given url `endpoint`. If endpoint is unreachable or returns an error code other than `HTTP 200` ikas will try to push webhook for 3 times then stops sending webhook.

```graphql
saveWebhook(
  input: WebhookInput!
): [Webhook!]
```
Copy

#### Arguments
`input`WebhookInput!required

#### Return Type
`Webhook`Webhook

Webhook model description.
