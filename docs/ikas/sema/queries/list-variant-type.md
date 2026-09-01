<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/queries/list-variant-type -->

# listVariantType

Using this api, you can view the variant types of products.

```graphql
listVariantType(
  id: StringFilterInput
  name: StringFilterInput
  updatedAt: DateFilterInput
): [VariantType!]!
```
Copy

#### Arguments
`id`StringFilterInput

`name`StringFilterInput

You can filter by product variant type name.

`updatedAt`DateFilterInput

#### Return Type
`VariantType`VariantType
