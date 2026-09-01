<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/search-product-price -->

# SearchProductPrice

```graphql
type SearchProductPrice {
  buyPrice: Float
  campaignPrice: SearchProductCampaignPrice
  currency: String
  currencyCode: String
  currencySymbol: String
  discountPrice: Float
  priceListId: String
  sellPrice: Float!
  unitPrice: Float
}
```
Copy

#### Fields
`buyPrice`Float

`campaignPrice`SearchProductCampaignPrice

`currency`String

`currencyCode`String

`currencySymbol`String

`discountPrice`Float

`priceListId`String

`sellPrice`Float!required

`unitPrice`Float
