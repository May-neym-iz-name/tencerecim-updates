<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-line-bundle-variant -->

# OrderLineBundleVariant

```graphql
type OrderLineBundleVariant {
  id: String
  barcodeList: [String!]
  baseUnit: OrderLineBaseUnit
  brand: OrderLineVariantBrand
  categories: [OrderLineVariantCategory!]
  fileId: String
  hsCode: String
  mainImageId: String
  name: String!
  prices: [OrderLineVariantPrice!]
  productId: String
  productVolumeDiscountId: String
  sku: String
  slug: String
  tagIds: [String!]
  tags: [OrderLineVariantTag!]
  taxValue: Float
  type: Float
  unit: OrderLineVariantUnit
  variantValues: [OrderLineVariantVariantValues!]
  weight: Float
}
```
Copy

#### Fields
`id`String

It is the id of the variant.

`barcodeList`[String!]

It is the barcode list of the variant.

`baseUnit`OrderLineBaseUnit

Information about the brand of variant.

`brand`OrderLineVariantBrand

Information about the brand of variant.

`categories`[OrderLineVariantCategory!]

A list of category objects, each containing information about a category in the variant.

`fileId`String

It is the id of the product file.

`hsCode`String

It is the hasCode of the variant.

`mainImageId`String

It is the main image id of the variant.

`name`String!required

It is the name of the variant.

`prices`[OrderLineVariantPrice!]

It is the price list of the variant. Different price lists may have different pricing.

`productId`String

It is the product id of the variant.

`productVolumeDiscountId`String

It is the product volume discount id of the product.

`sku`String

It is the sku of the variant.

`slug`String

It is the slug of the variant. The slug value is unique each variant and product.

`tagIds`[String!]

It is the the tag id list

`tags`[OrderLineVariantTag!]

A list of tag objects, each containing information about a tag in the variant.

`taxValue`Float

It is the tax value of the variant.

`type`Float

`unit`OrderLineVariantUnit

Information about the brand of variant.

`variantValues`[OrderLineVariantVariantValues!]

It is the variant values of the variant.

`weight`Float
