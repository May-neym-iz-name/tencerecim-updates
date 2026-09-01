<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/queries/product-attribute-export -->

# productAttributeExport

```graphql
productAttributeExport(
  attributeId: ProductAttributeFilterInput
  attributeOptionId: ProductAttributeOptionFilterInput
  brandId: StringFilterInput
  categoryIds: CategoryFilterInput
  dynamicPriceListIds: StringFilterInput
  fileType: ImportSourceEnum
  id: StringFilterInput
  includeDeleted: Boolean
  locale: ProductLocaleFilterInput
  name: StringFilterInput
  pagination: PaginationInput
  priceListId: StringFilterInput
  salesChannelIds: StringFilterInput
  search: String
  sort: String
  stockLocationId: StringFilterInput
  tagIds: StringFilterInput
  totalStock: NumberFilterInput
  type: ProductTypeEnumFilterInput
  updatedAt: DateFilterInput
  variantId: StringFilterInput
  variantTypeId: StringFilterInput
  variantValueId: StringFilterInput
  vendorId: StringFilterInput
): String!
```
Copy

#### Arguments
`attributeId`ProductAttributeFilterInput

`attributeOptionId`ProductAttributeOptionFilterInput

`brandId`StringFilterInput

`categoryIds`CategoryFilterInput

`dynamicPriceListIds`StringFilterInput

`fileType`ImportSourceEnum

`id`StringFilterInput

`includeDeleted`Boolean

`locale`ProductLocaleFilterInput

`name`StringFilterInput

`pagination`PaginationInput

`priceListId`StringFilterInput

`salesChannelIds`StringFilterInput

`search`String

`sort`String

`stockLocationId`StringFilterInput

`tagIds`StringFilterInput

`totalStock`NumberFilterInput

`type`ProductTypeEnumFilterInput

`updatedAt`DateFilterInput

`variantId`StringFilterInput

`variantTypeId`StringFilterInput

`variantValueId`StringFilterInput

`vendorId`StringFilterInput

#### Return Type
`String`String

The `String` scalar type represents textual data, represented as UTF-8 character sequences. The String type is most often used by GraphQL to represent free-form human-readable text.
