<!-- kaynak: https://ikas.dev/docs/api/admin-api/products -->

# Product

By using this api, you can manage your products.

## Models

### Product

```graphql
type Product {
  id: ID!
  attributes: [ProductAttributeValue!]
  baseUnit: ProductBaseUnitModel
  brand: SimpleProductBrand
  brandId: String
  categories: [SimpleCategory!]
  categoryIds: [String!]
  description: String
  dynamicPriceListIds: [String!]
  googleTaxonomyId: String
  groupVariantsByVariantTypeId: String
  hiddenSalesChannelIds: [String!]
  maxQuantityPerCart: Float
  metaData: HTMLMetaData
  name: String!
  productOptionSetId: String
  productVariantTypes: [ProductVariantType!]
  productVolumeDiscountId: String
  salesChannelIds: [String!]
  shortDescription: String
  tagIds: [String!]
  tags: [SimpleProductTag!]
  totalStock: Float
  translations: [ProductTranslation!]
  type: ProductTypeEnum!
  variants: [Variant!]!
  vendorId: String
  weight: Float
}
```
Copy

#### Fields
`id`ID!required

`attributes`[ProductAttributeValue!]

List of product attributes.

`baseUnit`ProductBaseUnitModel

Base unit of the product.

`brand`SimpleProductBrand

Brand of the product.

`brandId`String

Brand id of the product.

`categories`[SimpleCategory!]

List of categories of the product.

`categoryIds`[String!]

List category identifiers of the product.

`description`String

Description of the product.

`dynamicPriceListIds`[String!]

`googleTaxonomyId`String

`groupVariantsByVariantTypeId`String

This is the variant type id that can be used to group variants by a specific variant type id.

`hiddenSalesChannelIds`[String!]

List of hidden sales channel ids of the product.

`maxQuantityPerCart`Float

Max purchasable quantity of the product for per cart.

`metaData`HTMLMetaData

HTML Metadata identifier of the product.

`name`String!required

Unique identifier of the product.

`productOptionSetId`String

Option set id of the product.

`productVariantTypes`[ProductVariantType!]

Variant types of the product.

`productVolumeDiscountId`String

Volume discount id of the product.

`salesChannelIds`[String!]

List of sales channel ids of the product.

`shortDescription`String

Short description of the product.

`tagIds`[String!]

List of product tag identifiers.

`tags`[SimpleProductTag!]

List of product tags.

`totalStock`Float

`translations`[ProductTranslation!]

Translations for the product.

`type`ProductTypeEnum!required

Type of the product.

`variants`[Variant!]!required

List of product variants.

`vendorId`String

Vendor id of the product.

`weight`Float

Weight of the product.

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

### ProductCategory

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

### ProductVariantType

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

### ProductTranslation

```graphql
type ProductTranslation {
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

## Queries

### List Products
Use this query to list products.
Sort applies to following fields: `createdAt` `updatedAt` `name`

```graphql
listProduct(
  attributeId: ProductAttributeFilterInput
  barcodeList: StringFilterInput
  brandId: StringFilterInput
  categoryIds: CategoryFilterInput
  id: StringFilterInput
  includeDeleted: Boolean
  name: StringFilterInput
  pagination: PaginationInput
  salesChannelIds: StringFilterInput
  sku: StringFilterInput
  sort: String
  tagIds: StringFilterInput
  variantStockLocationId: StringFilterInput
  variantTypeId: StringFilterInput
  vendorId: StringFilterInput
): ProductPaginationResponse!
```
Copy

#### Arguments
`attributeId`ProductAttributeFilterInput

`barcodeList`StringFilterInput

List of barcode for the product.

`brandId`StringFilterInput

`categoryIds`CategoryFilterInput

`id`StringFilterInput

`includeDeleted`Boolean

`name`StringFilterInput

`pagination`PaginationInput

With the pagination feature in the data returned as a response, you can filter the data and display the part you want.

`salesChannelIds`StringFilterInput

`sku`StringFilterInput

SKU of the product.

`sort`String

`tagIds`StringFilterInput

`variantStockLocationId`StringFilterInput

`variantTypeId`StringFilterInput

`vendorId`StringFilterInput

#### Return Type
`ProductPaginationResponse`ProductPaginationResponse

### Search Products
Result(s) containing searched products.

```graphql
searchProducts(
  input: SearchInput!
): ProductSearchResponse!
```
Copy

#### Arguments
`input`SearchInput!required

Input data for product search

#### Return Type
`ProductSearchResponse`ProductSearchResponse

## Mutations

### Save Product
Use this mutation to create or update a product with provided input values.

```graphql
saveProduct(
  input: ProductInput!
): Product!
```
Copy

#### Arguments
`input`ProductInput!required

#### Return Type
`Product`Product

### Delete Product List
Use this mutation to delete products with specific product ids.

```graphql
deleteProductList(
  idList: [String!]!
): Boolean!
```
Copy

#### Arguments
`idList`[String!]!required

#### Return Type
`Boolean`Boolean

The `Boolean` scalar type represents `true` or `false`.

### Update Product Sales Channel Status
Response indicating the status of operation.

```graphql
updateProductSalesChannelStatus(
  input: [UpdateProductSalesChannelStatusInput!]!
  salesChannelId: String
): Boolean!
```
Copy

#### Arguments
`input`[UpdateProductSalesChannelStatusInput!]!required

Input to update sales channels list of the product.

`salesChannelId`String

Id of the sales channel to update its sales channels.

#### Return Type
`Boolean`Boolean

The `Boolean` scalar type represents `true` or `false`.

### Bulk Update Products
Response indicating the status of operation.

```graphql
bulkUpdateProducts(
  input: [BulkUpdateProductsInput!]!
): String!
```
Copy

#### Arguments
`input`[BulkUpdateProductsInput!]!required

Input for bulk update products.

#### Return Type
`String`String

The `String` scalar type represents textual data, represented as UTF-8 character sequences. The String type is most often used by GraphQL to represent free-form human-readable text.

### Save Variant Prices
Response indicating the status of operation.

```graphql
saveVariantPrices(
  input: SaveVariantPricesInput!
): Boolean!
```
Copy

#### Arguments
`input`SaveVariantPricesInput!required

Input to update sales channels list of the product.

#### Return Type
`Boolean`Boolean

The `Boolean` scalar type represents `true` or `false`.

## Examples

### Retrieves a list of products

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ listProduct { data { id name createdAt } } }"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
     listProduct {
       data {
         id
         name
         createdAt
       }
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
    "listProduct": {
      "data": [
        {
          "id": "a8befae6-2cb9-487a-bd7f-5e0bfff3676b",
          "name": "Product name",
          "createdAt": 1634019877744
        }
      ]
    }
  }
}
```
Copy

