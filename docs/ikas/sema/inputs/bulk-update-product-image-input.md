<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/bulk-update-product-image-input -->

# BulkUpdateProductImageInput

```graphql
type BulkUpdateProductImageInput {
  imageUrl: String!
  isMain: Boolean!
  isVideo: Boolean
  order: Float!
}
```
Copy

#### Fields
`imageUrl`String!required

URL of the image

`isMain`Boolean!required

Whether the image is main image for the product or not.

`isVideo`Boolean

True if this the media type is video

`order`Float!required

Order of the product image.
