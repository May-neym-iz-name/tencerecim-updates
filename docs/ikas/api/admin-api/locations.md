<!-- kaynak: https://ikas.dev/docs/api/admin-api/locations -->

# Location

By using this API, you can get location information such as country list, state list, city list, discrict list, town list.

## Overview
Location API.

## Models

### Country

```graphql
type Country {
  id: ID!
  capital: String
  currency: String
  currencyCode: String
  currencySymbol: String
  emoji: String
  emojiString: String
  iso2: String
  iso3: String
  locationTranslations: LocationTranslations!
  name: String!
  native: String
  phoneCode: String
  region: String
  subregion: String
}
```
Copy

#### Fields
`id`ID!required

`capital`String

Indicates the capital of the county.

`currency`String

Indicates the currency of the county.

`currencyCode`String

`currencySymbol`String

`emoji`String

Indicates the flag emoji of the county.

`emojiString`String

Indicates the flag emoji code of the county.

`iso2`String

The two-letter country code corresponding to the country.

`iso3`String

The three-letter country code corresponding to the country.

`locationTranslations`LocationTranslations!required

Shows spellings of country name in different languages.

`name`String!required

Country's name.

`native`String

Indicates the name of the country in the local language.

`phoneCode`String

The phone code corresponding to the country.

`region`String

Indicates the region of the county.

`subregion`String

Indicates the subregion of the county.

### State

```graphql
type State {
  id: ID!
  countryId: String!
  locationTranslations: LocationTranslations
  name: String!
  native: String
  stateCode: String
}
```
Copy

#### Fields
`id`ID!required

`countryId`String!required

ID indicating which country the state belongs to.

`locationTranslations`LocationTranslations

Shows spellings of state name in different languages.

`name`String!required

State's name.

`native`String

Indicates the name of the state in the local language.

`stateCode`String

The two-letter state code corresponding to the state.

### City

```graphql
type City {
  id: ID!
  cityCode: String
  countryId: String!
  latitude: String
  longitude: String
  name: String!
  order: Float
  stateId: String!
}
```
Copy

#### Fields
`id`ID!required

`cityCode`String

The two-letter city code corresponding to the city.

`countryId`String!required

ID indicating which country the city belongs to.

`latitude`String

Indicates the latitude of the city.

`longitude`String

Indicates the longitude of the city.

`name`String!required

City's name.

`order`Float

Specifies the order of cities.

`stateId`String!required

ID indicating which state the city belongs to.

### District

```graphql
type District {
  id: ID!
  cityId: String!
  countryId: String!
  latitude: String
  longitude: String
  name: String!
  order: Float
  stateId: String!
}
```
Copy

#### Fields
`id`ID!required

`cityId`String!required

ID indicating which city the district belongs to.

`countryId`String!required

ID indicating which country the district belongs to.

`latitude`String

Indicates the latitude of the city.

`longitude`String

Indicates the longitude of the city.

`name`String!required

District's name.

`order`Float

Specifies the order of districts.

`stateId`String!required

ID indicating which state the district belongs to.

### Town

```graphql
type Town {
  id: ID!
  districtId: String!
  name: String!
  order: Float
}
```
Copy

#### Fields
`id`ID!required

`districtId`String!required

ID indicating which district the town belongs to.

`name`String!required

Town's name.

`order`Float

Specifies the order of towns.

## Queries

### List Countries

```graphql
listCountry(
  id: StringFilterInput
  iso2: StringFilterInput
  iso3: StringFilterInput
  search: String
  updatedAt: DateFilterInput
): [Country!]!
```
Copy

#### Arguments
`id`StringFilterInput

`iso2`StringFilterInput

You can get the filter response by entering the desired condition for the iso2.

`iso3`StringFilterInput

You can get the filter response by entering the desired condition for the iso3.

`search`String

`updatedAt`DateFilterInput

#### Return Type
`Country`Country

### List States

```graphql
listState(
  countryId: StringFilterInput!
  id: StringFilterInput
  search: String
  updatedAt: DateFilterInput
): [State!]!
```
Copy

#### Arguments
`countryId`StringFilterInput!required

You can get the filter response by entering the desired condition for the countryId.

`id`StringFilterInput

`search`String

`updatedAt`DateFilterInput

#### Return Type
`State`State

### List Cities

```graphql
listCity(
  countryId: StringFilterInput
  id: StringFilterInput
  search: String
  stateId: StringFilterInput!
  updatedAt: DateFilterInput
): [City!]!
```
Copy

#### Arguments
`countryId`StringFilterInput

You can get the filter response by entering the desired condition for the countryId.

`id`StringFilterInput

`search`String

`stateId`StringFilterInput!required

