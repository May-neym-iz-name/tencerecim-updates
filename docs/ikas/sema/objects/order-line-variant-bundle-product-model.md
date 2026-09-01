<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-line-variant-bundle-product-model -->

# OrderLineVariantBundleProductModel

```graphql
type OrderLineVariantBundleProductModel {
  id: String!
  addToBundleBasePrice: Boolean
  discountPrice: Float
  discountRatio: Float
  finalPrice: Float
  order: Float!
  price: Float!
  quantity: Float!
  taxValue: Float
  variant: OrderLineBundleVariant!
}
```
Copy

#### Fields
`id`String!required

`addToBundleBasePrice`Boolean

It indicates whether the variant price within the package product will be reflected in the order line or not.

`discountPrice`Float

It is the final price of the variant.

`discountRatio`Float

It is the discount ratio of the variant.

`finalPrice`Float

It is the final price of the variant.

`order`Float!required

Indicates the order of the product in the bundle.

`price`Float!required

It is the price of the variant.

`quantity`Float!required

It is the quantity of the variant.

`taxValue`Float

It is the tax value of the variant.

`variant`OrderLineBundleVariant!required

Information about the variant of the order line item.
