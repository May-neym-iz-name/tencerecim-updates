<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/merchant-app-payment-price -->

# MerchantAppPaymentPrice

```graphql
type MerchantAppPaymentPrice {
  period: SubscriptionPeriodEnum!
  price: Float!
}
```
Copy

#### Fields
`period`SubscriptionPeriodEnum!required

`price`Float!required

The area where the price information of the product is kept. Here, one-time, monthly or annual payments can be made and the information is kept in this way.
