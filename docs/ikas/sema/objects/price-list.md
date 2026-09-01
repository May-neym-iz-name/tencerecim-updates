<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/price-list -->

# PriceList

```graphql
type PriceList {
  id: ID!
  addProductsAutomatically: Boolean
  currency: String!
  currencyCode: String
  currencySymbol: String
  name: String!
  ruleList: [PriceListRuleList!]
  type: PriceListTypeEnum
}
```
Copy

#### Fields
`id`ID!required

`addProductsAutomatically`Boolean

`currency`String!required

The currency of the product's price list.

`currencyCode`String

`currencySymbol`String

`name`String!required

It is the name of the price list of the product.

`ruleList`[PriceListRuleList!]

`type`PriceListTypeEnum

Type of price price list
