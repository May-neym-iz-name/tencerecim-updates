<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/merchant-app-payment -->

# MerchantAppPayment

```graphql
type MerchantAppPayment {
  id: ID!
  appPaymentKey: String
  authorizedAppId: String
  merchantPaymentUrl: String!
  name: String!
  paymentDate: Timestamp
  prices: [MerchantAppPaymentPrice!]!
  status: MerchantAppPaymentStatusEnum!
  storeAppId: String!
  storeAppListingSubscriptionId: String
  storeAppListingSubscriptionKey: String
  type: MerchantAppPaymentTypeEnum!
}
```
Copy

#### Fields
`id`ID!required

`appPaymentKey`String

It keeps the information of which type of license is obtained. For example: trendyol-app-licence, foriba-app-licence etc.

`authorizedAppId`String

The id of the app that generated the app payment. Actually, the id of the app for which merchant app payment was created.

`merchantPaymentUrl`String!required

The url where the Merchant will be redirected to the payment screen. On this page, the payment process is performed by obtaining the card information.

`name`String!required

The created merchant app keeps the name of the payment.

`paymentDate`Timestamp

The merchant app keeps the date of completion of the payment. In other words, it keeps the information of the date the payment was received.

`prices`[MerchantAppPaymentPrice!]!required

Merchant app payment pricing description.

`status`MerchantAppPaymentStatusEnum!required

`storeAppId`String!required

The id of the application for which payment will be created in the store

`storeAppListingSubscriptionId`String

`storeAppListingSubscriptionKey`String

`type`MerchantAppPaymentTypeEnum!required
