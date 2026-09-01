<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/price-list-rule-list -->

# PriceListRuleList

```graphql
type PriceListRuleList {
  basePriceListId: String
  currencyRateSettings: PriceListCurrencyRateSettings
  currencySettings: PriceListCurrencySettings!
  rules: [PriceListRules!]!
}
```
Copy

#### Fields
`basePriceListId`String

`currencyRateSettings`PriceListCurrencyRateSettings

`currencySettings`PriceListCurrencySettings!required

`rules`[PriceListRules!]!required
