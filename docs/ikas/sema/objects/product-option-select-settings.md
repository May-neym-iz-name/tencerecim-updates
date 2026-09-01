<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/product-option-select-settings -->

# ProductOptionSelectSettings

```graphql
type ProductOptionSelectSettings {
  maxSelect: Float
  minSelect: Float
  type: ProductOptionSelectTypeEnum!
  values: [ProductOptionSelectValue!]!
}
```
Copy

#### Fields
`maxSelect`Float

`minSelect`Float

`type`ProductOptionSelectTypeEnum!required

`values`[ProductOptionSelectValue!]!required
