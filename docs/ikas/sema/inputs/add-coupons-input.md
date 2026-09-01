<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/add-coupons-input -->

# AddCouponsInput

```graphql
type AddCouponsInput {
  campaignId: String!
  coupons: [NewCouponInput!]
  generateCoupons: GenerateCouponInput
}
```
Copy

#### Fields
`campaignId`String!required

`coupons`[NewCouponInput!]

`generateCoupons`GenerateCouponInput
