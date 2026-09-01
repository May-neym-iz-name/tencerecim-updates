<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/product-option -->

# ProductOption

```graphql
type ProductOption {
  id: ID!
  dateSettings: ProductOptionDateSettings
  fileSettings: ProductOptionFileSettings
  isOptional: Boolean
  name: String!
  optionalText: String
  order: Float!
  otherPrices: [ProductOptionSelectValueOtherPrice!]
  price: Float
  requiredOptionId: String
  requiredOptionValueIds: [String!]
  selectSettings: ProductOptionSelectSettings
  textSettings: ProductOptionTextSettings
  type: ProductOptionTypeEnum!
}
```
Copy

#### Fields
`id`ID!required

`dateSettings`ProductOptionDateSettings

`fileSettings`ProductOptionFileSettings

`isOptional`Boolean

`name`String!required

`optionalText`String

`order`Float!required

`otherPrices`[ProductOptionSelectValueOtherPrice!]

`price`Float

`requiredOptionId`String

`requiredOptionValueIds`[String!]

`selectSettings`ProductOptionSelectSettings

`textSettings`ProductOptionTextSettings

`type`ProductOptionTypeEnum!required
