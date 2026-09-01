<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/product-base-unit-model -->

# ProductBaseUnitModel

```graphql
type ProductBaseUnitModel {
  baseAmount: Float
  type: ProductUnitTypeEnum!
  unitId: String
}
```
Copy

#### Fields
`baseAmount`Float

Amount of the product unit.

`type`ProductUnitTypeEnum!required

Type of the product unit.

`unitId`String

Unit id of the product unit.
