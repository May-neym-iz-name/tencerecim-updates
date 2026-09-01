<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-line-base-unit -->

# OrderLineBaseUnit

```graphql
type OrderLineBaseUnit {
  baseAmount: Float!
  type: ProductUnitTypeEnum!
  unit: OrderLineVariantUnitType
}
```
Copy

#### Fields
`baseAmount`Float!required

It is the amount of the unit.

`type`ProductUnitTypeEnum!required

It is the type of the unit of the variant.

`unit`OrderLineVariantUnitType

It is the amount of the unit.
