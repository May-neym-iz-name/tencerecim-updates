<!-- kaynak: https://ikas.dev/docs/api/admin-api/stock-locations -->

# Stock Locations

## Models

### StockLocation

```graphql
type StockLocation {
  id: ID!
  address: StockLocationAddress
  deliveryTime: StockLocationDeliveryTimeEnum
  description: String
  isRemindOutOfStockEnabled: Boolean
  name: String!
  outOfStockMailList: [String!]
  type: StockLocationTypeEnum
}
```
Copy

#### Fields
`id`ID!required

`address`StockLocationAddress

It is the address information of the stock location.

`deliveryTime`StockLocationDeliveryTimeEnum

It is the delivery time of the stock location.

`description`String

It is the description of the stock location.

`isRemindOutOfStockEnabled`Boolean

`name`String!required

It is the name of the stock location.

`outOfStockMailList`[String!]

`type`StockLocationTypeEnum

It is the type enum of the stock location.

### StockLocationAddress

```graphql
type StockLocationAddress {
  address: String
  city: StockLocationAddressCity
  country: StockLocationAddressCountry
  district: StockLocationAddressDistrict
  phone: String
  postalCode: String
  state: StockLocationAddressState
}
```
Copy

#### Fields
`address`String

It is the full address of the stock location.

`city`StockLocationAddressCity

It is the city information of the address.

`country`StockLocationAddressCountry

It is the country information of the address.

`district`StockLocationAddressDistrict

It is the district information of the address.

`phone`String

It is the phone number of the address.

`postalCode`String

It is the postal code of the address.

`state`StockLocationAddressState

It is the state information of the address.

### StockLocationAddressCountry

```graphql
type StockLocationAddressCountry {
  id: String
  code: String
  name: String!
}
```
Copy

#### Fields
`id`String

It is the id of the country of the address.

`code`String

It is the code of the country of the address.

`name`String!required

It is the name of the country of the address.

### StockLocationAddressCity

```graphql
type StockLocationAddressCity {
  id: String
  code: String
  name: String!
}
```
Copy

#### Fields
`id`String

It is the id of the city of the address.

`code`String

It is the code of the city of the address.

`name`String!required

It is the name of the city of the address.

### StockLocationAddressDistrict

```graphql
type StockLocationAddressDistrict {
  id: String
  code: String
  name: String
}
```
Copy

#### Fields
`id`String

It is the id of the district of the address.

`code`String

It is the code of the district of the address.

`name`String

It is the name of the district of the address.

### StockLocationAddressState

```graphql
type StockLocationAddressState {
  id: String
  code: String
  name: String
}
```
Copy

#### Fields
`id`String

It is the id of the state of the address.

`code`String

It is the code of the state of the address.

`name`String

It is the name of the state of the address.

## Queries

### List Product Stock Locations

```graphql
listProductStockLocation(
  id: StringFilterInput
  pagination: PaginationInput
  productId: StringFilterInput
  sort: String
  stockLocationId: StringFilterInput
  updatedAt: DateFilterInput
  variantId: StringFilterInput
): ProductStockLocationPaginationResponse!
```
Copy

#### Arguments
`id`StringFilterInput

`pagination`PaginationInput

`productId`StringFilterInput

`sort`String

`stockLocationId`StringFilterInput

`updatedAt`DateFilterInput

`variantId`StringFilterInput

#### Return Type
`ProductStockLocationPaginationResponse`ProductStockLocationPaginationResponse

### List Stock Locations

```graphql
listStockLocation(
  id: StringFilterInput
  name: StringFilterInput
  updatedAt: DateFilterInput
): [StockLocation!]!
```
Copy

#### Arguments
`id`StringFilterInput

`name`StringFilterInput

`updatedAt`DateFilterInput

#### Return Type
`StockLocation`StockLocation

### Mutations

### Save Product Stock Locations
Use this mutation to define new stock or update stocks by location.

```graphql
saveProductStockLocations(
  input: SaveStockLocationsInput!
): Boolean!
```
Copy

#### Arguments
`input`SaveStockLocationsInput!required

#### Return Type
`Boolean`Boolean

The `Boolean` scalar type represents `true` or `false`.

## Examples

### Retrieves a list of product stock locations

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ listProductStockLocation { count data { createdAt deleted id productId stockCount stockLocationId updatedAt variantId } hasNext limit page }}"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
  listProductStockLocation {
      count
      data {
        createdAt
        deleted
        id
        productId
        stockCount
        stockLocationId
        updatedAt
        variantId
      }
      hasNext
      limit
      page
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
    "listProductStockLocation": {
      "count": 2,
      "hasNext": false,
      "limit": 200,
      "page": 1,
      "data": [
        {
          "createdAt": 1626700964797,
          "deleted": false,
          "id": "122fa5fa-2271-4f90-a26a-fb67539b788b",
          "productId": "08665baf-a982-4042-9d08-01b0ea21a2eb",
          "stockCount": 0,
          "stockLocationId": "1712d863-82f8-465c-a096-9d599ff94d37",
          "updatedAt": 1626701111813,
          "variantId": "40c802f1-6755-420a-8817-2976bbcfacde"
        },
        {
          "createdAt": 1626700701526,
          "deleted": false,
          "id": "b3f265f5-6588-4b67-aaae-e2d722589541",
          "productId": "08665baf-a982-4042-9d08-01b0ea21a2eb",
          "stockCount": 0,
          "stockLocationId": "a0d19a13-7603-4d75-9ed7-dc414b1df8df",
          "updatedAt": 1626855914363,
          "variantId": "40c802f1-6755-420a-8817-2976bbcfacde"
        }
      ]
    }
  }
}
```
Copy

### Retrieves a list of stock locations

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ listStockLocation { address { address city { code id name } country { code id name } district { code id name } phone postalCode state { code id name } } createdAt deleted id name type updatedAt }}"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
      listStockLocation {
      address {
        address
        city {
          code
          id
          name
        }
        country {
          code
          id
          name
        }
        district {
          code
          id
          name
        }
        phone
        postalCode
        state {
          code
          id
          name
        }
      }
      createdAt
      deleted
      id
      name
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
    "listStockLocation": [
      {
        "id": "a0d19a13-7603-4d75-9ed7-dc414b1df8df",
        "createdAt": 1609769593424,
        "updatedAt": 1609769593424,
        "deleted": false,
        "name": "HQ",
        "type": "PHYSICAL",
        "address": {
          "address": "Koru Mah. Ahmet Taner Kışlalı Cad. No:4 North Star iş Merkezi, D:Kat:6 Daire:12, 06810 Çankaya/Ankara",
          "phone": "+905555555555",
          "postalCode": "06810",
          "country": null,
          "state": null,
          "district": null,
          "city": null
        }
      }
    ]
  }
}
```
Copy

### Creates or updates product stock locations
note
If provided product stock location already exists, it will be updated with the given input values.
Otherwise, a new product stock location is created.

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"mutation { saveProductStockLocations( input: { productStockLocationInputs: [ { productId: \"product_id\" variantId: \"variant_id\" stockCount: 1 stockLocationId: \"stock_location_id\" } ] } )}"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`mutation {
      saveProductStockLocations(
        input: {
          productStockLocationInputs: [
            {
              productId: "product_id"
              variantId: "variant_id"
              stockCount: 1
              stockLocationId: "stock_location_id"
            }
          ]
        }
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
    "saveProductStockLocations": true
  }
}
```
Copy
