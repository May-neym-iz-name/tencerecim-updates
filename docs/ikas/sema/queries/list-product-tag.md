<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/queries/list-product-tag -->

# listProductTag

Using this api, you can view the tags of products.

```graphql
listProductTag(
  id: StringFilterInput
  name: StringFilterInput
  updatedAt: DateFilterInput
): [ProductTag!]!
```
Copy

#### Arguments
`id`StringFilterInput

`name`StringFilterInput

You can filter by product tag name.

`updatedAt`DateFilterInput

#### Return Type
`ProductTag`ProductTag
