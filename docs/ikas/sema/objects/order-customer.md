<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-customer -->

# OrderCustomer

```graphql
type OrderCustomer {
  id: String
  email: String
  firstName: String
  fullName: String
  isGuestCheckout: Boolean
  lastName: String
  notificationsAccepted: Boolean
  phone: String
  preferredLanguage: String
}
```
Copy

#### Fields
`id`String

It is the id of the customer who created the order.

`email`String

It is the email of the customer who created the order.

`firstName`String

It is the first name of the customer who created the order.

`fullName`String

It is the full name name of the customer who created the order.

`isGuestCheckout`Boolean

Indicates whether the order was created by a new customer with no email record. isGuestCheckout returns true if the order was created without customer email information.

`lastName`String

It is the last name of the customer who created the order.

`notificationsAccepted`Boolean

`phone`String

It is the phone number of the customer who created the order.

`preferredLanguage`String

It is the preferred language of the customer who created the order.
