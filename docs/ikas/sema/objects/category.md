<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/category -->

# Category

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
