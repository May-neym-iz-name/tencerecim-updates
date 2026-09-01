<!-- kaynak: https://ikas.dev/docs/api/custom-definition/inputs/upload-brand-image-input -->

# UploadBrandImageInput

```undefined
type brandImage {
  brandIds: string[],
  url?: string,
  base64?: string
}
```
Copy

#### Fields
`brandIds`[string!]!required

Id list of the brand to upload the image. If more than one brand id is entered, the uploaded image will be added to all brands.

`url`string

Url of the uploading image.If this value is entered, it is not necessary to enter base64.

`base64`string

Base64 string of the uploading image.If this value is entered, it is not necessary to enter url.
