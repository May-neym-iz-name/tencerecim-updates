<!-- kaynak: https://ikas.dev/docs/api/admin-api/sales-channels -->

# Sales Channels

## Models

### Sales Channel

```graphql
type SalesChannel {
  id: ID!
  name: String!
  paymentGateways: [SalesChannelPaymentGateway!]
  priceListId: String
  stockLocations: [SalesChannelStockLocation!]
  type: SalesChannelTypeEnum!
}
```
Copy

#### Fields
`id`ID!required

`name`String!required

The sales channel name field.

`paymentGateways`[SalesChannelPaymentGateway!]

The sales channel payment gateway field.

`priceListId`String

The sales channel priceList field.

`stockLocations`[SalesChannelStockLocation!]

The sales channel stock locations field.

`type`SalesChannelTypeEnum!required

### Sales Channel Payment Gateway

```graphql
type SalesChannelPaymentGateway {
  id: String!
  order: Float!
}
```
Copy

#### Fields
`id`String!required

`order`Float!required

The field where the Sales Channel Stock Position order is kept.

### Sales Channel Stock Location

```graphql
type SalesChannelStockLocation {
  id: String!
  order: Float!
}
```
Copy

#### Fields
`id`String!required

`order`Float!required

The field where the Sales Channel Stock Position order is kept.

## Queries

### List Sales Channels

```graphql
listSalesChannel(
  id: StringFilterInput
): [SalesChannel!]!
```
Copy

#### Arguments
`id`StringFilterInput

#### Return Type
`SalesChannel`SalesChannel

### Get Sales Channel
Using this api, you can view your sales channel.

```graphql
getSalesChannel: SalesChannel
```
Copy

#### Return Type
`SalesChannel`SalesChannel

## Mutations

### Save Sales Channel
Using this api you can update the sales channel name, priceList Id and stockLocations properties.

```graphql
saveSalesChannel(
  input: SalesChannelInput!
): SalesChannel
```
Copy

#### Arguments
`input`SalesChannelInput!required

#### Return Type
`SalesChannel`SalesChannel

## Examples

### Retrieves a list of sales channels

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ listSalesChannel { createdAt deleted id name priceListId stockLocations { order } paymentGateways { order } type updatedAt }}"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
  listSalesChannel {
    createdAt
    deleted
    id
    name
    priceListId
    stockLocations {
      order
    }
    paymentGateways {
      order
    }
    type
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
    "listSalesChannel": [
      {
        "createdAt": 1631194974624,
        "deleted": false,
        "id": "c78b2fa7-2e8a-442a-9818-b1b033bad47f",
        "name": "taylan-app",
        "priceListId": null,
        "stockLocations": [
          {
            "order": 1
          }
        ],
        "paymentGateways": [
          {
            "order": 0
          }
        ],
        "type": "STOREFRONT",
        "updatedAt": 1631195159983
      }
    ]
  }
}
```
Copy

### Retrieves a sales channel detail

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ getSalesChannel { createdAt deleted id name priceListId type updatedAt }}"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
  getSalesChannel {
    createdAt
    deleted
    id
    name
    priceListId
    type
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
{}
```
Copy

### Creates a new sales channel

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"mutation { saveSalesChannel( input: { name: \"AAA\" priceListId: \"priceListId\" stockLocations: { id: \"stockLocationId\", order: 4 } } ) { createdAt deleted id name priceListId stockLocations { order } paymentGateways { order } type updatedAt }}"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`mutation {
  saveSalesChannel(
    input: {
      name: "AAA"
      priceListId: "priceListId"
      stockLocations: { id: "stockLocationId", order: 4 }
    }
  ) {
    createdAt
    deleted
    id
    name
    priceListId
    stockLocations {
      order
    }
    paymentGateways {
      order
    }
    type
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
{}
```
Copy
