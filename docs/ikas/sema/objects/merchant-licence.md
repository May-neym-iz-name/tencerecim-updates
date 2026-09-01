<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/merchant-licence -->

# MerchantLicence

```graphql
type MerchantLicence {
  id: ID!
  activeSubscriptionCode: SubscriptionCodeEnum!
  appSubscriptions: [MerchantAppSubscription!]
  developmentStore: Boolean
  fromDate: Timestamp
  period: SubscriptionPeriodEnum
  region: MerchantRegionEnum!
  toDate: Timestamp
}
```
Copy

#### Fields
`id`ID!required

`activeSubscriptionCode`SubscriptionCodeEnum!required

`appSubscriptions`[MerchantAppSubscription!]

If the license is attached to an app, its properties are kept in this domain.

`developmentStore`Boolean

`fromDate`Timestamp

It is the information of the start date of the license.

`period`SubscriptionPeriodEnum

`region`MerchantRegionEnum!required

`toDate`Timestamp

It is the information of the expiry date of the license.
