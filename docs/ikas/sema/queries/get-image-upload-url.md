<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/queries/get-image-upload-url -->

# getImageUploadUrl

Upload url for the specified image.

```graphql
getImageUploadUrl(
  imageDir: String
  imageId: String!
): String!
```
Copy

#### Arguments
`imageDir`String

Directory path of the specified image.

`imageId`String!required

Unique identifier of the image.

#### Return Type
`String`String

The `String` scalar type represents textual data, represented as UTF-8 character sequences. The String type is most often used by GraphQL to represent free-form human-readable text.
