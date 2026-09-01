<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/bundle-product-order-line -->

# BundleProductOrderLine

```graphql
type BundleProductOrderLine {
  bundleLineId: String!
  bundleLineQuantity: Float!
  name: String
  variant: OrderLineVariant!
}
```
Copy

#### Fields
`bundleLineId`String!required

If the order line is derived from a package product, it shows the bundle line id of the package product

`bundleLineQuantity`Float!required

If the order line is derived from a package product, it shows the bundle line id of the package product

`name`String

If the order line is derived from a package product, it shows the bundle product name of the package product

`variant`OrderLineVariant!required

Information about the variant of the order line item.
