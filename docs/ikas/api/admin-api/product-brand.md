<!-- kaynak: https://ikas.dev/docs/api/admin-api/product-brand -->

# ProductBrand

By using this api, you can manage brands of your products.

## Models

### ProductBrand

```graphql
type ProductBrand {
  id: ID!
  description: String
  imageId: String
  metaData: HTMLMetaData
  name: String!
  orderType: CategoryProductsOrderTypeEnum
  salesChannelIds: [String!]
  translations: [ProductBrandTranslation!]
}
```
Copy

#### Fields
`id`ID!required

`description`String

The description of the product's brand.

`imageId`String

The image information of the product's brand.

`metaData`HTMLMetaData

It is the metadata information of the product brand.

`name`String!required

The name of the product's brand.

`orderType`CategoryProductsOrderTypeEnum

`salesChannelIds`[String!]

It is the information of which sales channel the product brand is in.

`translations`[ProductBrandTranslation!]

It is the translation information of the product brand.

### ProductBrandTranslation

```graphql
type ProductBrandTranslation {
  description: String
  locale: String!
  name: String
}
```
Copy

#### Fields
`description`String

It is the description information of the translation.

`locale`String!required

It is the name information of the translation.

`name`String

It is the information in which language the translation is saved.

## Queries

### List Product Brands
Using this api, you can view the brands of products.
Search applies to following fields: `name`

```graphql
listProductBrand(
  id: StringFilterInput
  name: StringFilterInput
  search: String
  updatedAt: DateFilterInput
): [ProductBrand!]!
```
Copy

#### Arguments
`id`StringFilterInput

`name`StringFilterInput

You can filter by product brand name.

`search`String

Some listing APIs have searchable fields. You can search in these fields as you wish. For example, in an API; Let the `searchableFields :['name', 'description']`. If we send `search: AAA` as input in args, it will return records with 'AAA' in both the name and description fields.

`updatedAt`DateFilterInput

#### Return Type
`ProductBrand`ProductBrand

## Mutations

### Save Product Brand
Using this api, you can update the brands of products.

```graphql
saveProductBrand(
  input: ProductBrandInput!
): ProductBrand!
```
Copy

#### Arguments
`input`ProductBrandInput!required

#### Return Type
`ProductBrand`ProductBrand

### Delete Product Brand List
Using this api, you can delete the brands of products.

```graphql
deleteProductBrandList(
  idList: [String!]!
): Boolean!
```
Copy

#### Arguments
`idList`[String!]!required

#### Return Type
`Boolean`Boolean

The `Boolean` scalar type represents `true` or `false`.

## Examples

### Retrieves a list of brands

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ listProductBrand { id name createdAt } }"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
     listProductBrand {
        id
        name
        createdAt
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
    "listProductBrand": [
      {
        "id": "a8befae6-2cb9-487a-bd7f-5e0bfff3676b",
        "name": "Brand name",
        "createdAt": 1634019877744
      }
    ]
  }
}
```
Copy
