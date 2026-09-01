<!-- kaynak: https://ikas.dev/docs/api/admin-api/product-tag -->

# ProductTag

By using this api, you can manage tags of your products.

## Models

### ProductTag

```graphql
type ProductTag {
  id: ID!
  name: String!
  translations: [ProductTagTranslation!]
}
```
Copy

#### Fields
`id`ID!required

`name`String!required

The name of the product's tag.

`translations`[ProductTagTranslation!]

The name of the product's tag.

### ProductTagTranslation

```graphql
type ProductTagTranslation {
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

### List Product Tags
Using this api, you can view the tags of products.

```graphql
listProductTag(
  id: StringFilterInput
  name: StringFilterInput
  updatedAt: DateFilterInput
): [ProductTag!]!
```
Copy

#### Arguments
`id`StringFilterInput

`name`StringFilterInput

You can filter by product tag name.

`updatedAt`DateFilterInput

#### Return Type
`ProductTag`ProductTag

## Mutations

### Save Product Tag
Using this api, you can update the tags of products.

```graphql
saveProductTag(
  input: ProductTagInput!
): ProductTag!
```
Copy

#### Arguments
`input`ProductTagInput!required

#### Return Type
`ProductTag`ProductTag

### Delete Product Tag List
Using this api, you can delete the tags of products.

```graphql
deleteProductTagList(
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

### Retrieves a list of tags

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ listProductTag { id name } }"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
     listProductTag {
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
    "listProductTag": [
      {
        "id": "a8befae6-2cb9-487a-bd7f-5e0bfff3676b",
        "name": "Tag name"
      }
    ]
  }
}
```
Copy
