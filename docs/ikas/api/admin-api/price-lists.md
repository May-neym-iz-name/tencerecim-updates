<!-- kaynak: https://ikas.dev/docs/api/admin-api/price-lists -->

# Price List

By using this api, you can view your price lists.

## Models

### Price List

```graphql
type PriceList {
  id: ID!
  addProductsAutomatically: Boolean
  currency: String!
  currencyCode: String
  currencySymbol: String
  name: String!
  ruleList: [PriceListRuleList!]
  type: PriceListTypeEnum
}
```
Copy

#### Fields
`id`ID!required

`addProductsAutomatically`Boolean

`currency`String!required

The currency of the product's price list.

`currencyCode`String

`currencySymbol`String

`name`String!required

It is the name of the price list of the product.

`ruleList`[PriceListRuleList!]

`type`PriceListTypeEnum

Type of price price list

## Queries

### List Price Lists

```graphql
listPriceList(
  id: StringFilterInput
): [PriceList!]!
```
Copy

#### Arguments
`id`StringFilterInput

#### Return Type
`PriceList`PriceList

## Examples

### Retrieves a list of price lists

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ listPriceList { id name } }"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
     listPriceList {
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
    "listPriceList": [
      {
        "id": "a8befae6-2cb9-487a-bd7f-5e0bfff3676b",
        "name": "Price list name"
      }
    ]
  }
}
```
Copy
