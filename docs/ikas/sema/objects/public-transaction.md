<!-- kaynak: https://ikas.dev/docs/api/type-definitions/admin-api/objects/public-transaction -->

# PublicTransaction

```graphql
type PublicTransaction {
  id: ID!
  amount: Float!
  authCode: String!
  checkoutId: String
  currencyCode: String!
  currencySymbol: String
  customerId: String
  error: TransactionError
  orderId: String
  paymentGatewayCode: String
  paymentGatewayId: String!
  paymentGatewayName: String!
  paymentMethod: PaymentMethodTypeEnum
  paymentMethodDetail: TransactionPaymentMethodDetail
  processedAt: Timestamp
  refundReason: String
  status: TransactionStatusEnum!
  type: TransactionTypeEnum!
}
```
Copy

#### Fields
`id`ID!required

`amount`Float!required

`authCode`String!required

`checkoutId`String

`currencyCode`String!required

`currencySymbol`String

`customerId`String

`error`TransactionError

`orderId`String

`paymentGatewayCode`String

`paymentGatewayId`String!required

`paymentGatewayName`String!required

`paymentMethod`PaymentMethodTypeEnum

`paymentMethodDetail`TransactionPaymentMethodDetail

`processedAt`Timestamp

`refundReason`String

`status`TransactionStatusEnum!required

`type`TransactionTypeEnum!required
