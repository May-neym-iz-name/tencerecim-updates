<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/product-brand -->

# ProductBrand

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