You can get the filter response by entering the desired condition for the stateId.

`updatedAt`DateFilterInput

#### Return Type
`City`City

### List Districts

```graphql
listDistrict(
  cityId: StringFilterInput!
  countryId: StringFilterInput
  id: StringFilterInput
  search: String
  stateId: StringFilterInput
  updatedAt: DateFilterInput
): [District!]!
```
Copy

#### Arguments
`cityId`StringFilterInput!required

You can get the filter response by entering the desired condition for the cityId.

`countryId`StringFilterInput

You can get the filter response by entering the desired condition for the countryId.

`id`StringFilterInput

`search`String

`stateId`StringFilterInput

You can get the filter response by entering the desired condition for the stateId.

`updatedAt`DateFilterInput

#### Return Type
`District`District

### List Towns

```graphql
listTown(
  districtId: StringFilterInput!
  id: StringFilterInput
  search: String
  updatedAt: DateFilterInput
): [Town!]!
```
Copy

#### Arguments
`districtId`StringFilterInput!required

You can get the filter response by entering the desired condition for the districtId.

`id`StringFilterInput

`search`String

`updatedAt`DateFilterInput

#### Return Type
`Town`Town

## Examples

### Retrieve a list of countries

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ listCountry { id name locationTranslations { tr en } iso2 iso3 phoneCode capital currency native region subregion emoji emojiString } } "}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
            listCountry {
                    id
                    name
                    locationTranslations {
                        tr
                        en
                    }
                    iso2
                    iso3
                    phoneCode
                    capital
                    currency
                    native
                    region
                    subregion
                    emoji
                    emojiString
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
    "listCountry": [
      {
        "id": "92b5ad7a-a93e-45d3-aae5-c8e58bd65130",
        "name": "France",
        "locationTranslations": {
          "tr": "Fransa",
          "en": "France"
        },
        "iso2": "FR",
        "iso3": "FRA",
        "phoneCode": "33",
        "capital": "Paris",
        "currency": "EUR",
        "native": "France",
        "region": "Europe",
        "subregion": "Western Europe",
        "emoji": "🇫🇷",
        "emojiString": "U+1F1EB U+1F1F7"
      }
    ]
  }
}
```
Copy

### List States

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ listState(countryId: { eq: \"country_id\" }) { id name stateCode countryId } } "}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
            listState(countryId: { eq: "country_id" })
                {
                    id
                    name
                    stateCode
                    countryId
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
    "listState": [
      {
        "id": "1efede5d-7ca8-4499-be12-092defb21a0c",
        "countryId": "92b5ad7a-a93e-45d3-aae5-c8e58bd65130",
        "name": "Franche-Comté",
        "stateCode": "I"
      }
    ]
  }
}
```
Copy

### List Cities

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ listCity( stateId: { eq: \"state_id\" }) { id countryId stateId name latitude longitude } } "}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
            listCity(
                stateId: { eq: "state_id" })
                {
                    id
                    countryId
                    stateId
                    name
                    latitude
                    longitude
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
    "listCity": [
      {
        "id": "b23c0e54-aef2-4357-b690-75c90fd44792",
        "countryId": "92b5ad7a-a93e-45d3-aae5-c8e58bd65130",
        "stateId": "eda394b7-9aa8-49c9-9c26-dba5a0838fa5",
        "name": "Paris",
        "latitude": "48.85340000",
        "longitude": "2.34860000"
      }
    ]
  }
}
```
Copy

### List Districts

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ listDistrict( cityId: { eq: \"city_id\" }) { id countryId stateId cityId name order } } "}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
            listDistrict(
                cityId: { eq: "city_id" })
                {
                    id
                    countryId
                    stateId
                    cityId
                    name
                    order
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
    "listDistrict": [
      {
        "id": "0774fbd3-b818-463a-b697-2e28a8a6daed",
        "countryId": "da8c5f2a-8d37-48a8-beff-6ab3793a1861",
        "stateId": "dcb9135c-4b84-4c06-9a42-f359317a9b78",
        "cityId": "6f9272a3-9924-4223-baf8-9b21c9360f0c",
        "name": "ÇANKAYA",
        "order": 46
      }
    ]
  }
}
```
Copy

### List Towns

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ listTown( districtId: { eq: \"district_id\" }) { id districtId name order } } "}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
            listTown(
                districtId: { eq: "district_id" })
                {
                    id
                    districtId
                    name
                    order
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
    "listTown": [
      {
        "id": "14692d78-c5da-4830-975e-44dd54d9df6f",
        "districtId": "0774fbd3-b818-463a-b697-2e28a8a6daed",
        "name": "ÇAYYOLU",
        "order": 1286
      }
    ]
  }
}
```
Copy
