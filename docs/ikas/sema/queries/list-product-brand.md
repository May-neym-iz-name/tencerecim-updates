<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/queries/list-product-brand -->

# listProductBrand

Using this api, you can view the brands of products.
Search applies to following fields: `name`

```graphql
listProductBrand(
  id: StringFilterInput
  name: StringFilterInput
  search: String
  updatedAt: DateFilterInput
): [ProductBrand!]!
```
Copy

#### Arguments
`id`StringFilterInput

`name`StringFilterInput

You can filter by product brand name.

`search`String

Some listing APIs have searchable fields. You can search in these fields as you wish. For example, in an API; Let the `searchableFields :['name', 'description']`. If we send `search: AAA` as input in args, it will return records with 'AAA' in both the name and description fields.

`updatedAt`DateFilterInput

#### Return Type
`ProductBrand`ProductBrand
