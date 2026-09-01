<!-- kaynak: https://ikas.dev/docs/api/admin-api/webhooks -->

# Webhooks

## Models

### Webhook
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

## Queries

### List Webhooks
Use this query to list active webhooks of your application.

```graphql
listWebhook: [Webhook!]!
```
Copy

#### Return Type
`Webhook`Webhook

Webhook model description.

## Mutations

### Save Webhook
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

### Delete Webhook
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

## Examples

### Retrieves a list of webhooks

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ listWebhook { createdAt deleted endpoint id scope updatedAt }}"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
  listWebhook {
    createdAt
    deleted
    endpoint
    id
    scope
    updatedAt
  }
}
`};

const config = {
  method: 'POST',
  url: 'https://api.myikas.com/api/v1/admin/graphql',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_token'
  },
  data : data
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  if (error.response) {
    console.log(JSON.stringify(error.response.data));
  }
});
```
Copy

#### Response

```json
{
  "data": {
    "listWebhook": [
      {
        "createdAt": 1636366311914,
        "deleted": false,
        "endpoint": "https://mailchimp-dev.ikasapps.com/api/webhook/ikas",
        "id": "331f40ad-58a5-4b25-b060-15e6ce57fc9f",
        "scope": "store/customer/created",
        "updatedAt": 1636366311914
      },
      {
        "createdAt": 1636366311924,
        "deleted": false,
        "endpoint": "https://mailchimp-dev.ikasapps.com/api/webhook/ikas",
        "id": "806047a2-ce1d-4e2c-8c7d-10a5407bfa6d",
        "scope": "store/customer/updated",
        "updatedAt": 1636366311924
      }
    ]
  }
}
```
Copy

### Creates a webhook

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"mutation { saveWebhook( input: { scopes: \"store/customer/created\" endpoint: \"https://www.google.com/\" } ) { createdAt deleted endpoint id scope updatedAt }}"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`mutation {
  saveWebhook(
    input: {
      scopes: "store/customer/created"
      endpoint: "https://www.google.com/"
    }
  ) {
    createdAt
    deleted
    endpoint
    id
    scope
    updatedAt
  }
}
`};

const config = {
  method: 'POST',
  url: 'https://api.myikas.com/api/v1/admin/graphql',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_token'
  },
  data : data
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  if (error.response) {
    console.log(JSON.stringify(error.response.data));
  }
});
```
Copy

#### Response

```json
{
  "data": {
    "saveWebhook": [
      {
        "createdAt": 1637328436979,
        "deleted": false,
        "endpoint": "https://www.google.com/",
        "id": "e96e7c71-3521-43be-b905-1a607a1e4fa5",
        "scope": "store/customer/created",
        "updatedAt": 1637764765953
      }
    ]
  }
}
```
Copy

### Deletes webhook

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"mutation { deleteWebhook(scopes: [\"store/customer/created\"])}"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`mutation {
  deleteWebhook(scopes: ["store/customer/created"])
}
`};

const config = {
  method: 'POST',
  url: 'https://api.myikas.com/api/v1/admin/graphql',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_token'
  },
  data : data
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  if (error.response) {
    console.log(JSON.stringify(error.response.data));
  }
});
```
Copy

#### Response

```json
{
  "data": {
    "deleteWebhook": true
  }
}
```
Copy
