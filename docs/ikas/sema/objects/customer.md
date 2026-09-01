<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/customer -->

# Customer

```graphql
type Customer {
  id: ID!
  accountStatus: CustomerAccountStatusEnum
  accountStatusUpdatedAt: Timestamp
  addresses: [CustomerAddress!]
  attributes: [CustomerAttributeValue!]
  customerGroupIds: [String!]
  customerSegmentIds: [String!]
  customerSequence: Float
  email: String
  emailVerifiedDate: Timestamp
  firstName: String!
  firstOrderDate: Timestamp
  fullName: String
  ip: String
  isEmailVerified: Boolean
  isPhoneVerified: Boolean
  lastName: String
  lastOrderDate: Timestamp
  lastPriceListId: String
  lastStorefrontRoutingId: String
  note: String
  orderCount: Float
  passwordUpdateDate: Timestamp
  phone: String
  phoneVerifiedDate: Timestamp
  preferredLanguage: String
  priceListId: String
  priceListRules: [CustomerPriceListRule!]
  registrationSource: CustomerRegistrationSourceEnum
  subscriptionStatus: CustomerEmailSubscriptionStatusesEnum
  subscriptionStatusUpdatedAt: Timestamp
  tagIds: [String!]
  totalOrderPrice: Float
  userAgent: String
}
```
Copy

#### Fields
`id`ID!required

`accountStatus`CustomerAccountStatusEnum

CustomerAccountStatusEnum

`accountStatusUpdatedAt`Timestamp

`addresses`[CustomerAddress!]

A list of the ten most recently updated addresses for the customer.

`attributes`[CustomerAttributeValue!]

`customerGroupIds`[String!]

Groups that the store owner attaches to the customer.

`customerSegmentIds`[String!]

Segments that the customers are belong to.

`customerSequence`Float

It is the sequence value of the customer. The sequence value starts from 1.

`email`String

The unique email address of the customer. Attempting to assign the same email address to multiple customers returns an error.

`emailVerifiedDate`Timestamp

The date the email was verified.

`firstName`String!required

The customer's first name.

`firstOrderDate`Timestamp

Date of first order by the customer

`fullName`String

Customer's full name. Firstname plus lastname if firstname and lastname exist. Otherwise, it is saved as firstname only.

`ip`String

`isEmailVerified`Boolean

Email verification status. isEmailVerified returns `true` if the email is verified.

`isPhoneVerified`Boolean

Phone verification status. isPhoneVerified returns `true` if the email is verified.

`lastName`String

The customer's last name.

`lastOrderDate`Timestamp

Date of last order by the customer

`lastPriceListId`String

Last used price list id by the customer

`lastStorefrontRoutingId`String

Last used storefront routing id by the customer

`note`String

A note about the customer.

`orderCount`Float

Number of orders placed by the customer.

`passwordUpdateDate`Timestamp

Date the customer last changed their password.

`phone`String

The customer's phone number

`phoneVerifiedDate`Timestamp

The date the email was verified.

`preferredLanguage`String

`priceListId`String

`priceListRules`[CustomerPriceListRule!]

`registrationSource`CustomerRegistrationSourceEnum

Registration source of customer.

`subscriptionStatus`CustomerEmailSubscriptionStatusesEnum

CustomerEmailSubscriptionStatusesEnum

`subscriptionStatusUpdatedAt`Timestamp

`tagIds`[String!]

Tags that the store owner attaches to the customer.

`totalOrderPrice`Float

Amount of orders by the customer

`userAgent`String
