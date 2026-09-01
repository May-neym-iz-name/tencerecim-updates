<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/order-line-option-input -->

# OrderLineOptionInput

```graphql
type OrderLineOptionInput {
  productOptionId: String!
  productOptionsSetId: String!
  values: [OrderLineOptionValueInput!]!
}
```
Copy

#### Fields
`productOptionId`String!required

It is the option id.

`productOptionsSetId`String!required

It is the options set id information that option is connected to.

- Is the entered id must be exist in ikas.

`values`[OrderLineOptionValueInput!]!required

A list of option value objects, each containing input about an option value.