### Updates Specified Variant Prices

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"mutation { saveVariantPrices(input: { priceListId: '35d9ecd5-c8a2-4a95-a388-4ee86791bb05', variantPriceInputs: [{ productId: 'a8befae6-2cb9-487a-bd7f-5e0bfff3676b', variantId: 'c1e7e564-4034-469d-ae55-a5aa14a297b3', price: { buyPrice: 15, sellPrice: 30 } }] }) { } }"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`mutation {
     saveVariantPrices(input: {
       priceListId: '35d9ecd5-c8a2-4a95-a388-4ee86791bb05',
       variantPriceInputs: [{
         productId: 'a8befae6-2cb9-487a-bd7f-5e0bfff3676b',
         variantId: 'c1e7e564-4034-469d-ae55-a5aa14a297b3',
         price: {
           buyPrice: 15,
           sellPrice: 30
         }
       }]
     }) {
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
    "saveVariantPrices": true
  }
}
```
Copy

## REST Endpoints

### Upload Image
`POST https://api.myikas.com/api/v1/admin/product/upload/image`
Using this REST endpoint, you can add images to variants, categories and brands. However, when using this api, only one of the productImage, categoryImage and brandImage inputs can be sent.

#### Body Parameters

#### Product Image Input

```undefined
type productImage {
  variantIds: string[],
  order: number,
  isMain?: boolean == false,
  url?: string,
  base64?: string
}
```
Copy

#### Fields
`variantIds`[string!]!required

Id list of the variant to upload the image. If more than one variant id is entered, the uploaded image will be added to all variants.

`order`number

Order of the uploading image.

`isMain`boolean

Whether the uploading image is the main image or not.

`url`string

Url of the uploading image.If this value is entered, it is not necessary to enter base64.

`base64`string

Base64 string of the uploading image.If this value is entered, it is not necessary to enter url.

#### Category Image Input

```undefined
type categoryImage {
  categoryIds: string[],
  url?: string,
  base64?: string
}
```
Copy

#### Fields
`categoryIds`[string!]!required

Id list of the category to upload the image. If more than one category id is entered, the uploaded image will be added to all categories.

`url`string

Url of the uploading image.If this value is entered, it is not necessary to enter base64.

`base64`string

Base64 string of the uploading image.If this value is entered, it is not necessary to enter url.

#### Brand Image Input

```undefined
type categoryImage {
  categoryIds: string[],
  url?: string,
  base64?: string
}
```
Copy

#### Fields
`categoryIds`[string!]!required

Id list of the category to upload the image. If more than one category id is entered, the uploaded image will be added to all categories.

`url`string

Url of the uploading image.If this value is entered, it is not necessary to enter base64.

`base64`string

Base64 string of the uploading image.If this value is entered, it is not necessary to enter url.

#### Response
Endpoint returns `OK` response with status code `200` when upload is successful.

#### Example

- BASH
- NODE.JS

```bash
curl --request POST \
        --url 'https://api.myikas.com/api/v1/admin/product/upload/image' \
        --header 'content-type: application/json' \
        --header 'Authorization: Bearer <your_access_token>' \
        --data-raw productId=<your_product_id> \
        --data-raw variantId=<your_variant_id> \
        --data-raw order=<order_of_image> \
        --data-raw isMain=<true | false>
```
Copy

```javascript
var axios = require("axios").default;
var options = {
  method: 'POST',
  url: 'https://api.myikas.com/api/v1/admin/product/upload/image',
  headers: {
    'content-type': 'application/json',
    'Authorization: Bearer <your_access_token>'
  },
  data: {
    productImage: {
        variantIds: '<your_variant_ids_array>',
        url?: <image_url>,
        base64?: <base64_string>,
        order: '<order_of_image>',
        isMain: '<true | false>'
    }
  }
};
axios.request(options)
  .then((response) => {
    console.log(response.data);
  }).catch((error) => {
    console.error(error);
  });
```
Copy
