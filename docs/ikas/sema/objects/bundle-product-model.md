<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/bundle-product-model -->

# BundleProductModel

```graphql
type BundleProductModel {
  id: String!
  addToBundleBasePrice: Boolean
  discountRatio: Float
  filteredVariantIds: [String!]!
  maxQuantity: Float
  minQuantity: Float
  order: Float!
  productId: String!
  quantity: Float!
}
```
Copy

#### Fields
`id`String!required

`addToBundleBasePrice`Boolean

The setting that specifies whether the prices of the products to be added to the bundle product will be added to the base price of the bundle. If this setting is selected, the sales prices of the products in the bundle product are included on the bundle price.

`discountRatio`Float

The discount rate that will be applied specifically to the product to be added to the bundle product. If the addToBundleBasePrice setting is selected, the discount is applied.

`filteredVariantIds`[String!]!required

Selectable variant ids of the product that can be included in the bundle product.

`maxQuantity`Float

Maximum quantity of product that can be included in the bundle product.

`minQuantity`Float

Minimum quantity of product that can be included in the bundle product.

`order`Float!required

Order of the product that can be included in the bundle product.

`productId`String!required

Id of the product that can be included in the bundle product.

`quantity`Float!required

Quantity of the product that can be included in the bundle product.
