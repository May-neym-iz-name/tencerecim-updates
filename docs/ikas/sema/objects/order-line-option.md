<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-line-option -->

# OrderLineOption

```graphql
type OrderLineOption {
  name: String!
  productOptionId: String!
  productOptionsSetId: String!
  type: ProductOptionTypeEnum!
  values: [OrderLineOptionValue!]!
}
```
Copy

#### Fields
`name`String!required

It is the name of order line option in the order line item.

`productOptionId`String!required

It is the product option id of the product in the order line item.

`productOptionsSetId`String!required

It is the product option set id of the product in the order line item.

`type`ProductOptionTypeEnum!required

It is the type of the order line option.

`values`[OrderLineOptionValue!]!required
