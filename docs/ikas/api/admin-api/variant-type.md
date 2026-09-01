<!-- kaynak: https://ikas.dev/docs/api/admin-api/variant-type -->

# VariantType

By using this api, you can manage variant types of your products.

## Models

### VariantType

```graphql
type VariantType {
  id: ID!
  name: String!
  selectionType: VariantSelectionTypeEnum!
  translations: [VariantTypeTranslation!]
  values: [VariantValue!]!
}
```
Copy

#### Fields
`id`ID!required

`name`String!required

Product variant type name information. For example: Size, Color, Number etc..It can be a maximum of 100 characters.

`selectionType`VariantSelectionTypeEnum!required

Product variant type selection type. It can be choice or color.

`translations`[VariantTypeTranslation!]

It is the translation information of the product variant types.

`values`[VariantValue!]!required

Variant values used in Variant type. For example, variant type: Size. Variant values can be thought of as S, M, L, XL. It is unique according to the value name.Values array size must have at least one element.

### VariantTypeTranslation

```graphql
type VariantTypeTranslation {
  locale: String!
  name: String
  values: [VariantValueTranslation!]
}
```
Copy

#### Fields
`locale`String!required

It is the name information of the translation.

`name`String

It is the information in which language the translation is saved.

`values`[VariantValueTranslation!]

It is the translation information of the values of variant types.

## Queries

### List Variant Types
Using this api, you can view the variant types of products.

```graphql
listVariantType(
  id: StringFilterInput
  name: StringFilterInput
  updatedAt: DateFilterInput
): [VariantType!]!
```
Copy

#### Arguments
`id`StringFilterInput

`name`StringFilterInput

You can filter by product variant type name.

`updatedAt`DateFilterInput

#### Return Type
`VariantType`VariantType

## Mutations

### Save Variant Type
Using this api, you can update the variant types of products.

```graphql
saveVariantType(
  input: VariantTypeInput!
): VariantType!
```
Copy

#### Arguments
`input`VariantTypeInput!required

#### Return Type
`VariantType`VariantType

### Delete Variant Type List
Using this api, you can delete the variant types of products.

```graphql
deleteVariantTypeList(
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

### Retrieves a list of variant types

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ listVariantType { id name } }"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
     listVariantType {
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
    "listVariantType": [
      {
        "id": "a8befae6-2cb9-487a-bd7f-5e0bfff3676b",
        "name": "Variant type name"
      }
    ]
  }
}
```
Copy
