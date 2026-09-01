<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/product-brand-input -->

# ProductBrandInput

```graphql
type ProductBrandInput {
  id: ID
  description: String
  imageId: String
  metaData: HTMLMetaDataInput
  name: String!
  orderType: CategoryProductsOrderTypeEnum
  salesChannelIds: [String!]
  translations: [ProductBrandTranslationInput!]
}
```
Copy

#### Fields
`id`ID

`description`String

The description of the product's brand.

`imageId`String

The image information of the product's brand.

`metaData`HTMLMetaDataInput

It is the metadata information of the product brand.

`name`String!required

The name of the product's brand.

`orderType`CategoryProductsOrderTypeEnum

`salesChannelIds`[String!]

It is the information of which sales channel the product brand is in.

`translations`[ProductBrandTranslationInput!]

It is the translation information of the product brand.
