<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/abandoned-cart-flow -->

# AbandonedCartFlow

```graphql
type AbandonedCartFlow {
  authorizedAppId: String
  campaignId: String
  canApplicable: Boolean!
  couponId: String
  customerFilters: AbandonedCartFlowCustomerFilter
  flowId: String!
  mailSendDate: Timestamp
  mailTranslationId: String
  messageType: AbandonedCartSettingsNotificationTypeEnum
  recoverEmailStatus: CheckoutRecoveryEmailStatusEnum!
  sendAfter: Float!
  smsTranslationId: String
}
```
Copy

#### Fields
`authorizedAppId`String

`campaignId`String

`canApplicable`Boolean!required

`couponId`String

`customerFilters`AbandonedCartFlowCustomerFilter

`flowId`String!required

`mailSendDate`Timestamp

`mailTranslationId`String

`messageType`AbandonedCartSettingsNotificationTypeEnum

`recoverEmailStatus`CheckoutRecoveryEmailStatusEnum!required

`sendAfter`Float!required

`smsTranslationId`String
