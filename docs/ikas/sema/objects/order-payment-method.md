<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/order-payment-method -->

# OrderPaymentMethod

```graphql
type OrderPaymentMethod {
  paymentGatewayCode: String
  paymentGatewayId: String
  paymentGatewayName: String
  price: Float!
  type: PaymentMethodTypeEnum!
}
```
Copy

#### Fields
`paymentGatewayCode`String

It is the gateway code of the order payment method.

`paymentGatewayId`String

It is the gateway name of the order payment method.

`paymentGatewayName`String

It is the gateway name of the order payment method.

`price`Float!required

It is the amount charged by the payment method.

`type`PaymentMethodTypeEnum!required

It is the type enum of the order payment method.
