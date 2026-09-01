<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/new-coupon-input -->

# NewCouponInput

```graphql
type NewCouponInput {
  id: ID
  canCombineWithOtherCampaigns: Boolean!
  code: String!
  usageLimit: Int
  usageLimitPerCustomer: Int
}
```
Copy

#### Fields
`id`ID

`canCombineWithOtherCampaigns`Boolean!required

`code`String!required

`usageLimit`Int

`usageLimitPerCustomer`Int
