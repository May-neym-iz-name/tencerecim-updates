<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/get-video-upload-urlresponse -->

# GetVideoUploadURLResponse

```graphql
type GetVideoUploadURLResponse {
  fields: JSON!
  url: String!
}
```
Copy

#### Fields
`fields`JSON!required

Fields object that should be sent with the video file as multipart form-data.

`url`String!required

Upload url for the specified video.
