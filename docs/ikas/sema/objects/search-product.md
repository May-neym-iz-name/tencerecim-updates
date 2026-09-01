<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/search-product -->

# SearchProduct

```graphql
type SearchProduct {
  id: String!
  attributes: [SearchProductAttributeValue!]
  averageRating: Float
  baseUnit: SearchProductProductBaseUnit
  brand: SearchProductBrand
  campaignOffers: [SearchProductCampaignOffer!]
  campaigns: [SearchProductCampaign!]
  categories: [SearchCategory!]
  customerReviewSummaries: ProductSearchCustomerReviewSummaries
  description: String
  dynamicPriceListIds: [String!]
  groupVariantsByVariantTypeId: String
  hiddenSalesChannelIds: [String!]
  metaData: SearchHTMLMetaData
  name: String!
  productGroup: SearchProductGroup
  productOptionSetId: String
  productVariantTypes: [SearchProductVariantType!]!
  productVolumeDiscountId: String
  reviewCount: Float
  salesChannelIds: [String!]
  shortDescription: String
  stars: [SearchProductCustomerReviewStar!]
  tags: [SearchProductTag!]
  translations: [ProductTranslation!]
  type: String!
  variants: [SearchVariant!]!
  weight: Float
}
```
Copy

#### Fields
`id`String!required

`attributes`[SearchProductAttributeValue!]

`averageRating`Float

`baseUnit`SearchProductProductBaseUnit

`brand`SearchProductBrand

`campaignOffers`[SearchProductCampaignOffer!]

`campaigns`[SearchProductCampaign!]

`categories`[SearchCategory!]

`customerReviewSummaries`ProductSearchCustomerReviewSummaries

`description`String

`dynamicPriceListIds`[String!]

`groupVariantsByVariantTypeId`String

`hiddenSalesChannelIds`[String!]

`metaData`SearchHTMLMetaData

`name`String!required

`productGroup`SearchProductGroup

`productOptionSetId`String

`productVariantTypes`[SearchProductVariantType!]!required

`productVolumeDiscountId`String

`reviewCount`Float

`salesChannelIds`[String!]

`shortDescription`String

`stars`[SearchProductCustomerReviewStar!]

`tags`[SearchProductTag!]

`translations`[ProductTranslation!]

`type`String!required

`variants`[SearchVariant!]!required

`weight`Float
