<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/queries/list-category -->

# listCategory

Using this api, you can view the categories of products.
Search applies to following fields: `name`

```graphql
listCategory(
  categoryPath: CategoryPathFilterInput
  id: StringFilterInput
  name: StringFilterInput
  search: String
  updatedAt: DateFilterInput
): [Category!]!
```
Copy

#### Arguments
`categoryPath`CategoryPathFilterInput

You can filter according to the category path of the product.

`id`StringFilterInput

`name`StringFilterInput

You can filter according to the name of the category.

`search`String

Some listing APIs have searchable fields. You can search in these fields as you wish. For example, in an API; Let the `searchableFields :['name', 'description']`. If we send `search: AAA` as input in args, it will return records with 'AAA' in both the name and description fields.

`updatedAt`DateFilterInput

#### Return Type
`Category`Category
