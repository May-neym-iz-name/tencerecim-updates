<!-- kaynak: https://ikas.dev/docs/api/admin-api/storefronts -->

# Storefront

By using this API, you can get information about the storefronts and
you can save and embed javascript script in your storefront theme, so script run it easily in your theme.

## Overview
The storefront API stores information about a store's storefront such as name, javascript script information.

## Models

### Storefront

```graphql
type Storefront {
  id: ID!
  name: String!
}
```
Copy

#### Fields
`id`ID!required

`name`String!required

The storefront's name.

### Storefront Javascript Script

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

## Queries

### List Storefronts

```graphql
listStorefront(
  id: StringFilterInput
): [Storefront!]!
```
Copy

#### Arguments
`id`StringFilterInput

#### Return Type
`Storefront`Storefront

### List Storefront JS Scripts
Use this query to list storefront javascript scripts by supplying the `storefrontId` input.

```graphql
listStorefrontJSScript(
  storefrontId: String
): [StorefrontJSScript!]!
```
Copy

#### Arguments
`storefrontId`String

#### Return Type
`StorefrontJSScript`StorefrontJSScript

## Mutations

### Save Storefont JS Script
Using this api, you can save javascript script to a the storefront.

```graphql
saveStorefrontJSScript(
  input: StorefrontJSScriptInput!
): StorefrontJSScript!
```
Copy

#### Arguments
`input`StorefrontJSScriptInput!required

#### Return Type
`StorefrontJSScript`StorefrontJSScript

### Delete Storefont JS Script
Using this api, you can delete javascript script from a the storefront.

```graphql
deleteStorefrontJSScript(
  storefrontIdList: [String!]!
): Boolean!
```
Copy

#### Arguments
`storefrontIdList`[String!]!required

#### Return Type
`Boolean`Boolean

The `Boolean` scalar type represents `true` or `false`.

## Examples

### Retrieves a list of storefronts

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ listStorefront(id: { eq: \"storefront_id\" }) { id name } } "}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
            listStorefront(id: { eq: "storefront_id" }) {
                id
                name
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
    "listStorefront": [
      {
        "id": "78c58c28-d191-4ab1-a8df-4b23283a7fb4",
        "name": "Storefront's Name"
      }
    ]
  }
}
```
Copy

### Retrieves a list of storefront javascript scripts

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ listStorefrontJSScript(storefrontId: \"storefront_id\") { id name storefrontId isActive storeAppId authorizedAppId scriptContent } } "}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
            listStorefrontJSScript(storefrontId: "storefront_id") {
                id
                name
                storefrontId
                isActive
                storeAppId
                authorizedAppId
                scriptContent
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
    "listStorefrontJSScript": [
      {
        "id": "18c58c28-d191-4ab1-a8df-4b23283a7fb4",
        "name": "Storefront Javascript Script's Name",
        "storefrontId": "78c58c28-d191-4ab1-a8df-4b23283a7fb4",
        "isActive": true,
        "storeAppId": "28c58c28-d191-4ab1-a8df-4b23283a7fb5",
        "authorizedAppId": "58c58c28-d191-4ab1-a8df-4b23283a7fb9",
        "scriptContent": "<script src='https://www.ikas.com'>Welcome to ikas</script>"
      }
    ]
  }
}
```
Copy

### Save Storefont JS Script

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"mutation { saveStorefrontJSScript( input: { name: \"ikas Javascript Script\" storefrontId: \"78c58c28-d191-4ab1-a8df-4b23283a7fb4\" scriptContent: \"<script src='https://www.ikas.com'>Welcome to ikas</script>\" } ) { id name storefrontId isActive storeAppId authorizedAppId scriptContent } } "}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`mutation {
            saveStorefrontJSScript(
                input: {
                    name: "ikas Javascript Script"
                    storefrontId: "78c58c28-d191-4ab1-a8df-4b23283a7fb4"
                    scriptContent: "<script src='https://www.ikas.com'>Welcome to ikas</script>"
                }
            ) {
                id
                name
                storefrontId
                isActive
                storeAppId
                authorizedAppId
                scriptContent
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
    "saveStorefrontJSScript": {
      "id": "18c58c28-d191-4ab1-a8df-4b23283a7fb4",
      "name": "Storefront Javascript Script's Name",
      "storefrontId": "78c58c28-d191-4ab1-a8df-4b23283a7fb4",
      "isActive": true,
      "storeAppId": "28c58c28-d191-4ab1-a8df-4b23283a7fb5",
      "authorizedAppId": "58c58c28-d191-4ab1-a8df-4b23283a7fb9",
      "scriptContent": "<script src='https://www.ikas.com'>Welcome to ikas</script>"
    }
  }
}
```
Copy

### Delete Storefont JS Script

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"mutation { deleteStorefrontJSScript( storefrontIdList: [\"18c58c28-d191-4ab1-a8df-4b23283a7fb4\"] ) } "}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`mutation {
            deleteStorefrontJSScript(
                storefrontIdList: ["18c58c28-d191-4ab1-a8df-4b23283a7fb4"]
            )
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
    "deleteStorefrontJSScript": true
  }
}
```
Copy
