<!-- kaynak: https://ikas.dev/docs/api/custom-definition/inputs/upload-product-image-input -->

# UploadProductImageInput

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
