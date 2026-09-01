<!-- kaynak: https://ikas.dev/docs/api/admin-api/customers -->

# Customer

The customer api stores information about a store's customers such as contact information, address information, number of orders of the customer.
A customer resource stores information about a store's customers, such as contact information, order history, and whether they agree to receive email marketing.
The customer resource also maintains information about the status of a customer's account. Customers with accounts save time at checkout as they don't need to enter their contact information when they log in. You can use the Customer API to check if a customer has an active account, and then invite the customer to create one if they don't.
For security reasons, the Customer resource does not store credit card information. Customers must always enter this information at checkout.

## Models

### Customer

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

### CustomerAddress

```graphql
type CustomerAddress {
  id: ID!
  addressLine1: String!
  addressLine2: String
  attributes: [CustomerAttributeValue!]
  city: CustomerAddressCity!
  company: String
  country: CustomerAddressCountry!
  district: CustomerAddressDistrict
  firstName: String!
  identityNumber: String
  isDefault: Boolean
  lastName: String!
  phone: String
  postalCode: String
  region: CustomerAddressRegion
  state: CustomerAddressState
  taxNumber: String
  taxOffice: String
  title: String!
}
```
Copy

#### Fields
`id`ID!required

`addressLine1`String!required

The customer's mailing address.

`addressLine2`String

An additional field for the customer's mailing address.

`attributes`[CustomerAttributeValue!]

`city`CustomerAddressCity!required

The customer's city.

`company`String

The customer's company.

`country`CustomerAddressCountry!required

The customer's country.

`district`CustomerAddressDistrict

The customer's district in city.

`firstName`String!required

The customer's first name.

`identityNumber`String

The customer's identity numbers.

`isDefault`Boolean

Whether this address is the default address for the customer. Returns `true` for each default address.

`lastName`String!required

The customer's last name.

`phone`String

The customer's phone number at this address

`postalCode`String

The customer's postal code, also known as zip, postcode, etc.

`region`CustomerAddressRegion

`state`CustomerAddressState

`taxNumber`String

Tax number that the customer will use for orders

`taxOffice`String

If customer is corporate, customer can use that field to fill their Tax Office name.

`title`String!required

### CustomerAddressCountry

```graphql
type CustomerAddressCountry {
  id: String
  code: String
  iso2: String
  iso3: String
  name: String!
}
```
Copy

#### Fields
`id`String

`code`String

The two-letter country code corresponding to the customer's country.

`iso2`String

The two-letter country code corresponding to the customer's country.

`iso3`String

The two-letter country code corresponding to the customer's country.

`name`String!required

The customer's normalized country name.

### CustomerAddressCity

```graphql
type CustomerAddressCity {
  id: String
  code: String
  name: String!
}
```
Copy

#### Fields
`id`String

`code`String

The two-letter country code corresponding to the customer's country.

`name`String!required

The customer's normalized city name.

### CustomerAddressDistrict

```graphql
type CustomerAddressDistrict {
  id: String
  code: String
  name: String
}
```
Copy

#### Fields
`id`String

`code`String

The two-letter district code corresponding to the customer's district.

`name`String

The customer's normalized district name.

### CustomerAddressState

```graphql
type CustomerAddressState {
  id: String
  code: String
  name: String
}
```
Copy

#### Fields
`id`String

`code`String

`name`String

## Queries

### List Customers

```graphql
listCustomer(
  email: StringFilterInput
  id: StringFilterInput
  merchantId: StringFilterInput
  pagination: PaginationInput
  phone: StringFilterInput
  search: String
  sort: String
  updatedAt: DateFilterInput
): CustomerPaginationResponse!
```
Copy

#### Arguments
`email`StringFilterInput

You can get the filter response by entering the desired condition for the email.
note
For example email: { eq: aa@gmail.com}

`id`StringFilterInput

`merchantId`StringFilterInput

`pagination`PaginationInput

With the pagination feature in the data returned as a response, you can filter the data and display the part you want.

`phone`StringFilterInput

You can get the filter response by entering the desired condition for the email.
note
For example phone: { eq: 5123456789999}

`search`String

Some listing APIs have searchable fields. You can search in these fields as you wish. For example, in an API; Let the `searchableFields :['name', 'description']`. If we send `search: AAA` as input in args, it will return records with 'AAA' in both the name and description fields.

`sort`String

Some listing APIs have sortable fields. Using these fields, the data returned as response has been sorted. For example, in an API; Let it be `sortableFields: ['updatedAt']`. The data returned as a response will be sorted according to updatedAt.

`updatedAt`DateFilterInput

#### Return Type
`CustomerPaginationResponse`CustomerPaginationResponse

## Examples

### Retrieves a list of customers

- BASH
- NODE.JS

```bash
curl --location --request POST 'https://api.myikas.com/api/v1/admin/graphql' \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer <your_access_token>' \
      --data-raw '{"query":"{ listCustomer(merchantId: { eq: \"your_merchant_id\" }) { data { accountStatus accountStatusUpdatedAt createdAt customerGroupIds deleted email emailVerifiedDate firstName id isEmailVerified isPhoneVerified lastName note passwordUpdateDate phone phoneVerifiedDate subscriptionStatus subscriptionStatusUpdatedAt tagIds updatedAt orderCount } } }"}'
```
Copy

```javascript
const axios = require('axios');
const data = {"query":`{
     listCustomer(merchantId: { eq: "your_merchant_id" }) {
       data {
         accountStatus
         accountStatusUpdatedAt
         createdAt
         customerGroupIds
         deleted
         email
         emailVerifiedDate
         firstName
         id
         isEmailVerified
         isPhoneVerified
         lastName
         note
         passwordUpdateDate
         phone
         phoneVerifiedDate
         subscriptionStatus
         subscriptionStatusUpdatedAt
         tagIds
         updatedAt
         orderCount
       }
     }
   }
`};

const config = {
  method: 'POST',
  url: 'https://api.myikas.com/api/v1/admin/graphql',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_token'
  },
  data : data
};

axios(config)
.then(function (response) {
  console.log(JSON.stringify(response.data));
})
.catch(function (error) {
  if (error.response) {
    console.log(JSON.stringify(error.response.data));
  }
});
```
Copy

#### Response

```json
{
  "data": {
    "listCustomer": {
      "data": [
        {
          "accountStatus": "ACTIVE_ACCOUNT",
          "accountStatusUpdatedAt": null,
          "createdAt": 1634019877744,
          "customerGroupIds": [],
          "deleted": false,
          "email": "onur@gmail.com",
          "emailVerifiedDate": null,
          "firstName": "onur",
          "id": "a8befae6-2cb9-487a-bd7f-5e0bfff3676b",
          "isEmailVerified": false,
          "isPhoneVerified": false,
          "lastName": "ilkyaz",
          "note": null,
          "passwordUpdateDate": null,
          "phone": "+905554443322",
          "phoneVerifiedDate": null,
          "subscriptionStatus": "NOT_SUBSCRIBED",
          "subscriptionStatusUpdatedAt": null,
          "tagIds": [],
          "updatedAt": 1634019877744,
          "orderCount": 5
        }
      ]
    }
  }
}
```
Copy
