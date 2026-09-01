<!-- kaynak: https://ikas.dev/docs/api/custom-definition/inputs/upload-category-image-input -->

# UploadCategoryImageInput

```undefined
type categoryImage {
  categoryIds: string[],
  url?: string,
  base64?: string
}
```
Copy

#### Fields
`categoryIds`[string!]!required

Id list of the category to upload the image. If more than one category id is entered, the uploaded image will be added to all categories.

`url`string

Url of the uploading image.If this value is entered, it is not necessary to enter base64.

`base64`string

Base64 string of the uploading image.If this value is entered, it is not necessary to enter url.
