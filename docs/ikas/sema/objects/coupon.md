<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/coupon -->

# Coupon

```graphql
type Coupon {
  id: ID!
  campaignId: String!
  canCombineWithOtherCampaigns: Boolean!
  code: String!
  usageCount: Int!
  usageLimit: Int
  usageLimitPerCustomer: Int
}
```
Copy

#### Fields
`id`ID!required

`campaignId`String!required

`canCombineWithOtherCampaigns`Boolean!required

`code`String!required

`usageCount`Int!required

`usageLimit`Int

`usageLimitPerCustomer`Int
