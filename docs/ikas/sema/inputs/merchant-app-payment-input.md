<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/inputs/merchant-app-payment-input -->

# MerchantAppPaymentInput

```graphql
type MerchantAppPaymentInput {
  name: String!
  price: Float!
}
```
Copy

#### Fields
`name`String!required

The created merchant app keeps the name of the payment.

`price`Float!required

The area where the price information of the product is kept. Input array can be sent a minimum of one element and a maximum of 2 elements.
