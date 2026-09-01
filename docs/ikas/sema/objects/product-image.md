<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/product-image -->

# ProductImage

```graphql
type ProductImage {
  fileName: String
  imageId: String
  isMain: Boolean!
  isVideo: Boolean
  order: Float!
}
```
Copy

#### Fields
`fileName`String

`imageId`String

Id of the product image.

`isMain`Boolean!required

Whether the image is main image for the product or not.

`isVideo`Boolean

True if this the media type is video

`order`Float!required

Order of the product image.
