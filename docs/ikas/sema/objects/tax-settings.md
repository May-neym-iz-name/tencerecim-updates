<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/tax-settings -->

# TaxSettings

```graphql
type TaxSettings {
  id: ID!
  countryId: String!
  giftPackageTaxRates: [TaxSettingsGiftPackageTaxRate!]
  productOverrides: [TaxSettingsProductOverride!]
  rates: [TaxSettingsRate!]
  shippingTaxRates: [TaxSettingsShippingTaxRate!]
  taxRate: Float!
}
```
Copy

#### Fields
`id`ID!required

`countryId`String!required

`giftPackageTaxRates`[TaxSettingsGiftPackageTaxRate!]

`productOverrides`[TaxSettingsProductOverride!]

`rates`[TaxSettingsRate!]

`shippingTaxRates`[TaxSettingsShippingTaxRate!]

`taxRate`Float!required
