<!-- kaynak: https://ikas.dev/docs/api/admin-api/category -->

# Category

By using this api, you can manage categories of your products.

## Models

### Category

```graphql
type Category {
  id: ID!
  categoryPath: [String!]
  categoryPathItems: [CategoryPathItem!]
  conditions: [CategoryCondition!]
  description: String
  imageId: String
  isAutomated: Boolean
  metaData: HTMLMetaData
  name: String!
  orderType: CategoryProductsOrderTypeEnum
  parentId: String
  salesChannelIds: [String!]
  salesChannels: [CategorySalesChannel!]
  shouldMatchAllConditions: Boolean
  translations: [CategoryTranslation!]
}
```
Copy

#### Fields
`id`ID!required

`categoryPath`[String!]

It is the id list information where the ids of all the superclasses of the category are found.

`categoryPathItems`[CategoryPathItem!]

It is the id list information where the ids of all the superclasses of the category are found.

`conditions`[CategoryCondition!]

`description`String

It is the description of the category of the product.

`imageId`String

It is the id where the picture of the category is kept in the system.

`isAutomated`Boolean

`metaData`HTMLMetaData

It is the metadata information of the product category.

`name`String!required

It is the name of the category in which the product is located.

`orderType`CategoryProductsOrderTypeEnum

`parentId`String

It is the id of the superclass category of the category.

`salesChannelIds`[String!]

It is the information of which sales channel the product category is in.

`salesChannels`[CategorySalesChannel!]

List of hidden sales channels of the category.

`shouldMatchAllConditions`Boolean

`translations`[CategoryTranslation!]

It is the translation information of the product category.

### CategoryCondition

```graphql
type CategoryCondition {
  conditionType: CategoryConditionTypeEnum!
  method: CategoryConditionMethodEnum
  valueList: [String!]!
}
```
Copy

#### Fields
`conditionType`CategoryConditionTypeEnum!required

`method`CategoryConditionMethodEnum

`valueList`[String!]!required

### CategoryTranslation

```graphql
type CategoryTranslation {
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

### List Categories
Using this api, you can view the categories of products.
Search applies to following fields: `name`

```graphql
listCategory(
  categoryPath: CategoryPathFilterInput
  id: StringFilterInput
  name: StringFilterInput
  search: String
  updatedAt: DateFilterInput
): [Category!]!
```
Copy

#### Arguments
`categoryPath`CategoryPathFilterInput

You can filter according to the category path of the product.

`id`StringFilterInput

`name`StringFilterInput

You can filter according to the name of the category.

`search`String

Some listing APIs have searchable fields. You can search in these fields as you wish. For example, in an API; Let the `searchableFields :['name', 'description']`. If we send `search: AAA` as input in args, it will return records with 'AAA' in both the name and description fields.

`updatedAt`DateFilterInput

#### Return Type
`Category`Category

## Mutations

### Save Category
Using this api, you can update the categories of products.

```graphql
saveCategory(
  input: CategoryInput!
): Category!
```
Copy

#### Arguments
`input`CategoryInput!required

#### Return Type
`Category`Category

### Delete Category List
Using this api, you can delete the categories of products.

```graphql
deleteCategoryList(
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

### Retrieves a list of categories

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ listCategory { id name } }"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
     listCategory {
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
    "listProductAttribute": {
      "data": [
        {
          "id": "a8befae6-2cb9-487a-bd7f-5e0bfff3676b",
          "name": "Category name",
          "createdAt": 1634019877744
        }
      ]
    }
  }
}
```
Copy
