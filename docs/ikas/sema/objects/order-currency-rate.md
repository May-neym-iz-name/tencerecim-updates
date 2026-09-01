<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-currency-rate -->

# OrderCurrencyRate

```graphql
type OrderCurrencyRate {
  code: String!
  originalRate: Float!
  rate: Float!
}
```
Copy

#### Fields
`code`String!required

It is the code of the currency.

`originalRate`Float!required

It is the original rate of the currency.

`rate`Float!required

It is the rate of the currency.
