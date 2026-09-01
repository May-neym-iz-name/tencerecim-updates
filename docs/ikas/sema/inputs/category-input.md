<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/category-input -->

# CategoryInput

```graphql
type CategoryInput {
  id: ID
  conditions: [CategoryConditionInput!]
  description: String
  imageId: String
  isAutomated: Boolean
  metaData: HTMLMetaDataInput
  name: String!
  orderType: CategoryProductsOrderTypeEnum
  parentId: String
  salesChannels: [CategorySalesChannelInput!]
  shouldMatchAllConditions: Boolean
  translations: [CategoryTranslationInput!]
}
```
Copy

#### Fields
`id`ID

`conditions`[CategoryConditionInput!]

`description`String

It is the description of the category of the product.

`imageId`String

It is the id where the picture of the category is kept in the system.

`isAutomated`Boolean

`metaData`HTMLMetaDataInput

It is the metadata information of the product category.

`name`String!required

It is the name of the category in which the product is located.

`orderType`CategoryProductsOrderTypeEnum

`parentId`String

It is the id of the superclass category of the category.

`salesChannels`[CategorySalesChannelInput!]

List of hidden sales channels of the category.

`shouldMatchAllConditions`Boolean

`translations`[CategoryTranslationInput!]

It is the translation information of the product category.
