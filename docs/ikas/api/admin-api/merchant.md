<!-- kaynak: https://ikas.dev/docs/api/admin-api/merchant -->

# Merchant

Merchant API stores contact information, address information, personal information, information about a merchant.
Merchant api also provides information about apps owned by a merchant. Thus, merchant can access the features of the apps it owns.

## Models

### Merchant

```graphql
type MerchantResponse {
  id: String!
  address: MerchantAddress
  email: String!
  firstName: String!
  lastName: String!
  merchantName: String
  merchantSequence: Float
  phoneNumber: String
  storeName: String
}
```
Copy

#### Fields
`id`String!required

`address`MerchantAddress

Merchant's address information.

`email`String!required

The merchant staff's email address.

`firstName`String!required

The merchant's first name.

`lastName`String!required

The merchant's last name.

`merchantName`String

The merchant staff's last name.

`merchantSequence`Float

`phoneNumber`String

The merchant's phone number.

`storeName`String

The merchant's store name.

### MerchantAddress

```graphql
type MerchantAddress {
  addressLine1: String
  addressLine2: String
  city: MerchantAddressCity
  company: String
  country: MerchantAddressCountry
  district: MerchantAddressDistrict
  firstName: String
  identityNumber: String
  lastName: String
  postalCode: String
  state: MerchantAddressState
  taxNumber: String
  taxOffice: String
  title: String
  type: MerchantSettingsAddressTypeEnum
  vkn: String
}
```
Copy

#### Fields
`addressLine1`String

The merchant's mailing address.

`addressLine2`String

An additional field for the merchant's mailing address.

`city`MerchantAddressCity

The merchant's city.

`company`String

`country`MerchantAddressCountry

The merchant's country.

`district`MerchantAddressDistrict

The merchant's district in city.

`firstName`String

The merchant staff's first name.

`identityNumber`String

The merchant's identity numbers.

`lastName`String

The merchant staff's last name.

`postalCode`String

The merchant's postal code, also known as zip, postcode, etc.

`state`MerchantAddressState

`taxNumber`String

`taxOffice`String

If merchant is corporate, merchant can use that field to fill their Tax Office name.

`title`String

`type`MerchantSettingsAddressTypeEnum

`vkn`String

### MerchantAddressCountry

```graphql
type MerchantAddressCountry {
  id: String
  code: String
  iso2: String
  iso3: String
  name: String
}
```
Copy

#### Fields
`id`String

`code`String

The ISO3 country code corresponding to the merchant's country.

`iso2`String

Two-letter country code

`iso3`String

Three-letter country code

`name`String

The merchant's normalized country name.

### MerchantAddressCity

```graphql
type MerchantAddressCity {
  id: String
  code: String
  name: String
}
```
Copy

#### Fields
`id`String

`code`String

The city code corresponding to the merchant's city.

`name`String

The merchant's normalized city name.

### MerchantAddressDistrict

```graphql
type MerchantAddressDistrict {
  id: String
  code: String
  name: String
}
```
Copy

#### Fields
`id`String

`code`String

The district code corresponding to the merchant's district.

`name`String

The merchant's normalized district name.

### MerchantAddressState

```graphql
type MerchantAddressState {
  id: String
  code: String
  name: String
}
```
Copy

#### Fields
`id`String

`code`String

`name`String

## Queries

### Get Merchant Detail

```graphql
type MerchantResponse {
  id: String!
  address: MerchantAddress
  email: String!
  firstName: String!
  lastName: String!
  merchantName: String
  merchantSequence: Float
  phoneNumber: String
  storeName: String
}
```
Copy

#### Fields
`id`String!required

`address`MerchantAddress

Merchant's address information.

`email`String!required

The merchant staff's email address.

`firstName`String!required

The merchant's first name.

`lastName`String!required

The merchant's last name.

`merchantName`String

The merchant staff's last name.

`merchantSequence`Float

`phoneNumber`String

The merchant's phone number.

`storeName`String

The merchant's store name.

### Get Authorized App

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

### Me

```graphql
type MerchantResponse {
  id: String!
  address: MerchantAddress
  email: String!
  firstName: String!
  lastName: String!
  merchantName: String
  merchantSequence: Float
  phoneNumber: String
  storeName: String
}
```
Copy

#### Fields
`id`String!required

`address`MerchantAddress

Merchant's address information.

`email`String!required

The merchant staff's email address.

`firstName`String!required

The merchant's first name.

`lastName`String!required

The merchant's last name.

`merchantName`String

The merchant staff's last name.

`merchantSequence`Float

`phoneNumber`String

The merchant's phone number.

`storeName`String

The merchant's store name.

## Examples

### Get Merchant Detail

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ getMerchant { email firstName id lastName merchantName merchantSequence phoneNumber storeName }}"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
  getMerchant {
    email
    firstName
    id
    lastName
    merchantName
    merchantSequence
    phoneNumber
    storeName
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
    "getMerchant": {
      "email": "taylan-app@gmail.com",
      "firstName": "taylan",
      "id": "f2813818-6d01-4f48-b205-a94041ee703d",
      "lastName": "ilkyaz",
      "merchantName": "Taylan İlkyaz",
      "merchantSequence": 310,
      "phoneNumber": null,
      "storeName": "taylan-app"
    }
  }
}
```
Copy

### Get Authorized App

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ getAuthorizedApp { addedDate createdAt deleted id partnerId salesChannelId scope storeAppId supportsMultipleInstallation updatedAt }}"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
  getAuthorizedApp {
    addedDate
    createdAt
    deleted
    id
    partnerId
    salesChannelId
    scope
    storeAppId
    supportsMultipleInstallation
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
    "getAuthorizedApp": {
      "addedDate": 1637050545408,
      "createdAt": 1637050545409,
      "deleted": false,
      "id": "92be8a2f-47e4-471b-8c17-bc17d3de90fe",
      "partnerId": "02032105-e67f-42e9-aaff-32b608c500f9",
      "salesChannelId": null,
      "scope": "read_customers,write_customers",
      "storeAppId": "68e29a17-ae29-484b-9e94-839a108dcf57",
      "supportsMultipleInstallation": null,
      "updatedAt": 1637050545409
    }
  }
}
```
Copy

### Me

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ me { addedDate email id name partnerId salesChannelId scope scopes storeAppId supportsMultipleInstallation }}"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
  me {
    addedDate
    email
    id
    name
    partnerId
    salesChannelId
    scope
    scopes
    storeAppId
    supportsMultipleInstallation
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
    "me": {
      "addedDate": 1637050545408,
      "email": null,
      "id": "92be8a2f-47e4-471b-8c17-bc17d3de90fe",
      "name": null,
      "partnerId": "02032105-e67f-42e9-aaff-32b608c500f9",
      "salesChannelId": null,
      "scope": "read_customers,write_customers",
      "scopes": null,
      "storeAppId": "68e29a17-ae29-484b-9e94-839a108dcf57",
      "supportsMultipleInstallation": null
    }
  }
}
```
Copy
