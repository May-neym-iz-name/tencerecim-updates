<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/customer-price-list-rule -->

# CustomerPriceListRule

```graphql
type CustomerPriceListRule {
  discountRate: Float
  filters: [CustomerPriceListRuleFilter!]
  priceListId: String
  shouldMatchAllFilters: Boolean
  value: Float!
  valueType: CustomerPriceListRuleValueTypeEnum!
}
```
Copy

#### Fields
`discountRate`Float

`filters`[CustomerPriceListRuleFilter!]

`priceListId`String

`shouldMatchAllFilters`Boolean

`value`Float!required

`valueType`CustomerPriceListRuleValueTypeEnum!required
