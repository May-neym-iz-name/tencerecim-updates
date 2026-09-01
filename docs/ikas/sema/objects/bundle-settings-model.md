<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/bundle-settings-model -->

# BundleSettingsModel

```graphql
type BundleSettingsModel {
  maxBundleQuantity: Float
  minBundleQuantity: Float
  products: [BundleProductModel!]!
}
```
Copy

#### Fields
`maxBundleQuantity`Float

Maximum quantity of products that can be in the bundle product.

`minBundleQuantity`Float

Minimum quantity of products that can be in the bundle product.

`products`[BundleProductModel!]!required

List of products that can be included in the bundle product.
