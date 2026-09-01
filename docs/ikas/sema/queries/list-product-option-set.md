<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/queries/list-product-option-set -->

# listProductOptionSet

```graphql
listProductOptionSet(
  id: StringFilterInput
  name: StringFilterInput
  search: String
  updatedAt: DateFilterInput
): [ProductOptionSet!]!
```
Copy

#### Arguments
`id`StringFilterInput

`name`StringFilterInput

You can filter by product option set name.

`search`String

Some listing APIs have searchable fields. You can search in these fields as you wish. For example, in an API; Let the `searchableFields :['name', 'description']`. If we send `search: AAA` as input in args, it will return records with 'AAA' in both the name and description fields.

`updatedAt`DateFilterInput

#### Return Type
`ProductOptionSet`ProductOptionSet
