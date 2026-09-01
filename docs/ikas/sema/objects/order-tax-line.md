<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-tax-line -->

# OrderTaxLine

```graphql
type OrderTaxLine {
  price: Float!
  rate: Float!
}
```
Copy

#### Fields
`price`Float!required

It is the price of the order tax.

`rate`Float!required

It is the percentage of the slice to which the calculated tax amount belongs.
