<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/merchant-response -->

# MerchantResponse

```graphql
type MerchantResponse {
  id: String!
  address: MerchantAddress
  email: String!
  firstName: String!
  lastName: String!
  merchantName: String
  merchantSequence: Float
  phoneNumber: String
  storeName: String
}
```
Copy

#### Fields
`id`String!required

`address`MerchantAddress

Merchant's address information.

`email`String!required

The merchant staff's email address.

`firstName`String!required

The merchant's first name.

`lastName`String!required

The merchant's last name.

`merchantName`String

The merchant staff's last name.

`merchantSequence`Float

`phoneNumber`String

The merchant's phone number.

`storeName`String

The merchant's store name.
