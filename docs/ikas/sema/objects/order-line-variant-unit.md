<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-line-variant-unit -->

# OrderLineVariantUnit

```graphql
type OrderLineVariantUnit {
  amount: Float!
  type: ProductUnitTypeEnum!
}
```
Copy

#### Fields
`amount`Float!required

It is the amount of the unit.

`type`ProductUnitTypeEnum!required

It is the type of the unit of the variant.
