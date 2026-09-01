<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/checkout-customer -->

# CheckoutCustomer

```graphql
type CheckoutCustomer {
  id: String
  accountStatus: CustomerAccountStatusEnum
  customerGroupIds: [String!]
  email: String
  firstName: String
  identityNumber: String
  lastName: String
  notificationsAccepted: Boolean
  phone: String
  subscriptionStatus: CustomerEmailSubscriptionStatusesEnum
}
```
Copy

#### Fields
`id`String

`accountStatus`CustomerAccountStatusEnum

`customerGroupIds`[String!]

`email`String

`firstName`String

`identityNumber`String

`lastName`String

`notificationsAccepted`Boolean

`phone`String

`subscriptionStatus`CustomerEmailSubscriptionStatusesEnum
