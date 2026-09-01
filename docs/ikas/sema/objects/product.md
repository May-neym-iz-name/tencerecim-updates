<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/product -->

# Product

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
