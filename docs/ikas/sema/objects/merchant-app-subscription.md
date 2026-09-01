<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/merchant-app-subscription -->

# MerchantAppSubscription

```graphql
type MerchantAppSubscription {
  id: ID!
  addedDate: Timestamp
  appPaymentKey: String
  authorizedAppId: String
  currency: SubscriptionPriceCurrencyEnum
  currencyCode: String
  currencySymbol: String
  lastPaymentDate: Timestamp
  lastPaymentDiscountRatio: Float
  lastPaymentPeriod: SubscriptionPeriodEnum!
  lastPaymentPeriodInDays: Float!
  lastPaymentPrice: Float!
  lastPaymentPriceWithTax: Float!
  merchantAppPaymentId: String
  name: String!
  status: MerchantSubscriptionStatusEnum!
  storeAppId: String!
  storeAppListingSubscriptionId: String!
  storeAppListingSubscriptionKey: String!
}
```
Copy

#### Fields
`id`ID!required

`addedDate`Timestamp

The date the app licence was added.

`appPaymentKey`String

It is the information of which type of app license is obtained.

`authorizedAppId`String

The id of the app that generated the app payment. Actually, the id of the app for which merchant app payment was created.

`currency`SubscriptionPriceCurrencyEnum

`currencyCode`String

`currencySymbol`String

`lastPaymentDate`Timestamp

It is the date of receipt of the last payment for the license subscription.

`lastPaymentDiscountRatio`Float

The discount rate on the last payment for the app license subscription.

`lastPaymentPeriod`SubscriptionPeriodEnum!required

`lastPaymentPeriodInDays`Float!required

The payment period of the license last payment. The purpose of keeping this information is to adjust the controls according to the last month if the subscription is withdrawn from annual to monthly.

`lastPaymentPrice`Float!required

It is the last payment information for the app license subscription.

`lastPaymentPriceWithTax`Float!required

It is the price information including KDV, for which the last payment is made for the app license subscription.

`merchantAppPaymentId`String

`name`String!required

The name of the created application license is the information.

`status`MerchantSubscriptionStatusEnum!required

`storeAppId`String!required

The id of the application to be licensed in the store

`storeAppListingSubscriptionId`String!required

`storeAppListingSubscriptionKey`String!required
