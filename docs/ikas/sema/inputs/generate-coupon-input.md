<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/generate-coupon-input -->

# GenerateCouponInput

```graphql
type GenerateCouponInput {
  canCombineWithOtherCampaigns: Boolean!
  prefix: String!
  quantity: Int!
  usageLimit: Int
  usageLimitPerCustomer: Int
}
```
Copy

#### Fields
`canCombineWithOtherCampaigns`Boolean!required

`prefix`String!required

`quantity`Int!required

`usageLimit`Int

`usageLimitPerCustomer`Int
