<!-- kaynak: https://ikas.dev/docs/api/admin-api/product-attributes -->

# Product Attribute

By using this api, you can manage attributes of your products.

## Models

### ProductAttribute

```graphql
type ProductAttribute {
  id: ID!
  description: String
  name: String!
  options: [ProductAttributeOption!]
  tableTemplate: ProductAttributeTableTemplate
  translations: [ProductAttributeTranslation!]
  type: ProductAttributeTypeEnum!
}
```
Copy

#### Fields
`id`ID!required

`description`String

Description of the attribute

`name`String!required

Name of the attribute

`options`[ProductAttributeOption!]

Options of the attribute

`tableTemplate`ProductAttributeTableTemplate

Table template description for product attribute

`translations`[ProductAttributeTranslation!]

Translations for the attribute

`type`ProductAttributeTypeEnum!required

Type of the attribute

### ProductAttributeOption

```graphql
type ProductAttributeOption {
  id: ID!
  name: String!
}
```
Copy

#### Fields
`id`ID!required

`name`String!required

Name of the product attribute option

### ProductAttributeValue

```graphql
type ProductAttributeValue {
  imageIds: [String!]
  productAttributeId: String
  productAttributeOptionId: String
  value: String
}
```
Copy

#### Fields
`imageIds`[String!]

Image ids of the product attribute

`productAttributeId`String

Identifier of the product attribute

`productAttributeOptionId`String

Option identifier for the product attribute

`value`String

Value of the product attribute

### ProductAttributeTranslation

```graphql
type ProductAttributeTranslation {
  description: String
  locale: String!
  name: String
  options: [ProductAttributeOptionTranslation!]
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

`options`[ProductAttributeOptionTranslation!]

List of translations for attribute options

## Queries

### List Product Attributes
Use this query to list product attributes.

```graphql
listProductAttribute(
  id: StringFilterInput
  name: StringFilterInput
  updatedAt: DateFilterInput
): [ProductAttribute!]!
```
Copy

#### Arguments
`id`StringFilterInput

`name`StringFilterInput

`updatedAt`DateFilterInput

#### Return Type
`ProductAttribute`ProductAttribute

## Mutations

### Save Product Attribute
Use this mutation to create or update product attributes with provided input values.

```graphql
saveProductAttribute(
  input: ProductAttributeInput!
): ProductAttribute!
```
Copy

#### Arguments
`input`ProductAttributeInput!required

#### Return Type
`ProductAttribute`ProductAttribute

### Delete Product Attribute List
Use this mutation to delete product attributes with specific ids.

```graphql
deleteProductAttributeList(
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

### Retrieves a list of product attributes

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ listProductAttribute { id name createdAt } }"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
     listProductAttribute {
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
    "listProductAttribute": [
      {
        "id": "a8befae6-2cb9-487a-bd7f-5e0bfff3676b",
        "name": "Product attribute name",
        "createdAt": 1634019877744
      }
    ]
  }
}
```
Copy
